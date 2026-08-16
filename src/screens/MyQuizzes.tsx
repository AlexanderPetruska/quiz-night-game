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
      toast.error(
        err instanceof Error
          ? err.message
          : "Your data folder isn't accessible anymore. Please choose it again.",
      );
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create quiz.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddExample() {
    setSeedingExample(true);
    try {
      await seedExampleQuiz(root);
      await refresh();
      toast.success('Added "Example Quiz".');
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      toast.error(`Could not add the example quiz: ${detail}`);
    } finally {
      setSeedingExample(false);
    }
  }

  async function handleDuplicate(slug: string) {
    setBusySlug(slug);
    try {
      const { meta } = await duplicateQuiz(root, slug);
      await refresh();
      toast.success(`Duplicated as "${meta.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate quiz.");
    } finally {
      setBusySlug(undefined);
    }
  }

  async function handleExport(slug: string) {
    setBusySlug(slug);
    try {
      await exportQuiz(root, slug);
      toast.success("Quiz exported.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Could not export quiz.");
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
      const { slug, meta } = await importQuizFromZip(root, file);
      await refresh();
      toast.success(`Imported "${meta.name}".`);
      navigate({ name: "quizEditor", slug });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Could not import quiz.");
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
        deleteTarget.kind === "quiz" ? `Deleted "${deleteTarget.name}".` : `Deleted folder "${deleteTarget.slug}".`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }

  const hasExampleQuiz = quizzes.some((q) => q.summary.meta.name === "Example Quiz");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Quizzes</h1>
          <p className="text-muted-foreground">Create and manage your quiz nights.</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !hasExampleQuiz && (
            <Button variant="outline" onClick={handleAddExample} disabled={seedingExample}>
              {seedingExample ? "Adding…" : "+ Add Example Quiz"}
            </Button>
          )}
          <Button variant="outline" onClick={handleImport} disabled={importing}>
            {importing ? "Importing…" : "Import Quiz"}
          </Button>
          <Dialog open={newQuizOpen} onOpenChange={setNewQuizOpen}>
            <DialogTrigger render={<Button size="lg" />}>+ New Quiz</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Quiz</DialogTitle>
                <DialogDescription>Give your new quiz a name. You can rename it later.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="quiz-name">Quiz name</Label>
                <Input
                  id="quiz-name"
                  value={newQuizName}
                  onChange={(e) => setNewQuizName(e.target.value)}
                  placeholder="e.g. Friday Night Trivia"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate();
                  }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate} disabled={!newQuizName.trim() || creating}>
                  {creating ? "Creating…" : "Create Quiz"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && <ScreenLoading />}

      {!loading && quizzes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No quizzes yet. Click "+ New Quiz" to create your first one.
          </CardContent>
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
                {quiz.summary.questionCount} question{quiz.summary.questionCount === 1 ? "" : "s"}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => navigate({ name: "quizEditor", slug: quiz.slug })}>
                Open / Edit
              </Button>
              <Button
                disabled={quiz.summary.questionCount === 0}
                onClick={() => navigate({ name: "teamSetup", slug: quiz.slug })}
              >
                Start Presentation
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" disabled={busySlug === quiz.slug} />}
                >
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDuplicate(quiz.slug)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport(quiz.slug)}>Export…</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setDeleteTarget({ kind: "quiz", slug: quiz.slug, name: quiz.summary.meta.name })
                    }
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loading && orphanedFolders.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-1 text-lg font-medium">Unrecognized folders</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            These folders are inside <code>quizzes/</code> but don't have a valid quiz.json — probably
            leftovers from a previous crash or an edit outside the app. You can remove them here.
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
                    Delete
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
              Delete "{deleteTarget?.kind === "quiz" ? deleteTarget.name : deleteTarget?.slug}"?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes the folder and everything in it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
