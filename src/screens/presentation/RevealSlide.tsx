import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/I18nContext";
import {
  computeAwardSuggestion,
  getIncomingFreezes,
  getIncomingSteals,
  jokerUsedForQuestion,
} from "@/lib/jokers";
import type { AwardNote } from "@/lib/jokers";
import { playReveal } from "@/lib/sound";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import { stopAdvance } from "@/screens/presentation/interaction";
import type { Joker, Question, Team } from "@/types";

export type AwardOutcome = "correct" | "incorrect" | "manual" | "frozen";

interface RevealSlideProps {
  question: Question;
  teams: Team[];
  jokers: Joker[];
  scoredTeamIds: Set<string>;
  onAward: (teamId: string, amount: number, outcome: AwardOutcome) => void;
  onUndoAward: (teamId: string) => void;
  manualAmounts: Record<string, string>;
  onManualAmountChange: (teamId: string, value: string) => void;
  onAdvance: () => void;
  isLast: boolean;
}

export function RevealSlide({
  question,
  teams,
  jokers,
  scoredTeamIds,
  onAward,
  onUndoAward,
  manualAmounts,
  onManualAmountChange,
  onAdvance,
  isLast,
}: RevealSlideProps) {
  const { t } = useTranslation();
  const allScored = teams.every((t) => scoredTeamIds.has(t.id));
  const remaining = teams.length - scoredTeamIds.size;

  useEffect(() => {
    playReveal();
  }, [question.id]);

  const hasRevealContent = question.type === "choice" || !!question.correctAnswerText;

  function resolveNote(note: AwardNote | undefined): string | undefined {
    if (!note) return undefined;
    return "raw" in note ? note.raw : t(note.key, note.vars);
  }

  return (
    <SlideFrame slideKey={`reveal-${question.id}`} onAdvance={onAdvance}>
      {hasRevealContent && (
        <h2 className="mb-6 text-2xl font-medium text-muted-foreground">
          {t("presentation.reveal.correctAnswerHeading")}
        </h2>
      )}

      {question.type === "choice" && question.options && (
        <div className="mb-10 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex;
            return (
              <div
                key={i}
                className={`rounded-xl border px-6 py-5 text-center text-2xl font-medium ${
                  isCorrect
                    ? "border-green-500 bg-green-500/15 text-green-400"
                    : "border-border bg-card text-muted-foreground opacity-60"
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            );
          })}
        </div>
      )}

      {question.type === "open" && question.correctAnswerText && (
        <p className="mb-10 max-w-3xl text-center text-4xl font-bold text-green-400">
          {question.correctAnswerText}
        </p>
      )}

      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2" onClick={stopAdvance}>
        {teams.map((team) => {
          const joker = jokerUsedForQuestion(team, question.id, jokers);
          const suggestion = computeAwardSuggestion(question, joker);
          const scored = scoredTeamIds.has(team.id);

          const freezes = getIncomingFreezes(team.id, question.id, teams, jokers);
          const steals = getIncomingSteals(team.id, question.id, teams, jokers);
          const isFrozen = freezes.length > 0;
          const noteText = resolveNote(suggestion.note);

          return (
            <div key={team.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-lg font-semibold">{team.name}</span>
                <span className="text-muted-foreground">{t("presentation.scorePts", { count: team.score })}</span>
              </div>

              {isFrozen ? (
                <div className="space-y-2">
                  <p className="text-sm text-cyan-400">
                    {t("presentation.reveal.frozenBy", { names: freezes.map((f) => f.byTeam.name).join(", ") })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" disabled={scored} onClick={() => onAward(team.id, 0, "frozen")}>
                      {t("presentation.reveal.award0Frozen")}
                    </Button>
                    {scored && (
                      <Button size="sm" variant="ghost" onClick={() => onUndoAward(team.id)}>
                        {t("presentation.reveal.undoButton")}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {noteText && <p className="mb-2 text-xs text-muted-foreground">{noteText}</p>}
                  {steals.length > 0 && (
                    <p className="mb-2 text-xs text-amber-400">
                      {t("presentation.reveal.stealWarning", {
                        names: steals.map((s) => s.byTeam.name).join(", "),
                        count: question.points,
                      })}
                    </p>
                  )}

                  {!suggestion.manual ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        disabled={scored}
                        onClick={() => onAward(team.id, suggestion.correctAmount, "correct")}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        {t("presentation.reveal.correctButton", { amount: suggestion.correctAmount })}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={scored}
                        onClick={() => onAward(team.id, suggestion.incorrectAmount, "incorrect")}
                      >
                        {t("presentation.reveal.incorrectButton", {
                          amount: suggestion.incorrectAmount === 0 ? "+0" : suggestion.incorrectAmount,
                        })}
                      </Button>
                      {scored && (
                        <Button size="sm" variant="ghost" onClick={() => onUndoAward(team.id)}>
                          {t("presentation.reveal.undoButton")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        placeholder={t("presentation.reveal.manualAmountPlaceholder")}
                        value={manualAmounts[team.id] ?? ""}
                        onChange={(e) => onManualAmountChange(team.id, e.target.value)}
                        disabled={scored}
                      />
                      <Button
                        size="sm"
                        disabled={scored || !manualAmounts[team.id]}
                        onClick={() => onAward(team.id, Number(manualAmounts[team.id]) || 0, "manual")}
                      >
                        {t("presentation.reveal.applyButton")}
                      </Button>
                      {scored && (
                        <Button size="sm" variant="ghost" onClick={() => onUndoAward(team.id)}>
                          {t("presentation.reveal.undoButton")}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {!allScored && (
        <p className="mt-10 text-sm text-muted-foreground">
          {t("presentation.reveal.scoreMoreTeams", { count: remaining })}
        </p>
      )}
      <Button
        size="lg"
        className={allScored ? "mt-4" : "mt-2"}
        disabled={!allScored}
        onClick={(e) => {
          e.stopPropagation();
          onAdvance();
        }}
      >
        {isLast ? t("presentation.reveal.seeResultsButton") : t("presentation.reveal.nextQuestionButton")}
      </Button>
    </SlideFrame>
  );
}
