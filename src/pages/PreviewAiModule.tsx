import { useMemo, useState } from "react";
import { AiModule } from "@/pages/AiModule";
import { SettingsContext } from "@/hooks/useSettings";
import { DEFAULT_PET_PLUGINS, DEFAULT_PET_VARIANT } from "@/lib/pets";
import type { AppSettings } from "@/types";

const previewSettings: AppSettings = {
  language: "en",
  autoplay_next: true,
  resume_position: true,
  default_speed: 1,
  default_volume: 100,
  skip_forward_secs: 10,
  skip_backward_secs: 10,
  ai_deepseek_api_key: "",
  ai_deepseek_proxy_url: "https://julyapi.top/v1",
  ai_deepseek_proxy_token: "sk-preview",
  ai_deepseek_model: "deepseek-v4-flash",
  ai_asr_api_key: "",
  ai_asr_model: "offline-whisper-tiny",
  ai_asr_endpoint: "",
  ai_translation_target: "zh",
  pet_enabled: true,
  pet_variant: DEFAULT_PET_VARIANT,
  pet_plugins_enabled: DEFAULT_PET_PLUGINS,
  pet_ai_token_enabled: false,
  pet_ai_daily_token_budget: 3,
  pet_desktop_enabled: false,
};

export function PreviewAiModule() {
  const [settings, setSettings] = useState(previewSettings);
  const context = useMemo(
    () => ({
      settings,
      loaded: true,
      update: async (key: string, value: string) => {
        setSettings((current) => ({ ...current, [key]: value }));
      },
      reload: async () => {},
    }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={context}>
      <main className="min-h-screen overflow-y-auto bg-background text-foreground">
        <AiModule previewMode />
      </main>
    </SettingsContext.Provider>
  );
}
