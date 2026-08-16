export const LOCALES = ["en", "es", "fr", "de", "pt", "it", "sk", "cs"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language's name in itself (endonym) — always shown this way, regardless of active UI language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  sk: "Slovenčina",
  cs: "Čeština",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇵🇹",
  it: "🇮🇹",
  sk: "🇸🇰",
  cs: "🇨🇿",
};

export type PluralCategory = "one" | "few" | "many" | "other";

/**
 * CLDR plural rule for Slovak and Czech (they share the same rule): one = 1, few = 2..4
 * (integers only), many = any non-integer count, other = everything else (0, 5+). Our app
 * only ever passes integer counts, so "many" never actually triggers here, but it's included
 * for correctness against the real CLDR rule rather than a simplified guess.
 */
function czSkPlural(n: number): PluralCategory {
  if (!Number.isInteger(n)) return "many";
  if (n === 1) return "one";
  if (n >= 2 && n <= 4) return "few";
  return "other";
}

/** CLDR plural rule per locale, restricted to the categories this app ever needs (integer counts only). */
export const pluralRules: Record<Locale, (n: number) => PluralCategory> = {
  en: (n) => (n === 1 ? "one" : "other"),
  es: (n) => (n === 1 ? "one" : "other"),
  // French: 0 and 1 both take the singular form.
  fr: (n) => (n === 0 || n === 1 ? "one" : "other"),
  de: (n) => (n === 1 ? "one" : "other"),
  pt: (n) => (n === 1 ? "one" : "other"),
  it: (n) => (n === 1 ? "one" : "other"),
  sk: czSkPlural,
  cs: czSkPlural,
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function detectLocale(): Locale {
  const candidates = navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  for (const lang of candidates) {
    const primary = lang.split("-")[0]?.toLowerCase();
    if (primary && isLocale(primary)) return primary;
  }
  return "en";
}
