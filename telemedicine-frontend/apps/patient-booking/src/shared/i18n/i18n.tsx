import { createContext, useContext, useMemo, type ReactNode } from "react";
import enCommon from "./en/common.json";
import esCommon from "./es-CL/common.json";

export type Locale = "es-CL" | "en";

type Bundle = Record<string, string>;

const BUNDLES: Record<Locale, Bundle> = {
  en: { ...enCommon },
  "es-CL": { ...esCommon },
};

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export interface I18nApi {
  t(key: string, vars?: Record<string, string | number>): string;
  locale: Locale;
}

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({
  locale = "en",
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nApi>(() => {
    const primary = BUNDLES[locale];
    const fallback = BUNDLES.en;
    return {
      locale,
      t: (key, vars) => interpolate(primary[key] ?? fallback[key] ?? key, vars),
    };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
