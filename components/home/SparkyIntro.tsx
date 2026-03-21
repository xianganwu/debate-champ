'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SparkyAvatar } from '@/components/debate/SparkyAvatar';

const STORAGE_KEY = 'debateChamp:hasVisited';
const AUTO_DISMISS_MS = 6000;

const INTRO_TEXT = "Hey! I'm Sparky, your debate buddy! Pick a topic and let's argue!";

/**
 * Full-screen intro overlay shown once on first visit.
 * Sparky waves, introduces himself, then the overlay dissolves.
 */
export function SparkyIntro({ onDismiss }: { onDismiss: () => void }) {
  // Typewriter effect — reveal one word at a time
  const words = INTRO_TEXT.split(' ');
  const [visibleCount, setVisibleCount] = useState(0);
  const allRevealed = visibleCount >= words.length;

  useEffect(() => {
    if (visibleCount >= words.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 80);
    return () => clearTimeout(timer);
  }, [visibleCount, words.length]);

  // Auto-dismiss after text is fully revealed + a pause
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Dismiss on Escape key (WCAG keyboard accessibility)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark/90 backdrop-blur-md px-6"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Meet Sparky"
    >
      {/* Sparky avatar — scales up on entrance */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
      >
        <SparkyAvatar state="idle" size={100} smSize={140} />
      </motion.div>

      {/* Speech bubble */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="mt-4 max-w-sm rounded-2xl border border-white/10 bg-surface/90 px-6 py-4 text-center shadow-xl shadow-black/30 backdrop-blur-sm"
      >
        <p className="text-base leading-relaxed text-white/90 sm:text-lg">
          {words.map((word, i) => (
            <span
              key={i}
              className={`inline transition-opacity duration-150 ${i < visibleCount ? 'opacity-100' : 'opacity-0'}`}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </motion.div>

      {/* "Let's go!" button — appears after text is revealed */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={allRevealed ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1, duration: 0.3 }}
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        tabIndex={allRevealed ? 0 : -1}
        autoFocus={allRevealed}
        className={`
          mt-6 rounded-2xl bg-primary px-8 py-3 text-lg font-bold text-white
          shadow-lg shadow-primary/30 transition-transform
          hover:scale-105 active:scale-95
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
          ${allRevealed ? '' : 'pointer-events-none'}
        `}
      >
        Let&apos;s go! 🔥
      </motion.button>

      {/* Subtle "tap anywhere" hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 2 }}
        className="mt-4 text-xs text-white/30"
      >
        tap anywhere to skip
      </motion.p>
    </motion.div>
  );
}

/**
 * Check if this is the user's first visit (no localStorage flag).
 */
export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

/**
 * Mark that the user has visited (set localStorage flag).
 */
export function markVisited(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // localStorage unavailable — ignore
  }
}
