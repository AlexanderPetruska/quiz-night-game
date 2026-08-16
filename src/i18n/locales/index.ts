import type { Locale } from "@/i18n/locale";
import en, { type TranslationKey } from "@/i18n/locales/en";
import es from "@/i18n/locales/es";
import fr from "@/i18n/locales/fr";
import de from "@/i18n/locales/de";
import pt from "@/i18n/locales/pt";
import it from "@/i18n/locales/it";
import sk from "@/i18n/locales/sk";
import cs from "@/i18n/locales/cs";

export const localeDictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en,
  es,
  fr,
  de,
  pt,
  it,
  sk,
  cs,
};

export type { TranslationKey };
