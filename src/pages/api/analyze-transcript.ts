import { TranscriptEntry } from '@/types/transcript';
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { transcript } = req.body;

    // Format transcript for analysis
    const formattedTranscript = transcript.map((entry: TranscriptEntry) => 
      `${entry.role}: ${entry.content}`
    ).join('\n');

    const systemPrompt: string = `
      You are evaluating this conversation for the Mom Test. We want feedback for this practice customer interview on how well the interviewer performed a mom test. A good mom test has the following characteristics:
      - Avoids Leading Questions  
      - Focuses on the customer's past instead of hypothetical future behavior  
      - Asks for specifics  
      - Digs deep into motivations of the customers  
      - Listens more than talks  
    
      The goal of your feedback is to make the interviewer better at the Mom Test so when it's done for real, they can get the most value out of those conversations. 
      Give specific actionable insights with examples from the conversations if possible. Don't go point by point on characteristics of a mom test. 
      Instead, give a concise summary with a couple of actionable items if possible.
      Transcript: `;

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest", 
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: formattedTranscript
        }
      ]
    });

    res.status(200).json({ analysis: completion.choices[0].message?.content });
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    res.status(500).json({ error: 'Error analyzing transcript' });
  }
}