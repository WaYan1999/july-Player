export interface AppSettings {
  language: "en" | "zh" | "fr";
  autoplay_next: boolean;
  resume_position: boolean;
  default_speed: number;
  default_volume: number;
  skip_forward_secs: number;
  skip_backward_secs: number;
  ai_deepseek_api_key: string;
  ai_deepseek_model: string;
  ai_translation_target: "en" | "zh" | "fr";
}
