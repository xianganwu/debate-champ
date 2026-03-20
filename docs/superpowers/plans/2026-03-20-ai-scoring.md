# AI-Powered Debate Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the word-count scoring heuristic with Claude-evaluated scores across 3 categories (Reasoning, Persuasion, Engagement), piggybacked onto the existing feedback API call.

**Architecture:** The feedback prompt is updated to request a `[SCORES]` JSON block alongside conversational feedback. The API route parses and validates scores, returning them in the response. The Zustand store holds scores, the results page renders a category breakdown. The old heuristic is kept as a fallback.

**Tech Stack:** Next.js, TypeScript, Anthropic SDK, Zustand, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-20-ai-scoring-design.md`

---

### Task 1: Add DebateScores type and update FeedbackApiResponse

**Files:**
- Modify: `types/debate.ts`

- [ ] **Step 1: Add DebateScores interface and update types**

Add `DebateScores` interface and update `FeedbackApiResponse` and `DebateState`:

```typescript
// Add after DebateEntry interface
export interface DebateScores {
  readonly reasoning: number;
  readonly persuasion: number;
  readonly engagement: number;
}
```

In `DebateState`, add after the `feedback` field:
```typescript
  scores: DebateScores | null;
```

Add after the `setFeedback` action:
```typescript
  setScores: (scores: DebateScores | null) => void;
```

Update `FeedbackApiResponse`:
```typescript
export interface FeedbackApiResponse {
  readonly feedback: string;
  readonly scores: DebateScores | null;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Build fails (store doesn't implement `scores`/`setScores` yet) — that's fine, confirms types are syntactically correct.

- [ ] **Step 3: Commit**

```bash
git add types/debate.ts
git commit -m "feat: add DebateScores type and update FeedbackApiResponse"
```

---

### Task 2: Update Zustand store with scores field

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Add scores to INITIAL_STATE and store actions**

In `INITIAL_STATE`, add after the `feedback` line:
```typescript
  scores: null as DebateScores | null,
```

Add the `setScores` action after `setFeedback`:
```typescript
  setScores: (scores: DebateScores | null) => set({ scores }),
```

Update the import to include `DebateScores`:
```typescript
import type { DebateEntry, DebateSide, DebateScores, DebateState, Topic, TurnState } from '@/types/debate';
```

Note: `resetDebate` and `startNewDebate` already spread `INITIAL_STATE` which now includes `scores: null`, so they automatically clear scores.

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Compiled successfully (store now satisfies the updated `DebateState` interface).

- [ ] **Step 3: Commit**

```bash
git add lib/store.ts
git commit -m "feat: add scores field and setScores action to debate store"
```

---

### Task 3: Update feedback prompt to request scores with full transcript

**Files:**
- Modify: `lib/prompts.ts`

- [ ] **Step 1: Rewrite FEEDBACK_PROMPT**

Replace the `FEEDBACK_PROMPT` function with:

```typescript
export const FEEDBACK_PROMPT = (transcript: readonly DebateEntry[]): string => {
  const formatted = transcript
    .map((e) => {
      const label = e.speaker === 'student' ? 'Student' : 'Sparky';
      return `[Round ${e.round}] ${label}: ${e.text}`;
    })
    .join('\n\n');

  return `
You are Sparky, wrapping up a debate practice session with a 5th grade student.

Here is the full debate transcript:
${formatted}

First, score the student's performance in these 3 categories (1-5 each):
- Reasoning: Did they give reasons and evidence?
- Persuasion: Was their argument convincing and well-structured?
- Engagement: Did they respond to your points rather than ignoring them?

Return scores in EXACTLY this format on its own line:
[SCORES]{"reasoning": 3, "persuasion": 4, "engagement": 2}[/SCORES]

Then give feedback in this EXACT format:
1. Start with genuine excitement about something specific they did well (1-2 sentences)
2. Give a second specific compliment about their argument or style (1-2 sentences)
3. Give ONE actionable tip for next time, framed positively (1-2 sentences)
4. End with an encouraging sign-off that makes them want to debate again

Keep the feedback under 100 words. Use casual, enthusiastic language.
`;
};
```

Key changes:
- Full transcript (both student and Sparky) instead of student-only — needed for Engagement scoring
- Adds scoring instructions with an example of the exact `[SCORES]...[/SCORES]` format
- Feedback instructions unchanged

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts
git commit -m "feat: update feedback prompt to request structured scores"
```

---

### Task 4: Parse scores in the feedback API route

**Files:**
- Modify: `app/api/feedback/route.ts`

- [ ] **Step 1: Add score parsing logic and bump max_tokens**

Update the existing import to include `DebateScores`:
```typescript
import type { DebateScores, FeedbackApiRequest, FeedbackApiResponse } from '@/types/debate';
```

Add a `parseScores` helper function before the `POST` handler:

```typescript

function parseScores(text: string): { scores: DebateScores | null; feedback: string } {
  const match = text.match(/\[SCORES\](.*?)\[\/SCORES\]/s);
  if (!match) {
    return { scores: null, feedback: text.trim() };
  }

  // Strip the scores block from the feedback text
  const feedback = text.replace(/\[SCORES\].*?\[\/SCORES\]/s, '').trim();

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
```

In the `POST` handler, change `max_tokens` from 200 to 300:
```typescript
max_tokens: 300,
```

Update the response construction to use `parseScores`:
```typescript
const { scores, feedback } = parseScores(textBlock.text);

const responseBody: FeedbackApiResponse = { feedback, scores };
return Response.json(responseBody);
```

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add app/api/feedback/route.ts
git commit -m "feat: parse AI scores from feedback response"
```

---

### Task 5: Wire scores through useDebate hook

**Files:**
- Modify: `hooks/useDebate.ts`

- [ ] **Step 1: Store scores alongside feedback**

In the `playSparkysResponse` callback, after `store.setFeedback(result.feedback)` (line 89), add:
```typescript
store.setScores(result.scores);
```

In the `startDebate` callback, after `store.setFeedback(null)` (line 200), add:
```typescript
store.setScores(null);
```

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add hooks/useDebate.ts
git commit -m "feat: wire scores through useDebate hook to store"
```

---

### Task 6: Update results page — use AI scores and add category breakdown

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Update star computation to use AI scores**

In `ResultsPage`, destructure `scores` from the store:
```typescript
const { topic, studentSide, transcript, feedback, scores, resetDebate } = useDebateStore();
```

Replace the stars `useMemo` with:
```typescript
const stars = useMemo(() => {
  if (scores) {
    const avg = (scores.reasoning + scores.persuasion + scores.engagement) / 3;
    return Math.max(1, Math.min(5, Math.round(avg)));
  }
  return computeStars(transcript);
}, [scores, transcript]);
```

- [ ] **Step 2: Add CategoryBreakdown component**

Add this component after the `StarRating` component in the file:

```tsx
const CATEGORY_LABELS: { key: keyof DebateScores; label: string }[] = [
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'persuasion', label: 'Persuasion' },
  { key: 'engagement', label: 'Engagement' },
];

function CategoryBreakdown({ scores }: { scores: DebateScores }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8 }}
      className="flex w-full max-w-xs flex-col gap-2"
    >
      {CATEGORY_LABELS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-24 text-right text-xs font-bold text-white/50">
            {label}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.div
                key={n}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2 + n * 0.05 }}
                className={`h-2.5 w-2.5 rounded-full ${
                  n <= scores[key]
                    ? 'bg-secondary shadow-[0_0_6px_rgba(78,205,196,0.4)]'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
```

Add the import for `DebateScores`:
```typescript
import type { DebateEntry, DebateScores } from '@/types/debate';
```

- [ ] **Step 3: Render CategoryBreakdown in the page**

After the `<StarRating stars={stars} />` line, add:
```tsx
{scores && <CategoryBreakdown scores={scores} />}
```

- [ ] **Step 4: Verify build passes**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Compiled successfully.

- [ ] **Step 5: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat: display AI-evaluated category scores on results page"
```

---

### Task 7: Final build verification and lint

- [ ] **Step 1: Full build**

Run: `cd /Users/frawu/Debate && npx next build 2>&1 | tail -20`
Expected: Compiled successfully, all routes generated.

- [ ] **Step 2: Lint**

Run: `cd /Users/frawu/Debate && npx eslint . 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Final commit if any cleanup needed**

Only if previous steps revealed issues that needed fixing.
