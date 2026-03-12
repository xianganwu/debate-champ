'use client';

import { useState, useCallback } from 'react';
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

export function AudioTestPanel() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TestResult>({
    tts: 'idle',
    stt: 'idle',
    audio: 'idle',
  });
  const [running, setRunning] = useState(false);

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition();

  const runTests = useCallback(async () => {
    setRunning(true);
    setResults({ tts: 'idle', stt: 'idle', audio: 'idle' });

    // Test 1: Sound effects (AudioContext)
    setResults((r) => ({ ...r, audio: 'testing' }));
    try {
      playSound('ding');
      // If no error thrown, AudioContext worked
      setResults((r) => ({ ...r, audio: 'pass' }));
    } catch {
      setResults((r) => ({ ...r, audio: 'fail' }));
    }

    // Small gap between tests
    await new Promise((res) => setTimeout(res, 500));

    // Test 2: Text-to-Speech
    setResults((r) => ({ ...r, tts: 'testing' }));
    try {
      if (!synthesis.isSupported) {
        setResults((r) => ({ ...r, tts: 'fail', ttsError: 'SpeechSynthesis not supported in this browser' }));
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

    // Test 3: Speech-to-Text (listen for 4 seconds)
    setResults((r) => ({ ...r, stt: 'testing' }));
    if (!recognition.isSupported) {
      setResults((r) => ({
        ...r,
        stt: 'fail',
        sttError: 'SpeechRecognition not supported in this browser',
      }));
    } else {
      recognition.startListening();
      // Wait 4 seconds for the user to say something
      await new Promise((res) => setTimeout(res, 4000));
      const transcript = recognition.stopListening();
      if (transcript.trim()) {
        setResults((r) => ({
          ...r,
          stt: 'pass',
          sttTranscript: transcript.trim(),
        }));
      } else {
        setResults((r) => ({
          ...r,
          stt: 'fail',
          sttError: 'No speech detected — check mic permissions and try speaking',
        }));
      }
    }

    setRunning(false);
  }, [synthesis, recognition]);

  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case 'idle': return <span className="text-white/30">-</span>;
      case 'testing': return <span className="inline-block h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />;
      case 'pass': return <span className="text-green-400">OK</span>;
      case 'fail': return <span className="text-red-400">FAIL</span>;
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
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-surface p-4 shadow-xl backdrop-blur-sm"
          >
            <h3 className="mb-3 font-display text-sm font-bold text-white/80">
              Audio Diagnostics
            </h3>

            {/* Voice info */}
            <div className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
              <div>TTS: {synthesis.isSupported ? 'supported' : 'not supported'}</div>
              <div>STT: {recognition.isSupported ? 'supported' : 'not supported'}</div>
              <div>Voice: {synthesis.voiceName ?? 'loading...'}</div>
              <div>Voices loaded: {synthesis.voicesLoaded ? 'yes' : 'no'}</div>
            </div>

            {/* Test results */}
            <div className="mb-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Sound effects</span>
                {statusIcon(results.audio)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Text-to-Speech (Sparky)</span>
                {statusIcon(results.tts)}
              </div>
              {results.ttsError && (
                <p className="text-red-400/80 pl-2">{results.ttsError}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-white/70">Microphone (say something!)</span>
                {statusIcon(results.stt)}
              </div>
              {results.sttError && (
                <p className="text-red-400/80 pl-2">{results.sttError}</p>
              )}
              {results.sttTranscript && (
                <p className="text-green-400/80 pl-2">Heard: &ldquo;{results.sttTranscript}&rdquo;</p>
              )}
            </div>

            <button
              onClick={runTests}
              disabled={running}
              className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {running ? 'Running tests...' : 'Run Audio Tests'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
