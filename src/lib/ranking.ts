import type { Team } from "@/types";

export interface RankedTeam {
  team: Team;
  rank: number;
}

/**
 * Standard competition ranking ("1224"): tied teams share the same rank, and the next distinct
 * score's rank skips ahead by however many teams were tied above it (two teams tied for 1st
 * means the next team is ranked 3rd, not 2nd).
 */
export function rankTeams(teams: Team[]): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const result: RankedTeam[] = [];
  let rank = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i].score !== sorted[i - 1].score) {
      rank = i + 1;
    }
    result.push({ team: sorted[i], rank });
  }
  return result;
}
