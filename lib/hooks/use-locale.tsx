"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Locale, locales, translate } from "@/lib/i18n";

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: "en",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Reads saved locale after mount to keep SSR and first client render in sync (avoids
  // a hydration mismatch), then swaps in the real value.
  useEffect(() => {
    const saved = localStorage.getItem("vasuli-locale");
    if (saved && (locales as readonly string[]).includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, not derivable from props/state
      setLocaleState(saved as Locale);
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("vasuli-locale", l);
  }

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, setLocale, t: (key: string) => translate(locale, key) };
}
