import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureRootStructure, pickRootDirectory, verifyPermission } from "@/lib/fs";
import { setStoredRootHandle } from "@/lib/idb";

interface WelcomeProps {
  onFolderReady: (root: FileSystemDirectoryHandle) => void;
}

export function Welcome({ onFolderReady }: WelcomeProps) {
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function handleChooseFolder() {
    setError(undefined);
    setBusy(true);
    try {
      const handle = await pickRootDirectory();
      const granted = await verifyPermission(handle, "readwrite");
      if (!granted) {
        setError("Permission to read/write that folder was not granted.");
        setBusy(false);
        return;
      }
      await ensureRootStructure(handle);
      await setStoredRootHandle(handle);
      onFolderReady(handle);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setBusy(false);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not access that folder.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Quiz Night</CardTitle>
          <CardDescription>
            Choose a folder on this computer where your quizzes, questions, proof files, and
            teams will be saved. You'll only need to do this once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="lg" className="w-full" onClick={handleChooseFolder} disabled={busy}>
            {busy ? "Waiting for folder selection…" : "Choose data folder"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
