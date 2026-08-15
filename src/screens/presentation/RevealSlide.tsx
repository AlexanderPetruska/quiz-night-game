import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeAwardSuggestion, jokerUsedForQuestion } from "@/lib/jokers";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import { stopAdvance } from "@/screens/presentation/interaction";
import type { Joker, Question, Team } from "@/types";

interface RevealSlideProps {
  question: Question;
  teams: Team[];
  jokers: Joker[];
  scoredTeamIds: Set<string>;
  onAward: (teamId: string, amount: number) => void;
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
  return (
    <SlideFrame slideKey={`reveal-${question.id}`} onAdvance={onAdvance}>
      <h2 className="mb-6 text-2xl font-medium text-muted-foreground">Correct Answer</h2>

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

      {question.type === "open" && (
        <p className="mb-10 max-w-3xl text-center text-4xl font-bold text-green-400">
          {question.correctAnswerText || "(no answer text provided)"}
        </p>
      )}

      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2" onClick={stopAdvance}>
        {teams.map((team) => {
          const joker = jokerUsedForQuestion(team, question.id, jokers);
          const suggestion = computeAwardSuggestion(question, joker);
          const scored = scoredTeamIds.has(team.id);

          return (
            <div key={team.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-lg font-semibold">{team.name}</span>
                <span className="text-muted-foreground">{team.score} pts</span>
              </div>
              {suggestion.note && <p className="mb-2 text-xs text-muted-foreground">{suggestion.note}</p>}

              {!suggestion.manual ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={scored}
                    onClick={() => onAward(team.id, suggestion.correctAmount)}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    Correct +{suggestion.correctAmount}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={scored} onClick={() => onAward(team.id, suggestion.incorrectAmount)}>
                    Incorrect {suggestion.incorrectAmount === 0 ? "+0" : suggestion.incorrectAmount}
                  </Button>
                  {scored && (
                    <Button size="sm" variant="ghost" onClick={() => onUndoAward(team.id)}>
                      Undo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24"
                    placeholder="±pts"
                    value={manualAmounts[team.id] ?? ""}
                    onChange={(e) => onManualAmountChange(team.id, e.target.value)}
                    disabled={scored}
                  />
                  <Button
                    size="sm"
                    disabled={scored || !manualAmounts[team.id]}
                    onClick={() => onAward(team.id, Number(manualAmounts[team.id]) || 0)}
                  >
                    Apply
                  </Button>
                  {scored && (
                    <Button size="sm" variant="ghost" onClick={() => onUndoAward(team.id)}>
                      Undo
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button size="lg" className="mt-10" onClick={onAdvance}>
        {isLast ? "See Results" : "Next Question"}
      </Button>
    </SlideFrame>
  );
}
