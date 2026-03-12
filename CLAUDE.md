# DebateChamp 🎤
**AI-Powered Debate Practice for Rising 5th Graders**

---

## Project Vision

DebateChamp is a voice-enabled debate practice app where rising 5th graders argue against an AI opponent named **Sparky**. The student picks a fun topic, chooses a side, and goes head-to-head with Sparky in 3 rounds of back-and-forth debate. At the end, Sparky gives personalized feedback with encouragement and one tip to improve.

The emotional goal: make kids feel like debate is *fun and exciting*, not scary. Every design and UX decision should serve that feeling.

**Inspiration:** Duolingo meets a school debate club meets a Saturday morning cartoon.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS variables |
| Animation | Framer Motion |
| State | Zustand |
| AI | Anthropic API (`claude-sonnet-4-20250514`) |
| Voice In | Web Speech API (`SpeechRecognition`) |
| Voice Out | Web Speech API (`SpeechSynthesis`) |
| Deployment | Vercel |

---

## Project Structure

```
debate-champ/
├── app/
│   ├── layout.tsx              # Root layout, fonts, global styles
│   ├── page.tsx                # Home / topic selector screen
│   ├── debate/
│   │   └── page.tsx            # Main debate arena
│   └── results/
│       └── page.tsx            # Feedback + score screen
├── components/
│   ├── ui/
│   │   ├── Button.tsx          # Reusable animated button
│   │   ├── Card.tsx            # Topic card component
│   │   └── ProgressBar.tsx     # Round progress indicator
│   ├── debate/
│   │   ├── DebateArena.tsx     # Main debate layout
│   │   ├── SparkyAvatar.tsx    # Animated Sparky character
│   │   ├── VoiceButton.tsx     # Big mic button with state
│   │   ├── TranscriptBubble.tsx # Speech bubble for transcript
│   │   └── RoundIndicator.tsx  # Shows current round
│   └── home/
│       ├── TopicGrid.tsx       # Grid of selectable topics
│       ├── TopicCard.tsx       # Individual topic card
│       └── SideSelector.tsx    # Choose FOR or AGAINST
├── lib/
│   ├── debate-engine.ts        # Claude API integration
│   ├── speech.ts               # Web Speech API wrapper
│   ├── topics.ts               # Topic bank with categories
│   ├── store.ts                # Zustand debate state store
│   └── prompts.ts              # All Claude system prompts
├── hooks/
│   ├── useSpeechRecognition.ts # Voice input hook
│   ├── useSpeechSynthesis.ts   # Voice output hook
│   └── useDebate.ts            # Main debate orchestration hook
├── types/
│   └── debate.ts               # All TypeScript types
└── public/
    └── sounds/                 # UI sound effects (optional)
```

---

## Core User Flow

```
HOME SCREEN
  → Browse topic grid (silly + substantive mix)
  → Click a topic card
  → Choose: FOR or AGAINST
  → "Start Debate" button

DEBATE SCREEN
  → Sparky introduces himself and the topic (TTS)
  → Round 1: Student speaks (STT) → Sparky responds (TTS)
  → Round 2: Student speaks → Sparky responds  
  → Round 3 (closing): Student speaks → Sparky responds
  → "See your feedback" button

RESULTS SCREEN
  → Full debate transcript
  → Sparky's feedback: 2 compliments + 1 tip
  → Score visualization (stars or meter)
  → "Debate again" or "Try new topic"
```

---

## Topics Bank

Topics are organized by category. Mix of silly and substantive:

### 🍕 Fun & Everyday
- Should school lunches include pizza every day?
- Is a hot dog a sandwich?
- Should kids get paid for good grades?
- Is summer better than winter?
- Should recess be longer than class time?

### 🏫 School Life
- Should schools have homework?
- Should students choose their own classes?
- Should school start later in the morning?
- Should phones be allowed in school?
- Should gym class be graded?

### 🌍 Big Ideas (accessible)
- Should zoos exist?
- Are cats better pets than dogs?
- Should kids be allowed to vote?
- Is it better to be book-smart or street-smart?
- Should everyone learn to code?

---

## Sparky — The AI Opponent

Sparky is a friendly, slightly overconfident debate robot who LOVES arguing but is never mean. Think of him as that friend who always plays devil's advocate but you still like them.

**Personality traits:**
- Enthusiastic and a little theatrical ("Oh, that's a GREAT point! But consider THIS...")
- Uses age-appropriate vocabulary (5th grade level)
- Never condescending
- Models good debate technique subtly (evidence, examples, counter-arguments)
- Gets "flustered" if the student makes a really good point

**Voice:** Use `SpeechSynthesis` with a slightly higher pitch and faster rate to give Sparky personality:
```typescript
const sparkyVoice = {
  pitch: 1.15,
  rate: 1.05,
  voice: // prefer 'Google UK English Male' or similar distinctive voice
}
```

---

## Claude API — System Prompts

### Main Debate Prompt (in `lib/prompts.ts`)

```typescript
export const SPARKY_SYSTEM_PROMPT = (topic: string, sparkySide: string) => `
You are Sparky, a friendly and enthusiastic debate robot practicing with a 5th grade student (age 10-11).

TOPIC: "${topic}"
YOUR SIDE: ${sparkySide}

PERSONALITY:
- You are energetic, a little theatrical, and always encouraging
- You genuinely enjoy debating and want the student to improve
- You never talk down to the student
- You model good debate technique: use evidence, give examples, acknowledge their points before countering

DEBATE RULES:
- Keep each response to 3-4 sentences MAXIMUM
- Use vocabulary a 5th grader understands (no jargon)
- Start each response by briefly acknowledging what the student just said
- Then give your counter-argument with one specific example or reason
- End with a question or challenge to keep them thinking

TONE EXAMPLES:
Good: "Oh wow, that's actually a solid point! But here's what you're missing..."
Good: "Okay okay, I see what you're saying, BUT..."  
Bad: "While your argument has merit, one must consider..."

After round 3 (the final round), end your response with exactly this tag: [DEBATE_COMPLETE]
`

export const FEEDBACK_PROMPT = (transcript: string) => `
You are Sparky, wrapping up a debate practice session with a 5th grade student.

Here is the full debate transcript:
${transcript}

Give feedback in this EXACT format:
1. Start with genuine excitement about something specific they did well (1-2 sentences)
2. Give a second specific compliment about their argument or style (1-2 sentences)  
3. Give ONE actionable tip for next time, framed positively (1-2 sentences)
4. End with an encouraging sign-off that makes them want to debate again

Keep the whole response under 100 words. Use casual, enthusiastic language.
`
```

---

## Voice Implementation

### Speech Recognition (`hooks/useSpeechRecognition.ts`)

```typescript
// Key implementation notes:
// - Always check browser support before initializing
// - Set interimResults: true for live transcript display
// - Use continuous: false (single utterance per turn)
// - Show visual feedback while mic is open
// - Add 1.5s silence detection to auto-stop
// - DISABLE mic during Sparky's speech to prevent echo
```

### Speech Synthesis (`hooks/useSpeechSynthesis.ts`)

```typescript
// Key implementation notes:
// - Load voices after 'voiceschanged' event fires
// - Prefer: 'Google UK English Male', 'Microsoft David', or similar
// - Fall back gracefully if preferred voice unavailable
// - Dispatch event when speech ENDS so UI can re-enable mic
// - Cancel any ongoing speech before starting new utterance
// - Split long text at sentence boundaries for more natural pauses
```

### Turn-Taking State Machine

```
IDLE
  → STUDENT_TURN (mic enabled, recording indicator shown)
    → PROCESSING (spinner, mic disabled)
      → SPARKY_TURN (Sparky avatar animates, TTS playing, mic disabled)
        → STUDENT_TURN (loop)
          → FEEDBACK (after round 3)
```

---

## UI/UX Design Principles

### Color Palette
```css
--color-primary: #FF6B35;      /* energetic orange */
--color-secondary: #4ECDC4;    /* friendly teal */  
--color-accent: #FFE66D;       /* warm yellow */
--color-dark: #1A1A2E;         /* deep navy */
--color-surface: #16213E;      /* card backgrounds */
--color-success: #06D6A0;      /* green for good points */
```

### Typography
- Display/headings: `Fredoka One` or `Nunito` (rounded, fun, approachable)
- Body: `Nunito` (highly legible for kids)
- Import via Google Fonts in `layout.tsx`

### Animation Guidelines (Framer Motion)
- Sparky avatar should bob/pulse when speaking
- Mic button should pulse red when recording
- Topic cards should have hover lift effect
- Speech bubbles should slide in from left (Sparky) or right (student)
- Round transitions should feel like a game level advancing
- Always use `spring` physics, never linear easing

### Accessibility
- Large touch targets (min 48x48px) for all interactive elements
- High contrast text (WCAG AA minimum)
- Screen reader labels on all icon buttons
- Keyboard navigation support throughout

---

## State Management (Zustand — `lib/store.ts`)

```typescript
interface DebateStore {
  // Setup
  topic: string | null
  studentSide: 'FOR' | 'AGAINST' | null
  sparkySide: 'FOR' | 'AGAINST' | null
  
  // Debate state
  currentRound: number  // 1-3
  maxRounds: number     // 3
  turnState: 'idle' | 'student' | 'processing' | 'sparky' | 'feedback'
  
  // Content
  transcript: DebateEntry[]  // Full conversation history
  studentScore: number       // 0-100
  
  // Actions
  setTopic: (topic: string) => void
  setSides: (studentSide: 'FOR' | 'AGAINST') => void
  addTranscriptEntry: (entry: DebateEntry) => void
  advanceRound: () => void
  setTurnState: (state: TurnState) => void
  resetDebate: () => void
}
```

---

## API Route (`app/api/debate/route.ts`)

```typescript
// POST /api/debate
// Body: { messages: Message[], topic: string, sparkySide: string, round: number }
// Returns: { response: string, isComplete: boolean }

// POST /api/feedback  
// Body: { transcript: DebateEntry[] }
// Returns: { feedback: string, score: number }
```

---

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=your_key_here
```

---

## Agents Used in This Project

This project was built using the following Claude Code sub-agents. Reference these when making changes:

### 1. `architect-agent`
Responsible for: Project scaffolding, Next.js config, TypeScript setup, folder structure, package.json dependencies.

### 2. `ui-agent`  
Responsible for: All visual components, Tailwind styling, Framer Motion animations, Sparky avatar design, responsive layout.

### 3. `voice-agent`
Responsible for: Web Speech API integration, turn-taking logic, voice selection, mic state management, audio feedback.

### 4. `debate-engine-agent`
Responsible for: Claude API integration, prompt engineering, conversation history management, feedback generation.

### 5. `state-agent`
Responsible for: Zustand store, game loop logic, round progression, score calculation.

---

## Key Constraints & Gotchas

1. **Web Speech API is Chrome/Edge only** — show a friendly browser warning for Firefox/Safari users
2. **Voices load asynchronously** — always wait for `speechSynthesis.onvoiceschanged` before trying to use a voice
3. **Never run STT and TTS simultaneously** — this creates echo feedback hell
4. **Claude API calls go server-side** — never expose the API key in client code
5. **Conversation history must be passed on every API call** — Claude has no memory between requests
6. **Mobile voice support is inconsistent** — test on iOS Safari separately; it has different STT behavior
7. **Keep Claude responses SHORT** — enforce max_tokens: 150 for debate turns, 200 for feedback

---

## Definition of Done

- [ ] Topic selection screen with all 15 topics, categorized
- [ ] Side selection (FOR/AGAINST) with clear visual feedback
- [ ] Debate arena with working voice input and output
- [ ] 3-round debate loop with turn indicators
- [ ] Sparky avatar animates when speaking
- [ ] Smooth transcript display (bubbles, left/right aligned)
- [ ] Feedback/results screen with score visualization
- [ ] "Play again" flow without page reload
- [ ] Browser compatibility warning for non-Chrome users
- [ ] Mobile-responsive layout
- [ ] Loading/error states for API calls
- [ ] Deployed to Vercel

---

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build  
npm run lint         # ESLint check
npm run type-check   # TypeScript check
vercel --prod        # Deploy to production
```
