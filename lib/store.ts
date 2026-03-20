import { create } from 'zustand';
import type { DebateEntry, DebateScores, DebateSide, DebateState, Topic, TurnState } from '@/types/debate';

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
};

export const useDebateStore = create<DebateState>()((set) => ({
  ...INITIAL_STATE,

  setTopic: (topic: Topic) => set({ topic }),

  setSides: (studentSide: DebateSide) =>
    set({
      studentSide,
      sparkySide: studentSide === 'FOR' ? 'AGAINST' : 'FOR',
    }),

  addTranscriptEntry: (entry: DebateEntry) =>
    set((state) => ({
      transcript: [...state.transcript, entry],
    })),

  advanceRound: () =>
    set((state) => ({
      currentRound: Math.min(state.currentRound + 1, state.maxRounds),
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

  resetDebate: () => set(INITIAL_STATE),

  startNewDebate: (topic, studentSide, introEntry) =>
    set({
      ...INITIAL_STATE,
      topic,
      studentSide,
      sparkySide: studentSide === 'FOR' ? 'AGAINST' : 'FOR',
      transcript: [introEntry],
      turnState: 'sparky' as TurnState,
    }),
}));
