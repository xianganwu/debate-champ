'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebate } from '@/hooks/useDebate';
import { SparkyAvatar } from '@/components/debate/SparkyAvatar';
import { VoiceButton } from '@/components/debate/VoiceButton';
import { TranscriptBubble } from '@/components/debate/TranscriptBubble';
import { RoundIndicator } from '@/components/debate/RoundIndicator';
import { Button } from '@/components/ui/Button';
import { AudioTestPanel } from '@/components/debate/AudioTestPanel';

function getSparkyState(turnState: string, isSpeaking: boolean) {
  if (turnState === 'sparky' && isSpeaking) return 'speaking' as const;
  if (turnState === 'processing') return 'thinking' as const;
  return 'idle' as const;
}

export default function DebatePage() {
  const router = useRouter();
  const debate = useDebate();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const [compatDismissed, setCompatDismissed] = useState(false);

  // Redirect to home if no topic selected
  useEffect(() => {
    if (!debate.topic && !initRef.current) {
      router.replace('/');
    }
  }, [debate.topic, router]);

  // Start the debate on mount (once)
  useEffect(() => {
    if (debate.topic && debate.studentSide && !initRef.current) {
      initRef.current = true;
      debate.startDebate(debate.topic, debate.studentSide);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll transcript (raf ensures the new bubble is painted before scrolling)
  useEffect(() => {
    requestAnimationFrame(() => {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [debate.transcript.length]);

  if (!debate.topic) {
    return null;
  }

  const sparkyState = getSparkyState(debate.turnState, debate.isSpeaking);
  const isComplete = debate.turnState === 'feedback';
  const isConfirming = debate.turnState === 'confirm';

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-dark">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-secondary/5 blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-primary/5 blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, -60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top bar: topic + round */}
      <header className="relative z-10 flex items-center justify-between gap-2 border-b border-white/5 bg-surface/50 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold text-white/90 sm:text-lg">
            {debate.topic.emoji} {debate.topic.text}
          </h1>
          <p className="text-xs text-white/40">
            You: <span className="font-bold text-primary">{debate.studentSide}</span>
            {' vs '}
            Sparky: <span className="font-bold text-secondary">{debate.sparkySide}</span>
          </p>
        </div>
        <RoundIndicator currentRound={debate.currentRound} maxRounds={3} />
        <AudioTestPanel />
      </header>

      {/* Main arena */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Sparky section — compact horizontal strip at all breakpoints */}
        <div className="flex flex-shrink-0 items-center justify-center gap-2 px-4 py-1 sm:py-1.5">
          <SparkyAvatar state={sparkyState} size={32} smSize={48} />
          <AnimatePresence mode="wait">
            <motion.span
              key={sparkyState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="font-display text-xs font-bold text-secondary/70"
            >
              {sparkyState === 'speaking'
                ? 'Sparky is arguing...'
                : sparkyState === 'thinking'
                  ? 'Sparky is thinking...'
                  : 'Sparky'}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Browser compat banner */}
        {!debate.voiceSupported && !compatDismissed && (
          <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-4 py-2 text-sm text-accent sm:mx-6">
            <span className="flex-1">Voice isn&apos;t available in this browser — you can type instead!</span>
            <button
              onClick={() => setCompatDismissed(true)}
              className="flex-shrink-0 text-accent/60 hover:text-accent"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Transcript area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {debate.transcript.map((entry, i) => (
              <TranscriptBubble key={i} entry={entry} />
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Empty state */}
          {debate.transcript.length === 0 && debate.turnState === 'student' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center text-sm text-white/30"
            >
              Make your opening argument!
            </motion.p>
          )}
        </div>

        {/* Error toast */}
        <AnimatePresence>
          {debate.error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-auto mb-2 max-w-sm rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-center text-sm text-red-300"
            >
              {debate.error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 border-t border-white/5 bg-surface/50 px-4 py-2 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="mx-auto max-w-md">
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="font-display text-lg font-bold text-accent">
                  Debate complete!
                </p>
                <Button
                  large
                  variant="primary"
                  onClick={() => router.push('/results')}
                >
                  See your results! 🏆
                </Button>
              </motion.div>
            ) : isConfirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-3"
              >
                {/* Preview of pending argument */}
                <div
                  className="max-w-sm rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-white/80 italic max-h-24 overflow-y-auto"
                  aria-live="polite"
                >
                  &ldquo;{debate.pendingArgument}&rdquo;
                </div>

                {/* Confirm / Redo buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={debate.redoArgument}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl border border-white/15 bg-surface px-5 py-2.5 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    aria-label="Redo your argument"
                  >
                    Redo
                  </motion.button>
                  <motion.button
                    onClick={debate.confirmArgument}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    aria-label="Send your argument to Sparky"
                  >
                    Send
                  </motion.button>
                </div>

                <p className="text-xs text-white/30">
                  {debate.redoUsed ? 'Redo used' : 'You can redo once per round'}
                </p>
              </motion.div>
            ) : (
              <motion.div key="voice" layout>
                <VoiceButton
                  turnState={debate.turnState}
                  isListening={debate.isListening}
                  interimTranscript={debate.interimTranscript}
                  onTapToSpeak={debate.startStudentTurn}
                  onStopSpeaking={debate.finishStudentTurn}
                  voiceSupported={debate.voiceSupported}
                  onSubmitText={debate.submitTextArgument}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
