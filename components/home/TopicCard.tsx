'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showHint, setShowHint] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);

  const toggleHint = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHint((v) => !v);
  }, []);

  // Dismiss hint on outside click (covers tapping another card, tapping backdrop, etc.)
  useEffect(() => {
    if (!showHint) return;
    function handleClick(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowHint(false);
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHint]);

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

      {/* Hint icon — 44px touch target wrapping 24px visual icon (WCAG 2.5.5 + kid-friendly) */}
      <span
        role="button"
        tabIndex={0}
        onClick={toggleHint}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShowHint((v) => !v); } }}
        aria-label={`Hint for: ${topic.text}`}
        aria-expanded={showHint}
        className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center"
      >
        <span
          className={`
            flex h-6 w-6 items-center justify-center
            rounded-full text-xs transition-all duration-200
            ${showHint
              ? 'bg-accent text-dark'
              : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white/70'
            }
          `}
          aria-hidden
        >
          💡
        </span>
      </span>

      {/* Hint popover */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            ref={hintRef}
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-12 right-1 z-20 w-56 rounded-xl border border-accent/20 bg-dark/95 px-3.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-sm"
          >
            <p className="text-xs leading-relaxed text-white/80">
              {topic.hint}
            </p>
            {/* Arrow */}
            <div className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-accent/20 bg-dark/95" />
          </motion.div>
        )}
      </AnimatePresence>

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
