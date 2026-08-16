import { useTranslation } from "@/i18n/I18nContext";
import { rankTeams } from "@/lib/ranking";
import type { Team } from "@/types";

interface ScoreboardPanelProps {
  teams: Team[];
}

const RANK_STYLES: Record<number, { medal: string; className: string }> = {
  1: { medal: "🥇", className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300" },
  2: { medal: "🥈", className: "border-slate-400/50 bg-slate-400/10 text-slate-300" },
  3: { medal: "🥉", className: "border-amber-700/50 bg-amber-700/10 text-amber-400" },
};

export function ScoreboardPanel({ teams }: ScoreboardPanelProps) {
  const { t } = useTranslation();
  const ranked = rankTeams(teams);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l bg-card/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("presentation.scoreboardHeading")}
      </h3>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {ranked.map(({ team, rank }) => {
          const style = RANK_STYLES[rank];
          return (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                style ? style.className : "border-border bg-background/60"
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                {style ? <span>{style.medal}</span> : <span className="text-muted-foreground">{rank}.</span>}
                <span className="truncate">{team.name}</span>
              </span>
              <span className="ml-2 shrink-0 font-mono text-sm tabular-nums">{team.score}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
