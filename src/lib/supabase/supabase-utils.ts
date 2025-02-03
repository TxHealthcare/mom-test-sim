import { supabase } from "./client";
import type { Transcript } from "@/types/transcript";

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
