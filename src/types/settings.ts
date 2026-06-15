export interface AppSettings {
  language: "en" | "zh" | "fr";
  autoplay_next: boolean;
  resume_position: boolean;
  default_speed: number;
  default_volume: number;
  skip_forward_secs: number;
  skip_backward_secs: number;
}
