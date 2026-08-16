import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/I18nContext";
import { applyTheme, resolveTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() => resolveTheme());

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("theme.toggleAriaLabel")}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
