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
  const [isRecording, setIsRecording] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>({ 
    isBlocked: false, 
  });

  const handleRecordingToggle = async () => {
    if (!isRecording) {
        if (peerConnection) {
          // TODO: if we already have a peer connection we are resuming a recording. Add handlers for pausing and resuming session.
          const { dataChannel } = await startRealtimeSession(peerConnection);
          setDataChannel(dataChannel);
        } else {
          const pc = new RTCPeerConnection();
          setPeerConnection(pc);
          const { dataChannel } = await startRealtimeSession(pc);
          setDataChannel(dataChannel);
        }
        setIsRecording(true);
    } else if (peerConnection) {
      endRealtimeSession(peerConnection, dataChannel);
      setPeerConnection(null);
      setDataChannel(null);
      setIsRecording(false);
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
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneState({ isBlocked: false });
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
          {peerConnection && !microphoneState.isBlocked && <AudioVisualizer peerConnection={peerConnection} />}
          {!peerConnection && microphoneState.isBlocked && (
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className={`bg-accent hover:bg-accent/90 transition-all duration-300 ${isRecording ? "h-12 w-12 rounded-lg" : "h-16 w-16 rounded-full"}`}
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
        </div>
      </main>
    </div>
  );
} 