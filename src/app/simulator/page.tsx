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

export default function SimulatorPage() {
  const peerConnection = useRef<RTCPeerConnection>(new RTCPeerConnection());
  const [isRecording, setIsRecording] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>("Enable your microphone to start recording");

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      peerConnection.current.addTrack(stream.getTracks()[0]);
      setPermissionError(null);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setPermissionError('Microphone access was denied. Please allow microphone access to use this feature.');
        } else if (err.name === 'NotFoundError') {
          setPermissionError('No microphone found. Please connect a microphone and try again.');
        } else {
          setPermissionError('An error occurred while accessing the microphone. Please try again.');
        }
      }
    }
  };

  const handleRecordingToggle = async () => {
    if (!isRecording) {
      if (!peerConnection.current.getSenders().length) {
        await requestMicrophoneAccess();
        return;
      }
      const { dataChannel } = await startRealtimeSession(peerConnection);
      setDataChannel(dataChannel);
      setIsRecording(true);
    } else {
      endRealtimeSession(peerConnection.current, dataChannel);
      setDataChannel(null);
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        endRealtimeSession(peerConnection.current, dataChannel);
      }
    };
  }, [peerConnection, dataChannel]);

  return (
    // We are forcing dark mode for the simulator.
    <div className="min-h-screen bg-background dark">
      <main className="container mx-auto p-8 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 bg-muted/50 rounded-lg p-4">
          {/* TODO: audio from LLM is not being visualized in the Audio Visualizer */}
          {!permissionError && <AudioVisualizer peerConnection={peerConnection} />}
          {permissionError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {permissionError}
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