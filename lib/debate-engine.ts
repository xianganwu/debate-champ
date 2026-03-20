import type {
  DebateEntry,
  FeedbackApiResponse,
} from '@/types/debate';

export interface StreamDebateResult {
  readonly fullText: string;
  readonly isComplete: boolean;
}

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

class ClientError extends Error {}

async function fetchWithRetry(
  url: string,
  body: unknown,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) return response;

      const errorData = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      const message = errorData?.error ?? `Request failed with status ${response.status}`;

      // 4xx errors are permanent — fail immediately, don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new ClientError(message);
      }

      // 5xx errors are retriable
      lastError = new Error(message);
    } catch (error) {
      // 4xx errors bubble up immediately
      if (error instanceof ClientError) throw error;

      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

export async function callDebateAPIStreaming(
  messages: readonly DebateEntry[],
  topic: string,
  sparkySide: string,
  round: number,
  onDelta: (text: string) => void,
): Promise<StreamDebateResult> {
  const response = await fetchWithRetry('/api/debate', {
    messages,
    topic,
    sparkySide,
    round,
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let fullText = '';
  let isComplete = false;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6);
      try {
        const event = JSON.parse(json) as
          | { type: 'delta'; text: string }
          | { type: 'done'; text: string; isComplete: boolean }
          | { type: 'error'; error: string };

        if (event.type === 'delta') {
          onDelta(event.text);
        } else if (event.type === 'done') {
          fullText = event.text;
          isComplete = event.isComplete;
        } else if (event.type === 'error') {
          throw new Error(event.error);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return { fullText, isComplete };
}

export async function callFeedbackAPI(
  transcript: readonly DebateEntry[],
): Promise<FeedbackApiResponse> {
  const response = await fetchWithRetry('/api/feedback', { transcript });

  return response.json() as Promise<FeedbackApiResponse>;
}
