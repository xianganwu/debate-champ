export interface Topic {
  readonly id: string;
  readonly text: string;
  readonly category: TopicCategory;
  readonly emoji: string;
}

export type TopicCategory = 'fun' | 'school' | 'big-ideas';

export type DebateSide = 'FOR' | 'AGAINST';

export type TurnState = 'idle' | 'student' | 'processing' | 'sparky' | 'feedback';

export interface DebateEntry {
  readonly speaker: 'student' | 'sparky';
  readonly text: string;
  readonly round: number;
  readonly timestamp: Date;
}

export interface DebateState {
  // Setup
  topic: Topic | null;
  studentSide: DebateSide | null;
  sparkySide: DebateSide | null;

  // Debate state
  currentRound: number;
  maxRounds: 3;
  turnState: TurnState;

  // Content
  transcript: readonly DebateEntry[];
  studentScore: number;

  // Actions
  setTopic: (topic: Topic) => void;
  setSides: (studentSide: DebateSide) => void;
  addTranscriptEntry: (entry: DebateEntry) => void;
  advanceRound: () => void;
  setTurnState: (state: TurnState) => void;
  resetDebate: () => void;
}

export interface DebateApiRequest {
  readonly messages: readonly DebateEntry[];
  readonly topic: string;
  readonly sparkySide: string;
  readonly round: number;
}

export interface DebateApiResponse {
  readonly response: string;
  readonly isComplete: boolean;
}

export interface FeedbackApiRequest {
  readonly transcript: readonly DebateEntry[];
}

export interface FeedbackApiResponse {
  readonly feedback: string;
  readonly score: number;
}
