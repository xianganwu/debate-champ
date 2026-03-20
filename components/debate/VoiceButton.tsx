'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TurnState } from '@/types/debate';

interface VoiceButtonProps {
  turnState: TurnState;
  isListening: boolean;
  interimTranscript: string;
  onTapToSpeak: () => void;
  onStopSpeaking: () => void;
  voiceSupported?: boolean;
  onSubmitText?: (text: string) => void;
}

type ButtonMode = 'waiting' | 'ready' | 'recording' | 'processing';

function getMode(turnState: TurnState, isListening: boolean): ButtonMode {
  if (turnState === 'processing') return 'processing';
  if (isListening) return 'recording';
  if (turnState === 'student') return 'ready';
  // 'confirm', 'idle', 'sparky', 'feedback' all map to waiting
  return 'waiting';
}

// SVG icons as components to avoid string literals
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

// Pulsing ripple rings behind the button
function RippleRings({ color }: { color: string }) {
  return (
    <>
      {[0, 0.5, 1].map((delay) => (
        <motion.div
          key={delay}
          className={`absolute inset-0 rounded-full border-2 ${color}`}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, delay }}
        />
      ))}
    </>
  );
}

// Spinner ring
function Spinner() {
  return (
    <motion.div
      className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

const modeConfig: Record<
  ButtonMode,
  { bg: string; label: string; sublabel: string }
> = {
  waiting: {
    bg: 'bg-white/10',
    label: 'Sparky is talking...',
    sublabel: '',
  },
  ready: {
    bg: 'bg-primary',
    label: 'Tap to speak',
    sublabel: 'Your turn!',
  },
  recording: {
    bg: 'bg-red-500',
    label: 'Listening...',
    sublabel: 'Tap to finish',
  },
  processing: {
    bg: 'bg-surface',
    label: 'Thinking...',
    sublabel: '',
  },
};

// Send icon for text input mode
function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

// Text input fallback when voice is not supported
function TextInput({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState('');

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  }

  return (
    <div className="flex w-full max-w-sm items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        disabled={disabled}
        placeholder="Type your argument..."
        className="h-12 flex-1 rounded-xl border border-white/15 bg-surface px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-primary disabled:opacity-50"
        aria-label="Type your argument"
      />
      <motion.button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        whileTap={{ scale: 0.92 }}
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label="Send argument"
      >
        <SendIcon className="h-5 w-5" />
      </motion.button>
    </div>
  );
}

export function VoiceButton({
  turnState,
  isListening,
  interimTranscript,
  onTapToSpeak,
  onStopSpeaking,
  voiceSupported = true,
  onSubmitText,
}: VoiceButtonProps) {
  const mode = getMode(turnState, isListening);
  const config = modeConfig[mode];
  const disabled = mode === 'waiting' || mode === 'processing';

  // Text input fallback for browsers without voice support
  if (!voiceSupported && onSubmitText) {
    const textDisabled = turnState !== 'student';

    return (
      <div className="flex flex-col items-center gap-3">
        {turnState === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            Sparky is thinking...
          </div>
        )}
        {turnState === 'sparky' && (
          <p className="text-sm font-bold text-white/50">Sparky is talking...</p>
        )}
        {turnState === 'student' && (
          <p className="text-sm font-bold text-accent">Your turn! Type your argument:</p>
        )}
        <TextInput onSubmit={onSubmitText} disabled={textDisabled} />
      </div>
    );
  }

  function handleClick() {
    if (mode === 'ready') onTapToSpeak();
    else if (mode === 'recording') onStopSpeaking();
  }

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-3">
      {/* Button container — compact on mobile */}
      <div className="relative flex items-center justify-center h-[56px] w-[56px] sm:h-[120px] sm:w-[120px]">
        {/* Ripple rings */}
        {mode === 'recording' && <RippleRings color="border-red-400/50" />}
        {mode === 'ready' && <RippleRings color="border-primary/30" />}

        {/* Spinner for processing */}
        {mode === 'processing' && <Spinner />}

        {/* Main button */}
        <motion.button
          onClick={handleClick}
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.92 }}
          whileHover={disabled ? undefined : { scale: 1.05 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
          className={`
            relative z-10 flex items-center justify-center
            h-12 w-12 sm:h-24 sm:w-24
            rounded-full
            transition-colors duration-300
            disabled:cursor-not-allowed
            focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent
            ${config.bg}
            ${mode === 'ready' ? 'shadow-xl shadow-primary/40' : ''}
            ${mode === 'recording' ? 'shadow-xl shadow-red-500/40' : ''}
          `}
          aria-label={config.label}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 500, damping: 25 }}
            >
              {mode === 'waiting' && <LockIcon className="w-5 h-5 sm:w-9 sm:h-9 text-white/40" />}
              {mode === 'ready' && <MicIcon className="w-6 h-6 sm:w-10 sm:h-10 text-white" />}
              {mode === 'recording' && <StopIcon className="w-5 h-5 sm:w-9 sm:h-9 text-white" />}
              {mode === 'processing' && (
                <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full border-3 border-white/20 border-t-white animate-spin" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Labels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="flex flex-col items-center gap-0.5 text-center"
        >
          <span className="text-sm font-bold text-white/80">{config.label}</span>
          {config.sublabel && (
            <span className="text-xs text-white/50">{config.sublabel}</span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Live transcript preview while recording */}
      <AnimatePresence>
        {mode === 'recording' && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-xs rounded-xl bg-white/5 px-4 py-2 text-center text-sm text-white/60 italic"
          >
            &ldquo;{interimTranscript}&rdquo;
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
