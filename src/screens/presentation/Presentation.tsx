import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppContext } from "@/context/AppContext";
import { useTranslation } from "@/i18n/I18nContext";
import { getIncomingSteals, hasSwappedWith } from "@/lib/jokers";
import {
  isSoundEnabled,
  playConfirm,
  playCorrect,
  playFreeze,
  playIncorrect,
  playJoker,
  setSoundEnabled,
} from "@/lib/sound";
import { getQuizDir, loadQuestions, loadQuizMeta, loadTeams, saveTeams } from "@/lib/store";
import { FinalSlide } from "@/screens/presentation/FinalSlide";
import { IntroSlide } from "@/screens/presentation/IntroSlide";
import { JokerSlide } from "@/screens/presentation/JokerSlide";
import { LoadingScreen } from "@/screens/LoadingScreen";
import { ProofSlide } from "@/screens/presentation/ProofSlide";
import { QuestionSlide } from "@/screens/presentation/QuestionSlide";
import type { AwardOutcome } from "@/screens/presentation/RevealSlide";
import { RevealSlide } from "@/screens/presentation/RevealSlide";
import { ScoreboardPanel } from "@/screens/presentation/ScoreboardPanel";
import { buildSlidePlan } from "@/screens/presentation/types";
import type { Question, QuizMeta, Team } from "@/types";

interface PresentationProps {
  slug: string;
}

function keyFor(questionId: string, teamId: string): string {
  return `${questionId}:${teamId}`;
}

interface AppliedAward {
  ownDelta: number;
  stealTransfers?: { toTeamId: string; amount: number }[];
}

export function Presentation({ slug }: PresentationProps) {
  const { root, jokers, navigate } = useAppContext();
  const { t } = useTranslation();

  const [quizDir, setQuizDir] = useState<FileSystemDirectoryHandle | undefined>();
  const [meta, setMeta] = useState<QuizMeta | undefined>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scoredKeys, setScoredKeys] = useState<Set<string>>(new Set());
  const [appliedDeltas, setAppliedDeltas] = useState<Record<string, AppliedAward>>({});
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const enteredFullscreenRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const dir = await getQuizDir(root, slug);
      const loadedMeta = await loadQuizMeta(dir);
      const loadedQuestions = (await loadQuestions(dir)).sort((a, b) => a.order - b.order);
      const loadedTeams = await loadTeams(dir);
      if (cancelled) return;
      setQuizDir(dir);
      setMeta(loadedMeta);
      setQuestions(loadedQuestions);
      setTeams(loadedTeams);
      setLoaded(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [root, slug]);

  // Presentation mode is always dark, regardless of the user's chosen theme — it's meant to
  // be viewed on a TV in a dimmed room. Toggled on the document itself (not just a local
  // wrapper) so portaled content like the exit-confirmation dialog picks it up too. Restores
  // whatever was there before on exit, rather than always removing it, so this doesn't
  // override an actual dark-mode preference once the presentation ends.
  useEffect(() => {
    const hadDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.add("dark");
    return () => {
      if (!hadDark) {
        document.documentElement.classList.remove("dark");
      }
    };
  }, []);

  // Autosave teams (scores + joker usage) continuously.
  useEffect(() => {
    if (!loaded || !quizDir) return;
    void saveTeams(quizDir, teams);
  }, [teams, loaded, quizDir]);

  // Fullscreen on entry.
  useEffect(() => {
    document.documentElement
      .requestFullscreen()
      .then(() => {
        enteredFullscreenRef.current = true;
        setIsFullscreen(true);
      })
      .catch(() => {
        /* user can enter manually via the on-screen button */
      });
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      if (enteredFullscreenRef.current && !fullscreen) {
        setShowExitConfirm(true);
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const activeJokers = meta ? jokers.filter((j) => meta.activeJokerIds.includes(j.id)) : [];
  const slidePlan = loaded ? buildSlidePlan(questions, activeJokers.length > 0) : [];
  const currentSlide = slidePlan[currentIndex];

  const advance = useCallback(() => {
    if (currentSlide?.kind === "reveal") {
      const question = questions[currentSlide.qIndex];
      const fullyScored = teams.every((t) => scoredKeys.has(keyFor(question.id, t.id)));
      if (!fullyScored) return;
    }
    setCurrentIndex((i) => Math.min(i + 1, slidePlan.length - 1));
  }, [slidePlan.length, currentSlide, questions, teams, scoredKeys]);

  const back = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (showExitConfirm) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, back, showExitConfirm]);

  function handleInvokeJoker(teamId: string, jokerId: string, targetTeamId?: string) {
    if (!currentSlide || currentSlide.kind !== "joker") return;
    const question = questions[currentSlide.qIndex];
    const joker = jokers.find((j) => j.id === jokerId);
    const invokingTeam = teams.find((t) => t.id === teamId);

    const lastRound = meta?.jokerLastRound?.[jokerId];
    if (lastRound !== undefined && question.order > lastRound) return;
    const minScore = meta?.jokerMinScore?.[jokerId];
    if (minScore !== undefined && (invokingTeam?.score ?? 0) < minScore) return;

    const isScoreSwap = joker?.effectType === "scoreSwap" && !!targetTeamId;
    if (isScoreSwap && targetTeamId && hasSwappedWith(teamId, targetTeamId, teams, jokers)) return;

    setTeams((ts) => {
      const invoker = ts.find((t) => t.id === teamId);
      const target = targetTeamId ? ts.find((t) => t.id === targetTeamId) : undefined;
      return ts.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            score: isScoreSwap && target ? target.score : t.score,
            jokersRemaining: { ...t.jokersRemaining, [jokerId]: (t.jokersRemaining[jokerId] ?? 0) - 1 },
            jokerLog: [...t.jokerLog, { questionId: question.id, jokerId, targetTeamId }],
          };
        }
        if (isScoreSwap && t.id === targetTeamId && invoker) {
          return { ...t, score: invoker.score };
        }
        return t;
      });
    });
    playJoker();
  }

  function handleUndoJoker(teamId: string) {
    if (!currentSlide || currentSlide.kind !== "joker") return;
    const question = questions[currentSlide.qIndex];

    setTeams((ts) => {
      const team = ts.find((t) => t.id === teamId);
      const entry = team?.jokerLog.find((e) => e.questionId === question.id);
      if (!entry) return ts;
      const joker = jokers.find((j) => j.id === entry.jokerId);
      const isScoreSwap = joker?.effectType === "scoreSwap" && !!entry.targetTeamId;
      const targetTeamId = entry.targetTeamId;

      const invoker = ts.find((t) => t.id === teamId);
      const target = targetTeamId ? ts.find((t) => t.id === targetTeamId) : undefined;

      return ts.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            score: isScoreSwap && target ? target.score : t.score,
            jokersRemaining: {
              ...t.jokersRemaining,
              [entry.jokerId]: (t.jokersRemaining[entry.jokerId] ?? 0) + 1,
            },
            jokerLog: t.jokerLog.filter((e) => e !== entry),
          };
        }
        if (isScoreSwap && t.id === targetTeamId && invoker) {
          return { ...t, score: invoker.score };
        }
        return t;
      });
    });
  }

  function handleAward(teamId: string, amount: number, outcome: AwardOutcome) {
    if (!currentSlide || currentSlide.kind !== "reveal") return;
    const question = questions[currentSlide.qIndex];
    const k = keyFor(question.id, teamId);

    let ownDelta = amount;
    let stealTransfers: { toTeamId: string; amount: number }[] | undefined;

    if (outcome === "incorrect") {
      const steals = getIncomingSteals(teamId, question.id, teams, jokers);
      if (steals.length > 0) {
        stealTransfers = steals.map((s) => ({ toTeamId: s.byTeam.id, amount: question.points }));
        ownDelta -= question.points * steals.length;
      }
    }

    setTeams((ts) =>
      ts.map((t) => {
        if (t.id === teamId) return { ...t, score: t.score + ownDelta };
        const transfer = stealTransfers?.find((s) => s.toTeamId === t.id);
        return transfer ? { ...t, score: t.score + transfer.amount } : t;
      }),
    );
    setScoredKeys((prev) => new Set(prev).add(k));
    setAppliedDeltas((prev) => ({ ...prev, [k]: { ownDelta, stealTransfers } }));

    if (outcome === "correct") playCorrect();
    else if (outcome === "incorrect") playIncorrect();
    else if (outcome === "frozen") playFreeze();
    else playConfirm();
  }

  function handleUndoAward(teamId: string) {
    if (!currentSlide || currentSlide.kind !== "reveal") return;
    const question = questions[currentSlide.qIndex];
    const k = keyFor(question.id, teamId);
    const record = appliedDeltas[k];
    if (!record) return;

    setTeams((ts) =>
      ts.map((t) => {
        if (t.id === teamId) return { ...t, score: t.score - record.ownDelta };
        const transfer = record.stealTransfers?.find((s) => s.toTeamId === t.id);
        return transfer ? { ...t, score: t.score - transfer.amount } : t;
      }),
    );
    setScoredKeys((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    setAppliedDeltas((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }

  function handleManualAmountChange(teamId: string, value: string) {
    if (!currentSlide || currentSlide.kind !== "reveal") return;
    const question = questions[currentSlide.qIndex];
    setManualAmounts((prev) => ({ ...prev, [keyFor(question.id, teamId)]: value }));
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  }

  async function requestFullscreenManually() {
    try {
      await document.documentElement.requestFullscreen();
      enteredFullscreenRef.current = true;
      setIsFullscreen(true);
    } catch {
      /* ignore — host stays in windowed mode */
    }
  }

  async function handleEnd() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    navigate({ name: "myQuizzes" });
  }

  async function handleResumeFullscreen() {
    await requestFullscreenManually();
    setShowExitConfirm(false);
  }

  if (!loaded || !meta || !quizDir) {
    return <LoadingScreen />;
  }

  const showScoreboard = currentSlide?.kind !== "proof";

  return (
    <div className="relative flex min-h-svh bg-background">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        {!isFullscreen && (
          <Button size="sm" variant="outline" onClick={requestFullscreenManually}>
            {t("presentation.enterFullscreenButton")}
          </Button>
        )}
        <Button
          size="icon"
          variant="outline"
          onClick={toggleSound}
          aria-label={t(soundOn ? "presentation.muteSoundButton" : "presentation.unmuteSoundButton")}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        {currentSlide?.kind === "intro" && (
          <IntroSlide quizName={meta.name} teams={teams} onAdvance={advance} />
        )}

        {currentSlide?.kind === "question" && (
          <QuestionSlide
            key={questions[currentSlide.qIndex].id}
            question={questions[currentSlide.qIndex]}
            index={currentSlide.qIndex}
            total={questions.length}
            timerSeconds={meta.defaultTimerSeconds}
            onAdvance={advance}
          />
        )}

        {currentSlide?.kind === "joker" && (
          <JokerSlide
            question={questions[currentSlide.qIndex]}
            teams={teams}
            activeJokers={activeJokers}
            jokerLastRound={meta.jokerLastRound ?? {}}
            jokerMinScore={meta.jokerMinScore ?? {}}
            onInvoke={handleInvokeJoker}
            onUndo={handleUndoJoker}
            onAdvance={advance}
          />
        )}

        {currentSlide?.kind === "proof" && (
          <ProofSlide question={questions[currentSlide.qIndex]} quizDir={quizDir} onAdvance={advance} />
        )}

        {currentSlide?.kind === "reveal" && (
          <RevealSlide
            question={questions[currentSlide.qIndex]}
            teams={teams}
            jokers={jokers}
            scoredTeamIds={
              new Set(
                teams
                  .filter((t) => scoredKeys.has(keyFor(questions[currentSlide.qIndex].id, t.id)))
                  .map((t) => t.id),
              )
            }
            onAward={handleAward}
            onUndoAward={handleUndoAward}
            manualAmounts={Object.fromEntries(
              teams.map((t) => [t.id, manualAmounts[keyFor(questions[currentSlide.qIndex].id, t.id)] ?? ""]),
            )}
            onManualAmountChange={handleManualAmountChange}
            onAdvance={advance}
            isLast={currentSlide.qIndex === questions.length - 1}
          />
        )}

        {currentSlide?.kind === "final" && <FinalSlide teams={teams} onEnd={handleEnd} />}
      </div>

      {showScoreboard && <ScoreboardPanel teams={teams} />}

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("presentation.exitConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("presentation.exitConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleResumeFullscreen}>
              {t("presentation.resumeFullscreenButton")}
            </Button>
            <Button variant="destructive" onClick={handleEnd}>
              {t("presentation.endPresentationButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
