'use client';

import { motion } from 'framer-motion';
import type { Difficulty } from '@/types/debate';

interface DifficultySelectorProps {
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
}

const LEVELS: { value: Difficulty; label: string; emoji: string; desc: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🌱', desc: 'Gentle & encouraging' },
  { value: 'medium', label: 'Medium', emoji: '⚡', desc: 'Balanced challenge' },
  { value: 'hard', label: 'Hard', emoji: '🔥', desc: 'No mercy!' },
];

export function DifficultySelector({ selectedDifficulty, onSelectDifficulty }: DifficultySelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-center text-sm font-bold text-white/50">Difficulty</h3>
      <div className="flex gap-2">
        {LEVELS.map(({ value, label, emoji, desc }) => {
          const isSelected = selectedDifficulty === value;
          return (
            <motion.button
              key={value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDifficulty(value)}
              aria-pressed={isSelected}
              className={`
                flex flex-1 flex-col items-center gap-1 rounded-xl border-2 px-3 py-2.5
                text-center transition-all duration-200 cursor-pointer
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
                ${
                  isSelected
                    ? 'border-accent text-accent bg-accent/10 shadow-[0_0_12px_rgba(255,230,109,0.2)]'
                    : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white/80'
                }
              `}
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] text-white/40">{desc}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
