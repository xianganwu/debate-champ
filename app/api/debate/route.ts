import Anthropic from '@anthropic-ai/sdk';
import type { DebateApiRequest, DebateApiResponse } from '@/types/debate';
import { SPARKY_SYSTEM_PROMPT, buildConversationHistory } from '@/lib/prompts';

const DEBATE_COMPLETE_TAG = '[DEBATE_COMPLETE]';

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as DebateApiRequest;

  const { messages, topic, sparkySide, round } = body;

  if (!topic || !sparkySide || !round || !messages) {
    return Response.json(
      { error: 'Missing required fields: messages, topic, sparkySide, round' },
      { status: 400 },
    );
  }

  try {
    const conversationHistory = buildConversationHistory(messages);

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: SPARKY_SYSTEM_PROMPT(topic, sparkySide),
      messages: conversationHistory,
    });

    const textBlock = result.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json(
        { error: 'No text response from Claude' },
        { status: 502 },
      );
    }

    const rawText = textBlock.text;
    const isComplete = rawText.includes(DEBATE_COMPLETE_TAG);
    const response = rawText.replace(DEBATE_COMPLETE_TAG, '').trim();

    const responseBody: DebateApiResponse = { response, isComplete };
    return Response.json(responseBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude API';
    console.error('Debate API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
