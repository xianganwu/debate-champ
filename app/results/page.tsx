'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebateStore } from '@/lib/store';
import { callFeedbackAPI } from '@/lib/debate-engine';
import { SparkyAvatar } from '@/components/debate/SparkyAvatar';
import { TranscriptBubble } from '@/components/debate/TranscriptBubble';
import { Button } from '@/components/ui/Button';
import type { DebateEntry } from '@/types/debate';

// ---------------------------------------------------------------------------
// Confetti burst — pure CSS particles, no external dependency
// ---------------------------------------------------------------------------
const CONFETTI_COLORS = ['#FF6B35', '#4ECDC4', '#FFE66D', '#06D6A0', '#FF6B9D', '#9B5DE5'];
const CONFETTI_COUNT = 40;

function generateConfettiPieces() {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.8,
    drift: -30 + Math.random() * 60,
    delay: Math.random() * 0.4,
    duration: 1.5 + Math.random() * 1.5,
    shape: i % 3, // 0 = rect, 1 = circle, 2 = triangle-ish
  }));
}

function ConfettiBurst() {
  const pieces = useMemo(() => generateConfettiPieces(), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.shape === 1 ? 'rounded-full' : p.shape === 2 ? 'rounded-sm' : ''}`}
          style={{
            left: `${p.x}%`,
            top: -10,
            width: p.shape === 1 ? 10 : 8,
            height: p.shape === 1 ? 10 : 14,
            backgroundColor: p.color,
            rotate: p.rotation,
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: [0, window?.innerHeight ? window.innerHeight + 100 : 900],
            x: [0, p.drift, p.drift * 1.5],
            rotate: [p.rotation, p.rotation + 360 * (p.id % 2 === 0 ? 1 : -1)],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Star rating — always 2-3 stars (practice, not competition)
// ---------------------------------------------------------------------------
function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${stars} out of 3 stars`}>
      {[1, 2, 3].map((n) => {
        const filled = n <= stars;
        return (
          <motion.div
            key={n}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring' as const,
              stiffness: 400,
              damping: 15,
              delay: 0.6 + n * 0.25,
            }}
          >
            <motion.svg
              className="w-10 h-10 sm:w-14 sm:h-14"
              viewBox="0 0 24 24"
              fill={filled ? '#FFE66D' : 'none'}
              stroke={filled ? '#FFE66D' : 'rgba(255,255,255,0.15)'}
              strokeWidth={1.5}
              animate={
                filled
                  ? { filter: ['drop-shadow(0 0 6px rgba(255,230,109,0.6))', 'drop-shadow(0 0 12px rgba(255,230,109,0.8))', 'drop-shadow(0 0 6px rgba(255,230,109,0.6))'] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity, delay: n * 0.3 }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </motion.svg>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typewriter text — reveals feedback word by word
// ---------------------------------------------------------------------------
function TypewriterText({ text }: { text: string }) {
  const words = text.split(' ');
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= words.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 50);
    return () => clearTimeout(timer);
  }, [visibleCount, words.length]);

  return (
    <p className="text-sm leading-relaxed text-white/85 sm:text-base">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={i < visibleCount ? { opacity: 1 } : {}}
          transition={{ duration: 0.15 }}
          className="inline"
        >
          {word}{' '}
        </motion.span>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Compute stars from transcript engagement (always 2-3)
// ---------------------------------------------------------------------------
function computeStars(transcript: readonly DebateEntry[]): number {
  const studentEntries = transcript.filter((e) => e.speaker === 'student');
  if (studentEntries.length === 0) return 2;

  // Average word count across student arguments
  const avgWords =
    studentEntries.reduce((sum, e) => sum + e.text.split(/\s+/).length, 0) /
    studentEntries.length;

  // 3 stars if they gave substantive arguments (avg 8+ words), else 2
  // Every kid who completes the debate gets at least 2 stars
  return avgWords >= 8 ? 3 : 2;
}

// ---------------------------------------------------------------------------
// Main results page
// ---------------------------------------------------------------------------
export default function ResultsPage() {
  const router = useRouter();
  const { topic, studentSide, transcript, resetDebate } = useDebateStore();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  const stars = useMemo(() => computeStars(transcript), [transcript]);

  // Redirect if no debate data
  useEffect(() => {
    if (!topic || transcript.length === 0) {
      router.replace('/');
    }
  }, [topic, transcript.length, router]);

  const fetchFeedback = useCallback(async () => {
    if (transcript.length === 0) return;
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const result = await callFeedbackAPI(transcript);
      setFeedback(result.feedback);
    } catch {
      setFeedbackError("Sparky's brain froze! Tap retry to hear what he thinks.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [transcript]);

  // Fetch feedback on mount
  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Dismiss confetti after 3s
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleDebateAgain = useCallback(() => {
    if (!topic || !studentSide) return;
    // Save topic + side, reset state, then restore before navigating
    const savedTopic = topic;
    const savedSide = studentSide;
    resetDebate();
    useDebateStore.getState().setTopic(savedTopic);
    useDebateStore.getState().setSides(savedSide);
    router.push('/debate');
  }, [topic, studentSide, resetDebate, router]);

  const handleNewTopic = useCallback(() => {
    resetDebate();
    router.push('/');
  }, [resetDebate, router]);

  const handleCopySummary = useCallback(async () => {
    if (!topic) return;
    const starEmojis = Array.from({ length: stars }, () => '\u2B50').join('');
    const summary = `I just debated Sparky about "${topic.text}" and earned ${starEmojis}! Think you can do better? Try DebateChamp!`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — ignore silently
    }
  }, [topic, stars]);

  if (!topic) return null;

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-dark">
      {/* Confetti burst */}
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <motion.div
          className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-accent/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-secondary/5 blur-3xl"
          animate={{ scale: [1, 1.15, 1], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <main className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-8 sm:gap-8 sm:px-5 sm:py-14">
        {/* Hero headline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
          className="text-center"
        >
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Great job!
          </h1>
          <p className="mt-2 text-base text-white/50">
            {topic.emoji} {topic.text}
          </p>
        </motion.div>

        {/* Star rating */}
        <StarRating stars={stars} />

        {/* Sparky feedback card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 250, damping: 22, delay: 0.4 }}
          className="flex w-full gap-3 rounded-2xl border border-white/10 bg-surface/80 p-4 backdrop-blur-sm sm:gap-4 sm:p-5"
        >
          <div className="flex-shrink-0 pt-1">
            <SparkyAvatar size={64} state="idle" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-2 block font-display text-sm font-bold text-secondary">
              Sparky says...
            </span>

            {feedbackLoading && (
              <div className="flex items-center gap-2 py-2">
                <motion.div
                  className="h-2 w-2 rounded-full bg-secondary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <motion.div
                  className="h-2 w-2 rounded-full bg-secondary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="h-2 w-2 rounded-full bg-secondary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            )}

            {feedbackError && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-accent">
                  {feedbackError}
                </p>
                <button
                  onClick={fetchFeedback}
                  className="self-start rounded-lg bg-secondary/20 px-3 py-1.5 text-xs font-bold text-secondary transition-colors hover:bg-secondary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Retry
                </button>
              </div>
            )}

            {feedback && <TypewriterText text={feedback} />}
          </div>
        </motion.div>

        {/* Collapsible transcript */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full"
        >
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-surface/50 px-5 py-3 text-sm font-bold text-white/70 transition-colors hover:bg-surface/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-expanded={showTranscript}
          >
            <span>See full debate</span>
            <motion.span
              animate={{ rotate: showTranscript ? 180 : 0 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
              className="text-lg"
            >
              &#x25BC;
            </motion.span>
          </button>

          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 28 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 pt-4">
                  {transcript.map((entry, i) => (
                    <TranscriptBubble key={i} entry={entry} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Button large variant="primary" onClick={handleDebateAgain} className="flex-1 sm:flex-none">
            Debate again! 🔁
          </Button>
          <Button large variant="secondary" onClick={handleNewTopic} className="flex-1 sm:flex-none">
            New topic 🎲
          </Button>
        </motion.div>

        {/* Share section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface/40 px-5 py-2.5 text-sm text-white/50 transition-colors hover:bg-surface/70 hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy debate summary'}
          </button>
        </motion.div>

        <div className="h-6" />
      </main>
    </div>
  );
}
