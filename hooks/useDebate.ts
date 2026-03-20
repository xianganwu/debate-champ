'use client';

import { useCallback, useRef, useState } from 'react';
import { useDebateStore } from '@/lib/store';
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

export function useDebate(): UseDebateReturn {
  const store = useDebateStore();
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();

  const [error, setError] = useState<string | null>(null);

  // Guard against overlapping operations
  const processingRef = useRef(false);

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
        store.setTurnState('processing');

        const currentTranscript = useDebateStore.getState().transcript;
        try {
          const result = await callFeedbackAPI(currentTranscript);
          store.setFeedback(result.feedback);
          store.setScores(result.scores);
        } catch (err) {
          setError(toKidFriendlyError(err));
        }

        store.setTurnState('feedback');
      } else {
        // Advance round after both sides spoke, then hand mic back
        store.advanceRound();
        store.setTurnState('student');
        playSound('ding');
      }
    },
    [synthesis, store],
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
      store.addTranscriptEntry(studentEntry);
      store.setTurnState('processing');

      try {
        const currentTranscript = useDebateStore.getState().transcript;

        // Add a placeholder entry for Sparky that will be updated as chunks arrive
        const sparkyEntry: DebateEntry = {
          speaker: 'sparky',
          text: '',
          round: currentRound,
          timestamp: new Date(),
        };
        store.addTranscriptEntry(sparkyEntry);
        store.setTurnState('sparky');

        let streamedText = '';
        const result = await callDebateAPIStreaming(
          currentTranscript,
          topic.text,
          sparkySide,
          currentRound,
          (delta) => {
            streamedText += delta;
            store.updateLastTranscriptText(streamedText);
          },
        );

        // Finalize with cleaned text from the 'done' event
        store.updateLastTranscriptText(result.fullText);

        // Play Sparky's response via TTS
        playSound('whoosh');
        await playSparkysResponse(result.fullText, result.isComplete);
      } catch (err) {
        // Remove the empty sparky placeholder if streaming failed
        const lastEntry = useDebateStore.getState().transcript.at(-1);
        if (lastEntry?.speaker === 'sparky' && !lastEntry.text) {
          store.removeLastTranscriptEntry();
        }
        setError(toKidFriendlyError(err));
        // Re-enable student turn so they can retry
        store.setTurnState('student');
      } finally {
        processingRef.current = false;
      }
    },
    [store, clearError, playSparkysResponse],
  );

  const startStudentTurn = useCallback(() => {
    if (store.turnState !== 'student') return;
    clearError();
    recognition.startListening();
  }, [store.turnState, recognition, clearError]);

  const enterConfirmOrSubmit = useCallback(
    (text: string) => {
      const { redoUsed } = useDebateStore.getState();
      if (redoUsed) {
        // Already used redo — submit directly, skip confirmation
        submitStudentArgument(text);
      } else {
        // Show confirmation step
        store.setPendingArgument(text);
        store.setTurnState('confirm');
      }
    },
    [store, submitStudentArgument],
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
      store.setTurnState('student');
      return;
    }
    store.setPendingArgument(null);
    submitStudentArgument(pendingArgument);
  }, [store, submitStudentArgument]);

  const redoArgument = useCallback(() => {
    store.setPendingArgument(null);
    store.setRedoUsed(true);
    store.setTurnState('student');
  }, [store]);

  const startDebate = useCallback(
    async (topic: Topic, studentSide: DebateSide) => {
      store.setFeedback(null);
      store.setScores(null);
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
      store.startNewDebate(topic, studentSide, introEntry);

      try {
        await synthesis.speak(intro);
      } catch {
        console.error('Intro TTS failed, continuing');
      }

      // Hand off to student for round 1
      store.setTurnState('student');
      playSound('ding');
    },
    [store, synthesis, clearError],
  );

  const resetDebate = useCallback(() => {
    recognition.reset();
    synthesis.cancel();
    store.resetDebate();
    clearError();
  }, [recognition, synthesis, store, clearError]);

  return {
    isListening: recognition.isListening,
    isSpeaking: synthesis.isSpeaking,
    voiceSupported: recognition.isSupported && synthesis.isSupported,
    interimTranscript: recognition.transcript,

    topic: store.topic,
    studentSide: store.studentSide,
    sparkySide: store.sparkySide,
    currentRound: store.currentRound,
    turnState: store.turnState,
    transcript: store.transcript,

    error,
    feedback: store.feedback,

    pendingArgument: store.pendingArgument,
    redoUsed: store.redoUsed,

    startDebate,
    startStudentTurn,
    finishStudentTurn,
    submitTextArgument,
    confirmArgument,
    redoArgument,
    resetDebate,
  };
}
