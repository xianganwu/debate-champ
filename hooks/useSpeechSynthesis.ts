'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const SPARKY_PITCH = 1.15;
const SPARKY_RATE = 1.05;

const PREFERRED_VOICES = [
  'Google UK English Male',
  'Microsoft David Desktop',
  'Microsoft David',
  'Alex',                   // macOS / iOS
  'Daniel',                 // iOS English (UK)
  'Samantha',               // iOS English (US) fallback
];

function findSparkyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  // Try preferred voices in order
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  // Fall back to any English male-sounding voice
  const englishVoice = voices.find(
    (v) => v.lang.startsWith('en') && /male|david|daniel|james|george|tom|lee/i.test(v.name),
  );
  if (englishVoice) return englishVoice;

  // Fall back to any English voice
  const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  // Last resort: first available
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
  /** Speak a short test phrase — useful for verifying audio works */
  testSpeak: () => Promise<void>;
  /** The name of the selected voice (for diagnostics) */
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

    // Voices may already be loaded
    loadVoices();

    // Chrome fires this event asynchronously
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Chrome has a bug where TTS pauses after ~15s and onend never fires.
  // Workaround: call speechSynthesis.resume() every 5s while speaking.
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
    stopResumeInterval();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [stopResumeInterval]);

  const speakSingleUtterance = useCallback(
    (text: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = SPARKY_PITCH;
        utterance.rate = SPARKY_RATE;

        if (voiceRef.current) {
          utterance.voice = voiceRef.current;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => resolve();

        utterance.onerror = (event) => {
          // 'interrupted' and 'canceled' happen during normal cancel() calls
          if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve();
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`));
          }
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        throw new Error('SpeechSynthesis not supported');
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Start the Chrome resume workaround
      startResumeInterval();

      try {
        // Split into sentences for more natural pacing and to avoid Chrome's
        // ~15s pause bug (shorter utterances are more reliable).
        const sentences = splitSentences(text);

        for (const sentence of sentences) {
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

  // Cleanup on unmount
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
