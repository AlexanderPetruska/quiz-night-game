import {
  deleteEntry,
  fileToProofType,
  getOrCreateSubdir,
  listSubdirs,
  proofExtension,
  readJson,
  uniqueSlug,
  writeBinaryFile,
  writeJson,
} from "@/lib/fs";
import type { Joker, Question, QuizMeta, QuizSummary, Team } from "@/types";

export function newId(): string {
  return crypto.randomUUID();
}

export async function getQuizzesDir(root: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return getOrCreateSubdir(root, "quizzes");
}

export async function loadJokers(root: FileSystemDirectoryHandle): Promise<Joker[]> {
  const jokers = await readJson<Joker[]>(root, "jokers.json");
  return jokers ?? [];
}

export async function saveJokers(root: FileSystemDirectoryHandle, jokers: Joker[]): Promise<void> {
  await writeJson(root, "jokers.json", jokers);
}

export async function listQuizzes(root: FileSystemDirectoryHandle): Promise<
  { slug: string; summary: QuizSummary }[]
> {
  const quizzesDir = await getQuizzesDir(root);
  const dirs = await listSubdirs(quizzesDir);
  const results: { slug: string; summary: QuizSummary }[] = [];
  for (const dir of dirs) {
    const meta = await readJson<QuizMeta>(dir.handle, "quiz.json");
    if (!meta) continue;
    const questions = await readJson<Question[]>(dir.handle, "questions.json");
    results.push({ slug: dir.name, summary: { meta, questionCount: questions?.length ?? 0 } });
  }
  results.sort((a, b) => a.summary.meta.name.localeCompare(b.summary.meta.name));
  return results;
}

/**
 * Folder names inside quizzes/ that don't have a valid quiz.json — e.g. left over from a
 * previous crash, or dropped in by hand. Not shown as real quizzes, but still worth surfacing
 * so the user can clean them up instead of having to go dig through the file system.
 */
export async function listOrphanedQuizDirs(root: FileSystemDirectoryHandle): Promise<string[]> {
  const quizzesDir = await getQuizzesDir(root);
  const dirs = await listSubdirs(quizzesDir);
  const orphaned: string[] = [];
  for (const dir of dirs) {
    const meta = await readJson<QuizMeta>(dir.handle, "quiz.json");
    if (!meta) orphaned.push(dir.name);
  }
  return orphaned;
}

export async function getQuizDir(
  root: FileSystemDirectoryHandle,
  slug: string,
): Promise<FileSystemDirectoryHandle> {
  const quizzesDir = await getQuizzesDir(root);
  return getOrCreateSubdir(quizzesDir, slug);
}

export async function getProofDir(quizDir: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return getOrCreateSubdir(quizDir, "proof");
}

export async function createQuiz(
  root: FileSystemDirectoryHandle,
  name: string,
): Promise<{ slug: string; meta: QuizMeta }> {
  const quizzesDir = await getQuizzesDir(root);
  const slug = await uniqueSlug(quizzesDir, name);
  const quizDir = await getOrCreateSubdir(quizzesDir, slug);
  await getProofDir(quizDir);

  const meta: QuizMeta = {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    activeJokerIds: [],
    jokerUsesPerTeam: {},
  };

  await writeJson(quizDir, "quiz.json", meta);
  await writeJson(quizDir, "questions.json", []);

  return { slug, meta };
}

export async function loadQuizMeta(
  quizDir: FileSystemDirectoryHandle,
): Promise<QuizMeta | undefined> {
  return readJson<QuizMeta>(quizDir, "quiz.json");
}

export async function saveQuizMeta(quizDir: FileSystemDirectoryHandle, meta: QuizMeta): Promise<void> {
  await writeJson(quizDir, "quiz.json", meta);
}

export async function loadQuestions(quizDir: FileSystemDirectoryHandle): Promise<Question[]> {
  const questions = await readJson<Question[]>(quizDir, "questions.json");
  return questions ?? [];
}

export async function saveQuestions(quizDir: FileSystemDirectoryHandle, questions: Question[]): Promise<void> {
  await writeJson(quizDir, "questions.json", questions);
}

export async function deleteQuiz(root: FileSystemDirectoryHandle, slug: string): Promise<void> {
  const quizzesDir = await getQuizzesDir(root);
  await deleteEntry(quizzesDir, slug, true);
}

export async function loadTeams(quizDir: FileSystemDirectoryHandle): Promise<Team[]> {
  const teams = await readJson<Team[]>(quizDir, "teams.json");
  return teams ?? [];
}

export async function saveTeams(quizDir: FileSystemDirectoryHandle, teams: Team[]): Promise<void> {
  await writeJson(quizDir, "teams.json", teams);
}

export async function saveProofFile(
  quizDir: FileSystemDirectoryHandle,
  file: File,
  order: number,
): Promise<{ proofFile: string; proofType: "video" | "image" } | undefined> {
  const proofType = fileToProofType(file);
  if (!proofType) return undefined;
  const proofDir = await getProofDir(quizDir);
  const ext = proofExtension(file);
  const filename = `q${order}_proof.${ext}`;
  await writeBinaryFile(proofDir, filename, file);
  return { proofFile: filename, proofType };
}

export async function deleteProofFile(quizDir: FileSystemDirectoryHandle, filename: string): Promise<void> {
  const proofDir = await getProofDir(quizDir);
  await deleteEntry(proofDir, filename);
}

/**
 * Builds a simple, self-contained SVG "proof reveal" image — no external assets or binary
 * encoding needed, just a string. Used to give the seeded example quiz something to show on
 * the proof slide without bundling real media files.
 */
function buildMockProofSvg(emoji: string, title: string, subtitle: string, bg: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="${bg}"/>
  <text x="640" y="300" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="640" y="440" font-size="72" font-family="system-ui, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${title}</text>
  <text x="640" y="500" font-size="34" font-family="system-ui, sans-serif" fill="#d4d4d8" text-anchor="middle">${subtitle}</text>
</svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

/** Seeds a starter quiz with mock questions, mock proof images, and mock teams so a first-time user has something to explore. */
export async function seedExampleQuiz(root: FileSystemDirectoryHandle): Promise<void> {
  const quizzesDir = await getQuizzesDir(root);
  const slug = await uniqueSlug(quizzesDir, "Example Quiz");
  const quizDir = await getOrCreateSubdir(quizzesDir, slug);
  const proofDir = await getProofDir(quizDir);

  const meta: QuizMeta = {
    id: newId(),
    name: "Example Quiz",
    createdAt: new Date().toISOString(),
    activeJokerIds: [],
    jokerUsesPerTeam: {},
  };
  await writeJson(quizDir, "quiz.json", meta);

  const proofAssets = [
    { filename: "q1_proof.svg", svg: buildMockProofSvg("🔴", "Mars", "The Red Planet", "#7c2d12") },
    { filename: "q2_proof.svg", svg: buildMockProofSvg("🚀", "1969", "Apollo 11 Moon Landing", "#1e3a5f") },
    { filename: "q3_proof.svg", svg: buildMockProofSvg("🌊", "Lake Champlain", "Not one of the Great Lakes", "#0c4a6e") },
    { filename: "q4_proof.svg", svg: buildMockProofSvg("📖", "Jane Austen", "Pride and Prejudice, 1813", "#4c1d95") },
  ];
  for (const asset of proofAssets) {
    await writeBinaryFile(proofDir, asset.filename, asset.svg);
  }

  const questions: Question[] = [
    {
      id: newId(),
      text: "Which planet is known as the Red Planet?",
      type: "choice",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctIndex: 1,
      category: "Science",
      order: 1,
      points: 1,
      proofFile: "q1_proof.svg",
      proofType: "image",
    },
    {
      id: newId(),
      text: "In what year did humans first land on the Moon?",
      type: "open",
      correctAnswerText: "1969",
      category: "History",
      order: 2,
      points: 2,
      proofFile: "q2_proof.svg",
      proofType: "image",
    },
    {
      id: newId(),
      text: "Which of these is NOT one of the Great Lakes?",
      type: "choice",
      options: ["Superior", "Erie", "Champlain", "Huron"],
      correctIndex: 2,
      category: "Geography",
      order: 3,
      points: 2,
      proofFile: "q3_proof.svg",
      proofType: "image",
    },
    {
      id: newId(),
      text: 'Who wrote the novel "Pride and Prejudice"?',
      type: "open",
      correctAnswerText: "Jane Austen",
      category: "Literature",
      order: 4,
      points: 3,
      proofFile: "q4_proof.svg",
      proofType: "image",
    },
  ];
  await writeJson(quizDir, "questions.json", questions);

  const teams: Team[] = [
    {
      id: newId(),
      name: "The Quizzards",
      members: ["Alex", "Sam"],
      score: 0,
      jokersRemaining: {},
      jokerLog: [],
    },
    {
      id: newId(),
      name: "Trivia Newton John",
      members: ["Jordan", "Casey"],
      score: 0,
      jokersRemaining: {},
      jokerLog: [],
    },
    {
      id: newId(),
      name: "Sherlock Homies",
      members: ["Riley", "Morgan"],
      score: 0,
      jokersRemaining: {},
      jokerLog: [],
    },
    {
      id: newId(),
      name: "Quiz Pistols",
      members: ["Taylor", "Drew"],
      score: 0,
      jokersRemaining: {},
      jokerLog: [],
    },
  ];
  await writeJson(quizDir, "teams.json", teams);
}

export async function getProofFileUrl(
  quizDir: FileSystemDirectoryHandle,
  filename: string,
): Promise<string | undefined> {
  try {
    const proofDir = await getProofDir(quizDir);
    const fileHandle = await proofDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return undefined;
    }
    throw error;
  }
}
