import { useCallback, useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { AppContext } from "@/context/AppContext";
import type { AppContextValue, Screen } from "@/context/AppContext";
import { loadJokers } from "@/lib/store";
import { LoadingScreen } from "@/screens/LoadingScreen";
import { MyQuizzes } from "@/screens/MyQuizzes";
import { JokerLibrary } from "@/screens/JokerLibrary";
import { QuizEditor } from "@/screens/QuizEditor";
import { TeamSetup } from "@/screens/TeamSetup";
import { Presentation } from "@/screens/presentation/Presentation";
import type { Joker } from "@/types";

interface AppShellProps {
  root: FileSystemDirectoryHandle;
  onRootUnavailable: () => void;
}

export function AppShell({ root, onRootUnavailable }: AppShellProps) {
  const [screen, setScreen] = useState<Screen>({ name: "myQuizzes" });
  const [jokers, setJokers] = useState<Joker[]>([]);
  const [loadingJokers, setLoadingJokers] = useState(true);

  const refreshJokers = useCallback(async () => {
    const loaded = await loadJokers(root);
    setJokers(loaded);
  }, [root]);

  useEffect(() => {
    refreshJokers().finally(() => setLoadingJokers(false));
  }, [refreshJokers]);

  const navigate = useCallback((next: Screen) => setScreen(next), []);

  if (loadingJokers) return <LoadingScreen />;

  const value: AppContextValue = { root, jokers, refreshJokers, navigate, reportRootUnavailable: onRootUnavailable };
  const showNav = screen.name !== "presentation";

  return (
    <AppContext.Provider value={value}>
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        {showNav && <TopNav screen={screen} />}
        <main className="flex-1">
          {screen.name === "myQuizzes" && <MyQuizzes />}
          {screen.name === "jokers" && <JokerLibrary />}
          {screen.name === "quizEditor" && <QuizEditor slug={screen.slug} />}
          {screen.name === "teamSetup" && <TeamSetup slug={screen.slug} />}
          {screen.name === "presentation" && <Presentation slug={screen.slug} />}
        </main>
      </div>
    </AppContext.Provider>
  );
}
