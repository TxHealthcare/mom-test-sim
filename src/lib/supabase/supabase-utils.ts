import { supabase } from "./client";
import { Transcript } from "../../types/transcript";

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

  const { data, error } = await supabase
    .from('transcripts')
    .upsert(transcriptData)
    .select();

  if (error) throw error;
  return data;
}

export async function fetchInterviews(userId: string) {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
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
