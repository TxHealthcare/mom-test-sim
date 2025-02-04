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

export async function saveTranscript(transcript: Transcript) {
  console.log('Attempting to save transcript:', {
    id: transcript.id,
    user_id: transcript.user_id,
    session_id: transcript.session_id,
    entriesCount: transcript.entries.length
  });

  try {
    // Check authentication status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No authenticated session found');
    }

    // Ensure user_id matches the authenticated user
    if (transcript.user_id !== session.user.id) {
      throw new Error('User ID mismatch with authenticated user');
    }

    const { data, error } = await supabase
      .from('transcripts')
      .upsert([transcript])
      .select();

    if (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveTranscript:', error);
    throw error;
  }
}
