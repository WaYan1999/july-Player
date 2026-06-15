import { useSettings } from "@/hooks/useSettings";
import { UI_TRANSLATIONS, formatMessage } from "@/lib/i18n";

export function useI18n() {
  const { settings } = useSettings();
  const t = UI_TRANSLATIONS[settings.language];
  return { t, language: settings.language, formatMessage };
}

