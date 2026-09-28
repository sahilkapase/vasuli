"use client";

import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/hooks/use-locale";
import { localeNames, locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <SelectTrigger className="h-11 w-11 justify-center border-none bg-transparent p-0 [&>svg]:hidden">
        <Languages className="h-5 w-5" />
        <SelectValue className="sr-only" />
      </SelectTrigger>
      <SelectContent>
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            {localeNames[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
