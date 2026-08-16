import type { Locale } from "@/i18n/locale";
import { pluralRules } from "@/i18n/locale";

// Matches a single ICU-lite plural block: {varName, plural, cat{text} cat{text} ...}
// Branch content must not itself contain braces — keep any extra variables outside the block.
const PLURAL_BLOCK = /\{(\w+),\s*plural,\s*((?:\w+\{[^{}]*\}\s*)+)\}/g;
const BRANCH = /(\w+)\{([^{}]*)\}/g;
const SIMPLE_VAR = /\{(\w+)\}/g;

export function interpolate(
  template: string,
  vars: Record<string, string | number> | undefined,
  locale: Locale,
): string {
  let result = template;

  if (vars) {
    result = result.replace(PLURAL_BLOCK, (_match, varName: string, branchesRaw: string) => {
      const raw = vars[varName];
      const n = typeof raw === "number" ? raw : Number(raw ?? 0);
      const category = pluralRules[locale](n);

      const branches: Record<string, string> = {};
      BRANCH.lastIndex = 0;
      let branchMatch: RegExpExecArray | null;
      while ((branchMatch = BRANCH.exec(branchesRaw))) {
        branches[branchMatch[1]] = branchMatch[2];
      }

      const chosen = branches[category] ?? branches.other ?? "";
      return chosen.replace(/#/g, String(n));
    });

    result = result.replace(SIMPLE_VAR, (match, varName: string) =>
      varName in vars ? String(vars[varName]) : match,
    );
  }

  return result;
}
