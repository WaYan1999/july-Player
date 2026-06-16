import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAllSettings, setSetting } from "@/lib/store";
import type { AppSettings } from "@/types";
import {
  DEFAULT_TRANSLATION_LANGUAGE,
  isAppLanguage,
  isTranslationLanguage,
} from "@/lib/i18n";
import {
  DEFAULT_PET_PLUGINS,
  DEFAULT_PET_VARIANT,
  isPetVariantId,
  parsePetPlugins,
} from "@/lib/pets";

const DEFAULTS: AppSettings = {
  language: "en",
  autoplay_next: true,
  resume_position: true,
  default_speed: 1,
  default_volume: 100,
  skip_forward_secs: 10,
  skip_backward_secs: 10,
  ai_deepseek_api_key: "",
  ai_deepseek_proxy_url: "",
  ai_deepseek_proxy_token: "",
  ai_deepseek_model: "deepseek-v4-flash",
  ai_asr_api_key: "",
  ai_asr_model: "offline-whisper-tiny",
  ai_asr_endpoint: "",
  ai_translation_target: DEFAULT_TRANSLATION_LANGUAGE,
  pet_enabled: true,
  pet_variant: DEFAULT_PET_VARIANT,
  pet_plugins_enabled: DEFAULT_PET_PLUGINS,
};

function parseAiTarget(value: string | undefined): AppSettings["ai_translation_target"] {
  return isTranslationLanguage(value) ? value : DEFAULT_TRANSLATION_LANGUAGE;
}

function parse(raw: Record<string, string>): AppSettings {
  return {
    language: isAppLanguage(raw.language) ? raw.language : "en",
    autoplay_next: raw.autoplay_next !== "false",
    resume_position: raw.resume_position !== "false",
    default_speed: Number(raw.default_speed) || 1,
    default_volume: Number(raw.default_volume) || 100,
    skip_forward_secs: Number(raw.skip_forward_secs) || 10,
    skip_backward_secs: Number(raw.skip_backward_secs) || 10,
    ai_deepseek_api_key: raw.ai_deepseek_api_key ?? "",
    ai_deepseek_proxy_url: raw.ai_deepseek_proxy_url ?? "",
    ai_deepseek_proxy_token: raw.ai_deepseek_proxy_token ?? "",
    ai_deepseek_model: raw.ai_deepseek_model || "deepseek-v4-flash",
    ai_asr_api_key: raw.ai_asr_api_key ?? "",
    ai_asr_model: raw.ai_asr_model || "offline-whisper-tiny",
    ai_asr_endpoint: raw.ai_asr_endpoint ?? "",
    ai_translation_target: parseAiTarget(raw.ai_translation_target),
    pet_enabled: raw.pet_enabled !== "false",
    pet_variant: isPetVariantId(raw.pet_variant) ? raw.pet_variant : DEFAULT_PET_VARIANT,
    pet_plugins_enabled: parsePetPlugins(raw.pet_plugins_enabled),
  };
}

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  update: (key: string, value: string) => Promise<void>;
  reload: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  loaded: false,
  update: async () => {},
  reload: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function useSettingsProvider() {
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const settings = parse(raw);

  const reload = useCallback(async () => {
    const s = await getAllSettings();
    setRaw(s);
  }, []);

  useEffect(() => {
    reload().then(() => setLoaded(true));
  }, [reload]);

  const update = useCallback(async (key: string, value: string) => {
    setRaw((prev) => ({ ...prev, [key]: value }));
    await setSetting(key, value);
  }, []);

  return { settings, loaded, update, reload };
}
