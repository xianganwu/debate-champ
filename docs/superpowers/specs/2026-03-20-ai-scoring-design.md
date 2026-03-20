# AI-Powered Debate Scoring

## Problem

The current scoring system (`computeStars()` in `results/page.tsx`) uses a naive word-count heuristic. It counts average words per student entry and number of rounds completed. A student typing "yes I agree" three times gets the same score as one giving thoughtful arguments. The score and Claude's qualitative feedback are completely disconnected.

## Solution

Piggyback structured scoring onto the existing feedback API call. Claude evaluates the student's arguments across 3 categories and returns scores alongside the written feedback. No extra API call needed.

## Scoring Categories

Each scored 1-5 by Claude:

| Category | What Claude evaluates |
|----------|----------------------|
| **Reasoning** | Did they give reasons and evidence to support their position? |
| **Persuasion** | Was their argument convincing and well-structured? |
| **Engagement** | Did they respond to Sparky's points rather than ignoring them? |

**Overall stars** = rounded average of the 3 category scores. Minimum 1 star, maximum 5.

## Types

```typescript
interface DebateScores {
  readonly reasoning: number;  // 1-5
  readonly persuasion: number; // 1-5
  readonly engagement: number; // 1-5
}
```

`DebateState.scores` is `DebateScores | null` (null until feedback call completes).

`FeedbackApiResponse` becomes `{ feedback: string, scores: DebateScores | null }`.

## Data Flow

1. `FEEDBACK_PROMPT` updated to include the **full transcript** (both student and Sparky entries) — Claude needs Sparky's arguments to evaluate the Engagement category. The prompt asks Claude for scores in a `[SCORES]{"reasoning":N,"persuasion":N,"engagement":N}[/SCORES]` block followed by the written feedback.
2. `/api/feedback` route bumps `max_tokens` from 200 to 300 (scores block adds ~25 tokens overhead). It parses the `[SCORES]` block from **anywhere** in Claude's response (not just the start), strips it from the feedback text, and returns `{ feedback, scores }`.
3. Score validation: each value is clamped to integer 1-5 via `Math.max(1, Math.min(5, Math.round(value)))`. If any value is not a valid number, the entire scores block is treated as unparseable and `scores` is returned as `null`.
4. Zustand store gets `scores: DebateScores | null` field and a `setScores` action. `resetDebate` and `startNewDebate` clear it to `null`.
5. `useDebate.ts` calls `store.setScores(result.scores)` alongside `store.setFeedback(result.feedback)`.
6. Results page reads scores from store, computes overall stars from the average, displays category breakdown below the main star rating.
7. `computeStars()` heuristic retained as fallback only — used when `scores` is `null`.

## Prompt Strategy

Claude is asked to return:
```
[SCORES]{"reasoning": 3, "persuasion": 4, "engagement": 2}[/SCORES]

Hey, great job! You really nailed it when you...
```

The tag-delimited format is more reliable than asking for pure JSON, since the rest of the response is conversational. The parser uses a regex to find `[SCORES]...[/SCORES]` anywhere in the response and strips it before returning the feedback text. An example of the expected format is included in the prompt for reliability.

## Results Page Changes

- Overall star rating: computed from average of 3 category scores (rounded)
- Below the star rating: 3 category rows showing label + mini star indicators
- Existing star animation preserved for the headline score
- Category breakdown hidden when `scores` is null (fallback case shows only overall stars)

## Fallback

If `[SCORES]` block is missing, unparseable, or contains invalid values, `scores` is returned as `null`. The results page falls back to the existing `computeStars()` word-count heuristic for the overall star display and hides the category breakdown. The page never breaks.

## Files Changed

- `lib/prompts.ts` — update `FEEDBACK_PROMPT` to include full transcript and request scores
- `app/api/feedback/route.ts` — parse and validate scores from response, bump `max_tokens` to 300
- `types/debate.ts` — update `FeedbackApiResponse`, add `DebateScores` type, add `scores` to `DebateState`
- `lib/store.ts` — add `scores` field and `setScores` action
- `hooks/useDebate.ts` — call `store.setScores(result.scores)` alongside feedback
- `lib/debate-engine.ts` — passthrough only, no logic changes (updated response shape flows through)
- `app/results/page.tsx` — use AI scores for stars when available, add category breakdown UI, keep `computeStars()` as fallback
