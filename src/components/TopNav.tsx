import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppContext } from "@/context/AppContext";
import type { Screen } from "@/context/AppContext";
import { useTranslation } from "@/i18n/I18nContext";

export function TopNav({ screen }: { screen: Screen }) {
  const { navigate } = useAppContext();
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <button
        type="button"
        onClick={() => navigate({ name: "myQuizzes" })}
        className="text-lg font-semibold tracking-tight"
      >
        🎬 {t("common.appName")}
      </button>
      <nav className="flex items-center gap-2">
        <Button
          variant={screen.name === "myQuizzes" ? "secondary" : "ghost"}
          onClick={() => navigate({ name: "myQuizzes" })}
        >
          {t("topNav.myQuizzes")}
        </Button>
        <Button
          variant={screen.name === "jokers" ? "secondary" : "ghost"}
          onClick={() => navigate({ name: "jokers" })}
        >
          {t("topNav.jokers")}
        </Button>
        <LanguageSwitcher />
        <ThemeToggle />
      </nav>
    </header>
  );
}
