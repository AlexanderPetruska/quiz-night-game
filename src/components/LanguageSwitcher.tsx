import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/I18nContext";
import { LOCALE_FLAGS, LOCALE_NAMES, LOCALES } from "@/i18n/locale";
import type { Locale } from "@/i18n/locale";

export function LanguageSwitcher() {
  const { t, locale, setLocale, visibleLocales, setVisibleLocales } = useTranslation();
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState<Locale[]>(visibleLocales);

  function openManage() {
    setDraft(visibleLocales);
    setManageOpen(true);
  }

  function toggleDraft(loc: Locale, checked: boolean) {
    setDraft((prev) => (checked ? [...prev, loc] : prev.filter((l) => l !== loc)));
  }

  function saveManage() {
    if (draft.length === 0) return;
    setVisibleLocales(draft);
    setManageOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("language.switcherLabel")} />}>
          <Languages />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibleLocales.map((loc) => (
            <DropdownMenuItem key={loc} onClick={() => setLocale(loc)}>
              <span className="mr-1.5">{LOCALE_FLAGS[loc]}</span>
              {LOCALE_NAMES[loc]}
              {loc === locale && <span className="ml-auto pl-3 text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openManage}>{t("language.manageLanguages")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("language.manageDialogTitle")}</DialogTitle>
            <DialogDescription>{t("language.manageDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {LOCALES.map((loc) => (
              <div key={loc} className="flex items-center gap-2">
                <Checkbox
                  id={`lang-${loc}`}
                  checked={draft.includes(loc)}
                  onCheckedChange={(checked) => toggleDraft(loc, checked === true)}
                />
                <Label htmlFor={`lang-${loc}`} className="flex-1 cursor-pointer">
                  <span className="mr-1.5">{LOCALE_FLAGS[loc]}</span>
                  {LOCALE_NAMES[loc]}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
            <Button onClick={saveManage} disabled={draft.length === 0}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
