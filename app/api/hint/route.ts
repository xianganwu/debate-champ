import Anthropic from '@anthropic-ai/sdk';
import type { HintApiRequest, HintApiResponse } from '@/types/debate';
import { HINT_PROMPT } from '@/lib/prompts';

export const maxDuration = 15;

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return Response.json(
      { error: 'Server configuration error: missing API key' },
      { status: 500 },
    );
  }

  const body = (await request.json()) as HintApiRequest;

  const { topic, studentSide, round, transcript, difficulty } = body;

  if (!topic || !studentSide || !round) {
    return Response.json(
      { error: 'Missing required fields: topic, studentSide, round' },
      { status: 400 },
    );
  }

  try {
    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 60,
      messages: [
        {
          role: 'user',
          content: HINT_PROMPT(topic, studentSide, round, transcript ?? [], difficulty),
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

    const responseBody: HintApiResponse = { hint: textBlock.text.trim() };
    return Response.json(responseBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude API';
    console.error('Hint API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
