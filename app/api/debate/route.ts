import Anthropic from '@anthropic-ai/sdk';
import type { DebateApiRequest } from '@/types/debate';
import { SPARKY_SYSTEM_PROMPT, buildConversationHistory } from '@/lib/prompts';

export const maxDuration = 30;

const DEBATE_COMPLETE_TAG = '[DEBATE_COMPLETE]';

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return Response.json(
      { error: 'Server configuration error: missing API key' },
      { status: 500 },
    );
  }

  const body = (await request.json()) as DebateApiRequest;

  const { messages, topic, sparkySide, round, difficulty } = body;

  if (!topic || !sparkySide || !round || !messages) {
    return Response.json(
      { error: 'Missing required fields: messages, topic, sparkySide, round' },
      { status: 400 },
    );
  }

  // Server-side guardrails — prevent abuse via direct API calls
  if (topic.length > 200) {
    return Response.json({ error: 'Topic text too long' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length > 10) {
    return Response.json({ error: 'Too many messages' }, { status: 400 });
  }
  if (messages.some((m) => typeof m.text !== 'string' || m.text.length > 2000)) {
    return Response.json({ error: 'Message text too long' }, { status: 400 });
  }

  try {
    const conversationHistory = buildConversationHistory(messages);

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      system: SPARKY_SYSTEM_PROMPT(topic, sparkySide, round, difficulty),
      messages: conversationHistory,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = '';

        stream.on('text', (text) => {
          fullText += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`));
        });

        stream.on('end', () => {
          const isComplete = fullText.includes(DEBATE_COMPLETE_TAG);
          const cleaned = fullText.replace(DEBATE_COMPLETE_TAG, '').trim();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', text: cleaned, isComplete })}\n\n`),
          );
          controller.close();
        });

        stream.on('error', (error) => {
          const message = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`),
          );
          controller.close();
        });
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude API';
    console.error('Debate API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
