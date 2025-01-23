"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';

const AudioVisualizer = dynamic(() => import('@/components/AudioVisualizer'), {
  ssr: false
});

export default function SimulatorPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
        setAudioStream(stream);
        })
        .catch(err => console.error('Error accessing microphone:', err));
  }, []);

  return (
    // We are forcing dark mode for the simulator.
    <div className="min-h-screen bg-background dark">
      <main className="container mx-auto p-8 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 bg-muted/50 rounded-lg p-4">
          {audioStream && <AudioVisualizer audioStream={audioStream} />}
          {/* TODO: Add better error handeling for when audio permissions are revoked. Currently page crashes. */}
          {!audioStream && <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No audio stream available</p>
          </div>}
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
                    onClick={() => setIsRecording(!isRecording)}
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