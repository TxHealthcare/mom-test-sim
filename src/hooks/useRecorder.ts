import { useRef } from 'react';
import type { RecordRTCPromisesHandler as RecordRTCType } from 'recordrtc';

let RecordRTC: typeof RecordRTCType;
if (typeof window !== 'undefined') {
  RecordRTC = require('recordrtc').RecordRTCPromisesHandler;
}

interface UseRecorderProps {
  stream: MediaStream | null;
}

interface UseRecorderReturn {
  startRecording: () => void;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  isRecorderInitialized: () => boolean;
}

export function useRecorder({ stream }: UseRecorderProps): UseRecorderReturn {
  const recorderRef = useRef<RecordRTCType | null>(null);

  const startRecording = () => {
    if (!stream) return;

    try {
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        numberOfAudioChannels: 2,
      });

      recorderRef.current.startRecording();
      console.log('Started recording conversation');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const pauseRecording = async () => {
    if (!recorderRef.current) return;
    await recorderRef.current.pauseRecording();
    console.log('Paused recording conversation');
  };

  const resumeRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.resumeRecording();
    console.log('Resumed recording conversation');
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return null;

    try {
      await recorderRef.current.stopRecording();
      const blob = await recorderRef.current.getBlob();
      recorderRef.current = null;
      return blob;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  };

  const isRecorderInitialized = () => {
    return !!recorderRef.current;
  };

  return {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isRecorderInitialized,
  };
} 