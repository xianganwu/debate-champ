'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SparkyState = 'idle' | 'speaking' | 'thinking';

interface SparkyAvatarProps {
  state?: SparkyState;
  size?: number;
  /** Optional larger size to use at sm: breakpoint and above */
  smSize?: number;
}

export function SparkyAvatar({ state = 'idle', size = 160, smSize }: SparkyAvatarProps) {
  // Use responsive size: smSize on >=640px, size on smaller screens
  const [effectiveSize, setEffectiveSize] = useState(size);

  useEffect(() => {
    if (!smSize) return;
    const mql = window.matchMedia('(min-width: 640px)');
    const update = () => setEffectiveSize(mql.matches ? smSize : size);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [size, smSize]);

  const scale = effectiveSize / 160;

  return (
    <motion.div
      className="relative select-none"
      style={{ width: effectiveSize, height: effectiveSize + 24 * scale }}
      animate={
        state === 'idle'
          ? { y: [0, -6, 0] }
          : state === 'speaking'
            ? { y: [0, -3, 0] }
            : { y: [0, -4, 0] }
      }
      transition={{
        duration: state === 'speaking' ? 0.6 : 2.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      aria-label={`Sparky the debate robot is ${state}`}
      role="img"
    >
      {/* Glow behind head when speaking */}
      <AnimatePresence>
        {state === 'speaking' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute rounded-full bg-secondary/30 blur-xl"
            style={{
              width: effectiveSize * 1.2,
              height: effectiveSize * 1.2,
              left: -effectiveSize * 0.1,
              top: 24 * scale - effectiveSize * 0.1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Antenna */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: 0, width: 4 * scale, height: 24 * scale }}
      >
        <div
          className="mx-auto bg-white/40 rounded-full"
          style={{ width: 3 * scale, height: 18 * scale }}
        />
        <motion.div
          className="absolute -left-1/2 top-0 rounded-full bg-accent"
          style={{ width: 10 * scale, height: 10 * scale, marginLeft: -1.5 * scale }}
          animate={
            state === 'speaking'
              ? { backgroundColor: ['#FFE66D', '#FF6B35', '#FFE66D'], scale: [1, 1.3, 1] }
              : { scale: [1, 1.15, 1] }
          }
          transition={{ duration: state === 'speaking' ? 0.5 : 1.8, repeat: Infinity }}
        />
      </div>

      {/* Head */}
      <div
        className="absolute left-0 overflow-hidden rounded-3xl bg-secondary border-2 border-secondary/60"
        style={{
          top: 24 * scale,
          width: effectiveSize,
          height: effectiveSize,
          boxShadow: '0 4px 24px rgba(78,205,196,0.25), inset 0 2px 0 rgba(255,255,255,0.15)',
        }}
      >
        {/* Face plate (lighter inner panel) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-2xl bg-white/10"
          style={{
            top: 16 * scale,
            width: size * 0.75,
            height: size * 0.65,
          }}
        />

        {/* Eyes */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex justify-center"
          style={{ top: 28 * scale, gap: 20 * scale }}
        >
          <Eye scale={scale} state={state} side="left" />
          <Eye scale={scale} state={state} side="right" />
        </div>

        {/* Mouth */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 20 * scale }}
        >
          <Mouth scale={scale} state={state} />
        </div>

        {/* Cheek bolts */}
        <div
          className="absolute rounded-full bg-accent/50"
          style={{
            width: 8 * scale,
            height: 8 * scale,
            left: 12 * scale,
            top: 55 * scale,
          }}
        />
        <div
          className="absolute rounded-full bg-accent/50"
          style={{
            width: 8 * scale,
            height: 8 * scale,
            right: 12 * scale,
            top: 55 * scale,
          }}
        />
      </div>

      {/* Question marks for thinking state */}
      <AnimatePresence>
        {state === 'thinking' && (
          <>
            {[
              { x: -20, y: 10, delay: 0, text: '?' },
              { x: effectiveSize + 4, y: 20, delay: 0.3, text: '?' },
              { x: -10, y: 50, delay: 0.6, text: '?' },
            ].map((q, i) => (
              <motion.span
                key={i}
                className="absolute font-display font-bold text-accent"
                style={{
                  left: q.x * scale,
                  top: q.y * scale,
                  fontSize: 22 * scale,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 1, 0], y: [10, -8, -20] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: q.delay,
                }}
              >
                {q.text}
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Eye({ scale, state, side }: { scale: number; state: SparkyState; side: 'left' | 'right' }) {
  const eyeSize = 26 * scale;

  return (
    <div
      className="relative rounded-full bg-white"
      style={{ width: eyeSize, height: eyeSize }}
    >
      {/* Pupil */}
      <motion.div
        className="absolute rounded-full bg-dark"
        style={{
          width: 12 * scale,
          height: 12 * scale,
          top: 7 * scale,
          left: 7 * scale,
        }}
        animate={
          state === 'thinking'
            ? { x: side === 'left' ? [-2, 4, -2] : [2, -4, 2] }
            : state === 'speaking'
              ? { scale: [1, 1.1, 1] }
              : {}
        }
        transition={{ duration: state === 'thinking' ? 1.5 : 0.8, repeat: Infinity }}
      />
      {/* Highlight */}
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: 5 * scale,
          height: 5 * scale,
          top: 5 * scale,
          right: 5 * scale,
        }}
      />
      {/* Glow ring when speaking */}
      {state === 'speaking' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </div>
  );
}

function Mouth({ scale, state }: { scale: number; state: SparkyState }) {
  const w = 40 * scale;

  if (state === 'speaking') {
    return (
      <motion.div
        className="rounded-xl bg-dark/60 overflow-hidden"
        style={{ width: w, originY: 0 }}
        animate={{ height: [8 * scale, 18 * scale, 8 * scale] }}
        transition={{ duration: 0.35, repeat: Infinity }}
      >
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-red-400/70"
          style={{ width: 14 * scale, height: 8 * scale }}
        />
      </motion.div>
    );
  }

  if (state === 'thinking') {
    return (
      <motion.div
        className="rounded-full bg-dark/50"
        style={{ width: 16 * scale, height: 16 * scale, marginLeft: 12 * scale }}
        animate={{ x: [-3, 3, -3] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    );
  }

  // idle — big happy smile
  return (
    <div
      className="rounded-b-full border-b-[3px] border-dark/50"
      style={{ width: w, height: 10 * scale }}
    />
  );
}
