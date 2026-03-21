'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SparkyAvatar } from '@/components/debate/SparkyAvatar';

const QUIPS = [
  "Back for more? I've been practicing...",
  'I let you win last time. Not today.',
  'Pick a topic. Any topic. I dare you.',
  'My circuits are warmed up. Are you?',
  "I've upgraded my arguing skills since last time!",
  'Think you can beat me? Let\'s find out.',
  "I don't lose debates. I just... let you think you won.",
  "Today's the day I finally convince you pineapple belongs on pizza.",
  'Ready to have your mind changed?',
  'I argued with a calculator yesterday. I won.',
  "You bring the topic, I'll bring the heat.",
  "Fair warning — I've been reading the dictionary.",
] as const;

/**
 * Small Sparky avatar with a random quip on the homepage.
 * One random line per visit — makes Sparky feel alive.
 */
export function SparkyQuip() {
  // Pick a random quip once per mount — stable across renders.
  // Safe: parent page.tsx is 'use client', so this only runs client-side.
  // If ever imported from a server component, this would cause a hydration mismatch.
  const [quip] = useState(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/50 px-4 py-3 backdrop-blur-sm sm:gap-4 sm:px-5"
    >
      <div className="flex-shrink-0">
        <SparkyAvatar state="idle" size={40} smSize={52} />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm italic text-white/60 sm:text-base"
      >
        &ldquo;{quip}&rdquo;
      </motion.p>
    </motion.div>
  );
}
