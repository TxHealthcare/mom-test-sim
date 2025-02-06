export interface TranscriptEntry {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface EvaluationData {
    generalAnalysis: string | null;
    rubricAnalysis: string | null;
    evaluatedAt: string;
}
  
export interface Transcript {
    id: string;
    user_id: string;
    session_id: string;
    entries: TranscriptEntry[];
    created_at: string;
    updated_at: string;
    evaluation?: EvaluationData;
    recording_blob_url?: string;
    customer_profile?: string;
}
  