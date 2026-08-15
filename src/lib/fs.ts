export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Thrown when the selected data folder can no longer be reached — e.g. moved, renamed, or deleted. */
export class RootFolderUnavailableError extends Error {
  constructor() {
    super("Your quiz data folder could not be reached. It may have been moved, renamed, or deleted.");
    this.name = "RootFolderUnavailableError";
  }
}

/**
 * Some File System Access operations (notably iterating a deleted directory's entries) hang
 * indefinitely instead of rejecting when their target no longer exists. This bounds any such
 * call so the UI can recover instead of showing a permanent loading state.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RootFolderUnavailableError()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export type PermissionMode = "read" | "readwrite";

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  mode: PermissionMode = "readwrite",
): Promise<boolean> {
  const options = { mode };
  try {
    if ((await handle.queryPermission(options)) === "granted") {
      return true;
    }
    if ((await handle.requestPermission(options)) === "granted") {
      return true;
    }
  } catch {
    // Some browsers throw (rather than resolve to a denied state) when requestPermission
    // is called without an active user gesture — treat that the same as "not granted".
  }
  return false;
}

export async function pickRootDirectory(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({
    id: "quiz-night-data",
    startIn: "documents",
    mode: "readwrite",
  });
}

/**
 * Re-confirms write permission right before a write. A single check at app startup isn't
 * enough — that check runs with no active user gesture, so the browser can silently fail to
 * (re-)grant permission there. Calling this from inside a click handler gives the browser a
 * valid moment to prompt again if needed.
 */
async function ensureWritable(handle: FileSystemDirectoryHandle): Promise<void> {
  const granted = await verifyPermission(handle, "readwrite");
  if (!granted) {
    throw new Error(
      "Permission to write to your quiz data folder was lost. Reload the app and reconnect your data folder, then try again.",
    );
  }
}

export async function getOrCreateSubdir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  await ensureWritable(parent);
  return parent.getDirectoryHandle(name, { create: true });
}

export async function ensureRootStructure(root: FileSystemDirectoryHandle): Promise<{ isFirstRun: boolean }> {
  await getOrCreateSubdir(root, "quizzes");
  const existingJokers = await readJson<unknown[]>(root, "jokers.json");
  const isFirstRun = existingJokers === undefined;
  if (isFirstRun) {
    await writeJson(root, "jokers.json", []);
  }
  return { isFirstRun };
}

export async function readJson<T>(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<T | undefined> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return undefined;
    }
    throw error;
  }
}

export async function writeJson(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  data: unknown,
): Promise<void> {
  await ensureWritable(dirHandle);
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function writeBinaryFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  file: File | Blob,
): Promise<void> {
  await ensureWritable(dirHandle);
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
}

export async function deleteEntry(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  recursive = false,
): Promise<void> {
  await ensureWritable(dirHandle);
  try {
    await dirHandle.removeEntry(name, { recursive });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return;
    }
    throw error;
  }
}

export interface NamedSubdir {
  name: string;
  handle: FileSystemDirectoryHandle;
}

export async function listSubdirs(dirHandle: FileSystemDirectoryHandle): Promise<NamedSubdir[]> {
  const results: NamedSubdir[] = [];
  try {
    await withTimeout(
      (async () => {
        for await (const [name, handle] of dirHandle.entries()) {
          if (handle.kind === "directory") {
            results.push({ name, handle: handle as FileSystemDirectoryHandle });
          }
        }
      })(),
      8000,
    );
  } catch (error) {
    // On folders synced by iCloud/Dropbox/OneDrive/etc., the sync client can create or
    // remove entries while we're mid-iteration, which surfaces as a NotFoundError here.
    // Return what we managed to collect rather than failing the whole listing.
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return results;
    }
    throw error;
  }
  return results;
}

/**
 * Confirms the root folder can actually still be read, not just that permission is granted —
 * a deleted/moved folder can still report permission as granted since that's tracked
 * separately from whether the target still exists.
 */
export async function verifyRootAccessible(root: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    await withTimeout(
      (async () => {
        for await (const _ of root.values()) {
          break;
        }
      })(),
      6000,
    );
    return true;
  } catch {
    return false;
  }
}

export function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "quiz";
}

export async function uniqueSlug(
  quizzesDir: FileSystemDirectoryHandle,
  desired: string,
): Promise<string> {
  const existing = new Set((await listSubdirs(quizzesDir)).map((d) => d.name));
  let slug = slugify(desired);
  let counter = 2;
  while (existing.has(slug)) {
    slug = `${slugify(desired)}-${counter}`;
    counter += 1;
  }
  return slug;
}

export function fileToProofType(file: File): "video" | "image" | undefined {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return undefined;
}

export function proofExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return (fromType || "bin").toLowerCase();
}
