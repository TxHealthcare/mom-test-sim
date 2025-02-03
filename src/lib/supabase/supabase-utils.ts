import { supabase } from "./client";
import { Transcript } from "../../types/transcript";

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
