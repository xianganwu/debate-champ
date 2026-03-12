import { create } from 'zustand';
import type { DebateEntry, DebateSide, DebateState, Topic, TurnState } from '@/types/debate';

const INITIAL_STATE = {
  topic: null,
  studentSide: null,
  sparkySide: null,
  currentRound: 1,
  maxRounds: 3 as const,
  turnState: 'idle' as TurnState,
  transcript: [] as readonly DebateEntry[],
  studentScore: 0,
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

  resetDebate: () => set(INITIAL_STATE),
}));
