export interface Topic {
  readonly id: string;
  readonly text: string;
  readonly category: TopicCategory;
  readonly emoji: string;
  readonly hint: string;
}

export type TopicCategory = 'fun' | 'school' | 'big-ideas' | 'anime';

export type DebateSide = 'FOR' | 'AGAINST';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type TurnState = 'idle' | 'student' | 'confirm' | 'processing' | 'sparky' | 'feedback';

export interface DebateEntry {
  readonly speaker: 'student' | 'sparky';
  readonly text: string;
  readonly round: number;
  readonly timestamp: Date;
}

export interface DebateScores {
  readonly reasoning: number;
  readonly persuasion: number;
  readonly engagement: number;
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
  feedback: string | null;
  scores: DebateScores | null;

  // Difficulty
  difficulty: Difficulty;

  // Redo
  pendingArgument: string | null;
  redoUsed: boolean;

  // Hint
  hintText: string | null;
  hintUsed: boolean;

  // Actions
  setTopic: (topic: Topic) => void;
  setSides: (studentSide: DebateSide) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  addTranscriptEntry: (entry: DebateEntry) => void;
  advanceRound: () => void;
  setTurnState: (state: TurnState) => void;
  setFeedback: (feedback: string | null) => void;
  setScores: (scores: DebateScores | null) => void;
  updateLastTranscriptText: (text: string) => void;
  removeLastTranscriptEntry: () => void;
  setPendingArgument: (text: string | null) => void;
  setRedoUsed: (used: boolean) => void;
  setHintText: (text: string | null) => void;
  setHintUsed: (used: boolean) => void;
  resetDebate: () => void;
  startNewDebate: (topic: Topic, studentSide: DebateSide, introEntry: DebateEntry) => void;
}

export interface DebateApiRequest {
  readonly messages: readonly DebateEntry[];
  readonly topic: string;
  readonly sparkySide: string;
  readonly round: number;
  readonly difficulty?: Difficulty;
}

export interface HintApiRequest {
  readonly topic: string;
  readonly studentSide: string;
  readonly round: number;
  readonly transcript: readonly DebateEntry[];
  readonly difficulty?: Difficulty;
}

export interface HintApiResponse {
  readonly hint: string;
}

export interface DebateHistoryEntry {
  readonly id: string;
  readonly topic: Topic;
  readonly studentSide: DebateSide;
  readonly difficulty: Difficulty;
  readonly scores: DebateScores | null;
  readonly stars: number;
  readonly timestamp: string;
}

export interface FeedbackApiRequest {
  readonly transcript: readonly DebateEntry[];
  readonly difficulty?: Difficulty;
}

export interface FeedbackApiResponse {
  readonly feedback: string;
  readonly scores: DebateScores | null;
}
