import { Button } from "@/components/ui/button";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import { stopAdvance } from "@/screens/presentation/interaction";
import type { Team } from "@/types";

interface FinalSlideProps {
  teams: Team[];
  onEnd: () => void;
}

export function FinalSlide({ teams, onEnd }: FinalSlideProps) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score;

  return (
    <SlideFrame slideKey="final" onAdvance={() => {}}>
      <h1 className="mb-10 text-5xl font-bold">Final Results</h1>
      <div className="w-full max-w-2xl space-y-3">
        {sorted.map((team, i) => {
          const isWinner = team.score === topScore;
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
                {i + 1}. {team.name} {isWinner && "🏆"}
              </span>
              <span className="font-mono tabular-nums">{team.score} pts</span>
            </div>
          );
        })}
      </div>
      <Button size="lg" className="mt-12" onClick={onEnd} onClickCapture={stopAdvance}>
        End Presentation
      </Button>
    </SlideFrame>
  );
}
