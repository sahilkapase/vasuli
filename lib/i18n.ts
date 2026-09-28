export const locales = ["en", "hi", "mr"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

/**
 * Minimal dictionary covering nav labels and a few high-traffic strings.
 * ponytail: only nav + dashboard strings are translated so far — the ceiling is that most
 * page copy is still English-only. Upgrade path: extend each locale object below and swap
 * hardcoded strings in components for `t("key")` as pages are touched.
 */
export const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.borrowers": "Borrowers",
    "nav.collect": "Collect",
    "nav.overdue": "Overdue",
    "nav.more": "More",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "dashboard.title": "Dashboard",
    "dashboard.totalLent": "Total lent",
    "dashboard.outstandingPrincipal": "Outstanding principal",
    "dashboard.interestDueToday": "Interest due today",
    "dashboard.interestDueWeek": "Interest due this week",
    "dashboard.overdueAmount": "Overdue amount",
  },
  hi: {
    "nav.home": "होम",
    "nav.borrowers": "उधारकर्ता",
    "nav.collect": "वसूली",
    "nav.overdue": "बकाया",
    "nav.more": "और",
    "nav.reports": "रिपोर्ट",
    "nav.settings": "सेटिंग्स",
    "dashboard.title": "डैशबोर्ड",
    "dashboard.totalLent": "कुल दिया गया",
    "dashboard.outstandingPrincipal": "बकाया मूलधन",
    "dashboard.interestDueToday": "आज का ब्याज",
    "dashboard.interestDueWeek": "इस सप्ताह का ब्याज",
    "dashboard.overdueAmount": "बकाया राशि",
  },
  mr: {
    "nav.home": "मुख्यपृष्ठ",
    "nav.borrowers": "कर्जदार",
    "nav.collect": "वसुली",
    "nav.overdue": "थकीत",
    "nav.more": "अधिक",
    "nav.reports": "अहवाल",
    "nav.settings": "सेटिंग्ज",
    "dashboard.title": "डॅशबोर्ड",
    "dashboard.totalLent": "एकूण दिलेली रक्कम",
    "dashboard.outstandingPrincipal": "थकीत मुद्दल",
    "dashboard.interestDueToday": "आजचे व्याज",
    "dashboard.interestDueWeek": "या आठवड्याचे व्याज",
    "dashboard.overdueAmount": "थकीत रक्कम",
  },
};

export function translate(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}
