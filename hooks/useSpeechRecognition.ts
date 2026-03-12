'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | undefined ?? null;
}

// Slightly longer timeout on mobile to account for slower network / mic activation
const IS_MOBILE = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const SILENCE_TIMEOUT_MS = IS_MOBILE ? 4500 : 3500;

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => string;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported] = useState(() => getSpeechRecognition() !== null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback((): string => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    return finalTranscriptRef.current;
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    // Clean up any prior instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    finalTranscriptRef.current = '';
    setTranscript('');

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
      }

      // Safari may not support interimResults — show final text as it arrives
      setTranscript(finalTranscriptRef.current + interim);

      // Reset silence timer on every result
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (event) => {
      // These errors are expected in normal usage across browsers
      // iOS Safari may also return 'not-allowed' if mic permission was denied
      const benign = ['no-speech', 'aborted'];
      if (!benign.includes(event.error)) {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);

      // Start initial silence timer
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, SILENCE_TIMEOUT_MS);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [clearSilenceTimer, stopListening]);

  const reset = useCallback(() => {
    stopListening();
    finalTranscriptRef.current = '';
    setTranscript('');
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [clearSilenceTimer]);

  return { isSupported, isListening, transcript, startListening, stopListening, reset };
}
