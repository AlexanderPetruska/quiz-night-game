import { useTranslation } from "@/i18n/I18nContext";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import type { Team } from "@/types";

interface IntroSlideProps {
  quizName: string;
  teams: Team[];
  onAdvance: () => void;
}

export function IntroSlide({ quizName, teams, onAdvance }: IntroSlideProps) {
  const { t } = useTranslation();
  return (
    <SlideFrame slideKey="intro" onAdvance={onAdvance}>
      <h1 className="mb-10 text-center text-6xl font-bold tracking-tight">{quizName}</h1>
      <div className="flex flex-wrap justify-center gap-4">
        {teams.map((team) => (
          <div key={team.id} className="rounded-xl border bg-card px-8 py-4 text-center">
            <p className="text-2xl font-semibold">{team.name}</p>
            {team.members.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">{team.members.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-16 text-muted-foreground">{t("presentation.intro.clickToBegin")}</p>
    </SlideFrame>
  );
}
