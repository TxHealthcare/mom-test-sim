"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useState } from "react";
import { saveTranscript, uploadRecordingBlob, getCustomerProfileBySessionId } from "@/lib/supabase/supabase-utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { EvaluationData, Interview } from "@/types/interview";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';
import { startRealtimeSession, endRealtimeSession } from "./realtime-session-manager";
import { Pause, Play } from "lucide-react";
import { useAudioMixer } from "@/hooks/useAudioMixer";
import { useRecorder } from "@/hooks/useRecorder";
import { useSearchParams, useRouter } from "next/navigation";
import { RealtimeEvent } from "@/types/realtime";
import { processTranscriptEvent } from "./transcript-manager";

const AudioVisualizer = dynamic(() => import('@/components/AudioVisualizer'), {
  ssr: false
});

interface MicrophoneState {
  isBlocked: boolean;
  errorMessage?: string;
}

let didRequestInitialMic = false;
let localStreamInitialized = false;

// Component that uses useSearchParams
function SimulatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session_id = searchParams?.get('session_id') ?? null;
  const [interview, setInterview] = useState<Interview | null>({});
  const { user, loading } = useAuth();
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>({ 
    isBlocked: false, 
  });
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

  const mergedStream = useAudioMixer({
    peerConnection: peerConnection ?? undefined,
    localStream: localStream ?? undefined,
    isRecording
  });

  const {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isRecorderInitialized
  } = useRecorder({
    stream: mergedStream
  });

  // Fetch customer profile and learning objectives when session_id changes
  useEffect(() => {
    if (session_id) {
      setInterview({
        ...interview,
        session_id: session_id
      });
      getCustomerProfileBySessionId(session_id)
        .then(({ customerProfile, learningObjectives }) => {
          setInterview({
            ...interview,
            customer_profile: customerProfile,
            objectives: learningObjectives
          });
        })
        .catch((error: Error) => console.error('Error fetching data:', error));
    }
  }, [session_id]);

  // Check authentication and session_id
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!session_id) {
      router.push('/simulator-onboarding');
      return;
    }
  }, [user, loading, session_id, router]);



  const handleRecordingToggle = async () => {
    const toggleTracks = (enabled: boolean) => {
      if (!peerConnection) {
        console.error("No peer connection found on conversation toggle.");
        return;
      }
      
      [...peerConnection.getSenders(), ...peerConnection.getReceivers()]
        .forEach(transceiver => {
          if (transceiver.track) {
            transceiver.track.enabled = enabled;
          }
        });
    };

    try {
      if (!isRecording) {
        if (peerConnection) {
          // Resume conversation
          toggleTracks(true);
          isRecorderInitialized() ? resumeRecording() : startRecording();
          setIsRecording(true);
          setHasStartedRecording(true);
        } else if (!peerConnection && !hasStartedRecording) {
          // Start new conversation
          const pc = new RTCPeerConnection();
          if (!session_id) {
            // This should never happen. We would redirect to simulator-onboarding.
            throw new Error('No session_id found');
          }
          const { dataChannel } = await startRealtimeSession(pc, session_id);
          setPeerConnection(pc);
          setDataChannel(dataChannel);

          // Start recording only after peer connection is established
          await startRecording();
          setHasStartedRecording(true);
          setIsRecording(true);
        } else {
          console.error("Invalid state for starting recording:", {
            hasPeerConnection: !!peerConnection,
            hasStartedRecording
          });
        }
      } else if (peerConnection) {
        // Pause conversation
        toggleTracks(false);
        await pauseRecording();
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Error in handleRecordingToggle:', error);
      // Reset state on error
      setIsRecording(false);
      if (!hasStartedRecording) {
        if (peerConnection) {
          peerConnection.close();
        }
        setPeerConnection(null);
        setDataChannel(null);
      }
    }
  };

  const handleFinishConversation = async () => {
    if (!peerConnection || !session_id || !user) {
      console.error("Missing required data");
      return;
    }

    try {        
      const blob = await stopRecording();
      if (!blob) {
        throw new Error("Failed to get recording blob");
      }

      // End the session immediately
      endRealtimeSession(peerConnection, dataChannel);
      setPeerConnection(null);
      setDataChannel(null);
      setIsRecording(false);

      // Set initial transcript data
      const currentTime = new Date().toISOString();
      const transcriptData = {
        id: session_id,
        user_id: user.id,
        session_id,
        entries: interview?.entries,
        customer_profile: interview?.customer_profile,
        updated_at: currentTime
      };

      // Save initial transcript data and redirect
      await saveTranscript(transcriptData);
      router.push('/dashboard');
      
      // Process the rest in the background
      Promise.all([
        // Upload recording
        uploadRecordingBlob(blob, session_id)
          .then(async (publicUrl) => {
            return saveTranscript({
              id: session_id,
              user_id: user.id,
              recording_blob_url: publicUrl,
            });
          })
          .catch(error => console.error('Error saving recording URL:', error)),
        
        // Run analysis in parallel
        (async () => {  
          if (!interview?.customer_profile?.trim()) {
            console.error('Customer profile is empty');
            return;
          }
          
          if (!interview?.objectives?.length || !interview.objectives.some(obj => obj.trim())) {
            console.error('No valid learning objectives found');
            return;
          }

          return fetch('/api/analyze-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              transcript: interview?.entries,
              session_id,
              customer_profile: interview?.customer_profile,
              learningObjectives: interview?.objectives
            })
          })
            .then(res => {
              if (!res.ok) {
                throw new Error('Analysis failed');
              }
              return res.json();
            })
            .then(async (analysis) => {
              // Save the evaluation data - include user_id for RLS
              const evaluationData: EvaluationData = {
                generalAnalysis: analysis.generalAnalysis || null,
                rubricAnalysis: analysis.rubricAnalysis || null,
                evaluatedAt: analysis.evaluatedAt
              };

              // Update with evaluation - include user_id for RLS
              const transcriptUpdate = {
                id: session_id,
                user_id: user.id,
                session_id,
                evaluation: evaluationData
              };

              return saveTranscript(transcriptUpdate);
            })
            .catch(error => {
              console.error('Error analyzing or saving transcript:', error);
            });
        })()
      ])
      .then(() => {
        // All background tasks completed successfully
        // Force refresh the dashboard page
        router.refresh();
      })
      .catch(error => {
        console.error('Error in background tasks:', error);
      });

    } catch (error) {
      if (peerConnection) {
        peerConnection.close();
      }
      setPeerConnection(null);
      setDataChannel(null);
      setIsRecording(false);
      
      console.error('Error in handleFinishConversation:', error);
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    if (!dataChannel) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);
        processEvent(event);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    dataChannel.addEventListener("message", handleMessage);
    return () => dataChannel.removeEventListener("message", handleMessage);
  }, [dataChannel]);

  // Modify processEvent function to track transcript
  const processEvent = useCallback((event: RealtimeEvent) => {
    processTranscriptEvent(event, setInterview);
  }, []);

  // Immediately request mic access after page load to reduce error state chances.
  useEffect(() => {
    if (!didRequestInitialMic) {
      didRequestInitialMic = true;
      requestMicrophoneAccess();
    }
  }, []);

  // Proactively starting RTC session if possible.
  useEffect(() => {
    const startRTConnection = async () => {
    if (localStream && session_id && !localStreamInitialized && !peerConnection) {
        // start new converstaion 
        if (localStream) {
          const pc = new RTCPeerConnection();
          const { dataChannel } = await startRealtimeSession(pc, session_id);
          [...pc.getSenders(), ...pc.getReceivers()]
          .forEach(transceiver => {
            if (transceiver.track) {
              transceiver.track.enabled = false;
            }
            });
          setPeerConnection(pc);
          setDataChannel(dataChannel);
        }

        localStreamInitialized = true;
      }
    }
    startRTConnection();
  }, [localStream]);

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setMicrophoneState({ 
            isBlocked: true, 
            errorMessage: 'Microphone access was denied. Please allow microphone access to use this feature.' 
          });
        } else if (err.name === 'NotFoundError') {
          setMicrophoneState({ 
            isBlocked: true, 
            errorMessage: 'No microphone found. Please connect a microphone and try again.' 
          });
        } else {
          setMicrophoneState({ 
            isBlocked: true, 
            errorMessage: 'An error occurred while accessing the microphone. Please try again.' 
          });
        }
      }
    }
  };

  if (loading) {
    return <div className="dark flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!user || !session_id) {
    return null;
  }

  return (
    // We are forcing dark mode for the simulator.
    <div className="min-h-screen bg-background dark">
      <main className="container mx-auto p-8 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 bg-muted/50 rounded-lg p-4">
          {(localStream || peerConnection) && (
            <>
              {mergedStream && <AudioVisualizer audioStream={mergedStream} />}
            </>
          )}
          {!localStream && !peerConnection && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {microphoneState.errorMessage}
                </p>
                <Button 
                  variant="secondary" 
                  onClick={requestMicrophoneAccess}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="h-[200px] bg-muted/50 mt-8 rounded-lg flex items-center justify-center"> 
          <div className="relative">
            {hasStartedRecording && (
              <div className="absolute -left-20 top-1/2 -translate-y-1/2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`transition-all duration-300 ${
                          isRecording 
                            ? "bg-gray-500 hover:bg-gray-600 h-12 w-12 rounded-full" 
                            : "bg-red-600 hover:bg-red-700 h-12 w-12 rounded-full"
                        }`}
                        onClick={handleRecordingToggle}
                      >
                        {isRecording ? <Pause color="white" fill="white" className="h-5 w-5" /> : <Play color="white" fill="white" className="h-8 w-8" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isRecording ? "Pause Conversation" : "Resume Conversation"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative w-[72px] h-[72px]">
                    <div className="absolute inset-0 rounded-full border-4 border-white" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="default"
                        className={`bg-red-600 hover:bg-red-700 transition-all duration-300 ${
                          hasStartedRecording && !!peerConnection
                            ? "h-10 w-10 rounded-lg" 
                            : "h-16 w-16 rounded-full"
                        }`}
                        onClick={(hasStartedRecording && !!peerConnection) ? handleFinishConversation : handleRecordingToggle}
                        disabled={microphoneState.isBlocked}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!!peerConnection
                      ? "End Conversation" 
                      : "Start Conversation"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main page component
export default function SimulatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background dark">
        <main className="container mx-auto p-8 flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex-1 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Loading...
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    }>
      <SimulatorContent />
    </Suspense>
  );
} 
