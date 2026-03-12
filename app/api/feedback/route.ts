import Anthropic from '@anthropic-ai/sdk';
import type { FeedbackApiRequest, FeedbackApiResponse } from '@/types/debate';
import { FEEDBACK_PROMPT } from '@/lib/prompts';

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as FeedbackApiRequest;

  const { transcript } = body;

  if (!transcript || transcript.length === 0) {
    return Response.json(
      { error: 'Missing required field: transcript' },
      { status: 400 },
    );
  }

  try {
    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: FEEDBACK_PROMPT(transcript),
        },
      ],
    });

    const textBlock = result.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json(
        { error: 'No text response from Claude' },
        { status: 502 },
      );
    }

    const responseBody: FeedbackApiResponse = {
      feedback: textBlock.text.trim(),
      score: 0,
    };
    return Response.json(responseBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude API';
    console.error('Feedback API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
