import Anthropic from '@anthropic-ai/sdk';
import type { DebateScores, FeedbackApiRequest, FeedbackApiResponse } from '@/types/debate';
import { FEEDBACK_PROMPT } from '@/lib/prompts';

export const maxDuration = 30;

const anthropic = new Anthropic();

function parseScores(text: string): { scores: DebateScores | null; feedback: string } {
  const match = text.match(/\[SCORES\]([\s\S]*?)\[\/SCORES\]/);
  if (!match) {
    return { scores: null, feedback: text.trim() };
  }

  const feedback = text.replace(/\[SCORES\][\s\S]*?\[\/SCORES\]/, '').trim();

  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>;
    const r = Number(parsed.reasoning);
    const p = Number(parsed.persuasion);
    const e = Number(parsed.engagement);

    if (isNaN(r) || isNaN(p) || isNaN(e)) {
      return { scores: null, feedback };
    }

    const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
    return {
      scores: { reasoning: clamp(r), persuasion: clamp(p), engagement: clamp(e) },
      feedback,
    };
  } catch {
    return { scores: null, feedback };
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return Response.json(
      { error: 'Server configuration error: missing API key' },
      { status: 500 },
    );
  }

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
      max_tokens: 300,
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

    const { scores, feedback } = parseScores(textBlock.text);
    const responseBody: FeedbackApiResponse = { feedback, scores };
    return Response.json(responseBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude API';
    console.error('Feedback API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
