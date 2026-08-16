import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/I18nContext";
import { EFFECT_TYPES_NEEDING_TARGET } from "@/lib/jokers";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import { stopAdvance } from "@/screens/presentation/interaction";
import type { Joker, Question, Team } from "@/types";

interface JokerSlideProps {
  question: Question;
  teams: Team[];
  activeJokers: Joker[];
  onInvoke: (teamId: string, jokerId: string, targetTeamId?: string) => void;
  onUndo: (teamId: string) => void;
  onAdvance: () => void;
}

interface PendingTarget {
  teamId: string;
  joker: Joker;
}

export function JokerSlide({ question, teams, activeJokers, onInvoke, onUndo, onAdvance }: JokerSlideProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingTarget | undefined>();

  function handleJokerClick(teamId: string, joker: Joker) {
    if (EFFECT_TYPES_NEEDING_TARGET.includes(joker.effectType)) {
      setPending({ teamId, joker });
    } else {
      onInvoke(teamId, joker.id);
    }
  }

  function handlePickTarget(targetTeamId: string) {
    if (!pending) return;
    onInvoke(pending.teamId, pending.joker.id, targetTeamId);
    setPending(undefined);
  }

  return (
    <SlideFrame slideKey={`joker-${question.id}`} onAdvance={onAdvance}>
      <h2 className="mb-2 text-3xl font-semibold">{t("presentation.joker.heading")}</h2>
      <p className="mb-8 text-muted-foreground">{t("presentation.joker.subtitle")}</p>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2" onClick={stopAdvance}>
        {teams.map((team) => {
          const used = team.jokerLog.find((entry) => entry.questionId === question.id);
          const usedJoker = used ? activeJokers.find((j) => j.id === used.jokerId) : undefined;
          const usedTargetName = used?.targetTeamId
            ? teams.find((t) => t.id === used.targetTeamId)?.name
            : undefined;
          const isPickingForThisTeam = pending?.teamId === team.id;

          return (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="text-lg">{team.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {isPickingForThisTeam ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {pending.joker.icon} {pending.joker.name} {t("presentation.joker.chooseTargetSuffix")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {teams.filter((t) => t.id !== team.id).length === 0 && (
                        <p className="text-sm text-muted-foreground">{t("presentation.joker.noOtherTeams")}</p>
                      )}
                      {teams
                        .filter((t) => t.id !== team.id)
                        .map((target) => (
                          <Button key={target.id} variant="outline" onClick={() => handlePickTarget(target.id)}>
                            {target.name}
                          </Button>
                        ))}
                      <Button variant="ghost" onClick={() => setPending(undefined)}>
                        {t("presentation.joker.cancelButton")}
                      </Button>
                    </div>
                  </div>
                ) : usedJoker ? (
                  <div className="flex items-center justify-between">
                    <p className="text-lg">
                      {usedJoker.icon} {t("presentation.joker.usedLabel")}{" "}
                      <span className="font-medium">{usedJoker.name}</span>
                      {usedTargetName && (
                        <span className="text-muted-foreground"> → {usedTargetName}</span>
                      )}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => onUndo(team.id)}>
                      {t("presentation.joker.undoButton")}
                    </Button>
                  </div>
                ) : activeJokers.length === 0 ? (
                  <p className="text-muted-foreground">{t("presentation.joker.noJokersAvailable")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeJokers.map((joker) => {
                      const remaining = team.jokersRemaining[joker.id] ?? 0;
                      if (remaining <= 0) return null;
                      return (
                        <Button key={joker.id} variant="outline" onClick={() => handleJokerClick(team.id, joker)}>
                          {joker.icon} {joker.name}{" "}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {t("presentation.joker.usesLeft", { count: remaining })}
                          </span>
                        </Button>
                      );
                    })}
                    {activeJokers.every((j) => (team.jokersRemaining[j.id] ?? 0) <= 0) && (
                      <p className="text-muted-foreground">{t("presentation.joker.noJokersRemaining")}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        size="lg"
        className="mt-10"
        onClick={(e) => {
          e.stopPropagation();
          onAdvance();
        }}
      >
        {t("presentation.joker.continueButton")}
      </Button>
    </SlideFrame>
  );
}
