import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/I18nContext";
import { ensureRootStructure, pickRootDirectory, verifyPermission } from "@/lib/fs";
import { setStoredRootHandle } from "@/lib/idb";
import { seedExampleQuiz } from "@/lib/store";

interface WelcomeProps {
  onFolderReady: (root: FileSystemDirectoryHandle) => void;
}

export function Welcome({ onFolderReady }: WelcomeProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function handleChooseFolder() {
    setError(undefined);
    setBusy(true);
    try {
      const handle = await pickRootDirectory();
      const granted = await verifyPermission(handle, "readwrite");
      if (!granted) {
        setError(t("welcome.permissionError"));
        setBusy(false);
        return;
      }
      const { isFirstRun } = await ensureRootStructure(handle);
      if (isFirstRun) {
        await seedExampleQuiz(handle);
      }
      await setStoredRootHandle(handle);
      onFolderReady(handle);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setBusy(false);
        return;
      }
      setError(err instanceof Error ? err.message : t("welcome.genericError"));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t("welcome.title")}</CardTitle>
          <CardDescription>{t("welcome.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="lg" className="w-full" onClick={handleChooseFolder} disabled={busy}>
            {busy ? t("welcome.waitingButton") : t("welcome.chooseFolderButton")}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
