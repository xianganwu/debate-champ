'use client';

import { motion } from 'framer-motion';
import type { DebateEntry } from '@/types/debate';

interface TranscriptBubbleProps {
  entry: DebateEntry;
}

export function TranscriptBubble({ entry }: TranscriptBubbleProps) {
  const isSparky = entry.speaker === 'sparky';

  return (
    <motion.div
      initial={{ opacity: 0, x: isSparky ? -40 : 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
      className={`flex ${isSparky ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          ${
            isSparky
              ? 'rounded-bl-sm bg-secondary/20 border border-secondary/30'
              : 'rounded-br-sm bg-primary/20 border border-primary/30'
          }
        `}
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isSparky ? 'text-secondary' : 'text-primary'
            }`}
          >
            {isSparky ? 'Sparky' : 'You'}
          </span>
          <span className="text-xs text-white/30">Round {entry.round}</span>
        </div>
        <p className="text-sm leading-relaxed text-white/90">{entry.text}</p>
      </div>
    </motion.div>
  );
}
