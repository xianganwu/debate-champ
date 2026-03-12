type SoundName = 'ding' | 'whoosh';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume suspended context (Chrome requires user gesture to activate)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function playTone(
  audioCtx: AudioContext,
  startHz: number,
  endHz: number,
  durationMs: number,
): void {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startHz, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(
    endHz,
    audioCtx.currentTime + durationMs / 1000,
  );

  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(
    0,
    audioCtx.currentTime + durationMs / 1000,
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + durationMs / 1000);
}

const SOUNDS: Record<SoundName, { startHz: number; endHz: number; durationMs: number }> = {
  ding: { startHz: 440, endHz: 880, durationMs: 150 },
  whoosh: { startHz: 600, endHz: 200, durationMs: 200 },
};

export function playSound(name: SoundName): void {
  try {
    const audioCtx = getContext();
    if (!audioCtx) return;
    const { startHz, endHz, durationMs } = SOUNDS[name];
    playTone(audioCtx, startHz, endHz, durationMs);
  } catch {
    // Audio failures are never fatal
  }
}
