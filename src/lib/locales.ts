// src/lib/locales.ts

export const SUPPORTED_LOCALES = [
  { locale: "en", label: "English", flag: "🇬🇧", rtl: false },
  { locale: "ar", label: "Arabic", flag: "🇸🇦", rtl: true },
  { locale: "fr", label: "French", flag: "🇫🇷", rtl: false },
  { locale: "es", label: "Spanish", flag: "🇪🇸", rtl: false },
  { locale: "ru", label: "Russian", flag: "🇷🇺", rtl: false },
  { locale: "pt", label: "Portuguese", flag: "🇧🇷", rtl: false },
  { locale: "de", label: "German", flag: "🇩🇪", rtl: false },
  { locale: "zh", label: "Chinese", flag: "🇨🇳", rtl: false },
  { locale: "ja", label: "Japanese", flag: "🇯🇵", rtl: false },
  { locale: "hi", label: "Hindi", flag: "🇮🇳", rtl: false },
  { locale: "tr", label: "Turkish", flag: "🇹🇷", rtl: false },
  { locale: "ko", label: "Korean", flag: "🇰🇷", rtl: false },
  { locale: "it", label: "Italian", flag: "🇮🇹", rtl: false },
  { locale: "nl", label: "Dutch", flag: "🇳🇱", rtl: false },
  { locale: "pl", label: "Polish", flag: "🇵🇱", rtl: false },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]["locale"];

export function getLocaleLabel(locale: string): string {
  return SUPPORTED_LOCALES.find((l) => l.locale === locale)?.label ?? locale;
}

export function getLocaleFlag(locale: string): string {
  return SUPPORTED_LOCALES.find((l) => l.locale === locale)?.flag ?? "🌐";
}

export function isRtlLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.find((l) => l.locale === locale)?.rtl ?? false;
}
