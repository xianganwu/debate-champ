import type { DebateEntry, DebateHistoryEntry, DebateScores, DebateSide, Difficulty, Topic } from '@/types/debate';

const STORAGE_KEY = 'debate-champ-history';

/**
 * Compute star rating from scores (preferred) or transcript word counts (fallback).
 * Shared by useDebate (for saving to history) and the results page (for display).
 */
export function computeStars(
  transcript: readonly DebateEntry[],
  scores: DebateScores | null,
): number {
  if (scores) {
    const avg = (scores.reasoning + scores.persuasion + scores.engagement) / 3;
    return Math.max(1, Math.min(5, Math.round(avg)));
  }
  const studentEntries = transcript.filter((e) => e.speaker === 'student');
  if (studentEntries.length === 0) return 2;
  const avgWords =
    studentEntries.reduce((sum, e) => sum + e.text.split(/\s+/).length, 0) /
    studentEntries.length;
  if (avgWords >= 20 && studentEntries.length >= 3) return 5;
  if (avgWords >= 15 && studentEntries.length >= 2) return 4;
  if (avgWords >= 8) return 3;
  return 2;
}
const MAX_ENTRIES = 50;

/**
 * Validate that a parsed object has the shape of a DebateHistoryEntry.
 * Prevents crashes from corrupted or legacy localStorage data.
 */
function isValidHistoryEntry(entry: unknown): entry is DebateHistoryEntry {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.timestamp === 'string' &&
    typeof e.stars === 'number' &&
    typeof e.studentSide === 'string' &&
    typeof e.difficulty === 'string' &&
    e.topic !== null &&
    typeof e.topic === 'object' &&
    typeof (e.topic as Record<string, unknown>).id === 'string' &&
    typeof (e.topic as Record<string, unknown>).text === 'string'
  );
}

/**
 * Load all debate history entries from localStorage.
 * Returns newest-first. Gracefully returns [] on any error.
 * Filters out malformed entries to prevent render crashes.
 */
export function loadHistory(): DebateHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidHistoryEntry);
  } catch {
    return [];
  }
}

/**
 * Save a completed debate to history.
 * Prepends the new entry (newest first) and caps at MAX_ENTRIES.
 */
export function saveToHistory(entry: {
  topic: Topic;
  studentSide: DebateSide;
  difficulty: Difficulty;
  scores: DebateScores | null;
  stars: number;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadHistory();
    const newEntry: DebateHistoryEntry = {
      id: crypto.randomUUID(),
      topic: entry.topic,
      studentSide: entry.studentSide,
      difficulty: entry.difficulty,
      scores: entry.scores,
      stars: entry.stars,
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/**
 * Clear all debate history.
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Get summary stats from history.
 */
export function getHistoryStats(history: DebateHistoryEntry[]) {
  const totalDebates = history.length;
  const totalStars = history.reduce((sum, e) => sum + e.stars, 0);
  const avgStars = totalDebates > 0 ? totalStars / totalDebates : 0;

  // Count unique topics debated
  const uniqueTopics = new Set(history.map((e) => e.topic.id)).size;

  // Longest streak of 4+ star debates
  let streak = 0;
  let maxStreak = 0;
  for (const entry of history) {
    if (entry.stars >= 4) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }

  return { totalDebates, totalStars, avgStars, uniqueTopics, maxStreak };
}
