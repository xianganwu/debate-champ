'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const SPARKY_PITCH = 1.15;
const SPARKY_RATE = 1.05;

const PREFERRED_VOICES = [
  'Google UK English Male',
  'Microsoft David Desktop',
  'Microsoft David',
  'Alex',
];

function findSparkyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  // Try preferred voices in order
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  // Fall back to any English male-sounding voice
  const englishVoice = voices.find(
    (v) => v.lang.startsWith('en') && /male|david|daniel|james|george/i.test(v.name),
  );
  if (englishVoice) return englishVoice;

  // Fall back to any English voice
  const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  // Last resort: first available
  return voices[0];
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  voicesLoaded: boolean;
  speak: (text: string) => Promise<void>;
  cancel: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current = findSparkyVoice(voices);
        setVoicesLoaded(true);
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

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          reject(new Error('SpeechSynthesis not supported'));
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = SPARKY_PITCH;
        utterance.rate = SPARKY_RATE;

        if (voiceRef.current) {
          utterance.voice = voiceRef.current;
        }

        utterance.onstart = () => setIsSpeaking(true);

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isSupported, isSpeaking, voicesLoaded, speak, cancel };
}
