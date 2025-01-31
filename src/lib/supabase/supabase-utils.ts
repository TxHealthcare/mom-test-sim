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

    const { data } = await supabase
      .from('transcripts')
      .upsert([transcript])
      .select();

    return data;
  } catch (error) {
    throw error;
  }
}
