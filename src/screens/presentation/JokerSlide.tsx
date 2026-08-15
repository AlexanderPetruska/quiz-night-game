import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import { stopAdvance } from "@/screens/presentation/interaction";
import type { Joker, Question, Team } from "@/types";

interface JokerSlideProps {
  question: Question;
  teams: Team[];
  activeJokers: Joker[];
  onInvoke: (teamId: string, jokerId: string) => void;
  onUndo: (teamId: string) => void;
  onAdvance: () => void;
}

export function JokerSlide({ question, teams, activeJokers, onInvoke, onUndo, onAdvance }: JokerSlideProps) {
  return (
    <SlideFrame slideKey={`joker-${question.id}`} onAdvance={onAdvance}>
      <h2 className="mb-2 text-3xl font-semibold">Jokers</h2>
      <p className="mb-8 text-muted-foreground">Any team may play a joker before the answer is revealed.</p>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2" onClick={stopAdvance}>
        {teams.map((team) => {
          const used = team.jokerLog.find((entry) => entry.questionId === question.id);
          const usedJoker = used ? activeJokers.find((j) => j.id === used.jokerId) : undefined;

          return (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="text-lg">{team.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {usedJoker ? (
                  <div className="flex items-center justify-between">
                    <p className="text-lg">
                      {usedJoker.icon} Used <span className="font-medium">{usedJoker.name}</span>
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => onUndo(team.id)}>
                      Undo
                    </Button>
                  </div>
                ) : activeJokers.length === 0 ? (
                  <p className="text-muted-foreground">No jokers available.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeJokers.map((joker) => {
                      const remaining = team.jokersRemaining[joker.id] ?? 0;
                      if (remaining <= 0) return null;
                      return (
                        <Button
                          key={joker.id}
                          variant="outline"
                          onClick={() => onInvoke(team.id, joker.id)}
                        >
                          {joker.icon} {joker.name}{" "}
                          <span className="ml-1 text-xs text-muted-foreground">({remaining} left)</span>
                        </Button>
                      );
                    })}
                    {activeJokers.every((j) => (team.jokersRemaining[j.id] ?? 0) <= 0) && (
                      <p className="text-muted-foreground">No jokers remaining.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button size="lg" className="mt-10" onClick={onAdvance}>
        Continue
      </Button>
    </SlideFrame>
  );
}
