'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const SPARKY_PITCH = 1.15;
const SPARKY_RATE = 1.05;

/** If an utterance doesn't fire onstart within this time, TTS is blocked (mobile). */
const UTTERANCE_START_TIMEOUT_MS = 2000;
/** Hard cap per utterance — if onend never fires (Chrome bug), bail out. */
const UTTERANCE_MAX_DURATION_MS = 15000;

const PREFERRED_VOICES = [
  'Google UK English Male',
  'Microsoft David Desktop',
  'Microsoft David',
  'Alex',                   // macOS / iOS
  'Daniel',                 // iOS English (UK)
  'Samantha',               // iOS English (US) fallback
];

function findSparkyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  const englishVoice = voices.find(
    (v) => v.lang.startsWith('en') && /male|david|daniel|james|george|tom|lee/i.test(v.name),
  );
  if (englishVoice) return englishVoice;

  const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  return voices[0];
}

/** Split text at sentence boundaries for more natural TTS pacing */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+\s*/g);
  if (!parts) return [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  voicesLoaded: boolean;
  speak: (text: string) => Promise<void>;
  cancel: () => void;
  testSpeak: () => Promise<void>;
  voiceName: string | null;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [voiceName, setVoiceName] = useState<string | null>(null);

  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current = findSparkyVoice(voices);
        setVoicesLoaded(true);
        setVoiceName(voiceRef.current?.name ?? null);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Chrome TTS pause bug workaround
  const startResumeInterval = useCallback(() => {
    if (resumeIntervalRef.current) return;
    resumeIntervalRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 5000);
  }, []);

  const stopResumeInterval = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stopResumeInterval();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [stopResumeInterval]);

  /**
   * Speak a single sentence with timeouts:
   * - If onstart doesn't fire within 2s → TTS is blocked, resolve immediately
   * - If onend doesn't fire within 15s → Chrome bug, force resolve
   */
  const speakSingleUtterance = useCallback(
    (text: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        if (cancelledRef.current) { resolve(); return; }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = SPARKY_PITCH;
        utterance.rate = SPARKY_RATE;

        if (voiceRef.current) {
          utterance.voice = voiceRef.current;
        }

        let started = false;
        let settled = false;

        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(startTimeout);
          clearTimeout(maxTimeout);
          resolve();
        };

        // Timeout: if TTS never starts (mobile blocks it), bail out
        const startTimeout = setTimeout(() => {
          if (!started) {
            console.warn('TTS blocked (no onstart) — skipping utterance');
            window.speechSynthesis.cancel();
            finish();
          }
        }, UTTERANCE_START_TIMEOUT_MS);

        // Hard max timeout: if onend never fires (Chrome pause bug), bail out
        const maxTimeout = setTimeout(() => {
          if (!settled) {
            console.warn('TTS utterance timed out — forcing completion');
            window.speechSynthesis.cancel();
            finish();
          }
        }, UTTERANCE_MAX_DURATION_MS);

        utterance.onstart = () => {
          started = true;
          setIsSpeaking(true);
        };

        utterance.onend = () => finish();

        utterance.onerror = (event) => {
          console.warn('TTS utterance error:', event.error);
          finish();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return; // silently skip — not supported
      }

      cancelledRef.current = false;
      window.speechSynthesis.cancel();
      startResumeInterval();

      try {
        const sentences = splitSentences(text);
        for (const sentence of sentences) {
          if (cancelledRef.current) break;
          await speakSingleUtterance(sentence);
        }
      } finally {
        stopResumeInterval();
        setIsSpeaking(false);
      }
    },
    [speakSingleUtterance, startResumeInterval, stopResumeInterval],
  );

  const testSpeak = useCallback(async () => {
    const phrase = "Hey! I'm Sparky, your debate buddy. Can you hear me?";
    await speak(phrase);
  }, [speak]);

  useEffect(() => {
    return () => {
      stopResumeInterval();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopResumeInterval]);

  return { isSupported, isSpeaking, voicesLoaded, speak, cancel, testSpeak, voiceName };
}
