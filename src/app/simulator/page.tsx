"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';
import { startRealtimeSession, endRealtimeSession } from "./realtime-session-manager";
import { Check } from "lucide-react";

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

export default function SimulatorPage() {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>({ 
    isBlocked: false, 
  });
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

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

    if (!isRecording) {
      if (peerConnection) {
        // Resume conversation
        toggleTracks(true);
        setIsRecording(true);
      } else if (!peerConnection && !hasStartedRecording) {
        // Start conversation
        const pc = new RTCPeerConnection();
        setPeerConnection(pc);
        const { dataChannel } = await startRealtimeSession(pc);
        setDataChannel(dataChannel);
        setHasStartedRecording(true);
        setIsRecording(true);
      } else {
        console.error("Error starting recording");
      }
    } else if (peerConnection) {
      // Pause conversation
      toggleTracks(false);
      setIsRecording(false);
    }
  }

  const handleFinishConversation = () => {
    if (peerConnection) {
      endRealtimeSession(peerConnection, dataChannel);
      setPeerConnection(null);
      setDataChannel(null);
      setIsRecording(false);
    } else {
      console.error("No peer connection found");
    }
  }

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

  const processEvent = (event: RealtimeEvent) => {
    console.log('Processing event:', event.type, event);
  }

  // Immediately request mic access after page load to reduce error state chances.
  useEffect(() => {
    requestMicrophoneAccess();
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

  return (
    // We are forcing dark mode for the simulator.
    <div className="min-h-screen bg-background dark">
      <main className="container mx-auto p-8 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 bg-muted/50 rounded-lg p-4">
          {(localStream || peerConnection) && 
            <AudioVisualizer 
              peerConnection={peerConnection ?? undefined} 
              localStream={localStream ?? undefined} 
              isRecording={isRecording}
            />
          }
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
        <div className="h-[200px] bg-muted/50 mt-8 rounded-lg flex items-center justify-between px-8"> 
          <div className="flex-1" /> {/* Spacer */}
          <div className="flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className={`bg-red-600 hover:bg-red-700 transition-all duration-300 ${isRecording ? "h-12 w-12 rounded-lg" : "h-16 w-16 rounded-full"}`}
                    onClick={handleRecordingToggle}
                    disabled={microphoneState.isBlocked}
                  >
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRecording ? "Stop Conversation" : "Start Conversation"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex-1 flex justify-end">
            {hasStartedRecording && !isRecording && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-accent hover:bg-accent/90 h-12 w-12 rounded-full"
                      onClick={handleFinishConversation}
                    >
                      <Check className="h-20 w-20 text-accent-foreground" strokeWidth={5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Finish Conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 
