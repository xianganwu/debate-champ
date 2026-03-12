# DebateChamp

**AI-powered debate practice for kids.** Pick a topic, choose your side, and go head-to-head with Sparky — a friendly (and slightly dramatic) AI debate partner.

3 rounds. Voice or text. Personalized feedback at the end.

## Quick Start

```bash
# Install dependencies
npm install

# Add your Anthropic API key
cp .env.local.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge for the full voice experience. Other browsers fall back to text input automatically.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| State | Zustand |
| AI | Claude via Anthropic API |
| Voice | Web Speech API (STT + TTS) |

## How It Works

1. **Pick a topic** — 15 fun and thought-provoking topics across three categories
2. **Choose a side** — FOR or AGAINST. Sparky takes the opposite
3. **Debate in 3 rounds** — speak into your mic (or type) and Sparky responds with counter-arguments
4. **Get feedback** — Sparky gives you 2 compliments and 1 tip to improve

## Project Structure

```
app/          → Next.js pages (home, debate arena, results)
components/   → UI components (Sparky avatar, voice button, topic cards)
hooks/        → React hooks (speech recognition, synthesis, debate orchestration)
lib/          → Business logic (AI engine, prompts, state store, topics)
types/        → TypeScript type definitions
```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set `ANTHROPIC_API_KEY` in your Vercel project's environment variables.

## Browser Support

| Feature | Chrome/Edge | Firefox/Safari |
|---------|-------------|----------------|
| Voice input | Full | Text fallback |
| Voice output | Full | Text only |
| Animations | Full | Full |

## License

MIT
