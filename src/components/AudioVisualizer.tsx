"use client";

import { useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

interface AudioVisualizerProps {
  audioStream: MediaStream;
}

export default function AudioVisualizer({ audioStream }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    analyzerRef.current = new AudioMotionAnalyzer(containerRef.current, {
      connectSpeakers: false,
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      mode: 4,
      barSpace: .25,
      colorMode: 'gradient',
      fillAlpha: 0.2,
      gradient: 'prism',
      lineWidth: 2,
      mirror: 0,
      minDecibels: -70,
      reflexRatio: .5,
      reflexAlpha: 1,
      roundBars: true,
      showScaleX: false,
      showScaleY: false,
      showPeaks: false,
      showBgColor: false,
      smoothing: .7,
      weightingFilter: 'D',
    });

    return () => {
      analyzerRef.current?.stop();
      analyzerRef.current?.disconnectInput();
      analyzerRef.current?.destroy();
    };
  }, []);

  // Handle audio stream connection
  useEffect(() => {
    if (!analyzerRef.current || !audioStream) return;

    // Disconnect any existing source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Connect new audio stream
    const audioCtx = analyzerRef.current.audioCtx;
    sourceRef.current = audioCtx.createMediaStreamSource(audioStream);
    analyzerRef.current.connectInput(sourceRef.current);
    analyzerRef.current.start();

    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    };
  }, [audioStream]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
    />
  );
} 