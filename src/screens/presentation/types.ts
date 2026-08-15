export type SlideItem =
  | { kind: "intro" }
  | { kind: "question"; qIndex: number }
  | { kind: "joker"; qIndex: number }
  | { kind: "proof"; qIndex: number }
  | { kind: "reveal"; qIndex: number }
  | { kind: "final" };

import type { Question } from "@/types";

export function buildSlidePlan(questions: Question[], hasJokers: boolean): SlideItem[] {
  const plan: SlideItem[] = [{ kind: "intro" }];
  questions.forEach((q, qIndex) => {
    plan.push({ kind: "question", qIndex });
    if (hasJokers) plan.push({ kind: "joker", qIndex });
    if (q.proofFile) plan.push({ kind: "proof", qIndex });
    plan.push({ kind: "reveal", qIndex });
  });
  plan.push({ kind: "final" });
  return plan;
}
