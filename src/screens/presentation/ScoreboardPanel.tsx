import type { Team } from "@/types";

interface ScoreboardPanelProps {
  teams: Team[];
}

const RANK_STYLES = [
  { medal: "🥇", className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300" },
  { medal: "🥈", className: "border-slate-400/50 bg-slate-400/10 text-slate-300" },
  { medal: "🥉", className: "border-amber-700/50 bg-amber-700/10 text-amber-400" },
] as const;

export function ScoreboardPanel({ teams }: ScoreboardPanelProps) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l bg-card/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Scoreboard
      </h3>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {sorted.map((team, i) => {
          const rank = RANK_STYLES[i];
          return (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                rank ? rank.className : "border-border bg-background/60"
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                {rank ? <span>{rank.medal}</span> : <span className="text-muted-foreground">{i + 1}.</span>}
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
