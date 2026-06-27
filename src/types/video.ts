export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  pause: () => void;
  prepareForSourceSwitch: () => void;
}

export interface AiAudioTranslation {
  transcript: string;
  translation: string;
  startSeconds: number;
  durationSeconds: number;
}

export interface AiAudioTranscript {
  transcript: string;
  startSeconds: number;
  durationSeconds: number;
}
