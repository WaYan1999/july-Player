export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  pause: () => void;
}

export type VideoQuality = "1080p" | "2k";

export interface PreparedVideoQuality {
  path: string;
  originalWidth: number;
  originalHeight: number;
  targetHeight: number;
  converted: boolean;
}

export interface AiAudioTranslation {
  transcript: string;
  translation: string;
  startSeconds: number;
  durationSeconds: number;
}
