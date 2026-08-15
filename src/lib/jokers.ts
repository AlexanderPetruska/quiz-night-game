import type { Joker, JokerEffectType, Question, Team } from "@/types";

export const EFFECT_TYPE_LABELS: Record<JokerEffectType, string> = {
  multiplier: "Point Multiplier",
  doubleOrNothing: "Risk It (double or nothing)",
  fiftyFifty: "50/50",
  steal: "Steal Points",
  freeze: "Freeze Opponent",
  safetyNet: "Safety Net",
  hint: "Hint for Half Points",
  scoreSwap: "Score Swap",
  manual: "Custom Rule (I'll assign points manually)",
};

export const EFFECT_TYPES_NEEDING_MULTIPLIER: JokerEffectType[] = ["multiplier", "doubleOrNothing"];
export const EFFECT_TYPES_NEEDING_PENALTY: JokerEffectType[] = ["hint"];
export const EFFECT_TYPES_CHOICE_ONLY: JokerEffectType[] = ["fiftyFifty"];

/** Effect types whose per-team point award can be computed automatically at reveal time. */
export const AUTO_COMPUTED_EFFECT_TYPES: JokerEffectType[] = [
  "multiplier",
  "doubleOrNothing",
  "hint",
  "safetyNet",
  "fiftyFifty",
];

export type StarterTemplate = Omit<Joker, "id">;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: "Double Points",
    icon: "✨",
    description: "Correct answer scores double points.",
    effectType: "multiplier",
    multiplierValue: 2,
  },
  {
    name: "Risk It",
    icon: "🎲",
    description:
      "Double or nothing: correct answer doubles the points, incorrect answer loses points equal to the question's value.",
    effectType: "doubleOrNothing",
    multiplierValue: 2,
  },
  {
    name: "50/50",
    icon: "➗",
    description: "Host eliminates two wrong options before the reveal (multiple choice only).",
    effectType: "fiftyFifty",
  },
  {
    name: "Steal",
    icon: "🥷",
    description: "Take points from a team that answered incorrectly.",
    effectType: "steal",
  },
  {
    name: "Freeze",
    icon: "🧊",
    description: "A chosen opposing team scores 0 for this question, regardless of their answer.",
    effectType: "freeze",
  },
  {
    name: "Safety Net",
    icon: "🛟",
    description: "No point loss on an incorrect answer for this question.",
    effectType: "safetyNet",
  },
  {
    name: "Hint",
    icon: "💡",
    description: "Correct answer only awards half points.",
    effectType: "hint",
    penaltyFraction: 0.5,
  },
  {
    name: "Score Swap",
    icon: "🔄",
    description: "Swap this team's total score with another team's total score.",
    effectType: "scoreSwap",
  },
];

export interface AwardSuggestion {
  /** Suggested points to award for a correct answer. */
  correctAmount: number;
  /** Suggested points to award for an incorrect answer (0 or negative). */
  incorrectAmount: number;
  /** When true, the host should use a free-form +/- control instead of the suggested amounts. */
  manual: boolean;
  /** Optional reminder shown to the host about the joker's effect. */
  note?: string;
}

export function jokerUsedForQuestion(team: Team, questionId: string, jokers: Joker[]): Joker | undefined {
  const entry = team.jokerLog.find((log) => log.questionId === questionId);
  if (!entry) return undefined;
  return jokers.find((j) => j.id === entry.jokerId);
}

export function computeAwardSuggestion(question: Question, joker: Joker | undefined): AwardSuggestion {
  const points = question.points;

  if (!joker) {
    return { correctAmount: points, incorrectAmount: 0, manual: false };
  }

  switch (joker.effectType) {
    case "multiplier": {
      const mult = joker.multiplierValue ?? 2;
      return {
        correctAmount: Math.round(points * mult),
        incorrectAmount: 0,
        manual: false,
        note: `${joker.name}: correct answer worth ${mult}x points.`,
      };
    }
    case "doubleOrNothing": {
      const mult = joker.multiplierValue ?? 2;
      return {
        correctAmount: Math.round(points * mult),
        incorrectAmount: -points,
        manual: false,
        note: `${joker.name}: correct doubles points, incorrect loses ${points}.`,
      };
    }
    case "hint": {
      const penalty = joker.penaltyFraction ?? 0.5;
      return {
        correctAmount: Math.round(points * (1 - penalty)),
        incorrectAmount: 0,
        manual: false,
        note: `${joker.name}: reduced to ${Math.round((1 - penalty) * 100)}% of points.`,
      };
    }
    case "safetyNet":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: `${joker.name}: no point loss possible this question.`,
      };
    case "fiftyFifty":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: `${joker.name}: two wrong options were eliminated before reveal.`,
      };
    case "steal":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: true,
        note: `${joker.name}: manually move points from a team that answered incorrectly.`,
      };
    case "freeze":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: true,
        note: `${joker.name}: the frozen opposing team should score 0 this question.`,
      };
    case "scoreSwap":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: true,
        note: `${joker.name}: manually swap this team's total score with another team's.`,
      };
    case "manual":
    default:
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: true,
        note: joker.description || `${joker.name}: assign points manually.`,
      };
  }
}
