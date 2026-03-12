# Lessons Learned

## Tailwind v4
- This project uses Tailwind CSS v4 with `@tailwindcss/postcss`. Configuration is done via `@theme inline` blocks in `globals.css`, NOT via `tailwind.config.ts`. Do not create a `tailwind.config.ts` file.

## Google Fonts in Next.js
- `Fredoka One` is not available as a separate import in `next/font/google`. Use `Fredoka` (which includes the One weight) instead.

## Placeholder files in Next.js App Router
- Empty `.tsx` page files cause build errors ("is not a module"). Every page file needs at minimum `export default function PageName() { return null; }`.
- Empty API route files also fail — they need at least a stub `POST`/`GET` export.
