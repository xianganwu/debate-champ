/**
 * Content filter for custom debate topics.
 *
 * Three layers of defense (this file powers layers 1 & 2):
 *   1. Client-side — instant feedback in CustomTopicInput, zero API cost
 *   2. Server-side — same check in /api/debate & /api/hint, prevents bypass
 *   3. System prompt — Sparky redirects if something still slips through
 *
 * Design decisions:
 * - Word-boundary matching avoids false positives ("class" ≠ "ass", "analysis" ≠ "anal")
 * - Leet-speak normalization catches basic substitutions (f@ck, sh1t, etc.)
 * - Multi-word patterns catch contextual phrases ("how to kill", "mass shooting")
 * - Single compiled regex for performance — runs on every keystroke
 * - Same module used on client and server — no 'use client' directive
 */

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Normalize leet-speak substitutions and collapse repeated characters. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't')
    // Collapse 3+ repeated chars → 2: "fuuuck" → "fuuck", "shiiiit" → "shiit"
    .replace(/(.)\1{2,}/g, '$1$1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Blocked content — single words (word-boundary matched)
// ---------------------------------------------------------------------------

const BLOCKED_WORDS = [
  // -- Profanity --
  'fuck', 'fucking', 'fucked', 'fucker',
  'shit', 'shitty', 'bullshit',
  'bitch', 'bitches',
  'bastard', 'cunt',
  'dick', 'cock', 'pussy',
  'whore', 'slut',
  'asshole', 'dumbass', 'jackass',
  'piss', 'pissed',
  'damn', 'dammit', 'goddamn',
  'stfu', 'wtf', 'lmfao',
  // Common phonetic evasions
  'fuk', 'fck', 'phuck', 'azz', 'shyt', 'biatch',

  // -- Slurs --
  'nigger', 'nigga',
  'faggot', 'fag',
  'retard', 'retarded',
  'tranny',
  'spic', 'wetback',
  'kike', 'chink',

  // -- Sexual content --
  'porn', 'pornography',
  'hentai',
  'nude', 'nudes', 'naked',
  'orgasm',
  'blowjob', 'handjob',
  'dildo', 'vibrator',
  'boobs', 'tits', 'titties',

  // -- Self-harm --
  'suicide', 'suicidal',

  // -- Drugs (specific substances) --
  'cocaine', 'heroin',
  'meth', 'methamphetamine',
  'ecstasy', 'mdma',
  'lsd', 'fentanyl', 'ketamine',

  // -- Extreme violence --
  'genocide',
  'rape', 'raping', 'rapist',
];

// Pre-compile a single regex with all words joined by alternation.
// Sorted longest-first so longer matches are tried before shorter prefixes.
const sortedWords = [...BLOCKED_WORDS].sort((a, b) => b.length - a.length);
const escapedWords = sortedWords.map((w) =>
  w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
);
const BLOCKED_WORDS_REGEX = new RegExp(
  `\\b(${escapedWords.join('|')})\\b`,
);

// ---------------------------------------------------------------------------
// Blocked content — multi-word patterns (regex)
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS: RegExp[] = [
  // Actionable violence
  /\bhow\s+to\s+(kill|murder|hurt|harm|poison|stab|shoot|attack)\b/,
  /\b(kill|murder|hurt|harm|rape)\s+(someone|people|kids|children|a\s+person)\b/,
  // Self-harm phrases
  /\b(kill|hurt|harm)\s+(myself|yourself|themselves|himself|herself)\b/,
  /\bwant\s+to\s+die\b/,
  // Weapon creation
  /\bhow\s+to\s+(make|build|get)\s+(a\s+)?(bomb|gun|weapon)\b/,
  // Targeted violence
  /\b(mass|school)\s+shooting\b/,
  /\bshoot\s+up\s+(a\s+)?(school|church|mosque|synagogue|mall)\b/,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a topic is appropriate for tween debate practice.
 * Returns a kid-friendly rejection message, or null if the topic is OK.
 *
 * Pure string matching — no API calls, safe to call on every keystroke.
 */
export function checkTopicAppropriateness(text: string): string | null {
  const normalized = normalize(text);

  if (BLOCKED_WORDS_REGEX.test(normalized)) {
    return "Hmm, that topic isn't quite right for debate practice. Try a different one!";
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return "Hmm, that topic isn't quite right for debate practice. Try a different one!";
    }
  }

  return null;
}
