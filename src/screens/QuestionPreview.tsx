import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/I18nContext";
import { ProofSlide } from "@/screens/presentation/ProofSlide";
import { QuestionSlide } from "@/screens/presentation/QuestionSlide";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import type { Question } from "@/types";

interface QuestionPreviewProps {
  question: Question;
  quizDir: FileSystemDirectoryHandle;
  onClose: () => void;
}

type Step = "question" | "proof" | "reveal";

function PreviewReveal({ question }: { question: Question }) {
  const { t } = useTranslation();
  return (
    <SlideFrame slideKey="preview-reveal" onAdvance={() => {}} clickable={false}>
      <h2 className="mb-6 text-2xl font-medium text-muted-foreground">{t("questionPreview.correctAnswerHeading")}</h2>

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

      <p className="text-muted-foreground">{t("questionPreview.notice")}</p>
    </SlideFrame>
  );
}

export function QuestionPreview({ question, quizDir, onClose }: QuestionPreviewProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("question");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function advance() {
    if (step === "question") {
      setStep(question.proofFile ? "proof" : "reveal");
    } else if (step === "proof") {
      setStep("reveal");
    }
  }

  return (
    <div className="dark fixed inset-0 z-50 bg-background">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
          {t("questionPreview.badge")}
        </span>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("questionPreview.closeButton")}
        </Button>
      </div>

      {step === "question" && (
        <QuestionSlide question={question} index={0} total={1} timerSeconds={undefined} onAdvance={advance} />
      )}

      {step === "proof" && question.proofFile && (
        <ProofSlide question={question} quizDir={quizDir} onAdvance={advance} />
      )}

      {step === "reveal" && <PreviewReveal question={question} />}
    </div>
  );
}
