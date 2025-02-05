import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const customer_profile = req.query.customer_profile as string;

    if (!OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API key");
    }
    if (!customer_profile) {
      throw new Error("Missing customer profile");
    }
    
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: `Talk quickly, be concise, have a friendly voice, here is your persona. You will be interviewed for the Mom test by our user. They expect you to take up this persona for the interview: ${customer_profile}.`,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
          language: "en"
        }
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in realtime-session:', error);
    res.status(500).json({ error: 'Failed to create realtime session' });
  }
}