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

export interface Interview {
  id: string;
  user_id: string;
  session_id: string;
  customer_profile: string;
  objectives: string[];
  recording_blob_url?: string;
  evaluation?: EvaluationData;
  entries?: Array<TranscriptEntry>;
  created_at: string;
  updated_at: string;
}