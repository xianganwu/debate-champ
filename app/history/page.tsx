'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { loadHistory, clearHistory, getHistoryStats } from '@/lib/debate-history';
import { Button } from '@/components/ui/Button';
import type { DebateHistoryEntry } from '@/types/debate';

// ---------------------------------------------------------------------------
// Difficulty badge colors
// ---------------------------------------------------------------------------
const DIFFICULTY_BADGE: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-green-500/20 text-green-400' },
  medium: { label: 'Medium', color: 'bg-amber-500/20 text-amber-400' },
  hard: { label: 'Hard', color: 'bg-red-500/20 text-red-400' },
};

// ---------------------------------------------------------------------------
// Star display helper
// ---------------------------------------------------------------------------
function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= count ? 'text-accent' : 'text-white/15'}
          style={{ fontSize: '14px' }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single history card
// ---------------------------------------------------------------------------
function HistoryCard({ entry, index }: { entry: DebateHistoryEntry; index: number }) {
  const badge = DIFFICULTY_BADGE[entry.difficulty] ?? DIFFICULTY_BADGE.medium;
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface/60 px-4 py-3 backdrop-blur-sm"
    >
      {/* Topic emoji */}
      <span className="text-2xl flex-shrink-0">{entry.topic.emoji}</span>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white/90">{entry.topic.text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/40">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}
          >
            {badge.label}
          </span>
          <span>
            {entry.studentSide === 'FOR' ? '👍 For' : '👎 Against'}
          </span>
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Stars */}
      <div className="flex-shrink-0">
        <Stars count={entry.stars} />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------
function StatsBar({ history }: { history: DebateHistoryEntry[] }) {
  const stats = useMemo(() => getHistoryStats(history), [history]);

  if (stats.totalDebates === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {[
        { label: 'Debates', value: stats.totalDebates, emoji: '🎤' },
        { label: 'Total Stars', value: stats.totalStars, emoji: '⭐' },
        { label: 'Topics', value: stats.uniqueTopics, emoji: '💬' },
        { label: 'Best Streak', value: stats.maxStreak, emoji: '🔥' },
      ].map(({ label, value, emoji }) => (
        <div
          key={label}
          className="flex flex-col items-center rounded-xl border border-white/10 bg-surface/40 px-3 py-3"
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-xl font-bold text-white">{value}</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            {label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<DebateHistoryEntry[]>(() => loadHistory());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = useCallback(() => {
    clearHistory();
    setHistory([]);
    setShowClearConfirm(false);
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-dark">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div
          className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-float-shape"
          style={{ '--float-dur': '18s', '--float-delay': '0s' } as React.CSSProperties}
        />
        <div
          className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-secondary/5 blur-3xl animate-float-shape"
          style={{ '--float-dur': '22s', '--float-delay': '3s' } as React.CSSProperties}
        />
      </div>

      <main className="relative z-10 mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-5 sm:py-14">
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-sm font-bold text-white/50 transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              ← Back
            </button>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold text-white sm:text-3xl"
          >
            Past Debates 📜
          </motion.h1>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Stats */}
        <StatsBar history={history} />

        {/* History list */}
        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-16"
          >
            <span className="text-5xl">🏟️</span>
            <p className="text-center text-base text-white/40">
              No debates yet! Go argue with Sparky and your results will show up here.
            </p>
            <Button variant="primary" onClick={() => router.push('/')}>
              Start debating! 🎤
            </Button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((entry, i) => (
              <HistoryCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}

        {/* Clear history */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <AnimatePresence mode="wait">
              {showClearConfirm ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3"
                >
                  <span className="text-sm text-red-300">Delete all history?</span>
                  <button
                    onClick={handleClear}
                    className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded-lg border border-white/15 px-3 py-1 text-xs font-bold text-white/60 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="trigger"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-white/30 transition-colors hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Clear history
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <div className="h-8" />
      </main>
    </div>
  );
}
