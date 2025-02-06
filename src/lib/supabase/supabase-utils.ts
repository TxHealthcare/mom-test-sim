import { supabase } from "./client";
import { Transcript, EvaluationData } from "../../types/transcript";

const TRUNCATE_LENGTH = 240;

function truncateText(text: string) {
  if (!text) return '';
  if (text.length <= TRUNCATE_LENGTH) return text;
  return text.slice(0, TRUNCATE_LENGTH).trim() + '...';
}

export async function uploadRecordingBlob(blob: Blob, session_id: string): Promise<string> {
  try {
    // Check authentication status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No authenticated session found');
    }

    const fileName = `${session.user.id}/${session_id}.webm`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('mom-test-blobs')
      .upload(fileName, blob, {
        contentType: 'audio/webm',
        upsert: true,
        duplex: 'half'
      });
    
    if (uploadError) {
      console.error('Upload error details:', {
        error: uploadError,
        fileName,
        userId: session.user.id,
        sessionId: session_id
      });
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('mom-test-blobs')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadRecordingBlob:', error);
    throw error;
  }
}

export async function saveTranscript(transcriptData: Partial<Transcript>) {
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No authenticated session found');
  }

  // Ensure evaluation is properly formatted as JSONB if it exists
  const dataToSave = {
    ...transcriptData,
    updated_at: new Date().toISOString(),
    evaluation: transcriptData.evaluation ? transcriptData.evaluation : undefined
  };

  const { data, error } = await supabase
    .from('transcripts')
    .upsert(dataToSave)
    .select();

  if (error) {
    console.error('Error saving transcript:', error);
    throw error;
  }
  return data;
}

export async function fetchInterviews(userId: string) {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data?.map(interview => ({
    ...interview,
    customer_profile_truncated: truncateText(interview.customer_profile),
    customer_profile_full: interview.customer_profile
  }));
}

export async function getCustomerProfileBySessionId(session_id: string): Promise<{ customerProfile: string; learningObjectives: string[] }> {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('customer_profile, objectives')
      .eq('session_id', session_id);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No transcript found for this session ID');
    }
    return { 
      customerProfile: data[0].customer_profile,
      objectives: data[0].objectives || []
    };
  } catch (error) {
    console.error('Error in getTranscriptBySessionId:', error);
    throw error;
  }
}

export async function downloadTranscript(interview: { id: string, entries?: Array<{ role: string, content: string }> }) {
  if (!interview.entries) return;

  const transcriptText = interview.entries
    .map(entry => `${entry.role}: ${entry.content}`)
    .join('\n\n');

  const blob = new Blob([transcriptText], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcript-${interview.id}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadAudio(interview: { session_id: string, id: string }, userId: string) {
  if (!userId) throw new Error('User ID is required');

  const { data, error } = await supabase.storage
    .from('mom-test-blobs')
    .download(`${userId}/${interview.session_id}.webm`);

  if (error) throw error;

  const url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-${interview.id}.webm`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function saveTranscriptEvaluation(session_id: string, evaluationData: EvaluationData) {
  // Get the current user's session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No authenticated session found');
  }

  const { data, error } = await supabase
    .from('transcripts')
    .update({
      evaluation: evaluationData,  // This will be stored as JSONB
      updated_at: new Date().toISOString(),
      user_id: session.user.id  // Include user_id for RLS
    })
    .eq('session_id', session_id)
    .eq('user_id', session.user.id)  // Add user_id check for RLS
    .select('evaluation');

  if (error) {
    console.error('Error saving evaluation:', error);
    throw error;
  }

  return data;
}
