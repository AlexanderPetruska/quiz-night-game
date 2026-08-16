import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScreenLoading } from "@/components/ScreenLoading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import { useTranslation } from "@/i18n/I18nContext";
import { deleteProofFile, getQuizDir, loadQuestions, loadQuizMeta, newId, saveProofFile, saveQuestions } from "@/lib/store";
import { QuestionPreview } from "@/screens/QuestionPreview";
import type { Question, QuestionType } from "@/types";

interface QuizEditorProps {
  slug: string;
}

interface QuestionFormState {
  id?: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctIndex: number | undefined;
  correctAnswerText: string;
  category: string;
  points: string;
  proofFile?: string;
  proofType?: "video" | "image";
  removeProof: boolean;
  newProofFile?: File;
}

function emptyForm(): QuestionFormState {
  return {
    text: "",
    type: "choice",
    options: ["", "", "", ""],
    correctIndex: undefined,
    correctAnswerText: "",
    category: "",
    points: "1",
    removeProof: false,
  };
}

function questionToForm(q: Question): QuestionFormState {
  return {
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options ? [...q.options] : ["", "", "", ""],
    correctIndex: q.correctIndex,
    correctAnswerText: q.correctAnswerText ?? "",
    category: q.category ?? "",
    points: String(q.points),
    proofFile: q.proofFile,
    proofType: q.proofType,
    removeProof: false,
  };
}

export function QuizEditor({ slug }: QuizEditorProps) {
  const { root, navigate } = useAppContext();
  const { t } = useTranslation();
  const [quizDir, setQuizDir] = useState<FileSystemDirectoryHandle | undefined>();
  const [quizName, setQuizName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Question | undefined>();
  const [previewQuestion, setPreviewQuestion] = useState<Question | undefined>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const dir = await getQuizDir(root, slug);
      const meta = await loadQuizMeta(dir);
      const qs = await loadQuestions(dir);
      if (cancelled) return;
      setQuizDir(dir);
      setQuizName(meta?.name ?? slug);
      setQuestions(qs.sort((a, b) => a.order - b.order));
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [root, slug]);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(question: Question) {
    setForm(questionToForm(question));
    setFormOpen(true);
  }

  function isFormValid(): boolean {
    if (!form.text.trim()) return false;
    if (!form.points || Number.isNaN(Number(form.points))) return false;
    if (form.type === "choice") {
      if (form.options.some((opt) => !opt.trim())) return false;
      if (form.correctIndex === undefined) return false;
    }
    if (form.type === "open") {
      if (!form.correctAnswerText.trim()) return false;
    }
    return true;
  }

  async function persistQuestions(next: Question[]) {
    if (!quizDir) return;
    const reordered = next.map((q, index) => ({ ...q, order: index + 1 }));
    setQuestions(reordered);
    await saveQuestions(quizDir, reordered);
  }

  async function handleSaveQuestion() {
    if (!quizDir || !isFormValid()) return;
    setSaving(true);
    try {
      const isNew = !form.id;
      const id = form.id ?? newId();
      const existing = questions.find((q) => q.id === id);
      const order = existing?.order ?? questions.length + 1;

      let proofFile = form.removeProof ? undefined : form.proofFile;
      let proofType = form.removeProof ? undefined : form.proofType;

      if (form.removeProof && form.proofFile) {
        await deleteProofFile(quizDir, form.proofFile);
      }

      if (form.newProofFile) {
        if (form.proofFile) {
          await deleteProofFile(quizDir, form.proofFile);
        }
        const saved = await saveProofFile(quizDir, form.newProofFile, order);
        if (saved) {
          proofFile = saved.proofFile;
          proofType = saved.proofType;
        }
      }

      const question: Question = {
        id,
        text: form.text.trim(),
        type: form.type,
        order,
        points: Number(form.points) || 1,
        category: form.category.trim() || undefined,
        proofFile,
        proofType,
        ...(form.type === "choice"
          ? { options: form.options.map((o) => o.trim()), correctIndex: form.correctIndex }
          : { correctAnswerText: form.correctAnswerText.trim() || undefined }),
      };

      const next = isNew ? [...questions, question] : questions.map((q) => (q.id === id ? question : q));
      await persistQuestions(next);
      setFormOpen(false);
      toast.success(isNew ? t("quizEditor.toastQuestionAdded") : t("quizEditor.toastQuestionUpdated"));
    } catch {
      toast.error(t("quizEditor.toastCouldNotSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!quizDir || !deleteTarget) return;
    try {
      if (deleteTarget.proofFile) {
        await deleteProofFile(quizDir, deleteTarget.proofFile);
      }
      const next = questions.filter((q) => q.id !== deleteTarget.id);
      await persistQuestions(next);
      toast.success(t("quizEditor.toastQuestionDeleted"));
    } catch {
      toast.error(t("quizEditor.toastCouldNotDelete"));
    } finally {
      setDeleteTarget(undefined);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const next = [...questions];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await persistQuestions(next);
  }

  if (loading) {
    return <ScreenLoading />;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Button variant="ghost" className="mb-4 -ml-3" onClick={() => navigate({ name: "myQuizzes" })}>
        {t("quizEditor.backButton")}
      </Button>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{quizName}</h1>
          <p className="text-muted-foreground">{t("quizEditor.questionCount", { count: questions.length })}</p>
        </div>
        <Button size="lg" onClick={openCreate}>
          {t("quizEditor.addQuestionButton")}
        </Button>
      </div>

      {questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("quizEditor.noQuestionsYet")}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardContent className="flex items-start justify-between gap-4 py-4">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">#{q.order}</span>
                  <Badge variant="outline">
                    {q.type === "choice" ? t("quizEditor.badgeMultipleChoice") : t("quizEditor.badgeOpen")}
                  </Badge>
                  {q.category && <Badge variant="secondary">{q.category}</Badge>}
                  <Badge>{t("quizEditor.pointsBadge", { count: q.points })}</Badge>
                  {q.proofFile && (
                    <Badge variant="outline">
                      {q.proofType === "video" ? t("quizEditor.badgeVideo") : t("quizEditor.badgeImage")}
                    </Badge>
                  )}
                </div>
                <p className="font-medium">{q.text}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" onClick={() => handleMove(index, -1)} disabled={index === 0}>
                    ↑
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === questions.length - 1}
                  >
                    ↓
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPreviewQuestion(q)}>
                  {t("quizEditor.previewButton")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(q)}>
                  {t("quizEditor.editButton")}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(q)}>
                  {t("quizEditor.deleteButton")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? t("quizEditor.editDialogTitle") : t("quizEditor.addDialogTitle")}</DialogTitle>
            <DialogDescription>{t("quizEditor.dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="q-text">{t("quizEditor.questionTextLabel")}</Label>
            <Textarea
              id="q-text"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("quizEditor.typeLabel")}</Label>
            <Tabs
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value as QuestionType })}
            >
              <TabsList>
                <TabsTrigger value="choice">{t("quizEditor.multipleChoiceTab")}</TabsTrigger>
                <TabsTrigger value="open">{t("quizEditor.openTab")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {form.type === "choice" ? (
            <div className="space-y-2">
              <Label>{t("quizEditor.optionsLabel")}</Label>
              <RadioGroup
                value={form.correctIndex !== undefined ? String(form.correctIndex) : undefined}
                onValueChange={(value) => setForm({ ...form, correctIndex: Number(value) })}
                className="space-y-2"
              >
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={String(i)} id={`opt-${i}`} />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const options = [...form.options];
                        options[i] = e.target.value;
                        setForm({ ...form, options });
                      }}
                      placeholder={t("quizEditor.optionPlaceholder", { n: i + 1 })}
                    />
                  </div>
                ))}
              </RadioGroup>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="q-answer">{t("quizEditor.correctAnswerLabel")}</Label>
              <Input
                id="q-answer"
                value={form.correctAnswerText}
                onChange={(e) => setForm({ ...form, correctAnswerText: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="q-proof">{t("quizEditor.proofLabel")}</Label>
            <Input
              id="q-proof"
              type="file"
              accept="video/*,image/*"
              onChange={(e) =>
                setForm({ ...form, newProofFile: e.target.files?.[0], removeProof: false })
              }
            />
            {form.newProofFile && (
              <p className="text-sm text-muted-foreground">
                {t("quizEditor.newFileLabel", { name: form.newProofFile.name })}
              </p>
            )}
            {!form.newProofFile && form.proofFile && !form.removeProof && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("quizEditor.currentFileLabel", { name: form.proofFile })}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setForm({ ...form, removeProof: true })}
                >
                  {t("quizEditor.removeButton")}
                </Button>
              </div>
            )}
            {form.removeProof && <p className="text-sm text-muted-foreground">{t("quizEditor.proofWillBeRemoved")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="q-category">{t("quizEditor.categoryLabel")}</Label>
              <Input
                id="q-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder={t("quizEditor.categoryPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-points">{t("quizEditor.pointsLabel")}</Label>
              <Input
                id="q-points"
                type="number"
                min="1"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
              />
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, points: "1" })}>
                  {t("quizEditor.easyButton")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, points: "2" })}>
                  {t("quizEditor.mediumButton")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, points: "3" })}>
                  {t("quizEditor.hardButton")}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
            <Button onClick={handleSaveQuestion} disabled={!isFormValid() || saving}>
              {saving ? t("quizEditor.savingButton") : t("quizEditor.saveQuestionButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("quizEditor.deleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("quizEditor.deleteDialogDescription", { text: deleteTarget?.text ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              {t("quizEditor.deleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewQuestion && quizDir && (
        <QuestionPreview question={previewQuestion} quizDir={quizDir} onClose={() => setPreviewQuestion(undefined)} />
      )}
    </div>
  );
}
