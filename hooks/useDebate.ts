'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebateStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { callDebateAPIStreaming, callFeedbackAPI } from '@/lib/debate-engine';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { playSound } from '@/lib/sounds';
import type { DebateEntry, DebateSide, Topic } from '@/types/debate';

function toKidFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  console.error('Debate error:', raw);
  if (raw.includes('API key') || raw.includes('configuration'))
    return "Sparky can't connect right now — ask a grown-up to check the setup!";
  if (raw.includes('fetch') || raw.includes('network') || raw.includes('Failed'))
    return "Uh oh, looks like the internet hiccuped! Try again in a sec.";
  if (raw.includes('timeout') || raw.includes('Timeout'))
    return "Sparky took too long to think! Let's try that again.";
  return "Sparky got confused! Let's try that again.";
}

function buildIntroScript(topic: string, sparkySide: string): string {
  return (
    `Hey there! I'm Sparky, your debate buddy! ` +
    `Today we're debating: "${topic}". ` +
    `I'll be arguing ${sparkySide}. ` +
    `We'll go 3 rounds. You go first! Give me your best argument!`
  );
}

export interface UseDebateReturn {
  // Voice state
  isListening: boolean;
  isSpeaking: boolean;
  voiceSupported: boolean;
  interimTranscript: string;

  // Debate state (from store)
  topic: Topic | null;
  studentSide: DebateSide | null;
  sparkySide: DebateSide | null;
  currentRound: number;
  turnState: ReturnType<typeof useDebateStore.getState>['turnState'];
  transcript: readonly DebateEntry[];

  // Error state
  error: string | null;

  // Feedback
  feedback: string | null;

  // Redo
  pendingArgument: string | null;
  redoUsed: boolean;

  // Actions
  startDebate: (topic: Topic, studentSide: DebateSide) => Promise<void>;
  startStudentTurn: () => void;
  finishStudentTurn: () => void;
  submitTextArgument: (text: string) => void;
  confirmArgument: () => void;
  redoArgument: () => void;
  resetDebate: () => void;
}

// Stable action selectors — Zustand guarantees these are referentially stable
const selectActions = (s: ReturnType<typeof useDebateStore.getState>) => ({
  setTopic: s.setTopic,
  setSides: s.setSides,
  addTranscriptEntry: s.addTranscriptEntry,
  advanceRound: s.advanceRound,
  setTurnState: s.setTurnState,
  setFeedback: s.setFeedback,
  setScores: s.setScores,
  updateLastTranscriptText: s.updateLastTranscriptText,
  removeLastTranscriptEntry: s.removeLastTranscriptEntry,
  setPendingArgument: s.setPendingArgument,
  setRedoUsed: s.setRedoUsed,
  resetDebate: s.resetDebate,
  startNewDebate: s.startNewDebate,
});

export function useDebate(): UseDebateReturn {
  // Subscribe to individual state slices — only re-render when that specific value changes
  const topic = useDebateStore((s) => s.topic);
  const studentSide = useDebateStore((s) => s.studentSide);
  const sparkySide = useDebateStore((s) => s.sparkySide);
  const currentRound = useDebateStore((s) => s.currentRound);
  const turnState = useDebateStore((s) => s.turnState);
  const transcript = useDebateStore((s) => s.transcript);
  const feedback = useDebateStore((s) => s.feedback);
  const pendingArgument = useDebateStore((s) => s.pendingArgument);
  const redoUsed = useDebateStore((s) => s.redoUsed);

  // Actions are stable refs — useShallow does shallow equality on the returned object,
  // so this won't cause re-renders since the function references never change.
  const actions = useDebateStore(useShallow(selectActions));

  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();

  const [error, setError] = useState<string | null>(null);

  // Guard against overlapping operations
  const processingRef = useRef(false);

  // RAF-batched streaming: accumulate deltas and flush once per frame
  const streamBufferRef = useRef('');
  const rafIdRef = useRef<number | null>(null);

  // Cancel any pending RAF on unmount to prevent post-teardown store mutations
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const playSparkysResponse = useCallback(
    async (text: string, isComplete: boolean) => {
      try {
        await synthesis.speak(text);
      } catch {
        // TTS failure is non-fatal — transcript is still visible
        console.error('TTS playback failed, continuing');
      }

      if (isComplete) {
        // Debate is over — fetch feedback
        actions.setTurnState('processing');

        const currentTranscript = useDebateStore.getState().transcript;
        try {
          const result = await callFeedbackAPI(currentTranscript);
          actions.setFeedback(result.feedback);
          actions.setScores(result.scores);
        } catch (err) {
          setError(toKidFriendlyError(err));
        }

        actions.setTurnState('feedback');
      } else {
        // Advance round after both sides spoke, then hand mic back
        actions.advanceRound();
        actions.setTurnState('student');
        playSound('ding');
      }
    },
    [synthesis, actions],
  );

  const submitStudentArgument = useCallback(
    async (text: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      clearError();

      const { topic, sparkySide, currentRound } = useDebateStore.getState();
      if (!topic || !sparkySide) {
        processingRef.current = false;
        return;
      }

      // Record student's entry
      const studentEntry: DebateEntry = {
        speaker: 'student',
        text,
        round: currentRound,
        timestamp: new Date(),
      };
      actions.addTranscriptEntry(studentEntry);
      actions.setTurnState('processing');

      try {
        const currentTranscript = useDebateStore.getState().transcript;

        // Add a placeholder entry for Sparky that will be updated as chunks arrive
        const sparkyEntry: DebateEntry = {
          speaker: 'sparky',
          text: '',
          round: currentRound,
          timestamp: new Date(),
        };
        actions.addTranscriptEntry(sparkyEntry);
        actions.setTurnState('sparky');

        // RAF-batched streaming: accumulate chunks and paint once per frame
        streamBufferRef.current = '';
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        const result = await callDebateAPIStreaming(
          currentTranscript,
          topic.text,
          sparkySide,
          currentRound,
          (delta) => {
            streamBufferRef.current += delta;
            if (rafIdRef.current === null) {
              rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                actions.updateLastTranscriptText(streamBufferRef.current);
              });
            }
          },
        );

        // Cancel any pending RAF and finalize with cleaned text
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        actions.updateLastTranscriptText(result.fullText);

        // Play Sparky's response via TTS
        playSound('whoosh');
        await playSparkysResponse(result.fullText, result.isComplete);
      } catch (err) {
        // Remove the empty sparky placeholder if streaming failed
        const lastEntry = useDebateStore.getState().transcript.at(-1);
        if (lastEntry?.speaker === 'sparky' && !lastEntry.text) {
          actions.removeLastTranscriptEntry();
        }
        setError(toKidFriendlyError(err));
        // Re-enable student turn so they can retry
        actions.setTurnState('student');
      } finally {
        processingRef.current = false;
      }
    },
    [actions, clearError, playSparkysResponse],
  );

  const startStudentTurn = useCallback(() => {
    if (turnState !== 'student') return;
    clearError();
    recognition.startListening();
  }, [turnState, recognition, clearError]);

  const enterConfirmOrSubmit = useCallback(
    (text: string) => {
      const { redoUsed } = useDebateStore.getState();
      if (redoUsed) {
        // Already used redo — submit directly, skip confirmation
        submitStudentArgument(text);
      } else {
        // Show confirmation step
        actions.setPendingArgument(text);
        actions.setTurnState('confirm');
      }
    },
    [actions, submitStudentArgument],
  );

  const finishStudentTurn = useCallback(async () => {
    const finalText = await recognition.stopListening();
    if (!finalText.trim()) {
      // Nothing was said — stay on student turn
      return;
    }
    enterConfirmOrSubmit(finalText.trim());
  }, [recognition, enterConfirmOrSubmit]);

  const submitTextArgument = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      enterConfirmOrSubmit(trimmed);
    },
    [enterConfirmOrSubmit],
  );

  const confirmArgument = useCallback(() => {
    const { pendingArgument } = useDebateStore.getState();
    if (!pendingArgument) {
      // Guard: no pending argument — reset to student turn
      actions.setTurnState('student');
      return;
    }
    actions.setPendingArgument(null);
    submitStudentArgument(pendingArgument);
  }, [actions, submitStudentArgument]);

  const redoArgument = useCallback(() => {
    actions.setPendingArgument(null);
    actions.setRedoUsed(true);
    actions.setTurnState('student');
  }, [actions]);

  const startDebate = useCallback(
    async (topic: Topic, studentSide: DebateSide) => {
      actions.setFeedback(null);
      actions.setScores(null);
      clearError();

      const sparkySide = studentSide === 'FOR' ? 'AGAINST' : 'FOR';
      const intro = buildIntroScript(topic.text, sparkySide);

      const introEntry: DebateEntry = {
        speaker: 'sparky',
        text: intro,
        round: 0,
        timestamp: new Date(),
      };

      // Atomic: reset + set topic/sides/transcript/turnState in a single set() call.
      // This prevents the debate page from briefly rendering null when topic goes to null.
      actions.startNewDebate(topic, studentSide, introEntry);

      try {
        await synthesis.speak(intro);
      } catch {
        console.error('Intro TTS failed, continuing');
      }

      // Hand off to student for round 1
      actions.setTurnState('student');
      playSound('ding');
    },
    [actions, synthesis, clearError],
  );

  const resetDebate = useCallback(() => {
    recognition.reset();
    synthesis.cancel();
    actions.resetDebate();
    clearError();
  }, [recognition, synthesis, actions, clearError]);

  return {
    isListening: recognition.isListening,
    isSpeaking: synthesis.isSpeaking,
    voiceSupported: recognition.isSupported && synthesis.isSupported,
    interimTranscript: recognition.transcript,

    topic,
    studentSide,
    sparkySide,
    currentRound,
    turnState,
    transcript,

    error,
    feedback,

    pendingArgument,
    redoUsed,

    startDebate,
    startStudentTurn,
    finishStudentTurn,
    submitTextArgument,
    confirmArgument,
    redoArgument,
    resetDebate,
  };
}
