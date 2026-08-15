export type JokerEffectType =
  | "multiplier"
  | "doubleOrNothing"
  | "fiftyFifty"
  | "steal"
  | "freeze"
  | "safetyNet"
  | "hint"
  | "scoreSwap"
  | "manual";

export interface Joker {
  id: string;
  name: string;
  icon: string;
  description: string;
  effectType: JokerEffectType;
  multiplierValue?: number;
  penaltyFraction?: number;
}

export interface QuizMeta {
  id: string;
  name: string;
  createdAt: string;
  activeJokerIds: string[];
  jokerUsesPerTeam: Record<string, number>;
  defaultTimerSeconds?: number;
}

export type QuestionType = "choice" | "open";
export type ProofType = "video" | "image";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctIndex?: number;
  correctAnswerText?: string;
  proofFile?: string;
  proofType?: ProofType;
  category?: string;
  order: number;
  points: number;
}

export interface JokerLogEntry {
  questionId: string;
  jokerId: string;
  /** For jokers that act on another team (steal, freeze, score swap): which team it targeted. */
  targetTeamId?: string;
}

export interface Team {
  id: string;
  name: string;
  members: string[];
  score: number;
  jokersRemaining: Record<string, number>;
  jokerLog: JokerLogEntry[];
}

export interface QuizSummary {
  meta: QuizMeta;
  questionCount: number;
}
