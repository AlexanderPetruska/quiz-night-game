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
import { useTranslation } from "@/i18n/I18nContext";
import {
  EFFECT_TYPES_NEEDING_MULTIPLIER,
  EFFECT_TYPES_NEEDING_PENALTY,
  EFFECT_TYPE_LABEL_KEYS,
  STARTER_TEMPLATES,
} from "@/lib/jokers";
import type { StarterTemplateDef } from "@/lib/jokers";
import { newId } from "@/lib/store";
import { saveJokers } from "@/lib/store";
import type { Joker, JokerEffectType } from "@/types";

const EFFECT_TYPES = Object.keys(EFFECT_TYPE_LABEL_KEYS) as JokerEffectType[];

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

export function JokerLibrary() {
  const { root, jokers, refreshJokers } = useAppContext();
  const { t } = useTranslation();
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

  function applyTemplate(template: StarterTemplateDef) {
    setForm({
      name: t(template.nameKey),
      icon: template.icon,
      description: t(template.descriptionKey),
      effectType: template.effectType,
      multiplierValue: String(template.multiplierValue ?? 2),
      penaltyFraction: String(template.penaltyFraction ?? 0.5),
    });
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
      toast.success(t("jokers.toastSaved", { name: joker.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("jokers.toastCouldNotSave"));
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
      toast.success(t("jokers.toastDeleted", { name: deleteTarget.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("jokers.toastCouldNotDelete"));
    } finally {
      setDeleteTarget(undefined);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("jokers.title")}</h1>
          <p className="text-muted-foreground">{t("jokers.subtitle")}</p>
        </div>
        <Button size="lg" onClick={openCreate}>
          {t("jokers.createButton")}
        </Button>
      </div>

      {jokers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">{t("jokers.noJokersYet")}</CardContent>
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
                  {t(EFFECT_TYPE_LABEL_KEYS[joker.effectType])}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{joker.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(joker)}>
                  {t("jokers.edit")}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(joker)}>
                  {t("jokers.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? t("jokers.editDialogTitle") : t("jokers.createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("jokers.dialogDescription")}</DialogDescription>
          </DialogHeader>

          {!form.id && (
            <div className="space-y-2">
              <Label>{t("jokers.startFromTemplateLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                {STARTER_TEMPLATES.map((template) => (
                  <Button
                    key={template.nameKey}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.icon} {t(template.nameKey)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <div className="space-y-2">
              <Label htmlFor="joker-name">{t("jokers.nameLabel")}</Label>
              <Input
                id="joker-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("jokers.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joker-icon">{t("jokers.iconLabel")}</Label>
              <Input
                id="joker-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder={t("jokers.iconPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joker-desc">{t("jokers.descriptionLabel")}</Label>
            <Textarea
              id="joker-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("jokers.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("jokers.effectLabel")}</Label>
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
                    {t(EFFECT_TYPE_LABEL_KEYS[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {EFFECT_TYPES_NEEDING_MULTIPLIER.includes(form.effectType) && (
            <div className="space-y-2">
              <Label htmlFor="joker-mult">{t("jokers.multiplierLabel")}</Label>
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
              <Label htmlFor="joker-penalty">{t("jokers.penaltyLabel")}</Label>
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
            <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
            <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
              {saving ? t("jokers.savingButton") : t("jokers.saveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("jokers.deleteDialogTitle", { name: deleteTarget?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("jokers.deleteDialogDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              {t("jokers.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
