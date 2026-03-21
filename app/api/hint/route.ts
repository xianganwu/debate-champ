import Anthropic from '@anthropic-ai/sdk';
import type { HintApiRequest, HintApiResponse } from '@/types/debate';
import { HINT_PROMPT } from '@/lib/prompts';
import { checkTopicAppropriateness } from '@/lib/topic-filter';

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

  // Server-side guardrails — prevent abuse via direct API calls
  if (topic.length > 200) {
    return Response.json({ error: 'Topic text too long' }, { status: 400 });
  }
  if (Array.isArray(transcript) && transcript.length > 10) {
    return Response.json({ error: 'Too many transcript entries' }, { status: 400 });
  }
  if (Array.isArray(transcript) && transcript.some((e) => typeof e.text !== 'string' || e.text.length > 2000)) {
    return Response.json({ error: 'Transcript entry too long' }, { status: 400 });
  }
  const topicWarning = checkTopicAppropriateness(topic);
  if (topicWarning) {
    return Response.json({ error: 'Topic not appropriate for debate practice' }, { status: 400 });
  }

  try {
    // Haiku is optimal for hints — generates a single 15-word sentence.
    // Lower cost (~10×) and lower latency than Sonnet, identical quality for this task.
    const result = await anthropic.messages.create({
      model: 'claude-haiku-3-5-20241022',
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
