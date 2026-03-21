export const SUPPORTED_LOCALES = [
  { locale: "en", label: "English", flag: "🇬🇧" },
  { locale: "ar", label: "Arabic", flag: "🇸🇦" },
  { locale: "fr", label: "French", flag: "🇫🇷" },
  { locale: "es", label: "Spanish", flag: "🇪🇸" },
  { locale: "ru", label: "Russian", flag: "🇷🇺" },
  { locale: "pt", label: "Portuguese", flag: "🇧🇷" },
  { locale: "de", label: "German", flag: "🇩🇪" },
  { locale: "zh", label: "Chinese", flag: "🇨🇳" },
  { locale: "ja", label: "Japanese", flag: "🇯🇵" },
  { locale: "hi", label: "Hindi", flag: "🇮🇳" },
  { locale: "tr", label: "Turkish", flag: "🇹🇷" },
  { locale: "ko", label: "Korean", flag: "🇰🇷" },
  { locale: "it", label: "Italian", flag: "🇮🇹" },
  { locale: "nl", label: "Dutch", flag: "🇳🇱" },
  { locale: "pl", label: "Polish", flag: "🇵🇱" },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]["locale"];

export function getLocaleLabel(locale: string): string {
  return SUPPORTED_LOCALES.find((l) => l.locale === locale)?.label ?? locale;
}

export function getLocaleFlag(locale: string): string {
  return SUPPORTED_LOCALES.find((l) => l.locale === locale)?.flag ?? "🌐";
}
