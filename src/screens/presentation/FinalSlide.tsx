import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/I18nContext";
import { rankTeams } from "@/lib/ranking";
import { playFanfare } from "@/lib/sound";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import type { Team } from "@/types";

interface FinalSlideProps {
  teams: Team[];
  onEnd: () => void;
}

export function FinalSlide({ teams, onEnd }: FinalSlideProps) {
  const { t } = useTranslation();
  const ranked = rankTeams(teams);

  useEffect(() => {
    playFanfare();
  }, []);

  return (
    <SlideFrame slideKey="final" onAdvance={() => {}} clickable={false}>
      <h1 className="mb-10 text-5xl font-bold">{t("presentation.final.heading")}</h1>
      <div className="w-full max-w-2xl space-y-3">
        {ranked.map(({ team, rank }) => {
          const isWinner = rank === 1;
          return (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-xl border px-6 py-4 text-2xl ${
                isWinner
                  ? "border-green-500 bg-green-500/15 text-green-400"
                  : "border-border bg-card"
              }`}
            >
              <span className="font-semibold">
                {rank}. {team.name} {isWinner && "🏆"}
              </span>
              <span className="font-mono tabular-nums">{t("presentation.scorePts", { count: team.score })}</span>
            </div>
          );
        })}
      </div>
      <Button
        size="lg"
        className="mt-12"
        onClick={(e) => {
          e.stopPropagation();
          onEnd();
        }}
      >
        {t("presentation.endPresentationButton")}
      </Button>
    </SlideFrame>
  );
}
