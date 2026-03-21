'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Topic } from '@/types/debate';
import { checkTopicAppropriateness } from '@/lib/topic-filter';

const MIN_CHARS = 10;
const MAX_CHARS = 150;
const MIN_WORDS = 3;

interface CustomTopicInputProps {
  onSelectTopic: (topic: Topic) => void;
  /** When a preset topic is selected externally, clear the custom input */
  hasPresetSelected: boolean;
}

function makeCustomTopic(text: string): Topic {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    category: 'fun', // category is cosmetic — custom topics skip the grid
    emoji: '✏️',
    hint: 'This is your topic — you already know what to think about!',
  };
}

function validateTopic(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_CHARS) return `At least ${MIN_CHARS} characters needed`;
  if (trimmed.length > MAX_CHARS) return `Max ${MAX_CHARS} characters`;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < MIN_WORDS) return `Use at least ${MIN_WORDS} words`;
  // Content check runs after format checks — avoids showing content warnings
  // for partially typed text that's too short to be meaningful yet.
  const contentWarning = checkTopicAppropriateness(trimmed);
  if (contentWarning) return contentWarning;
  return null; // valid
}

export function CustomTopicInput({ onSelectTopic, hasPresetSelected }: CustomTopicInputProps) {
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [prevPreset, setPrevPreset] = useState(hasPresetSelected);

  // Clear custom text when user switches to a preset topic.
  // Uses React's "adjusting state during render" pattern — no effect needed.
  if (hasPresetSelected !== prevPreset) {
    setPrevPreset(hasPresetSelected);
    if (hasPresetSelected) {
      setText('');
      setTouched(false);
    }
  }

  const trimmed = text.trim();
  const validationError = validateTopic(trimmed);
  const error = touched ? validationError : null;
  const charCount = trimmed.length;
  const isValid = validationError === null;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    const topic = makeCustomTopic(trimmed);
    onSelectTopic(topic);
  }, [isValid, trimmed, onSelectTopic]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isValid) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [isValid, handleSubmit],
  );

  // Show the "selected" state when custom topic was used (no preset selected + has text)
  const isActive = !hasPresetSelected && trimmed.length > 0 && isValid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full"
    >
      <h2 className="mb-4 font-display text-xl font-bold text-white/80">
        ✏️ Or Debate Your Own Topic
      </h2>

      <div
        className={`
          rounded-2xl border-2 bg-surface p-4 transition-all duration-200
          ${isActive
            ? 'border-accent shadow-[0_0_20px_rgba(255,230,109,0.35)]'
            : 'border-transparent'
          }
        `}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!touched) setTouched(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTouched(true)}
            maxLength={MAX_CHARS}
            placeholder='e.g. "Is Minecraft better than Roblox?"'
            aria-label="Type your own debate topic"
            className="h-12 flex-1 rounded-xl border border-white/15 bg-dark/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-accent"
          />
          <motion.button
            onClick={handleSubmit}
            disabled={!isValid}
            whileTap={isValid ? { scale: 0.95 } : undefined}
            aria-label="Use this custom topic for the debate"
            className="flex h-12 flex-shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-dark transition-opacity disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Use this!
          </motion.button>
        </div>

        {/* Validation + character count */}
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="min-h-[18px]" aria-live="polite">
            {error && (
              <p className="text-xs text-red-400" role="alert">{error}</p>
            )}
          </div>
          <p
            className={`text-xs tabular-nums ${
              charCount >= MIN_CHARS ? 'text-white/30' : 'text-white/20'
            }`}
          >
            {charCount}/{MAX_CHARS}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
