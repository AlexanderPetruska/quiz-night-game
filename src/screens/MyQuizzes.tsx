import { useEffect, useState } from "react";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { ScreenLoading } from "@/components/ScreenLoading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { useTranslation } from "@/i18n/I18nContext";
import {
  createQuiz,
  deleteQuiz,
  duplicateQuiz,
  exportQuiz,
  importQuizFromZip,
  listOrphanedQuizDirs,
  listQuizzes,
  seedExampleQuiz,
} from "@/lib/store";
import type { QuizSummary } from "@/types";

interface QuizRow {
  slug: string;
  summary: QuizSummary;
}

type DeleteTarget = { kind: "quiz"; slug: string; name: string } | { kind: "orphan"; slug: string };

export function MyQuizzes() {
  const { root, navigate, reportRootUnavailable } = useAppContext();
  const { t } = useTranslation();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [orphanedFolders, setOrphanedFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuizOpen, setNewQuizOpen] = useState(false);
  const [newQuizName, setNewQuizName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [seedingExample, setSeedingExample] = useState(false);
  const [importing, setImporting] = useState(false);
  const [busySlug, setBusySlug] = useState<string | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      const [list, orphaned] = await Promise.all([listQuizzes(root), listOrphanedQuizDirs(root)]);
      setQuizzes(list);
      setOrphanedFolders(orphaned);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("myQuizzes.toastDataFolderInaccessible"));
      reportRootUnavailable();
      return;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  async function handleCreate() {
    const name = newQuizName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { slug } = await createQuiz(root, name);
      setNewQuizOpen(false);
      setNewQuizName("");
      navigate({ name: "quizEditor", slug });
    } catch {
      toast.error(t("myQuizzes.toastCouldNotCreate"));
    } finally {
      setCreating(false);
    }
  }

  async function handleAddExample() {
    setSeedingExample(true);
    try {
      await seedExampleQuiz(root);
      await refresh();
      toast.success(t("myQuizzes.toastAddedExample", { name: "Example Quiz" }));
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      toast.error(t("myQuizzes.toastCouldNotAddExample", { detail }));
    } finally {
      setSeedingExample(false);
    }
  }

  async function handleDuplicate(slug: string) {
    setBusySlug(slug);
    try {
      const { meta } = await duplicateQuiz(root, slug, t("myQuizzes.copySuffix"));
      await refresh();
      toast.success(t("myQuizzes.toastDuplicatedAs", { name: meta.name }));
    } catch {
      toast.error(t("myQuizzes.toastCouldNotDuplicate"));
    } finally {
      setBusySlug(undefined);
    }
  }

  async function handleExport(slug: string) {
    setBusySlug(slug);
    try {
      await exportQuiz(root, slug);
      toast.success(t("myQuizzes.toastExported"));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(t("myQuizzes.toastCouldNotExport"));
    } finally {
      setBusySlug(undefined);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: "Quiz Night export", accept: { "application/zip": [".zip"] } }],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      const file = await fileHandle.getFile();
      const { slug, meta } = await importQuizFromZip(root, file, t("myQuizzes.importedFallbackName"));
      await refresh();
      toast.success(t("myQuizzes.toastImportedAs", { name: meta.name }));
      navigate({ name: "quizEditor", slug });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(t("myQuizzes.toastCouldNotImport"));
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuiz(root, deleteTarget.slug);
      setDeleteTarget(undefined);
      await refresh();
      toast.success(
        deleteTarget.kind === "quiz"
          ? t("myQuizzes.toastDeletedQuiz", { name: deleteTarget.name })
          : t("myQuizzes.toastDeletedFolder", { name: deleteTarget.slug }),
      );
    } catch {
      toast.error(t("myQuizzes.toastCouldNotDelete"));
    } finally {
      setDeleting(false);
    }
  }

  const hasExampleQuiz = quizzes.some((q) => q.summary.meta.name === "Example Quiz");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("myQuizzes.title")}</h1>
          <p className="text-muted-foreground">{t("myQuizzes.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !hasExampleQuiz && (
            <Button variant="outline" onClick={handleAddExample} disabled={seedingExample}>
              {seedingExample ? t("myQuizzes.addingExampleQuiz") : t("myQuizzes.addExampleQuiz")}
            </Button>
          )}
          <Button variant="outline" onClick={handleImport} disabled={importing}>
            {importing ? t("myQuizzes.importingQuiz") : t("myQuizzes.importQuiz")}
          </Button>
          <Dialog open={newQuizOpen} onOpenChange={setNewQuizOpen}>
            <DialogTrigger render={<Button size="lg" />}>{t("myQuizzes.newQuizButton")}</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("myQuizzes.newQuizDialogTitle")}</DialogTitle>
                <DialogDescription>{t("myQuizzes.newQuizDialogDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="quiz-name">{t("myQuizzes.quizNameLabel")}</Label>
                <Input
                  id="quiz-name"
                  value={newQuizName}
                  onChange={(e) => setNewQuizName(e.target.value)}
                  placeholder={t("myQuizzes.quizNamePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate();
                  }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
                <Button onClick={handleCreate} disabled={!newQuizName.trim() || creating}>
                  {creating ? t("myQuizzes.creatingQuizButton") : t("myQuizzes.createQuizButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && <ScreenLoading />}

      {!loading && quizzes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">{t("myQuizzes.noQuizzesYet")}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <Card key={quiz.slug}>
            <CardHeader>
              <CardTitle>{quiz.summary.meta.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("myQuizzes.questionCount", { count: quiz.summary.questionCount })}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => navigate({ name: "quizEditor", slug: quiz.slug })}>
                {t("myQuizzes.openEdit")}
              </Button>
              <Button
                disabled={quiz.summary.questionCount === 0}
                onClick={() => navigate({ name: "teamSetup", slug: quiz.slug })}
              >
                {t("myQuizzes.startPresentation")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" disabled={busySlug === quiz.slug} />}
                >
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDuplicate(quiz.slug)}>
                    {t("myQuizzes.duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport(quiz.slug)}>{t("myQuizzes.export")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setDeleteTarget({ kind: "quiz", slug: quiz.slug, name: quiz.summary.meta.name })
                    }
                  >
                    {t("myQuizzes.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loading && orphanedFolders.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-1 text-lg font-medium">{t("myQuizzes.unrecognizedFoldersTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("myQuizzes.unrecognizedFoldersDescription", { path: "quizzes/" })}
          </p>
          <div className="space-y-2">
            {orphanedFolders.map((name) => (
              <Card key={name}>
                <CardContent className="flex items-center justify-between py-3">
                  <span className="font-mono text-sm text-muted-foreground">{name}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget({ kind: "orphan", slug: name })}
                  >
                    {t("myQuizzes.delete")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("myQuizzes.deleteDialogTitle", {
                name: deleteTarget?.kind === "quiz" ? deleteTarget.name : (deleteTarget?.slug ?? ""),
              })}
            </DialogTitle>
            <DialogDescription>{t("myQuizzes.deleteDialogDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("myQuizzes.deletingButton") : t("myQuizzes.deleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
