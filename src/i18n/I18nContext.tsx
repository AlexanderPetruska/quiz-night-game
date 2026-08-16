import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { interpolate } from "@/i18n/interpolate";
import { detectLocale, LOCALES } from "@/i18n/locale";
import type { Locale } from "@/i18n/locale";
import { localeDictionaries } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/locales/en";

const LOCALE_KEY = "quiz-night-locale";
const VISIBLE_LOCALES_KEY = "quiz-night-visible-locales";

function getStoredLocale(): Locale | undefined {
  const stored = localStorage.getItem(LOCALE_KEY);
  return stored && (LOCALES as readonly string[]).includes(stored) ? (stored as Locale) : undefined;
}

function getStoredVisibleLocales(): Locale[] | undefined {
  const stored = localStorage.getItem(VISIBLE_LOCALES_KEY);
  if (!stored) return undefined;
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const filtered = parsed.filter(
      (v): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v),
    );
    return filtered.length > 0 ? filtered : undefined;
  } catch {
    return undefined;
  }
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  visibleLocales: Locale[];
  setVisibleLocales: (locales: Locale[]) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale() ?? detectLocale());
  const [visibleLocales, setVisibleLocalesState] = useState<Locale[]>(
    () => getStoredVisibleLocales() ?? [...LOCALES],
  );

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
  }

  function setVisibleLocales(next: Locale[]) {
    const safe = next.length > 0 ? next : [locale];
    setVisibleLocalesState(safe);
    localStorage.setItem(VISIBLE_LOCALES_KEY, JSON.stringify(safe));
    if (!safe.includes(locale)) {
      setLocale(safe.includes("en") ? "en" : safe[0]);
    }
  }

  const t = useMemo(() => {
    return (key: TranslationKey, vars?: Record<string, string | number>) => {
      const template = localeDictionaries[locale][key] ?? localeDictionaries.en[key] ?? key;
      return interpolate(template, vars, locale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const value: I18nContextValue = { locale, setLocale, visibleLocales, setVisibleLocales, t };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
