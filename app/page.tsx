'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { TopicGrid } from '@/components/home/TopicGrid';
import { SideSelector } from '@/components/home/SideSelector';
import { Button } from '@/components/ui/Button';
import { useDebateStore } from '@/lib/store';
import type { DebateSide, Topic } from '@/types/debate';

// Floating shape data — deterministic so SSR/CSR don't mismatch
const SHAPES = [
  { w: 72, h: 72, x: 8, y: 12, color: 'bg-primary/8', dur: 18, delay: 0, round: true },
  { w: 56, h: 56, x: 85, y: 25, color: 'bg-secondary/8', dur: 22, delay: 2, round: true },
  { w: 96, h: 96, x: 70, y: 70, color: 'bg-accent/6', dur: 25, delay: 1, round: true },
  { w: 48, h: 48, x: 20, y: 75, color: 'bg-success/8', dur: 20, delay: 3, round: true },
  { w: 64, h: 64, x: 50, y: 5, color: 'bg-primary/6', dur: 24, delay: 4, round: false },
  { w: 40, h: 40, x: 90, y: 80, color: 'bg-secondary/6', dur: 19, delay: 2, round: false },
  { w: 80, h: 80, x: 35, y: 45, color: 'bg-accent/5', dur: 26, delay: 0, round: true },
  { w: 52, h: 52, x: 5, y: 50, color: 'bg-primary/5', dur: 21, delay: 5, round: false },
];

function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {SHAPES.map((s, i) => (
        <motion.div
          key={i}
          className={`absolute ${s.color} ${s.round ? 'rounded-full' : 'rounded-2xl rotate-45'} blur-xl`}
          style={{
            width: s.w,
            height: s.h,
            left: `${s.x}%`,
            top: `${s.y}%`,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, 0, -15, 0],
            scale: [1, 1.15, 1, 0.9, 1],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { setTopic, setSides } = useDebateStore();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSide, setSelectedSide] = useState<DebateSide | null>(null);
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
  );
  const [compatDismissed, setCompatDismissed] = useState(false);

  const canStart = selectedTopic !== null && selectedSide !== null;

  const selectedTopicText = useMemo(
    () => (selectedTopic ? `"${selectedTopic.text}"` : null),
    [selectedTopic],
  );

  function handleStart() {
    if (!selectedTopic || !selectedSide) return;
    setTopic(selectedTopic);
    setSides(selectedSide);
    router.push('/debate');
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <FloatingShapes />

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-10 px-5 py-12 sm:py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Debate
            <span className="text-primary">Champ</span>
            <span className="ml-2 inline-block animate-bounce">🎤</span>
          </h1>
          <p className="max-w-md text-lg text-white/60 sm:text-xl">
            Pick a topic. Make your case. Beat Sparky.
          </p>
        </motion.div>

        {/* Browser compat banner */}
        {!voiceSupported && !compatDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="w-full max-w-md"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-3 text-sm text-accent">
              <span className="flex-1">
                Voice input isn&apos;t available in this browser. You can still debate by typing! For the full experience, try Chrome or Edge.
              </span>
              <button
                onClick={() => setCompatDismissed(true)}
                className="mt-0.5 flex-shrink-0 text-accent/60 hover:text-accent"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* Topic Grid */}
        <section className="w-full" aria-label="Choose a debate topic">
          <TopicGrid
            selectedTopic={selectedTopic}
            onSelectTopic={(topic) => {
              setSelectedTopic(topic);
              setSelectedSide(null);
            }}
          />
        </section>

        {/* Side Selector — slides up after topic is picked */}
        <AnimatePresence>
          {selectedTopic && (
            <motion.section
              key="side-selector"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-md overflow-hidden"
              aria-label="Choose your side"
            >
              <div className="rounded-2xl border border-white/10 bg-surface/80 p-6 backdrop-blur-sm">
                <p className="mb-4 text-center text-sm font-medium text-accent">
                  {selectedTopicText}
                </p>
                <SideSelector
                  selectedSide={selectedSide}
                  onSelectSide={setSelectedSide}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Start CTA — appears when ready */}
        <AnimatePresence>
          {canStart && (
            <motion.div
              key="start-btn"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <Button large variant="primary" onClick={handleStart}>
                Start Debate! 🔥
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer for bottom breathing room */}
        <div className="h-8" />
      </main>
    </div>
  );
}
