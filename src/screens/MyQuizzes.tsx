import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { createQuiz, deleteQuiz, listQuizzes } from "@/lib/store";
import type { QuizSummary } from "@/types";

interface QuizRow {
  slug: string;
  summary: QuizSummary;
}

export function MyQuizzes() {
  const { root, navigate } = useAppContext();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuizOpen, setNewQuizOpen] = useState(false);
  const [newQuizName, setNewQuizName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuizRow | undefined>();
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    setLoading(true);
    const list = await listQuizzes(root);
    setQuizzes(list);
    setLoading(false);
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuiz(root, deleteTarget.slug);
      setDeleteTarget(undefined);
      await refresh();
      toast.success(`Deleted "${deleteTarget.summary.meta.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete quiz.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Quizzes</h1>
          <p className="text-muted-foreground">Create and manage your quiz nights.</p>
        </div>
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

      {loading && <p className="text-muted-foreground">Loading quizzes…</p>}

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
            <CardFooter className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate({ name: "quizEditor", slug: quiz.slug })}>
                Open / Edit
              </Button>
              <Button
                disabled={quiz.summary.questionCount === 0}
                onClick={() => navigate({ name: "teamSetup", slug: quiz.slug })}
              >
                Start Presentation
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(quiz)}>
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.summary.meta.name}"?</DialogTitle>
            <DialogDescription>
              This permanently deletes the quiz, its questions, and all proof files. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
