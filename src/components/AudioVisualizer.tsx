"use client";

import { RefObject, useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

interface AudioVisualizerProps {
  peerConnection?: RTCPeerConnection;
  localStream?: MediaStream;
  isRecording: boolean;
}

export default function AudioVisualizer({ peerConnection, localStream, isRecording }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<AudioMotionAnalyzer | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
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
  }, []);

  // Handle audio source switching based on isRecording state
  useEffect(() => {
    if (!analyzerRef.current || !mergerRef.current) return;

    // Disconnect any existing source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    const audioCtx = analyzerRef.current.audioCtx;

    if (isRecording && peerConnection) {
      // Connect RTC tracks
      const connectTrack = (track: MediaStreamTrack) => {
        if (track.kind === 'audio') {
          const stream = new MediaStream([track]);
          sourceRef.current = audioCtx.createMediaStreamSource(stream);
          sourceRef.current.connect(mergerRef.current!);
        }
      };

      peerConnection.getSenders().forEach(sender => {
        if (sender.track) connectTrack(sender.track);
      });

      peerConnection.getReceivers().forEach(receiver => {
        if (receiver.track) connectTrack(receiver.track);
      });

      const handleTrack = (event: RTCTrackEvent) => {
        connectTrack(event.track);
      };

      peerConnection.ontrack = handleTrack;

      return () => {
        peerConnection.ontrack = null;
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
      };
    } else if (!isRecording && localStream) {
      // Connect local stream
      sourceRef.current = audioCtx.createMediaStreamSource(localStream);
      sourceRef.current.connect(mergerRef.current);

      return () => {
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
      };
    }
  }, [isRecording, peerConnection, localStream]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
    />
  );
} 