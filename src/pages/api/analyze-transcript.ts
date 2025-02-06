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
    const { transcript, session_id, customer_profile, learningObjectives } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!transcript || !customer_profile) {
      return res.status(400).json({ error: 'Transcript and customer profile are required' });
    }

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
    `;

    const rubricSystemPrompt: string = `
      You are evaluating conversations for the mom test. We have the following rubric to evaluate against. Each big question the user is trying to have answered should be individually graded by this rubric from 1-5. Give logic and reasoning before giving the grade. Be a really tough grader. 
      
      Eval Rubric:
      1 - The interviewer completely missed addressing this question. There was no attempt to explore the topic during the conversation, resulting in no useful insights or actionable takeaways related to this goal.
      3- The interviewer initiated a conversation about this question and gained a basic understanding of the user's perspective. While some actionable takeaways were gathered, the interviewer did not ask follow-up questions or probe deeply enough to uncover substantial or nuanced insights.
      5 - The interviewer effectively addressed this question, uncovering deep insights through thoughtful questioning and follow-up. The insights gathered provided actionable and highly relevant data that can directly inform the business or product decision-making process.
    `;

    const prompt = `
      Persona Interviewed:
      ${customer_profile}
      
      Learning Objectives:
      ${learningObjectives?.join('\n') || 'No specific learning objectives provided'}
      
      Transcript:
      ${formattedTranscript}
    `;

    // Run both analyses in parallel
    const [generalAnalysis, rubricAnalysis] = await Promise.all([
      openai.chat.completions.create({
        model: "chatgpt-4o-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      }),
      openai.chat.completions.create({
        model: "chatgpt-4o-latest",
        messages: [
          { role: "system", content: rubricSystemPrompt },
          { role: "user", content: prompt }
        ]
      })
    ]);

    const evaluationData = {
      generalAnalysis: generalAnalysis.choices[0].message?.content || null,
      rubricAnalysis: rubricAnalysis.choices[0].message?.content || null,
      evaluatedAt: new Date().toISOString()
    };

    // Return the evaluation data to be saved by the client
    res.status(200).json(evaluationData);
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    res.status(500).json({ error: 'Error analyzing transcript' });
  }
}