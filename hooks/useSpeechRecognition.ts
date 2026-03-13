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
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | undefined ?? null;
}

const SILENCE_TIMEOUT_MS = 5000;

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  /** Last error from speech recognition (for diagnostics) */
  lastError: string | null;
  startListening: () => void;
  /**
   * Stops recognition and returns the captured transcript.
   * Waits briefly for the browser to deliver final results after stop().
   */
  stopListening: () => Promise<string>;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported] = useState(() => getSpeechRecognition() !== null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');
  // Always tracks the latest full transcript (final + interim) so we never
  // lose speech that hasn't been marked isFinal yet (common on mobile).
  const latestTranscriptRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppingRef = useRef(false);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  /**
   * Stop recognition and return transcript. Returns a Promise because
   * calling recognition.stop() causes the browser to deliver one final
   * onresult event asynchronously — we wait up to 500ms for it.
   */
  const stopListening = useCallback((): Promise<string> => {
    clearSilenceTimer();

    // Prevent re-entrant calls (silence timer + manual stop)
    if (stoppingRef.current || !recognitionRef.current) {
      setIsListening(false);
      return Promise.resolve(finalTranscriptRef.current || latestTranscriptRef.current);
    }

    stoppingRef.current = true;
    const recognition = recognitionRef.current;

    return new Promise<string>((resolve) => {
      // Give the browser up to 500ms to deliver the final result after stop()
      const timeout = setTimeout(() => finish(), 500);

      function finish() {
        clearTimeout(timeout);
        recognitionRef.current = null;
        stoppingRef.current = false;
        setIsListening(false);
        // Prefer finalized text, but fall back to latest (includes interim)
        resolve(finalTranscriptRef.current || latestTranscriptRef.current);
      }

      // Override onend — it fires after the last onresult from stop()
      recognition.onend = () => finish();

      try {
        recognition.stop();
      } catch {
        finish();
      }
    });
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    // Clean up any prior instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    stoppingRef.current = false;
    setTranscript('');
    setLastError(null);

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onaudiostart = () => {
      console.log('[STT] Audio stream started — mic is active');
    };

    recognition.onspeechstart = () => {
      console.log('[STT] Speech detected');
    };

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

      const full = finalTranscriptRef.current + interim;
      latestTranscriptRef.current = full;
      setTranscript(full);

      // Reset silence timer on every result
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (event) => {
      const benign = ['no-speech', 'aborted'];
      if (!benign.includes(event.error)) {
        console.error('[STT] Error:', event.error);
        setLastError(event.error);
      }
    };

    recognition.onend = () => {
      // If we're not in the middle of an explicit stop, this means the browser
      // ended recognition on its own (e.g. mobile ended the session early).
      // If we still have the ref, it means this was an unexpected end.
      if (recognitionRef.current && !stoppingRef.current) {
        console.warn('[STT] Recognition ended unexpectedly');
      }
      clearSilenceTimer();
      recognitionRef.current = null;
      stoppingRef.current = false;
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[STT] Failed to start:', msg);
      setLastError(msg);
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [clearSilenceTimer, stopListening]);

  const reset = useCallback(() => {
    stopListening();
    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    setTranscript('');
    setLastError(null);
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

  return {
    isSupported,
    isListening,
    transcript,
    lastError,
    startListening,
    stopListening,
    reset,
  };
}
