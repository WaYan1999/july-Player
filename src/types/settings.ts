import type { PetCatalogId, PetPluginId } from "@/lib/pets";
import type { TranslationLanguage } from "@/lib/i18n";

export interface AppSettings {
  language: "en" | "zh" | "fr";
  autoplay_next: boolean;
  resume_position: boolean;
  default_speed: number;
  default_volume: number;
  skip_forward_secs: number;
  skip_backward_secs: number;
  ai_deepseek_api_key: string;
  ai_deepseek_proxy_url: string;
  ai_deepseek_proxy_token: string;
  ai_deepseek_model: string;
  ai_asr_api_key: string;
  ai_asr_model: string;
  ai_asr_endpoint: string;
  ai_translation_target: TranslationLanguage;
  pet_enabled: boolean;
  pet_variant: PetCatalogId;
  pet_plugins_enabled: PetPluginId[];
  pet_ai_token_enabled: boolean;
  pet_ai_daily_token_budget: number;
  pet_desktop_enabled: boolean;
}

export interface AiModelOption {
  id: string;
  label: string;
}
