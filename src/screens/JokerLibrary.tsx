import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import {
  EFFECT_TYPES_NEEDING_MULTIPLIER,
  EFFECT_TYPES_NEEDING_PENALTY,
  EFFECT_TYPE_LABELS,
  STARTER_TEMPLATES,
} from "@/lib/jokers";
import { newId } from "@/lib/store";
import { saveJokers } from "@/lib/store";
import type { Joker, JokerEffectType } from "@/types";

const EFFECT_TYPES = Object.keys(EFFECT_TYPE_LABELS) as JokerEffectType[];

interface JokerFormState {
  id?: string;
  name: string;
  icon: string;
  description: string;
  effectType: JokerEffectType;
  multiplierValue: string;
  penaltyFraction: string;
}

function emptyForm(): JokerFormState {
  return {
    name: "",
    icon: "🃏",
    description: "",
    effectType: "manual",
    multiplierValue: "2",
    penaltyFraction: "0.5",
  };
}

function jokerToForm(joker: Joker): JokerFormState {
  return {
    id: joker.id,
    name: joker.name,
    icon: joker.icon,
    description: joker.description,
    effectType: joker.effectType,
    multiplierValue: String(joker.multiplierValue ?? 2),
    penaltyFraction: String(joker.penaltyFraction ?? 0.5),
  };
}

function templateToForm(template: (typeof STARTER_TEMPLATES)[number]): JokerFormState {
  return {
    name: template.name,
    icon: template.icon,
    description: template.description,
    effectType: template.effectType,
    multiplierValue: String(template.multiplierValue ?? 2),
    penaltyFraction: String(template.penaltyFraction ?? 0.5),
  };
}

export function JokerLibrary() {
  const { root, jokers, refreshJokers } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<JokerFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Joker | undefined>();

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(joker: Joker) {
    setForm(jokerToForm(joker));
    setFormOpen(true);
  }

  function applyTemplate(template: (typeof STARTER_TEMPLATES)[number]) {
    setForm(templateToForm(template));
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      const joker: Joker = {
        id: form.id ?? newId(),
        name,
        icon: form.icon.trim() || "🃏",
        description: form.description.trim(),
        effectType: form.effectType,
        ...(EFFECT_TYPES_NEEDING_MULTIPLIER.includes(form.effectType)
          ? { multiplierValue: Number(form.multiplierValue) || 2 }
          : {}),
        ...(EFFECT_TYPES_NEEDING_PENALTY.includes(form.effectType)
          ? { penaltyFraction: Number(form.penaltyFraction) || 0.5 }
          : {}),
      };

      const next = form.id
        ? jokers.map((j) => (j.id === joker.id ? joker : j))
        : [...jokers, joker];

      await saveJokers(root, next);
      await refreshJokers();
      setFormOpen(false);
      toast.success(`Saved "${joker.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save joker.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const next = jokers.filter((j) => j.id !== deleteTarget.id);
      await saveJokers(root, next);
      await refreshJokers();
      toast.success(`Deleted "${deleteTarget.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete joker.");
    } finally {
      setDeleteTarget(undefined);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jokers</h1>
          <p className="text-muted-foreground">
            A shared library of power-ups. Turn them on per-quiz in Team Setup.
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          + Create Joker
        </Button>
      </div>

      {jokers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No jokers yet. Create one, or start from a template below.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {jokers.map((joker) => (
          <Card key={joker.id}>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="text-2xl">{joker.icon}</span>
              <div className="flex-1">
                <CardTitle>{joker.name}</CardTitle>
                <Badge variant="outline" className="mt-1">
                  {EFFECT_TYPE_LABELS[joker.effectType]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{joker.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(joker)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(joker)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Joker" : "Create Joker"}</DialogTitle>
            <DialogDescription>
              Define a power-up teams can use during presentation mode.
            </DialogDescription>
          </DialogHeader>

          {!form.id && (
            <div className="space-y-2">
              <Label>Start from a template</Label>
              <div className="flex flex-wrap gap-2">
                {STARTER_TEMPLATES.map((template) => (
                  <Button
                    key={template.name}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.icon} {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div className="space-y-2">
              <Label htmlFor="joker-name">Name</Label>
              <Input
                id="joker-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Turbo Points"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joker-icon">Icon</Label>
              <Input
                id="joker-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🔥"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joker-desc">Description</Label>
            <Textarea
              id="joker-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short rule text shown to the host and players."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Effect</Label>
            <Select
              value={form.effectType}
              onValueChange={(value) => setForm({ ...form, effectType: value as JokerEffectType })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EFFECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EFFECT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {EFFECT_TYPES_NEEDING_MULTIPLIER.includes(form.effectType) && (
            <div className="space-y-2">
              <Label htmlFor="joker-mult">Multiplier</Label>
              <Input
                id="joker-mult"
                type="number"
                min="0"
                step="0.5"
                value={form.multiplierValue}
                onChange={(e) => setForm({ ...form, multiplierValue: e.target.value })}
              />
            </div>
          )}

          {EFFECT_TYPES_NEEDING_PENALTY.includes(form.effectType) && (
            <div className="space-y-2">
              <Label htmlFor="joker-penalty">Penalty fraction (0–1)</Label>
              <Input
                id="joker-penalty"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={form.penaltyFraction}
                onChange={(e) => setForm({ ...form, penaltyFraction: e.target.value })}
              />
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
              {saving ? "Saving…" : "Save Joker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
            <DialogDescription>
              This removes the joker from the shared library. Quizzes that had it active will no
              longer offer it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
