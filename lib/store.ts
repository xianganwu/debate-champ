import { create } from 'zustand';
import type { DebateEntry, DebateScores, DebateSide, DebateState, Difficulty, Topic, TurnState } from '@/types/debate';

const INITIAL_STATE = {
  topic: null,
  studentSide: null,
  sparkySide: null,
  currentRound: 1,
  maxRounds: 3 as const,
  turnState: 'idle' as TurnState,
  transcript: [] as readonly DebateEntry[],
  feedback: null as string | null,
  scores: null as DebateScores | null,
  difficulty: 'medium' as Difficulty,
  pendingArgument: null as string | null,
  redoUsed: false,
  hintText: null as string | null,
  hintUsed: false,
};

export const useDebateStore = create<DebateState>()((set) => ({
  ...INITIAL_STATE,

  setTopic: (topic: Topic) => set({ topic }),

  setSides: (studentSide: DebateSide) =>
    set({
      studentSide,
      sparkySide: studentSide === 'FOR' ? 'AGAINST' : 'FOR',
    }),

  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),

  addTranscriptEntry: (entry: DebateEntry) =>
    set((state) => ({
      transcript: [...state.transcript, entry],
    })),

  advanceRound: () =>
    set((state) => ({
      currentRound: Math.min(state.currentRound + 1, state.maxRounds),
      redoUsed: false,
      pendingArgument: null,
      hintText: null,
      hintUsed: false,
    })),

  setTurnState: (turnState: TurnState) => set({ turnState }),

  setFeedback: (feedback: string | null) => set({ feedback }),

  setScores: (scores: DebateScores | null) => set({ scores }),

  updateLastTranscriptText: (text: string) =>
    set((state) => {
      const entries = [...state.transcript];
      if (entries.length === 0) return state;
      entries[entries.length - 1] = { ...entries[entries.length - 1], text };
      return { transcript: entries };
    }),

  removeLastTranscriptEntry: () =>
    set((state) => ({
      transcript: state.transcript.slice(0, -1),
    })),

  setPendingArgument: (text: string | null) => set({ pendingArgument: text }),

  setRedoUsed: (used: boolean) => set({ redoUsed: used }),

  setHintText: (text: string | null) => set({ hintText: text }),

  setHintUsed: (used: boolean) => set({ hintUsed: used }),

  resetDebate: () => set(INITIAL_STATE),

  startNewDebate: (topic, studentSide, introEntry) =>
    set((state) => ({
      ...INITIAL_STATE,
      difficulty: state.difficulty, // preserve user's difficulty selection
      topic,
      studentSide,
      sparkySide: studentSide === 'FOR' ? 'AGAINST' : 'FOR',
      transcript: [introEntry],
      turnState: 'sparky' as TurnState,
    })),
}));
