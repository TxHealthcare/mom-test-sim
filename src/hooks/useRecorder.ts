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
  stopRecording: () => Promise<void>;
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
    if (!recorderRef.current) return;

    try {
      await recorderRef.current.stopRecording();
      const blob = await recorderRef.current.getBlob();
      
      const url = URL.createObjectURL(blob);

      // TODO: This is temporary. We need to actually send this blob to the server instead
      // of just downloading it. 
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'conversation.webm';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      recorderRef.current = null;
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  return {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
} 