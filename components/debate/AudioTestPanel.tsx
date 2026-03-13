'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { playSound } from '@/lib/sounds';

type TestStatus = 'idle' | 'testing' | 'pass' | 'fail';

interface TestResult {
  tts: TestStatus;
  stt: TestStatus;
  audio: TestStatus;
  ttsError?: string;
  sttError?: string;
  sttTranscript?: string;
}

/** How long the mic test listens for speech */
const MIC_LISTEN_MS = 6000;

export function AudioTestPanel() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TestResult>({
    tts: 'idle',
    stt: 'idle',
    audio: 'idle',
  });
  const [running, setRunning] = useState(false);
  const [micCountdown, setMicCountdown] = useState(0);

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition();
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const runTests = useCallback(async () => {
    setRunning(true);
    setResults({ tts: 'idle', stt: 'idle', audio: 'idle' });

    // --- Test 1: Sound effects (AudioContext) ---
    setResults((r) => ({ ...r, audio: 'testing' }));
    try {
      playSound('ding');
      setResults((r) => ({ ...r, audio: 'pass' }));
    } catch {
      setResults((r) => ({ ...r, audio: 'fail' }));
    }

    await new Promise((res) => setTimeout(res, 500));

    // --- Test 2: Text-to-Speech ---
    setResults((r) => ({ ...r, tts: 'testing' }));
    try {
      if (!synthesis.isSupported) {
        setResults((r) => ({ ...r, tts: 'fail', ttsError: 'SpeechSynthesis not supported' }));
      } else {
        await synthesis.testSpeak();
        setResults((r) => ({ ...r, tts: 'pass' }));
      }
    } catch (err) {
      setResults((r) => ({
        ...r,
        tts: 'fail',
        ttsError: err instanceof Error ? err.message : 'Unknown TTS error',
      }));
    }

    await new Promise((res) => setTimeout(res, 500));

    // --- Test 3: Speech-to-Text ---
    setResults((r) => ({ ...r, stt: 'testing' }));

    if (!recognition.isSupported) {
      setResults((r) => ({
        ...r,
        stt: 'fail',
        sttError: 'SpeechRecognition not supported in this browser',
      }));
      setRunning(false);
      return;
    }

    // Start listening
    recognition.startListening();

    // Countdown timer so user knows how long they have
    const seconds = Math.ceil(MIC_LISTEN_MS / 1000);
    setMicCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setMicCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // Wait for the listen period
    await new Promise((res) => setTimeout(res, MIC_LISTEN_MS));

    // Stop and get transcript
    const transcript = await recognition.stopListening();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setMicCountdown(0);

    if (transcript.trim()) {
      setResults((r) => ({
        ...r,
        stt: 'pass',
        sttTranscript: transcript.trim(),
      }));
    } else {
      // Build a diagnostic error message
      let errorMsg = 'No speech detected.';
      if (recognition.lastError) {
        errorMsg += ` Error: ${recognition.lastError}`;
      }
      if (!recognition.isListening) {
        errorMsg += ' Recognition may have ended early.';
      }
      setResults((r) => ({
        ...r,
        stt: 'fail',
        sttError: errorMsg,
      }));
    }

    setRunning(false);
  }, [synthesis, recognition]);

  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case 'idle': return <span className="text-white/30">-</span>;
      case 'testing': return <span className="inline-block h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />;
      case 'pass': return <span className="text-green-400 font-bold">OK</span>;
      case 'fail': return <span className="text-red-400 font-bold">FAIL</span>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface/60 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-surface hover:text-white/70"
        aria-label="Test audio"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08" />
        </svg>
        Test Audio
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-surface p-4 shadow-xl backdrop-blur-sm"
          >
            <h3 className="mb-3 font-display text-sm font-bold text-white/80">
              Audio Diagnostics
            </h3>

            {/* System info */}
            <div className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50 space-y-0.5">
              <div>TTS: {synthesis.isSupported ? 'supported' : 'NOT supported'}</div>
              <div>STT: {recognition.isSupported ? 'supported' : 'NOT supported'}</div>
              <div>Voice: {synthesis.voiceName ?? 'loading...'}</div>
              <div>Voices loaded: {synthesis.voicesLoaded ? 'yes' : 'no'}</div>
              {recognition.lastError && (
                <div className="text-red-400">Last STT error: {recognition.lastError}</div>
              )}
            </div>

            {/* Test results */}
            <div className="mb-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/70">1. Sound effects</span>
                {statusIcon(results.audio)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">2. Text-to-Speech</span>
                {statusIcon(results.tts)}
              </div>
              {results.ttsError && (
                <p className="text-red-400/80 pl-4">{results.ttsError}</p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-white/70">
                  3. Microphone
                  {results.stt === 'testing' && micCountdown > 0 && (
                    <span className="ml-1 text-accent">— speak now! ({micCountdown}s)</span>
                  )}
                </span>
                {statusIcon(results.stt)}
              </div>
              {results.stt === 'testing' && recognition.transcript && (
                <p className="text-accent/80 pl-4 italic">
                  Hearing: &ldquo;{recognition.transcript}&rdquo;
                </p>
              )}
              {results.sttError && (
                <p className="text-red-400/80 pl-4">{results.sttError}</p>
              )}
              {results.sttTranscript && (
                <p className="text-green-400/80 pl-4">
                  Heard: &ldquo;{results.sttTranscript}&rdquo;
                </p>
              )}
            </div>

            <button
              onClick={runTests}
              disabled={running}
              className="w-full rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {running ? 'Running tests...' : 'Run Audio Tests'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
