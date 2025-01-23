"use client";

import { useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

export default function AudioVisualizer({ audioStream }: { audioStream: MediaStream }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!containerRef.current || !audioStream) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // TODO: Style the config better.
    analyzerRef.current = new AudioMotionAnalyzer(containerRef.current, {
      audioCtx: audioContextRef.current,
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      mode: 3,
      smoothing: 0.7,
      gradient: 'prism',
      colorMode: 'gradient',
      minDecibels: -80,
      maxDecibels: 0,
      mirror: 1,
      showScaleX: false,
      showScaleY: false,
      showPeaks: false,
      maxFreq: 16000,
      minFreq: 20,
      showBgColor: false,
      overlay: true,
      lineWidth: 2,
      fillAlpha: 0.2,
      reflexRatio: 0.1,
      radial: false,
      roundBars: true,
    });

    // Create and connect the audio source
    const source = audioContextRef.current.createMediaStreamSource(audioStream);
    analyzerRef.current.connectInput(source);
    analyzerRef.current.start();

    return () => {
      analyzerRef.current?.stop();
      analyzerRef.current?.disconnectInput();
      analyzerRef.current?.destroy();
      audioContextRef.current?.close();
    };
  }, [audioStream]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
    />
  );
} 