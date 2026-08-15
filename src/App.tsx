import { useEffect, useState } from "react";
import { AppShell } from "@/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { isFileSystemAccessSupported, verifyPermission } from "@/lib/fs";
import { getStoredRootHandle } from "@/lib/idb";
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
        if (granted) {
          setBoot({ status: "ready", root: stored });
          return;
        }
      }
      setBoot({ status: "needsFolder" });
    }
    void bootstrap();
  }, []);

  return (
    <>
      {boot.status === "checking" && <LoadingScreen />}
      {boot.status === "unsupported" && <UnsupportedBrowser />}
      {boot.status === "needsFolder" && (
        <Welcome onFolderReady={(root) => setBoot({ status: "ready", root })} />
      )}
      {boot.status === "ready" && <AppShell root={boot.root} />}
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
