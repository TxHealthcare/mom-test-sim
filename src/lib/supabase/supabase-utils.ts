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
  if (error) throw error;
  return data;
}

export async function getCustomerProfileBySessionId(session_id: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('customer_profile')
      .eq('session_id', session_id);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No transcript found for this session ID');
    }
    return data[0].customer_profile;
  } catch (error) {
    console.error('Error in getTranscriptBySessionId:', error);
    throw error;
  }
}
