import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScreenLoading } from "@/components/ScreenLoading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { useTranslation } from "@/i18n/I18nContext";
import { getQuizDir, loadQuestions, loadQuizMeta, loadTeams, newId, saveQuizMeta, saveTeams } from "@/lib/store";
import type { QuizMeta, Team } from "@/types";

interface TeamSetupProps {
  slug: string;
}

interface DraftTeam {
  key: string;
  name: string;
  members: string[];
  memberDraft: string;
}

interface JokerSetting {
  active: boolean;
  uses: string;
  /** Last question number this joker may be used on; empty string = no limit. */
  lastRound: string;
  /** Minimum score the inviting team must have; empty string = no minimum. */
  minScore: string;
}

interface Draft {
  teams: DraftTeam[];
  jokerSettings: Record<string, JokerSetting>;
  /** Seconds shown as a countdown on every question slide; empty string = no timer. */
  timerSeconds: string;
}

function draftKey(slug: string): string {
  return `teamSetupDraft:${slug}`;
}

function defaultDraft(existingTeams: Team[], defaultTeamName: (n: number) => string): Draft {
  const teams: DraftTeam[] =
    existingTeams.length > 0
      ? existingTeams.map((t) => ({ key: newId(), name: t.name, members: [...t.members], memberDraft: "" }))
      : [
          { key: newId(), name: defaultTeamName(1), members: [], memberDraft: "" },
          { key: newId(), name: defaultTeamName(2), members: [], memberDraft: "" },
        ];
  return { teams, jokerSettings: {}, timerSeconds: "" };
}

export function TeamSetup({ slug }: TeamSetupProps) {
  const { root, jokers, navigate } = useAppContext();
  const { t } = useTranslation();
  const defaultTeamName = (n: number) => t("teamSetup.defaultTeamName", { n });
  const [quizDir, setQuizDir] = useState<FileSystemDirectoryHandle | undefined>();
  const [meta, setMeta] = useState<QuizMeta | undefined>();
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => defaultDraft([], defaultTeamName));
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const dir = await getQuizDir(root, slug);
      const loadedMeta = await loadQuizMeta(dir);
      const existingTeams = await loadTeams(dir);
      const loadedQuestions = await loadQuestions(dir);
      if (cancelled) return;
      setQuizDir(dir);
      setMeta(loadedMeta);
      setQuestionCount(loadedQuestions.length);

      const stored = sessionStorage.getItem(draftKey(slug));
      if (stored) {
        const parsed = JSON.parse(stored) as Draft;
        setDraft({ ...parsed, timerSeconds: parsed.timerSeconds ?? "" });
      } else {
        const base = defaultDraft(existingTeams, defaultTeamName);
        if (loadedMeta) {
          const jokerSettings: Record<string, JokerSetting> = {};
          for (const jokerId of loadedMeta.activeJokerIds) {
            jokerSettings[jokerId] = {
              active: true,
              uses: String(loadedMeta.jokerUsesPerTeam[jokerId] ?? 1),
              lastRound: loadedMeta.jokerLastRound?.[jokerId] !== undefined ? String(loadedMeta.jokerLastRound[jokerId]) : "",
              minScore: loadedMeta.jokerMinScore?.[jokerId] !== undefined ? String(loadedMeta.jokerMinScore[jokerId]) : "",
            };
          }
          base.jokerSettings = jokerSettings;
          base.timerSeconds =
            loadedMeta.defaultTimerSeconds !== undefined ? String(loadedMeta.defaultTimerSeconds) : "";
        }
        setDraft(base);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, slug]);

  useEffect(() => {
    if (!loading) {
      sessionStorage.setItem(draftKey(slug), JSON.stringify(draft));
    }
  }, [draft, loading, slug]);

  function updateTeam(key: string, patch: Partial<DraftTeam>) {
    setDraft((d) => ({ ...d, teams: d.teams.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));
  }

  function addTeam() {
    setDraft((d) => ({
      ...d,
      teams: [...d.teams, { key: newId(), name: defaultTeamName(d.teams.length + 1), members: [], memberDraft: "" }],
    }));
  }

  function removeTeam(key: string) {
    setDraft((d) => {
      if (d.teams.length <= 1) return d;
      return { ...d, teams: d.teams.filter((t) => t.key !== key) };
    });
  }

  function addMember(key: string) {
    setDraft((d) => ({
      ...d,
      teams: d.teams.map((t) => {
        if (t.key !== key) return t;
        const name = t.memberDraft.trim();
        if (!name) return t;
        return { ...t, members: [...t.members, name], memberDraft: "" };
      }),
    }));
  }

  function removeMember(key: string, index: number) {
    setDraft((d) => ({
      ...d,
      teams: d.teams.map((t) =>
        t.key === key ? { ...t, members: t.members.filter((_, i) => i !== index) } : t,
      ),
    }));
  }

  function defaultJokerSetting(d: Draft, jokerId: string): JokerSetting {
    return d.jokerSettings[jokerId] ?? { active: false, uses: "1", lastRound: "", minScore: "" };
  }

  function setJokerActive(jokerId: string, active: boolean) {
    setDraft((d) => ({
      ...d,
      jokerSettings: { ...d.jokerSettings, [jokerId]: { ...defaultJokerSetting(d, jokerId), active } },
    }));
  }

  /**
   * type="number" turned out not to be trustworthy for this: browsers only expose e.target.value
   * for states the field considers a "valid" number, so a stray "-" typed mid-string (e.g.
   * "1-231") makes the browser report an empty value while still displaying the invalid text —
   * our regex was sanitizing that phantom "" instead of what was actually on screen, so the
   * junk characters never got removed. Plain text input with our own digit-only filtering
   * sidesteps that quirk entirely, since e.target.value always reflects what's really displayed.
   */
  function sanitizeNonNegativeInt(value: string): string {
    return value.replace(/[^0-9]/g, "");
  }

  /** Clamps a sanitized digit string to [1, max], dropping leading zeros. Empty stays empty. */
  function clampToRange(value: string, max: number): string {
    if (!value) return value;
    const n = Math.min(Math.max(Number(value), 1), max);
    return String(n);
  }

  function setJokerUses(jokerId: string, uses: string) {
    setDraft((d) => ({
      ...d,
      jokerSettings: {
        ...d.jokerSettings,
        [jokerId]: { ...defaultJokerSetting(d, jokerId), uses: sanitizeNonNegativeInt(uses) },
      },
    }));
  }

  function setJokerLastRound(jokerId: string, lastRound: string) {
    const sanitized = sanitizeNonNegativeInt(lastRound);
    const clamped = questionCount > 0 ? clampToRange(sanitized, questionCount) : sanitized;
    setDraft((d) => ({
      ...d,
      jokerSettings: {
        ...d.jokerSettings,
        [jokerId]: { ...defaultJokerSetting(d, jokerId), lastRound: clamped },
      },
    }));
  }

  function setJokerMinScore(jokerId: string, minScore: string) {
    setDraft((d) => ({
      ...d,
      jokerSettings: {
        ...d.jokerSettings,
        [jokerId]: { ...defaultJokerSetting(d, jokerId), minScore: sanitizeNonNegativeInt(minScore) },
      },
    }));
  }

  function setTimerSeconds(value: string) {
    setDraft((d) => ({ ...d, timerSeconds: sanitizeNonNegativeInt(value) }));
  }

  const canStart = draft.teams.every((t) => t.name.trim().length > 0);

  async function handleStart() {
    if (!quizDir || !meta || !canStart) return;
    setStarting(true);
    try {
      const activeJokerIds = jokers
        .filter((j) => draft.jokerSettings[j.id]?.active)
        .map((j) => j.id);
      const jokerUsesPerTeam: Record<string, number> = {};
      const jokerLastRound: Record<string, number> = {};
      const jokerMinScore: Record<string, number> = {};
      for (const jokerId of activeJokerIds) {
        const setting = draft.jokerSettings[jokerId];
        jokerUsesPerTeam[jokerId] = Number(setting?.uses) || 1;
        if (setting?.lastRound.trim()) {
          jokerLastRound[jokerId] = Number(setting.lastRound);
        }
        if (setting?.minScore.trim()) {
          jokerMinScore[jokerId] = Number(setting.minScore);
        }
      }

      const defaultTimerSeconds = draft.timerSeconds.trim() ? Number(draft.timerSeconds) : undefined;
      const updatedMeta: QuizMeta = {
        ...meta,
        activeJokerIds,
        jokerUsesPerTeam,
        jokerLastRound,
        jokerMinScore,
        defaultTimerSeconds,
      };
      await saveQuizMeta(quizDir, updatedMeta);

      const teams: Team[] = draft.teams.map((t) => ({
        id: newId(),
        name: t.name.trim(),
        members: t.members,
        score: 0,
        jokersRemaining: { ...jokerUsesPerTeam },
        jokerLog: [],
      }));
      await saveTeams(quizDir, teams);

      sessionStorage.removeItem(draftKey(slug));
      navigate({ name: "presentation", slug });
    } catch {
      toast.error(t("teamSetup.toastCouldNotStart"));
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <ScreenLoading />;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Button variant="ghost" className="mb-4 -ml-3" onClick={() => navigate({ name: "myQuizzes" })}>
        {t("teamSetup.backButton")}
      </Button>

      <h1 className="mb-1 text-3xl font-semibold tracking-tight">{t("teamSetup.title")}</h1>
      <p className="mb-8 text-muted-foreground">{meta?.name}</p>

      <div className="mb-6 space-y-4">
        <h2 className="text-xl font-medium">{t("teamSetup.teamsHeading")}</h2>
        {draft.teams.map((team) => (
          <Card key={team.key}>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <Input
                  value={team.name}
                  onChange={(e) => updateTeam(team.key, { name: e.target.value })}
                  className="max-w-xs font-medium"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeTeam(team.key)}
                  disabled={draft.teams.length <= 1}
                >
                  {t("teamSetup.removeTeamButton")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {team.members.map((member, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                  >
                    {member}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(team.key, i)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex max-w-xs gap-2">
                <Input
                  value={team.memberDraft}
                  onChange={(e) => updateTeam(team.key, { memberDraft: e.target.value })}
                  placeholder={t("teamSetup.memberPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember(team.key);
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addMember(team.key)}>
                  {t("teamSetup.addMemberButton")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={addTeam}>
          {t("teamSetup.addTeamButton")}
        </Button>
      </div>

      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-medium">{t("teamSetup.jokersHeading")}</h2>
        {jokers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-between py-6">
              <p className="text-muted-foreground">{t("teamSetup.noJokersMessage")}</p>
              <Button variant="secondary" onClick={() => navigate({ name: "jokers" })}>
                {t("teamSetup.createJokerButton")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y py-0">
              {jokers.map((joker) => {
                const setting = draft.jokerSettings[joker.id];
                const active = !!setting?.active;
                return (
                  <div key={joker.id} className="space-y-2 py-3">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id={`joker-${joker.id}`}
                        checked={active}
                        onCheckedChange={(checked) => setJokerActive(joker.id, checked === true)}
                      />
                      <Label htmlFor={`joker-${joker.id}`} className="flex-1 cursor-pointer">
                        <span className="mr-2">{joker.icon}</span>
                        {joker.name}
                      </Label>
                    </div>
                    {active && (
                      <div className="ml-9 flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`uses-${joker.id}`} className="text-sm text-muted-foreground">
                            {t("teamSetup.usesPerTeamLabel")}
                          </Label>
                          <Input
                            id={`uses-${joker.id}`}
                            type="text"
                            inputMode="numeric"
                            className="w-20"
                            value={setting?.uses ?? "1"}
                            onChange={(e) => setJokerUses(joker.id, e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`last-round-${joker.id}`} className="text-sm text-muted-foreground">
                            {t("teamSetup.lastRoundLabel", { total: questionCount })}
                          </Label>
                          <Input
                            id={`last-round-${joker.id}`}
                            type="text"
                            inputMode="numeric"
                            className="w-24"
                            placeholder="—"
                            value={setting?.lastRound ?? ""}
                            onChange={(e) => setJokerLastRound(joker.id, e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`min-score-${joker.id}`} className="text-sm text-muted-foreground">
                            {t("teamSetup.minScoreLabel")}
                          </Label>
                          <Input
                            id={`min-score-${joker.id}`}
                            type="text"
                            inputMode="numeric"
                            className="w-24"
                            placeholder="—"
                            value={setting?.minScore ?? ""}
                            onChange={(e) => setJokerMinScore(joker.id, e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-medium">{t("teamSetup.timerHeading")}</h2>
        <Card>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="timer-seconds" className="text-sm text-muted-foreground">
                {t("teamSetup.timerLabel")}
              </Label>
              <Input
                id="timer-seconds"
                type="text"
                inputMode="numeric"
                className="w-24"
                placeholder="—"
                value={draft.timerSeconds}
                onChange={(e) => setTimerSeconds(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{t("teamSetup.timerHelp")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("teamSetup.readyHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={handleStart} disabled={!canStart || starting}>
            {starting ? t("teamSetup.startingButton") : t("teamSetup.startQuizButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
