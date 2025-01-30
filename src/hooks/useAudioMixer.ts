import { useEffect, useRef, useState } from 'react';

export class AudioMixer {
  private audioContext: AudioContext;
  private merger: ChannelMergerNode;
  private destination: MediaStreamAudioDestinationNode;
  private activeSources: MediaStreamAudioSourceNode[] = [];

  constructor() {
    this.audioContext = new AudioContext();
    this.merger = this.audioContext.createChannelMerger(2);
    this.destination = this.audioContext.createMediaStreamDestination();
    this.merger.connect(this.destination);
  }

  public getMergedStream(): MediaStream {
    return this.destination.stream;
  }

  public addTrack(track: MediaStreamTrack) {
    const stream = new MediaStream([track]);
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.merger);
    this.activeSources.push(source);
  }

  public reset() {
    this.activeSources.forEach(source => source.disconnect());
    this.activeSources = [];
  }

  public destroy() {
    this.reset();
    this.merger.disconnect();
    this.audioContext.close();
  }
}

interface UseAudioMixerProps {
  peerConnection?: RTCPeerConnection;
  localStream?: MediaStream;
  isRecording: boolean;
}

export function useAudioMixer({ 
  peerConnection, 
  localStream, 
  isRecording 
}: UseAudioMixerProps): MediaStream | null {
  const mixerRef = useRef<AudioMixer | null>(null);
  const [mergedStream, setMergedStream] = useState<MediaStream | null>(null);

  // Initialize mixer
  useEffect(() => {
    mixerRef.current = new AudioMixer();
    return () => {
      mixerRef.current?.destroy();
      mixerRef.current = null;
    };
  }, []);

  // Handle audio mixing
  useEffect(() => {
    if (!mixerRef.current) return;

    // Reset current connections
    mixerRef.current.reset();

    if (isRecording && peerConnection) {
      // Connect RTC tracks
      const connectTrack = (track: MediaStreamTrack) => {
        if (track.kind === 'audio') {
          mixerRef.current?.addTrack(track);
        }
      };

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

      peerConnection.addEventListener('track', handleTrack);
      
      // Update merged stream
      setMergedStream(mixerRef.current.getMergedStream());

      return () => {
        peerConnection.removeEventListener('track', handleTrack);
      };
    } else if (!isRecording && localStream) {
      // Connect local stream only
      localStream.getAudioTracks().forEach(track => {
        mixerRef.current?.addTrack(track);
      });

      // Update merged stream
      setMergedStream(mixerRef.current.getMergedStream());
    } else {
      setMergedStream(null);
    }
  }, [isRecording, peerConnection, localStream]);

  return mergedStream;
} 