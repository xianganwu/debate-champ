'use client';

import { useCallback, useRef, useState } from 'react';
import { useDebateStore } from '@/lib/store';
import { callDebateAPI, callFeedbackAPI } from '@/lib/debate-engine';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { playSound } from '@/lib/sounds';
import type { DebateEntry, DebateSide, Topic } from '@/types/debate';

function toKidFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
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

  // Actions
  startDebate: (topic: Topic, studentSide: DebateSide) => Promise<void>;
  startStudentTurn: () => void;
  finishStudentTurn: () => void;
  submitTextArgument: (text: string) => void;
  resetDebate: () => void;
}

export function useDebate(): UseDebateReturn {
  const store = useDebateStore();
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Guard against overlapping operations
  const processingRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const playSparkysResponse = useCallback(
    async (text: string, isComplete: boolean) => {
      store.setTurnState('sparky');

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
          setFeedback(result.feedback);
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
        const result = await callDebateAPI(
          currentTranscript,
          topic.text,
          sparkySide,
          currentRound,
        );

        // Record Sparky's entry
        const sparkyEntry: DebateEntry = {
          speaker: 'sparky',
          text: result.response,
          round: currentRound,
          timestamp: new Date(),
        };
        store.addTranscriptEntry(sparkyEntry);

        // Play Sparky's response via TTS (mic stays disabled)
        playSound('whoosh');
        await playSparkysResponse(result.response, result.isComplete);
      } catch (err) {
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

  const finishStudentTurn = useCallback(() => {
    const finalText = recognition.stopListening();
    if (!finalText.trim()) {
      // Nothing was said — stay on student turn
      return;
    }
    submitStudentArgument(finalText.trim());
  }, [recognition, submitStudentArgument]);

  const submitTextArgument = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      submitStudentArgument(trimmed);
    },
    [submitStudentArgument],
  );

  const startDebate = useCallback(
    async (topic: Topic, studentSide: DebateSide) => {
      store.resetDebate();
      setFeedback(null);
      clearError();

      store.setTopic(topic);
      store.setSides(studentSide);

      const sparkySide = studentSide === 'FOR' ? 'AGAINST' : 'FOR';
      const intro = buildIntroScript(topic.text, sparkySide);

      store.setTurnState('sparky');

      try {
        await synthesis.speak(intro);
      } catch {
        console.error('Intro TTS failed, continuing');
      }

      // Hand off to student for round 1
      store.setTurnState('student');
    },
    [store, synthesis, clearError],
  );

  const resetDebate = useCallback(() => {
    recognition.reset();
    synthesis.cancel();
    store.resetDebate();
    setFeedback(null);
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
    feedback,

    startDebate,
    startStudentTurn,
    finishStudentTurn,
    submitTextArgument,
    resetDebate,
  };
}
