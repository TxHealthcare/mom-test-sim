export interface TranscriptEntry {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}
  
export interface Transcript {
    id: string;
    user_id: string;
    session_id: string;
    entries: TranscriptEntry[];
    created_at: string;
    updated_at: string;
}
  