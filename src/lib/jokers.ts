import type { TranslationKey } from "@/i18n/locales/en";
import type { Joker, JokerEffectType, Question, Team } from "@/types";

export const EFFECT_TYPE_LABEL_KEYS: Record<JokerEffectType, TranslationKey> = {
  multiplier: "jokers.effectType.multiplier",
  doubleOrNothing: "jokers.effectType.doubleOrNothing",
  fiftyFifty: "jokers.effectType.fiftyFifty",
  steal: "jokers.effectType.steal",
  freeze: "jokers.effectType.freeze",
  safetyNet: "jokers.effectType.safetyNet",
  hint: "jokers.effectType.hint",
  scoreSwap: "jokers.effectType.scoreSwap",
  manual: "jokers.effectType.manual",
};

export const EFFECT_TYPES_NEEDING_MULTIPLIER: JokerEffectType[] = ["multiplier", "doubleOrNothing"];
export const EFFECT_TYPES_NEEDING_PENALTY: JokerEffectType[] = ["hint"];
export const EFFECT_TYPES_CHOICE_ONLY: JokerEffectType[] = ["fiftyFifty"];

/** Effect types that act on another team and need a target picked when invoked. */
export const EFFECT_TYPES_NEEDING_TARGET: JokerEffectType[] = ["steal", "freeze", "scoreSwap"];

export interface StarterTemplateDef {
  effectType: JokerEffectType;
  icon: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  multiplierValue?: number;
  penaltyFraction?: number;
}

export const STARTER_TEMPLATES: StarterTemplateDef[] = [
  {
    effectType: "multiplier",
    icon: "✨",
    nameKey: "jokerTemplates.doublePoints.name",
    descriptionKey: "jokerTemplates.doublePoints.description",
    multiplierValue: 2,
  },
  {
    effectType: "doubleOrNothing",
    icon: "🎲",
    nameKey: "jokerTemplates.riskIt.name",
    descriptionKey: "jokerTemplates.riskIt.description",
    multiplierValue: 2,
  },
  {
    effectType: "fiftyFifty",
    icon: "➗",
    nameKey: "jokerTemplates.fiftyFifty.name",
    descriptionKey: "jokerTemplates.fiftyFifty.description",
  },
  {
    effectType: "steal",
    icon: "🥷",
    nameKey: "jokerTemplates.steal.name",
    descriptionKey: "jokerTemplates.steal.description",
  },
  {
    effectType: "freeze",
    icon: "🧊",
    nameKey: "jokerTemplates.freeze.name",
    descriptionKey: "jokerTemplates.freeze.description",
  },
  {
    effectType: "safetyNet",
    icon: "🛟",
    nameKey: "jokerTemplates.safetyNet.name",
    descriptionKey: "jokerTemplates.safetyNet.description",
  },
  {
    effectType: "hint",
    icon: "💡",
    nameKey: "jokerTemplates.hint.name",
    descriptionKey: "jokerTemplates.hint.description",
    penaltyFraction: 0.5,
  },
  {
    effectType: "scoreSwap",
    icon: "🔄",
    nameKey: "jokerTemplates.scoreSwap.name",
    descriptionKey: "jokerTemplates.scoreSwap.description",
  },
];

export type AwardNote = { key: TranslationKey; vars: Record<string, string | number> } | { raw: string };

export interface AwardSuggestion {
  /** Suggested points to award for a correct answer. */
  correctAmount: number;
  /** Suggested points to award for an incorrect answer (0 or negative). */
  incorrectAmount: number;
  /** When true, the host should use a free-form +/- control instead of the suggested amounts. */
  manual: boolean;
  /** Optional reminder shown to the host about the joker's effect. */
  note?: AwardNote;
}

/** The joker a team invoked for a given question (a team may invoke at most one joker per question). */
export function jokerUsedForQuestion(team: Team, questionId: string, jokers: Joker[]): Joker | undefined {
  const entry = team.jokerLog.find((log) => log.questionId === questionId);
  if (!entry) return undefined;
  return jokers.find((j) => j.id === entry.jokerId);
}

export interface IncomingTargetedJoker {
  byTeam: Team;
  joker: Joker;
}

/** All teams (and their joker) that targeted `targetTeamId` with `effectType` this question. */
function incomingTargetedJokers(
  targetTeamId: string,
  questionId: string,
  teams: Team[],
  jokers: Joker[],
  effectType: JokerEffectType,
): IncomingTargetedJoker[] {
  const results: IncomingTargetedJoker[] = [];
  for (const byTeam of teams) {
    for (const entry of byTeam.jokerLog) {
      if (entry.questionId !== questionId || entry.targetTeamId !== targetTeamId) continue;
      const joker = jokers.find((j) => j.id === entry.jokerId);
      if (joker?.effectType === effectType) {
        results.push({ byTeam, joker });
      }
    }
  }
  return results;
}

/** Teams that froze `targetTeamId` this question — if any, that team must score 0 regardless of their answer. */
export function getIncomingFreezes(
  targetTeamId: string,
  questionId: string,
  teams: Team[],
  jokers: Joker[],
): IncomingTargetedJoker[] {
  return incomingTargetedJokers(targetTeamId, questionId, teams, jokers, "freeze");
}

/** Teams that will steal from `targetTeamId` this question if that team answers incorrectly. */
export function getIncomingSteals(
  targetTeamId: string,
  questionId: string,
  teams: Team[],
  jokers: Joker[],
): IncomingTargetedJoker[] {
  return incomingTargetedJokers(targetTeamId, questionId, teams, jokers, "steal");
}

export function computeAwardSuggestion(question: Question, joker: Joker | undefined): AwardSuggestion {
  const points = question.points;

  if (!joker) {
    return { correctAmount: points, incorrectAmount: 0, manual: false };
  }

  const jokerName = joker.name;

  switch (joker.effectType) {
    case "multiplier": {
      const mult = joker.multiplierValue ?? 2;
      return {
        correctAmount: Math.round(points * mult),
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.multiplier", vars: { jokerName, mult } },
      };
    }
    case "doubleOrNothing": {
      const mult = joker.multiplierValue ?? 2;
      return {
        correctAmount: Math.round(points * mult),
        incorrectAmount: -points,
        manual: false,
        note: { key: "jokers.note.doubleOrNothing", vars: { jokerName, points } },
      };
    }
    case "hint": {
      const penalty = joker.penaltyFraction ?? 0.5;
      return {
        correctAmount: Math.round(points * (1 - penalty)),
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.hint", vars: { jokerName, percent: Math.round((1 - penalty) * 100) } },
      };
    }
    case "safetyNet":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.safetyNet", vars: { jokerName } },
      };
    case "fiftyFifty":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.fiftyFifty", vars: { jokerName } },
      };
    case "steal":
      // Steal doesn't change the inviting team's own award — it moves points from the target,
      // handled separately via getIncomingSteals at reveal time.
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.steal", vars: { jokerName } },
      };
    case "freeze":
      // Freeze doesn't change the inviting team's own award either.
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.freeze", vars: { jokerName } },
      };
    case "scoreSwap":
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: false,
        note: { key: "jokers.note.scoreSwap", vars: { jokerName } },
      };
    case "manual":
    default:
      return {
        correctAmount: points,
        incorrectAmount: 0,
        manual: true,
        note: joker.description
          ? { raw: joker.description }
          : { key: "jokers.note.manualFallback", vars: { jokerName } },
      };
  }
}
