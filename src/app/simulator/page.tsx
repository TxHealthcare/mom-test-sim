"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4} from "uuid";
import { saveTranscript, uploadRecordingBlob } from "@/lib/supabase/supabase-utils";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TranscriptEntry } from "@/types/transcript";
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

const AudioVisualizer = dynamic(() => import('@/components/AudioVisualizer'), {
  ssr: false
});

interface RealtimeEvent {
  type: string;
  response?: {
    modalities: string[];
    instructions: string;
    content?: string;
  };
  event_id?: string;
  response_id?: string;
  delta?: string;
  audio_data?: Uint8Array;
  transcript?: string;
  input_audio_transcription?: string;
  text?: string;
  output?: Array<{
    content: Array<{
      type: string;
      transcript?: string;
    }>;
  }>;
  [key: string]: unknown;
}

interface MicrophoneState {
  isBlocked: boolean;
  errorMessage?: string;
}

let didRequestInitialMic = false;

// Component that uses useSearchParams
function SimulatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session_id = searchParams?.get('session_id') ?? null;
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
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
    stopRecording
  } = useRecorder({
    stream: mergedStream
  });

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
        if (peerConnection && hasStartedRecording) {
          // Resume conversation
          toggleTracks(true);
          await resumeRecording();
          setIsRecording(true);
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
        entries: transcript,
        updated_at: currentTime
      };

      // Save initial transcript data
      await saveTranscript(transcriptData);
      
      // Redirect to dashboard immediately
      router.push('/dashboard');
      
      // Process the rest in the background
      Promise.all([
        // Upload recording
        uploadRecordingBlob(blob, session_id)
          .then(publicUrl => {
            const updatedTranscriptData = {
              ...transcriptData,
              recording_blob_url: publicUrl,
            };
            return saveTranscript(updatedTranscriptData);
          })
          .catch(error => console.error('Error saving transcript:', error)),

        // Run analysis in parallel
        fetch('/api/analyze-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        })
          .then(res => res.json())
          .then(analysis => console.log('Transcript analysis:', analysis))
          .catch(error => console.error('Error analyzing transcript:', error))
      ]).catch(error => {
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
    // Track user input from audio transcription
    if (event.input_audio_transcription) {
      const userEntry: TranscriptEntry = {
        role: 'user',
        content: event.input_audio_transcription,
        timestamp: Date.now()
      };
      setTranscript(prev => [...prev, userEntry]);
    }

    // Track assistant responses
    if (event?.output?.[0]?.content?.[0]?.transcript) {
      const assistantEntry: TranscriptEntry = {
        role: 'assistant',
        content: event.output[0].content[0].transcript,
        timestamp: Date.now()
      };
      setTranscript(prev => [...prev, assistantEntry]);
    }

    // Additional transcript checks
    if (event.transcript) {
      const entry: TranscriptEntry = {
        role: event.type.includes('input') ? 'user' : 'assistant',
        content: event.transcript,
        timestamp: Date.now()
      };
      setTranscript(prev => [...prev, entry]);
    }

    // Check for text field
    if (event.text) {
      const entry: TranscriptEntry = {
        role: event.type.includes('input') ? 'user' : 'assistant',
        content: event.text,
        timestamp: Date.now()
      };
      setTranscript(prev => [...prev, entry]);
    }
  }, []);

  // Immediately request mic access after page load to reduce error state chances.
  useEffect(() => {
    if (!didRequestInitialMic) {
      didRequestInitialMic = true;
      requestMicrophoneAccess();
    }
  }, []);

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

  // Redirect if no session_id
  useEffect(() => {
    if (!session_id) {
      router.push('/simulator-onboarding');
      return;
    }
  }, [session_id, router]);

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
                          !!peerConnection
                            ? "h-10 w-10 rounded-lg" 
                            : "h-16 w-16 rounded-full"
                        }`}
                        onClick={!!peerConnection ? handleFinishConversation : handleRecordingToggle}
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
