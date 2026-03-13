'use client';

import { motion } from 'framer-motion';
import type { Topic, TopicCategory } from '@/types/debate';

interface TopicCardProps {
  topic: Topic;
  isSelected: boolean;
  onSelect: (topic: Topic) => void;
}

const categoryColors: Record<TopicCategory, string> = {
  fun: 'text-primary',
  school: 'text-secondary',
  'big-ideas': 'text-accent',
  anime: 'text-primary',
};

const categoryLabels: Record<TopicCategory, string> = {
  fun: 'Fun',
  school: 'School',
  'big-ideas': 'Big Ideas',
  anime: 'Anime',
};

export function TopicCard({ topic, isSelected, onSelect }: TopicCardProps) {
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => onSelect(topic)}
      aria-pressed={isSelected}
      className={`
        relative flex flex-col items-start gap-2
        rounded-2xl bg-surface p-5 text-left
        min-h-[120px] w-full cursor-pointer
        border-2 transition-all duration-200
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        ${
          isSelected
            ? 'border-accent shadow-[0_0_20px_rgba(255,230,109,0.35)]'
            : 'border-transparent hover:border-white/10 hover:shadow-xl hover:shadow-black/30'
        }
      `}
    >
      <span className="text-3xl leading-none">{topic.emoji}</span>
      <span className="text-sm font-semibold leading-snug text-white/90">
        {topic.text}
      </span>
      <span className={`mt-auto text-xs font-medium uppercase tracking-wider ${categoryColors[topic.category]}`}>
        {categoryLabels[topic.category]}
      </span>

      {isSelected && (
        <motion.span
          layoutId="selected-check"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-dark text-xs font-bold"
          aria-hidden
        >
          ✓
        </motion.span>
      )}
    </motion.button>
  );
}
