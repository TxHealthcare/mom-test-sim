import { Interview, TranscriptEntry } from "@/types/interview";
import { RealtimeEvent } from "@/types/realtime";

export const processTranscriptEvent = (
  event: RealtimeEvent,
  setInterview: React.Dispatch<React.SetStateAction<Interview | null>>
) => {
  if (event.input_audio_transcription) {
    addTranscriptEntry(setInterview, {
      role: 'user',
      content: event.input_audio_transcription,
      timestamp: Date.now()
    });
  }

  if (event?.output?.[0]?.content?.[0]?.transcript) {
    addTranscriptEntry(setInterview, {
      role: 'assistant',
      content: event.output[0].content[0].transcript,
      timestamp: Date.now()
    });
  }

  if (event.transcript) {
    addTranscriptEntry(setInterview, {
      role: event.type.includes('input') ? 'user' : 'assistant',
      content: event.transcript,
      timestamp: Date.now()
    });
  }

  if (event.text) {
    addTranscriptEntry(setInterview, {
      role: event.type.includes('input') ? 'user' : 'assistant',
      content: event.text,
      timestamp: Date.now()
    });
  }
};

const addTranscriptEntry = (
  setInterview: React.Dispatch<React.SetStateAction<Interview | null>>,
  entry: TranscriptEntry
) => {
  setInterview(prev => ({
    ...prev,
    entries: [...(prev?.entries || []), entry]
  }));
}; 