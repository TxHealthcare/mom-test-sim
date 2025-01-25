"use client";

import { RefObject, useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

interface AudioVisualizerProps {
  peerConnection: RTCPeerConnection;
}

export default function AudioVisualizer({ peerConnection }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize analyzer first to use its AudioContext
    analyzerRef.current = new AudioMotionAnalyzer(containerRef.current, {
      connectSpeakers: false,
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      mode: 3,
      gradient: 'prism',
      colorMode: 'gradient',
      mirror: 1,
      minDecibels: -70,
      showScaleX: false,
      showScaleY: false,
      showPeaks: false,
      showBgColor: false,
      lineWidth: 2,
      fillAlpha: 0.2,
      radial: false,
      roundBars: true,
    });

    // Get the AudioContext from the analyzer
    const audioCtx = analyzerRef.current.audioCtx;
    
    // Create a merger node to combine all audio streams
    mergerRef.current = audioCtx.createChannelMerger(2);

    // Connect the merger to the analyzer
    analyzerRef.current.connectInput(mergerRef.current);
    analyzerRef.current.start();

    return () => {
      analyzerRef.current?.stop();
      analyzerRef.current?.disconnectInput();
      analyzerRef.current?.destroy();
    };
  }, [peerConnection]);

  // Handle track changes
  useEffect(() => {
    if (!analyzerRef.current || !mergerRef.current) return;

    const audioCtx = analyzerRef.current.audioCtx;

    // Connect all current tracks
    const connectTrack = (track: MediaStreamTrack) => {
      if (track.kind === 'audio') {
        const stream = new MediaStream([track]);
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(mergerRef.current!);
      }
    };

    // Connect existing tracks
    peerConnection.getSenders().forEach(sender => {
      if (sender.track) connectTrack(sender.track);
    });

    peerConnection.getReceivers().forEach(receiver => {
      if (receiver.track) connectTrack(receiver.track);
    });

    // Handle new tracks
    const handleTrack = (event: RTCTrackEvent) => {
      connectTrack(event.track);
    };

    const handleNegotiation = () => {
      // Reconnect all current tracks
      peerConnection?.getSenders().forEach(sender => {
        if (sender.track) connectTrack(sender.track);
      });
    };

    peerConnection.ontrack = handleTrack;
    peerConnection.onnegotiationneeded = handleNegotiation;

    // Debug logging
    console.log('Audio tracks:', {
      senders: peerConnection.getSenders().length,
      receivers: peerConnection.getReceivers().length
    });
  }, [peerConnection, peerConnection?.getSenders().length]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
    />
  );
} 