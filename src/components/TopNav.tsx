import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppContext } from "@/context/AppContext";
import type { Screen } from "@/context/AppContext";

export function TopNav({ screen }: { screen: Screen }) {
  const { navigate } = useAppContext();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <button
        type="button"
        onClick={() => navigate({ name: "myQuizzes" })}
        className="text-lg font-semibold tracking-tight"
      >
        🎬 Quiz Night
      </button>
      <nav className="flex items-center gap-2">
        <Button
          variant={screen.name === "myQuizzes" ? "secondary" : "ghost"}
          onClick={() => navigate({ name: "myQuizzes" })}
        >
          My Quizzes
        </Button>
        <Button
          variant={screen.name === "jokers" ? "secondary" : "ghost"}
          onClick={() => navigate({ name: "jokers" })}
        >
          Jokers
        </Button>
        <ThemeToggle />
      </nav>
    </header>
  );
}
