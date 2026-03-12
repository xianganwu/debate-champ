'use client';

import { motion } from 'framer-motion';
import type { DebateSide } from '@/types/debate';

interface SideSelectorProps {
  selectedSide: DebateSide | null;
  onSelectSide: (side: DebateSide) => void;
}

interface SideButtonProps {
  side: DebateSide;
  label: string;
  emoji: string;
  isSelected: boolean;
  color: string;
  glowColor: string;
  onSelect: () => void;
}

function SideButton({
  label,
  emoji,
  isSelected,
  color,
  glowColor,
  onSelect,
}: SideButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`
        relative flex flex-1 flex-col items-center justify-center gap-2
        rounded-2xl border-3 p-6 text-center
        min-h-[100px] cursor-pointer
        font-bold text-lg transition-all duration-200
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        ${
          isSelected
            ? `${color} border-current shadow-[0_0_24px_${glowColor}]`
            : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
        }
      `}
    >
      <span className="text-4xl">{emoji}</span>
      <span>{label}</span>
    </motion.button>
  );
}

export function SideSelector({ selectedSide, onSelectSide }: SideSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col gap-4"
    >
      <h2 className="font-display text-xl font-bold text-center text-white/90">
        Pick your side
      </h2>

      <div className="flex gap-4">
        <SideButton
          side="FOR"
          label="I'm FOR"
          emoji="👍"
          isSelected={selectedSide === 'FOR'}
          color="text-success"
          glowColor="rgba(6,214,160,0.3)"
          onSelect={() => onSelectSide('FOR')}
        />
        <SideButton
          side="AGAINST"
          label="I'm AGAINST"
          emoji="👎"
          isSelected={selectedSide === 'AGAINST'}
          color="text-primary"
          glowColor="rgba(255,107,53,0.3)"
          onSelect={() => onSelectSide('AGAINST')}
        />
      </div>

      <p className="text-center text-sm text-white/50">
        Sparky will argue the other side!
      </p>
    </motion.div>
  );
}
