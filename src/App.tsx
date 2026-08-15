import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { isFileSystemAccessSupported, verifyPermission, verifyRootAccessible } from "@/lib/fs";
import { clearStoredRootHandle, getStoredRootHandle } from "@/lib/idb";
import { LoadingScreen } from "@/screens/LoadingScreen";
import { UnsupportedBrowser } from "@/screens/UnsupportedBrowser";
import { Welcome } from "@/screens/Welcome";

type BootState =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "needsFolder" }
  | { status: "ready"; root: FileSystemDirectoryHandle };

function App() {
  const [boot, setBoot] = useState<BootState>({ status: "checking" });

  useEffect(() => {
    async function bootstrap() {
      if (!isFileSystemAccessSupported()) {
        setBoot({ status: "unsupported" });
        return;
      }
      const stored = await getStoredRootHandle();
      if (stored) {
        const granted = await verifyPermission(stored, "readwrite");
        if (granted && (await verifyRootAccessible(stored))) {
          setBoot({ status: "ready", root: stored });
          return;
        }
        await clearStoredRootHandle();
      }
      setBoot({ status: "needsFolder" });
    }
    void bootstrap();
  }, []);

  const handleRootUnavailable = useCallback(() => {
    void clearStoredRootHandle();
    setBoot({ status: "needsFolder" });
  }, []);

  return (
    <>
      {boot.status === "checking" && <LoadingScreen />}
      {boot.status === "unsupported" && <UnsupportedBrowser />}
      {boot.status === "needsFolder" && (
        <Welcome onFolderReady={(root) => setBoot({ status: "ready", root })} />
      )}
      {boot.status === "ready" && <AppShell root={boot.root} onRootUnavailable={handleRootUnavailable} />}
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
