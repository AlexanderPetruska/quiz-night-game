import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import type { Question } from "@/types";

interface QuestionSlideProps {
  question: Question;
  index: number;
  total: number;
  timerSeconds: number | undefined;
  onAdvance: () => void;
}

function CountdownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  const pct = (remaining / seconds) * 100;

  return (
    <div className="mx-auto mb-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <div className="mb-1 text-center text-3xl font-mono tabular-nums">{Math.ceil(remaining)}</div>
      <Progress value={pct} />
    </div>
  );
}

export function QuestionSlide({ question, index, total, timerSeconds, onAdvance }: QuestionSlideProps) {
  return (
    <SlideFrame slideKey={`question-${question.id}`} onAdvance={onAdvance}>
      <div className="mb-6 flex items-center gap-3 text-muted-foreground">
        <span>
          Question {index + 1}/{total}
        </span>
        {question.category && <Badge variant="outline">{question.category}</Badge>}
        <Badge>
          {question.points} point{question.points === 1 ? "" : "s"}
        </Badge>
      </div>

      {timerSeconds !== undefined && timerSeconds > 0 && (
        <CountdownTimer seconds={timerSeconds} onExpire={onAdvance} />
      )}

      <h1 className="mb-10 max-w-4xl text-center text-5xl font-bold leading-tight">{question.text}</h1>

      {question.type === "choice" && question.options && (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {question.options.map((opt, i) => (
            <div key={i} className="rounded-xl border bg-card px-6 py-5 text-center text-2xl font-medium">
              {String.fromCharCode(65 + i)}. {opt}
            </div>
          ))}
        </div>
      )}

      {question.type === "open" && (
        <p className="text-2xl text-muted-foreground">✍️ Open answer — write it down!</p>
      )}
    </SlideFrame>
  );
}
