'use client';

import { motion } from 'framer-motion';

interface RoundIndicatorProps {
  currentRound: number;
  maxRounds: number;
}

export function RoundIndicator({ currentRound, maxRounds }: RoundIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-sm font-bold text-white/70">
        Round {currentRound} of {maxRounds}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: maxRounds }, (_, i) => {
          const roundNum = i + 1;
          const isComplete = roundNum < currentRound;
          const isCurrent = roundNum === currentRound;

          return (
            <motion.div
              key={i}
              className={`
                h-3 w-3 rounded-full border-2
                ${
                  isComplete
                    ? 'border-success bg-success'
                    : isCurrent
                      ? 'border-accent bg-accent'
                      : 'border-white/20 bg-transparent'
                }
              `}
              animate={
                isCurrent
                  ? { scale: [1, 1.3, 1], boxShadow: ['0 0 0 0 rgba(255,230,109,0)', '0 0 0 6px rgba(255,230,109,0.3)', '0 0 0 0 rgba(255,230,109,0)'] }
                  : {}
              }
              transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
            />
          );
        })}
      </div>
    </div>
  );
}
