import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScreenLoading } from "@/components/ScreenLoading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { getQuizDir, loadQuizMeta, loadTeams, newId, saveQuizMeta, saveTeams } from "@/lib/store";
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
}

interface Draft {
  teams: DraftTeam[];
  jokerSettings: Record<string, JokerSetting>;
}

function draftKey(slug: string): string {
  return `teamSetupDraft:${slug}`;
}

function defaultDraft(existingTeams: Team[] = []): Draft {
  const teams: DraftTeam[] =
    existingTeams.length > 0
      ? existingTeams.map((t) => ({ key: newId(), name: t.name, members: [...t.members], memberDraft: "" }))
      : [
          { key: newId(), name: "Team 1", members: [], memberDraft: "" },
          { key: newId(), name: "Team 2", members: [], memberDraft: "" },
        ];
  return { teams, jokerSettings: {} };
}

export function TeamSetup({ slug }: TeamSetupProps) {
  const { root, jokers, navigate } = useAppContext();
  const [quizDir, setQuizDir] = useState<FileSystemDirectoryHandle | undefined>();
  const [meta, setMeta] = useState<QuizMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(defaultDraft());
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const dir = await getQuizDir(root, slug);
      const loadedMeta = await loadQuizMeta(dir);
      const existingTeams = await loadTeams(dir);
      if (cancelled) return;
      setQuizDir(dir);
      setMeta(loadedMeta);

      const stored = sessionStorage.getItem(draftKey(slug));
      if (stored) {
        setDraft(JSON.parse(stored) as Draft);
      } else {
        const base = defaultDraft(existingTeams);
        if (loadedMeta) {
          const jokerSettings: Record<string, JokerSetting> = {};
          for (const jokerId of loadedMeta.activeJokerIds) {
            jokerSettings[jokerId] = {
              active: true,
              uses: String(loadedMeta.jokerUsesPerTeam[jokerId] ?? 1),
            };
          }
          base.jokerSettings = jokerSettings;
        }
        setDraft(base);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
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
      teams: [...d.teams, { key: newId(), name: `Team ${d.teams.length + 1}`, members: [], memberDraft: "" }],
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

  function setJokerActive(jokerId: string, active: boolean) {
    setDraft((d) => ({
      ...d,
      jokerSettings: {
        ...d.jokerSettings,
        [jokerId]: { active, uses: d.jokerSettings[jokerId]?.uses ?? "1" },
      },
    }));
  }

  function setJokerUses(jokerId: string, uses: string) {
    setDraft((d) => ({
      ...d,
      jokerSettings: {
        ...d.jokerSettings,
        [jokerId]: { active: d.jokerSettings[jokerId]?.active ?? false, uses },
      },
    }));
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
      for (const jokerId of activeJokerIds) {
        jokerUsesPerTeam[jokerId] = Number(draft.jokerSettings[jokerId]?.uses) || 1;
      }

      const updatedMeta: QuizMeta = { ...meta, activeJokerIds, jokerUsesPerTeam };
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start presentation.");
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
        ← Back to My Quizzes
      </Button>

      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Team Setup</h1>
      <p className="mb-8 text-muted-foreground">{meta?.name}</p>

      <div className="mb-6 space-y-4">
        <h2 className="text-xl font-medium">Teams</h2>
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
                  Remove Team
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
                  placeholder="Member name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember(team.key);
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addMember(team.key)}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={addTeam}>
          + Add Team
        </Button>
      </div>

      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-medium">Jokers for this quiz</h2>
        {jokers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-between py-6">
              <p className="text-muted-foreground">No jokers in your library yet.</p>
              <Button variant="secondary" onClick={() => navigate({ name: "jokers" })}>
                + Create Joker
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y py-0">
              {jokers.map((joker) => {
                const setting = draft.jokerSettings[joker.id];
                return (
                  <div key={joker.id} className="flex items-center gap-4 py-3">
                    <Checkbox
                      id={`joker-${joker.id}`}
                      checked={!!setting?.active}
                      onCheckedChange={(checked) => setJokerActive(joker.id, checked === true)}
                    />
                    <Label htmlFor={`joker-${joker.id}`} className="flex-1 cursor-pointer">
                      <span className="mr-2">{joker.icon}</span>
                      {joker.name}
                    </Label>
                    <Label htmlFor={`uses-${joker.id}`} className="text-sm text-muted-foreground">
                      Uses per team
                    </Label>
                    <Input
                      id={`uses-${joker.id}`}
                      type="number"
                      min="0"
                      className="w-20"
                      value={setting?.uses ?? "1"}
                      onChange={(e) => setJokerUses(joker.id, e.target.value)}
                      disabled={!setting?.active}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ready?</CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={handleStart} disabled={!canStart || starting}>
            {starting ? "Starting…" : "Start Quiz"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
