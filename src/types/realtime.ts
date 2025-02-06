export interface RealtimeEvent {
  type: string;
  response?: {
    modalities: string[];
    instructions: string;
    content?: string;
  };
  event_id?: string;
  response_id?: string;
  delta?: string;
  audio_data?: Uint8Array;
  transcript?: string;
  input_audio_transcription?: string;
  text?: string;
  output?: Array<{
    content: Array<{
      type: string;
      transcript?: string;
    }>;
  }>;
  [key: string]: unknown;
}