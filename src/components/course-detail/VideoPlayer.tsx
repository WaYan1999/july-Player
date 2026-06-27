import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  memo,
  forwardRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  PlayIcon as Play,
  PauseIcon as Pause,
  SpeakerHighIcon as SpeakerHigh,
  SpeakerLowIcon as SpeakerLow,
  SpeakerSlashIcon as SpeakerSlash,
  CornersOutIcon as CornersOut,
  CornersInIcon as CornersIn,
  SkipForwardIcon as SkipForward,
  ArrowClockwiseIcon as Clockwise,
  ArrowCounterClockwiseIcon as CounterClockwise,
  SubtitlesIcon as Subtitles,
  GaugeIcon as Gauge,
  PictureInPictureIcon as PictureInPicture,
  CaretRightIcon as CaretRight,
  GearSixIcon as GearSix,
  SparkleIcon as Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { formatVideoTime } from "@/lib/format";
import type { Lesson, Subtitle, VideoPlayerHandle } from "@/types";
import {
  getSubtitleVtt,
  transcribeAudioSegmentOnly,
  translateLiveSubtitleText,
} from "@/lib/store";
import { EASE_OUT } from "@/lib/constants";
import type { PlayerTranslationKey } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import { useRafSeek } from "@/hooks/useRafSeek";
import { plainTextToSubtitleLines } from "@/lib/sanitize";
import {
  findUpcomingCues,
  getActiveCue,
  getAiSourceSubtitleCueText,
  getBilingualSubtitleIndexes,
  getDefaultSubtitleIndex,
  getDisplaySubtitleCueText,
  getSubtitleDisplayLabel,
  getSubtitleLanguageKey,
  getTranslationSourceSubtitleIndex,
  normalizeLiveSubtitleText,
  parseVttCues,
  uniqueSubtitleCueTexts,
  type SubtitleCue,
} from "@/lib/subtitles";

interface VideoPlayerProps {
  lesson: Lesson | undefined;
  subtitles: Subtitle[];
  hasNext: boolean;
  accentColor?: string;
  autoPlay?: boolean;
  autoSkipEnabled?: boolean;
  initialTime?: number | null;
  defaultSpeed?: number;
  defaultVolume?: number;
  skipSeconds?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onEnded?: () => void;
  onNext?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const AUTO_SKIP_SECONDS = 5;
const LIVE_AI_SEGMENT_SECONDS = 1.8;
const LIVE_AI_SEGMENT_OVERLAP_SECONDS = 0.25;
const LIVE_AI_SEGMENT_STEP_SECONDS = 0.75;
const LIVE_AI_POLL_MS = 220;
const LIVE_AI_BUSY_POLL_MS = 180;
const LIVE_AI_PAUSED_POLL_MS = 700;
const LIVE_AI_CACHE_LIMIT = 120;
const LIVE_AI_PREFETCH_CUE_COUNT = 8;
const LIVE_AI_PREFETCH_CONCURRENCY = 3;

const SUB_SIZE_OPTIONS: { labelKey: PlayerTranslationKey; value: number }[] = [
  { labelKey: "small", value: 14 },
  { labelKey: "medium", value: 18 },
  { labelKey: "large", value: 24 },
  { labelKey: "extraLarge", value: 32 },
] as const;

const SUB_COLOR_OPTIONS: { labelKey: PlayerTranslationKey; value: string }[] = [
  { labelKey: "white", value: "#FFFFFF" },
  { labelKey: "yellow", value: "#FFFF00" },
  { labelKey: "cyan", value: "#00FFFF" },
  { labelKey: "lime", value: "#AFC7F1" },
] as const;

const SUB_BG_OPTIONS: { labelKey?: PlayerTranslationKey; label?: string; value: number }[] = [
  { label: "75%", value: 0.75 },
  { label: "50%", value: 0.5 },
  { label: "25%", value: 0.25 },
  { labelKey: "none", value: 0 },
] as const;

const SUB_BOTTOM_OPTIONS: { labelKey: PlayerTranslationKey; value: number }[] = [
  { labelKey: "low", value: 8 },
  { labelKey: "default", value: 14 },
  { labelKey: "mid", value: 22 },
  { labelKey: "high", value: 32 },
] as const;

interface SubtitleStyle {
  fontSize: number;
  color: string;
  bgOpacity: number;
  bottomPct: number;
}

const SUB_STYLE_KEY = "ckourse:subtitle-style";
const SUBTITLE_OFF_KEY = "__off__";
const BILINGUAL_SUBTITLE_KEY = "bilingual";
const BILINGUAL_SUBTITLE_IDX = -2;
const BILINGUAL_SUBTITLE_LABEL = "双语字幕";

const DEFAULT_SUB_STYLE: SubtitleStyle = {
  fontSize: 18,
  color: "#FFFFFF",
  bgOpacity: 0.75,
  bottomPct: 14,
};

function loadSubStyle(): SubtitleStyle {
  try {
    const raw = localStorage.getItem(SUB_STYLE_KEY);
    if (raw) return { ...DEFAULT_SUB_STYLE, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_SUB_STYLE;
}

function getPreferredSubtitleKey(idx: number, subtitles: Subtitle[]): string {
  if (idx === BILINGUAL_SUBTITLE_IDX) return BILINGUAL_SUBTITLE_KEY;
  if (idx < 0) return SUBTITLE_OFF_KEY;
  return subtitles[idx] ? getSubtitleLanguageKey(subtitles[idx]) : SUBTITLE_OFF_KEY;
}

function getAiTranslationCacheKey(sourceText: string, targetLanguage: string): string {
  return `${targetLanguage}:${sourceText.toLowerCase()}`;
}

function setLimitedCacheValue(cache: Map<string, string>, key: string, value: string) {
  if (cache.has(key)) {
    cache.delete(key);
  }
  while (cache.size >= LIVE_AI_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
  cache.set(key, value);
}

export const VideoPlayer = memo(forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  lesson,
  subtitles,
  hasNext,
  accentColor,
  autoPlay,
  autoSkipEnabled = true,
  initialTime,
  defaultSpeed = 1,
  defaultVolume = 100,
  skipSeconds = 10,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
  onEnded,
  onNext,
}, ref) {
  const navigate = useNavigate();
  const { t: ui } = useI18n();
  const { settings } = useSettings();
  const t = ui.player;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const lastControlsWakeRef = useRef(0);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const seekPreviewFrameRef = useRef<number | null>(null);
  const pendingSeekPreviewRef = useRef<{ time: number; x: number } | null>(null);
  const aiTranslateRequestRef = useRef(0);
  const aiSegmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSegmentInFlightRef = useRef(false);
  const aiTranslationInFlightRef = useRef(false);
  const aiLastSegmentStartRef = useRef<number | null>(null);
  const aiLastTranscriptRef = useRef("");
  const aiPendingTranscriptRef = useRef("");
  const aiVisibleSubtitleRef = useRef("");
  const aiEmptySegmentCountRef = useRef(0);
  const isSeekingRef = useRef(false);
  const suppressNextPauseEventRef = useRef(false);
  const aiSegmentCacheRef = useRef(new Map<string, string>());
  const aiTranslationCacheRef = useRef(new Map<string, string>());
  const aiTranslationPromiseRef = useRef(new Map<string, Promise<string>>());
  const parsedTrackCacheRef = useRef(new Map<string, SubtitleCue[]>());

  const stopAiAudioTranslation = useCallback(() => {
    if (aiSegmentTimerRef.current) {
      clearTimeout(aiSegmentTimerRef.current);
      aiSegmentTimerRef.current = null;
    }
    aiSegmentInFlightRef.current = false;
    aiTranslationInFlightRef.current = false;
    aiLastSegmentStartRef.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        setVideoTime(seconds);
        onTimeUpdate?.(seconds);
      }
    },
    pause() {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    },
    prepareForSourceSwitch() {
      const video = videoRef.current;
      if (!video) return;
      stopAiAudioTranslation();
      if (!video.paused) {
        suppressNextPauseEventRef.current = true;
        video.pause();
      }
    },
  }), [onTimeUpdate, stopAiAudioTranslation]);

  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(defaultVolume / 100);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(defaultSpeed);
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState(-1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);
  const [seekPreviewX, setSeekPreviewX] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subStyle, setSubStyle] = useState<SubtitleStyle>(loadSubStyle);
  const [subMenuView, setSubMenuView] = useState<"tracks" | "settings">(
    "tracks",
  );
  const [autoSkipRemaining, setAutoSkipRemaining] = useState(AUTO_SKIP_SECONDS);
  const [autoSkipCancelled, setAutoSkipCancelled] = useState(false);
  const [aiTranslatedText, setAiTranslatedText] = useState("");
  const [aiTranslatedKey, setAiTranslatedKey] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiTranslating, setIsAiTranslating] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const updateAiSubtitleText = useCallback((text: string, cacheKey = "") => {
    aiVisibleSubtitleRef.current = text;
    setAiTranslatedKey(cacheKey);
    setAiTranslatedText(text);
  }, []);
  const hasSubtitles = subtitles.length > 0;
  const aiConfigured =
    settings.ai_deepseek_proxy_url.trim().length > 0 &&
    (settings.ai_deepseek_proxy_token.trim().length > 0 ||
      settings.ai_deepseek_api_key.trim().length > 0);

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  // Auto-skip countdown when video ends
  const autoSkipFiredRef = useRef(false);
  useEffect(() => {
    if (!hasEnded || !hasNext || !autoSkipEnabled || autoSkipCancelled) {
      setAutoSkipRemaining(AUTO_SKIP_SECONDS);
      autoSkipFiredRef.current = false;
      return;
    }
    if (autoSkipFiredRef.current) return;
    if (autoSkipRemaining <= 0) {
      autoSkipFiredRef.current = true;
      onNext?.();
      return;
    }
    const timer = setTimeout(() => {
      setAutoSkipRemaining((t) => t - 0.05);
    }, 50);
    return () => clearTimeout(timer);
  }, [hasEnded, hasNext, autoSkipEnabled, autoSkipCancelled, autoSkipRemaining, onNext]);

  // Reset auto-skip cancelled state when lesson changes
  useEffect(() => {
    setAutoSkipCancelled(false);
  }, [lesson?.id]);

  // Persist subtitle style to localStorage
  useEffect(() => {
    localStorage.setItem(SUB_STYLE_KEY, JSON.stringify(subStyle));
  }, [subStyle]);

  // Parsed subtitle cues per track index
  const [parsedTracks, setParsedTracks] = useState<
    Map<number, SubtitleCue[]>
  >(new Map());

  // Track preferred subtitle language and speed across lesson changes
  const preferredSubLangRef = useRef<string | null>(null);
  const playbackSpeedRef = useRef(playbackSpeed);

  const activeVideoPath = lesson?.videoPath;
  const videoSrc = useMemo(
    () => activeVideoPath ? convertFileSrc(activeVideoPath, "stream") : undefined,
    [activeVideoPath],
  );
  const bilingualSubtitleIndexes = useMemo(
    () => getBilingualSubtitleIndexes(subtitles),
    [subtitles],
  );

  // Reset state when lesson changes (includes AI reset — same deps, merged to reduce render cycles)
  useEffect(() => {
    stopAiAudioTranslation();
    setHasEnded(false);
    setVideoTime(0);
    setVideoDuration(0);
    setIsPlaying(false);
    setShowControls(true);
    setParsedTracks(new Map());
    setActiveSubtitleIdx(-1);
    setBuffered(0);
    setSeekPreviewTime(null);
    setAiError("");
    setAiStatus("");
    updateAiSubtitleText("");
    aiTranslateRequestRef.current += 1;
    setShowAiPanel(false);
    setIsAiTranslating(false);
    aiLastTranscriptRef.current = "";
    aiPendingTranscriptRef.current = "";
    aiVisibleSubtitleRef.current = "";
    aiEmptySegmentCountRef.current = 0;
    aiSegmentCacheRef.current.clear();
    aiTranslationCacheRef.current.clear();
    if (lesson?.id) setIsSwitching(true);
  }, [lesson?.id, stopAiAudioTranslation, updateAiSubtitleText]);

  // Restore subtitle selection by language when lesson changes
  useEffect(() => {
    if (subtitles.length === 0) {
      return;
    }

    const preferredKey = preferredSubLangRef.current;
    if (preferredKey === SUBTITLE_OFF_KEY) {
      setActiveSubtitleIdx(-1);
      return;
    }

    if (preferredKey === BILINGUAL_SUBTITLE_KEY) {
      setActiveSubtitleIdx(
        bilingualSubtitleIndexes ? BILINGUAL_SUBTITLE_IDX : getDefaultSubtitleIndex(subtitles),
      );
      return;
    }

    if (preferredKey) {
      const idx = subtitles.findIndex(
        (s) => getSubtitleLanguageKey(s) === preferredKey,
      );
      setActiveSubtitleIdx(idx >= 0 ? idx : getDefaultSubtitleIndex(subtitles));
      return;
    }

    setActiveSubtitleIdx(getDefaultSubtitleIndex(subtitles));
  }, [bilingualSubtitleIndexes, lesson?.id, subtitles]);

  // Track whether we've applied initial setup for the current lesson
  const initialSeekAppliedRef = useRef<number | null>(null);

  // Reset the flag when lesson changes
  useEffect(() => {
    initialSeekAppliedRef.current = null;
  }, [lesson?.id]);

  // Apply initial position, speed, volume, and autoplay when video is ready
  // initialTime === null means "settings not loaded yet" — wait before applying
  useEffect(() => {
    if (!videoRef.current || !lesson?.id) return;
    if (initialTime === null) return; // settings not ready yet
    if (initialSeekAppliedRef.current === lesson.id) return;
    const video = videoRef.current;

    const applyInitial = () => {
      if (initialSeekAppliedRef.current === lesson.id) return;
      initialSeekAppliedRef.current = lesson.id;
      if (initialTime && initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
      }
      video.playbackRate = playbackSpeedRef.current;
      video.volume = defaultVolume / 100;
      if (autoPlay) {
        video.play();
      }
    };

    // If metadata is already loaded, apply immediately
    if (video.readyState >= 1) {
      applyInitial();
    } else {
      video.addEventListener("loadedmetadata", applyInitial);
      return () => video.removeEventListener("loadedmetadata", applyInitial);
    }
  }, [lesson?.id, initialTime, autoPlay, defaultVolume]);

  const requiredSubtitleIndexes = useMemo(() => {
    if (subtitles.length === 0 || activeSubtitleIdx === -1) return [];
    if (activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX) {
      return bilingualSubtitleIndexes ?? [];
    }
    return subtitles[activeSubtitleIdx] ? [activeSubtitleIdx] : [];
  }, [activeSubtitleIdx, bilingualSubtitleIndexes, subtitles]);

  // Parse only the selected subtitle tracks. Loading every track during a
  // lesson switch can noticeably block slower disks when a course has many SRTs.
  useEffect(() => {
    if (requiredSubtitleIndexes.length === 0) return;

    const missingIndexes: number[] = [];
    const cachedEntries: [number, SubtitleCue[]][] = [];
    for (const idx of requiredSubtitleIndexes) {
      const subtitle = subtitles[idx];
      if (!subtitle || parsedTracks.has(idx)) continue;
      const cached = parsedTrackCacheRef.current.get(subtitle.path);
      if (cached) {
        cachedEntries.push([idx, cached]);
      } else {
        missingIndexes.push(idx);
      }
    }

    if (cachedEntries.length > 0) {
      setParsedTracks((prev) => {
        const next = new Map(prev);
        for (const [idx, cues] of cachedEntries) {
          next.set(idx, cues);
        }
        return next;
      });
    }
    if (missingIndexes.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      Promise.all(
        missingIndexes.map(async (idx) => {
          const subtitle = subtitles[idx];
          const vtt = await getSubtitleVtt(subtitle.path);
          const cues = parseVttCues(vtt);
          parsedTrackCacheRef.current.set(subtitle.path, cues);
          return [idx, cues] as [number, SubtitleCue[]];
        }),
      )
        .then((entries) => {
          if (cancelled) return;
          setParsedTracks((prev) => {
            const next = new Map(prev);
            for (const [idx, cues] of entries) {
              next.set(idx, cues);
            }
            return next;
          });
        })
        .catch(() => {});
    }, 30);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [parsedTracks, requiredSubtitleIndexes, subtitles]);

  // Get the active cue text for the current time
  const activeCueText =
    activeSubtitleIdx >= 0
      ? getActiveCue(parsedTracks.get(activeSubtitleIdx), videoTime)
      : null;
  const displayActiveCueText =
    activeSubtitleIdx >= 0 && subtitles[activeSubtitleIdx]
      ? getDisplaySubtitleCueText(subtitles[activeSubtitleIdx], activeCueText)
      : null;
  const bilingualCueTexts =
    activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX && bilingualSubtitleIndexes
      ? uniqueSubtitleCueTexts(
          bilingualSubtitleIndexes
            .map((idx) =>
              getDisplaySubtitleCueText(
                subtitles[idx],
                getActiveCue(parsedTracks.get(idx), videoTime),
              ),
            )
            .filter((text): text is string => Boolean(text)),
        )
      : [];
  const subtitleCueTexts =
    activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX
      ? bilingualCueTexts
      : displayActiveCueText
        ? [displayActiveCueText]
        : [];
  const hasSelectedSubtitleSource =
    activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX
      ? Boolean(bilingualSubtitleIndexes)
      : activeSubtitleIdx >= 0;
  const sourceSubtitleTextForAi =
    activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX && bilingualSubtitleIndexes
      ? getAiSourceSubtitleCueText(
          subtitles[bilingualSubtitleIndexes[0]],
          getActiveCue(parsedTracks.get(bilingualSubtitleIndexes[0]), videoTime),
        )
      : activeSubtitleIdx >= 0 && subtitles[activeSubtitleIdx]
        ? getAiSourceSubtitleCueText(subtitles[activeSubtitleIdx], activeCueText)
        : "";
  const isAiSubtitleMode =
    !isSeeking && showAiPanel && aiConfigured && Boolean(sourceSubtitleTextForAi);
  const currentAiTranslationKey = isAiSubtitleMode
    ? getAiTranslationCacheKey(sourceSubtitleTextForAi, settings.ai_translation_target)
    : "";
  const cachedAiSubtitleCueText = currentAiTranslationKey
    ? aiTranslationCacheRef.current.get(currentAiTranslationKey) || ""
    : "";
  const currentAiTranslatedText = isAiSubtitleMode
    ? cachedAiSubtitleCueText ||
      (aiTranslatedKey === currentAiTranslationKey ? aiTranslatedText : "")
    : aiTranslatedText;
  const aiSubtitleCueText =
    showAiPanel &&
    (aiError || currentAiTranslatedText || aiStatus || isAiTranslating || isAiSubtitleMode)
      ? aiError ||
        currentAiTranslatedText ||
        aiStatus ||
        (isAiTranslating
          ? t.aiTranslating
          : isAiSubtitleMode
            ? t.aiUsingSubtitle
            : t.aiListening)
      : null;
  const displaySubtitleCueTexts = aiSubtitleCueText
    ? [aiSubtitleCueText]
    : subtitleCueTexts;
  const shouldTranslateVisibleSubtitle =
    isAiSubtitleMode &&
    !currentAiTranslatedText;

  const translateAiSubtitleText = useCallback(
    (sourceText: string) => {
      const normalizedSourceText = normalizeLiveSubtitleText(sourceText);
      if (!normalizedSourceText) return Promise.resolve("");

      const translationKey = getAiTranslationCacheKey(
        normalizedSourceText,
        settings.ai_translation_target,
      );
      const cachedTranslation = aiTranslationCacheRef.current.get(translationKey);
      if (cachedTranslation) return Promise.resolve(cachedTranslation);

      const existingRequest = aiTranslationPromiseRef.current.get(translationKey);
      if (existingRequest) return existingRequest;

      const request = translateLiveSubtitleText(
        normalizedSourceText,
        settings.ai_translation_target,
      )
        .then((translation) => {
          const normalizedTranslation = normalizeLiveSubtitleText(translation);
          if (normalizedTranslation) {
            setLimitedCacheValue(
              aiTranslationCacheRef.current,
              translationKey,
              normalizedTranslation,
            );
          }
          return normalizedTranslation;
        })
        .finally(() => {
          aiTranslationPromiseRef.current.delete(translationKey);
        });

      aiTranslationPromiseRef.current.set(translationKey, request);
      return request;
    },
    [settings.ai_translation_target],
  );

  const handleAiTranslateClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setShowSpeedMenu(false);
      setShowSubtitleMenu(false);
      setShowControls(true);

      if (!aiConfigured) {
        navigate("/ai");
        return;
      }

      setShowAiPanel((open) => {
        const nextOpen = !open;
        if (nextOpen && !sourceSubtitleTextForAi && subtitles.length > 0) {
          const sourceIdx = getTranslationSourceSubtitleIndex(subtitles);
          if (sourceIdx >= 0) {
            setActiveSubtitleIdx(sourceIdx);
            preferredSubLangRef.current = getPreferredSubtitleKey(sourceIdx, subtitles);
          }
        }
        return nextOpen;
      });
    },
    [aiConfigured, navigate, sourceSubtitleTextForAi, subtitles],
  );

  useEffect(() => {
    if (!shouldTranslateVisibleSubtitle) return;

    const sourceText = sourceSubtitleTextForAi;
    const requestId = aiTranslateRequestRef.current + 1;
    aiTranslateRequestRef.current = requestId;
    const translationKey = getAiTranslationCacheKey(sourceText, settings.ai_translation_target);
    const cachedTranslation = aiTranslationCacheRef.current.get(translationKey);
    if (cachedTranslation) {
      updateAiSubtitleText(cachedTranslation, translationKey);
      setAiError("");
      setAiStatus("");
      setIsAiTranslating(false);
      return;
    }

    setAiError("");
    updateAiSubtitleText("");
    setAiStatus(t.aiUsingSubtitle);
    setIsAiTranslating(true);

    let cancelled = false;
    translateAiSubtitleText(sourceText)
      .then((translation) => {
        if (cancelled || aiTranslateRequestRef.current !== requestId) return;
        const normalizedTranslation = normalizeLiveSubtitleText(translation);
        if (normalizedTranslation) {
          updateAiSubtitleText(normalizedTranslation, translationKey);
          setAiStatus("");
        } else {
          updateAiSubtitleText("");
          setAiStatus(t.aiTranslationFailed);
        }
      })
      .catch((err) => {
        if (cancelled || aiTranslateRequestRef.current !== requestId) return;
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string" && err.trim()
              ? err
              : t.aiTranslationFailed;
        setAiError("");
        setAiStatus(message);
      })
      .finally(() => {
        if (!cancelled && aiTranslateRequestRef.current === requestId) {
          setIsAiTranslating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    shouldTranslateVisibleSubtitle,
    sourceSubtitleTextForAi,
    settings.ai_translation_target,
    t.aiTranslationFailed,
    t.aiUsingSubtitle,
    translateAiSubtitleText,
    updateAiSubtitleText,
  ]);

  useEffect(() => {
    if (isSeeking || !showAiPanel || !aiConfigured || activeSubtitleIdx < 0) return;

    const sourceIdx =
      activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX
        ? bilingualSubtitleIndexes?.[0]
        : activeSubtitleIdx;
    if (sourceIdx === undefined || !subtitles[sourceIdx]) return;

    const cues = parsedTracks.get(sourceIdx);
    if (!cues?.length) return;

    let cancelled = false;
    const upcomingSourceTexts = uniqueSubtitleCueTexts(
      findUpcomingCues(cues, videoTime, LIVE_AI_PREFETCH_CUE_COUNT)
        .map((cue) => getAiSourceSubtitleCueText(subtitles[sourceIdx], cue.text))
        .filter(Boolean),
    );

    const missingSourceTexts = upcomingSourceTexts.filter((sourceText) => {
      const translationKey = getAiTranslationCacheKey(
        sourceText,
        settings.ai_translation_target,
      );
      return (
        !aiTranslationCacheRef.current.has(translationKey) &&
        !aiTranslationPromiseRef.current.has(translationKey)
      );
    });

    if (missingSourceTexts.length === 0) return;

    const prefetch = async () => {
      for (let i = 0; i < missingSourceTexts.length; i += LIVE_AI_PREFETCH_CONCURRENCY) {
        if (cancelled) return;
        await Promise.allSettled(
          missingSourceTexts
            .slice(i, i + LIVE_AI_PREFETCH_CONCURRENCY)
            .map((sourceText) => translateAiSubtitleText(sourceText)),
        );
      }
    };

    void prefetch();

    return () => {
      cancelled = true;
    };
  }, [
    showAiPanel,
    aiConfigured,
    activeSubtitleIdx,
    bilingualSubtitleIndexes,
    isSeeking,
    parsedTracks,
    subtitles,
    videoTime,
    settings.ai_translation_target,
    translateAiSubtitleText,
  ]);

  useEffect(() => {
    if (aiConfigured || !showAiPanel) return;
    setShowAiPanel(false);
    stopAiAudioTranslation();
  }, [aiConfigured, showAiPanel, stopAiAudioTranslation]);

  useEffect(() => {
    if (!showAiPanel || !aiConfigured || !activeVideoPath || hasSelectedSubtitleSource) {
      stopAiAudioTranslation();
      return;
    }

    const requestId = aiTranslateRequestRef.current + 1;
    aiTranslateRequestRef.current = requestId;
    let cancelled = false;
    setAiError("");
    updateAiSubtitleText("");
    setAiStatus(t.aiListening);
    aiLastTranscriptRef.current = "";
    aiPendingTranscriptRef.current = "";
    aiVisibleSubtitleRef.current = "";
    aiEmptySegmentCountRef.current = 0;
    aiSegmentCacheRef.current.clear();
    aiTranslationCacheRef.current.clear();

    const scheduleNextSegment = (delayMs: number) => {
      if (aiSegmentTimerRef.current) {
        clearTimeout(aiSegmentTimerRef.current);
      }
      aiSegmentTimerRef.current = setTimeout(runSegment, delayMs);
    };

    const translateTranscript = async (transcript: string) => {
      const normalizedTranscript = normalizeLiveSubtitleText(transcript);
      if (!normalizedTranscript) return;
      if (aiTranslationInFlightRef.current) {
        aiPendingTranscriptRef.current = normalizedTranscript;
        return;
      }

      const translationKey = getAiTranslationCacheKey(
        normalizedTranscript,
        settings.ai_translation_target,
      );
      const cachedTranslation = aiTranslationCacheRef.current.get(translationKey);
      if (cachedTranslation) {
        updateAiSubtitleText(cachedTranslation);
        setAiError("");
        setAiStatus("");
        return;
      }

      aiTranslationInFlightRef.current = true;
      setIsAiTranslating(true);
      setAiStatus((current) => current || t.aiTranslating);

      try {
        const translation = normalizeLiveSubtitleText(
          await translateAiSubtitleText(normalizedTranscript),
        );
        if (cancelled || aiTranslateRequestRef.current !== requestId) return;
        if (translation) {
          if (aiLastTranscriptRef.current === normalizedTranscript) {
            updateAiSubtitleText(translation);
          }
          setAiError("");
          setAiStatus("");
        }
      } catch (err) {
        if (cancelled || aiTranslateRequestRef.current !== requestId) return;
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string" && err.trim()
              ? err
              : t.aiTranslationFailed;
        setAiError("");
        setAiStatus(message);
      } finally {
        if (!cancelled && aiTranslateRequestRef.current === requestId) {
          aiTranslationInFlightRef.current = false;
          setIsAiTranslating(false);
          const pendingTranscript = aiPendingTranscriptRef.current;
          aiPendingTranscriptRef.current = "";
          if (pendingTranscript && pendingTranscript !== normalizedTranscript) {
            void translateTranscript(pendingTranscript);
          }
        }
      }
    };

    const runSegment = async () => {
      if (cancelled || !videoRef.current) return;
      const video = videoRef.current;

      if (video.paused || video.ended || !Number.isFinite(video.currentTime)) {
        setIsAiTranslating(false);
        setAiStatus(t.aiListening);
        scheduleNextSegment(LIVE_AI_PAUSED_POLL_MS);
        return;
      }

      if (isSeekingRef.current) {
        setIsAiTranslating(false);
        scheduleNextSegment(LIVE_AI_PAUSED_POLL_MS);
        return;
      }

      if (aiSegmentInFlightRef.current) {
        scheduleNextSegment(LIVE_AI_BUSY_POLL_MS);
        return;
      }
      const durationSeconds = LIVE_AI_SEGMENT_SECONDS;
      const startSeconds = Math.max(
        0,
        video.currentTime - durationSeconds - LIVE_AI_SEGMENT_OVERLAP_SECONDS,
      );
      const roundedStart = Math.floor(startSeconds * 4) / 4;
      if (
        aiLastSegmentStartRef.current !== null &&
        Math.abs(aiLastSegmentStartRef.current - roundedStart) < LIVE_AI_SEGMENT_STEP_SECONDS
      ) {
        scheduleNextSegment(LIVE_AI_POLL_MS);
        return;
      }

      aiLastSegmentStartRef.current = roundedStart;
      aiSegmentInFlightRef.current = true;
      setIsAiTranslating(!aiVisibleSubtitleRef.current);
      setAiStatus(t.aiListening);

      try {
        const segmentDuration = Math.max(
          0.8,
          Math.min(durationSeconds, video.currentTime - roundedStart),
        );
        const segmentKey = `${activeVideoPath}:${roundedStart.toFixed(2)}:${segmentDuration.toFixed(2)}`;
        const cachedTranscript = aiSegmentCacheRef.current.get(segmentKey);
        const result = cachedTranscript
          ? {
              transcript: cachedTranscript,
              startSeconds: roundedStart,
              durationSeconds: segmentDuration,
            }
          : await transcribeAudioSegmentOnly(activeVideoPath, roundedStart, segmentDuration);
        if (cancelled || aiTranslateRequestRef.current !== requestId) return;

        if (!cachedTranscript) {
          setLimitedCacheValue(
            aiSegmentCacheRef.current,
            segmentKey,
            normalizeLiveSubtitleText(result.transcript),
          );
        }

        const transcript = normalizeLiveSubtitleText(result.transcript);
        if (transcript) {
          aiEmptySegmentCountRef.current = 0;
          if (transcript !== aiLastTranscriptRef.current) {
            aiLastTranscriptRef.current = transcript;
            const translationKey = getAiTranslationCacheKey(
              transcript,
              settings.ai_translation_target,
            );
            const cachedTranslation = aiTranslationCacheRef.current.get(translationKey);
            if (cachedTranslation) {
              updateAiSubtitleText(cachedTranslation);
              setAiStatus("");
            } else {
              updateAiSubtitleText("");
              setAiStatus(t.aiTranslating);
            }
            void translateTranscript(transcript);
          } else if (!aiVisibleSubtitleRef.current) {
            setAiStatus(t.aiTranslating);
          }
          setAiError("");
        } else {
          aiEmptySegmentCountRef.current += 1;
          if (aiEmptySegmentCountRef.current >= 3 && !aiTranslationInFlightRef.current) {
            setAiStatus(t.aiNoSource);
          }
        }
      } catch (err) {
        if (cancelled || aiTranslateRequestRef.current !== requestId) return;
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string" && err.trim()
              ? err
              : t.aiTranslationFailed;
        setAiError("");
        setAiStatus(message);
      } finally {
        if (!cancelled && aiTranslateRequestRef.current === requestId) {
          aiSegmentInFlightRef.current = false;
          if (!aiTranslationInFlightRef.current) {
            setIsAiTranslating(false);
          }
          scheduleNextSegment(LIVE_AI_POLL_MS);
        }
      }
    };

    aiSegmentTimerRef.current = setTimeout(runSegment, LIVE_AI_POLL_MS);

    return () => {
      cancelled = true;
      stopAiAudioTranslation();
    };
  }, [
    showAiPanel,
    aiConfigured,
    activeVideoPath,
    hasSelectedSubtitleSource,
    settings.ai_translation_target,
    stopAiAudioTranslation,
    translateAiSubtitleText,
    updateAiSubtitleText,
    t.aiListening,
    t.aiNoSource,
    t.aiTranslating,
    t.aiTranslationFailed,
  ]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowSubtitleMenu(false);
        setShowVolumeSlider(false);
      }
    }, 3000);
  }, []);

  const handleMouseMove = useCallback(() => {
    const now = performance.now();
    if (now - lastControlsWakeRef.current < 250) return;
    lastControlsWakeRef.current = now;
    resetHideTimer();
  }, [resetHideTimer]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowSubtitleMenu(false);
        setShowVolumeSlider(false);
      }, 800);
    }
  }, []);

  const seekToTime = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(time)) return;
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : videoDuration;
      const clampedTime =
        duration > 0 ? Math.max(0, Math.min(time, duration)) : Math.max(0, time);
      video.currentTime = clampedTime;
      setVideoTime(clampedTime);
      onTimeUpdate?.(clampedTime);
    },
    [onTimeUpdate, videoDuration],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!videoRef.current) return;
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;

      const v = videoRef.current;
      switch (e.key) {
        case "Escape":
          if (document.fullscreenElement) {
            e.preventDefault();
            document.exitFullscreen();
          }
          break;
        case " ":
        case "k":
          e.preventDefault();
          if (hasEnded) {
            handleReplay();
          } else {
            v.paused ? v.play() : v.pause();
          }
          resetHideTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekToTime(v.currentTime - skipSeconds);
          resetHideTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekToTime(v.currentTime + skipSeconds);
          resetHideTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          setVolume(v.volume);
          if (v.muted) {
            v.muted = false;
            setIsMuted(false);
          }
          resetHideTimer();
          break;
        case "ArrowDown":
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          setVolume(v.volume);
          resetHideTimer();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          resetHideTimer();
          break;
        case "j":
          e.preventDefault();
          seekToTime(v.currentTime - skipSeconds);
          resetHideTimer();
          break;
        case "l":
          e.preventDefault();
          seekToTime(v.currentTime + skipSeconds);
          resetHideTimer();
          break;
        case "c":
          e.preventDefault();
          cycleSubtitles();
          resetHideTimer();
          break;
        case "p":
          e.preventDefault();
          togglePiP();
          break;
        case ",":
          if (e.shiftKey) {
            e.preventDefault();
            const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
            if (idx > 0) changeSpeed(SPEED_OPTIONS[idx - 1]);
          }
          break;
        case ".":
          if (e.shiftKey) {
            e.preventDefault();
            const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
            if (idx < SPEED_OPTIONS.length - 1)
              changeSpeed(SPEED_OPTIONS[idx + 1]);
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasEnded,
    playbackSpeed,
    resetHideTimer,
    seekToTime,
    skipSeconds,
  ]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (hasEnded) {
      handleReplay();
      return;
    }
    videoRef.current.paused
      ? videoRef.current.play()
      : videoRef.current.pause();
  }, [hasEnded]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    if (val === 0) {
      videoRef.current.muted = true;
      setIsMuted(true);
    } else if (videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  }, []);

  const changeSpeed = useCallback((speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    playbackSpeedRef.current = speed;
    setShowSpeedMenu(false);
  }, []);

  const cycleSubtitles = useCallback(() => {
    if (!hasSubtitles) return;
    setActiveSubtitleIdx((prev) => {
      const options = [
        -1,
        ...(bilingualSubtitleIndexes ? [BILINGUAL_SUBTITLE_IDX] : []),
        ...subtitles.map((_, idx) => idx),
      ];
      const current = options.includes(prev) ? options.indexOf(prev) : 0;
      const next = options[(current + 1) % options.length];
      preferredSubLangRef.current = getPreferredSubtitleKey(next, subtitles);
      return next;
    });
  }, [bilingualSubtitleIndexes, hasSubtitles, subtitles]);

  const selectSubtitle = useCallback(
    (idx: number) => {
      setActiveSubtitleIdx(idx);
      preferredSubLangRef.current = getPreferredSubtitleKey(idx, subtitles);
      setShowSubtitleMenu(false);
    },
    [subtitles],
  );

  // Fullscreen via DOM Fullscreen API (enabled by macos-private-api on macOS)
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  // Sync isFullscreen state with DOM fullscreen changes
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // PiP not supported or denied
    }
  }, []);

  const skipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    seekToTime(video.currentTime + skipSeconds);
    resetHideTimer();
  }, [resetHideTimer, seekToTime, skipSeconds]);

  const skipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    seekToTime(video.currentTime - skipSeconds);
    resetHideTimer();
  }, [resetHideTimer, seekToTime, skipSeconds]);

  const handleReplay = useCallback(() => {
    if (!videoRef.current) return;
    seekToTime(0);
    videoRef.current.play();
    setHasEnded(false);
  }, [seekToTime]);

  const handleDoubleClick = useCallback(() => {
    toggleFullscreen();
  }, [toggleFullscreen]);

  const handleTimeUpdate = useCallback(() => {
    if (isSeekingRef.current) return;
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setVideoTime(t);
      onTimeUpdate?.(t);
    }
  }, [onTimeUpdate]);

  const handleDurationChange = useCallback(() => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      onDurationChange?.(dur);
    }
  }, [onDurationChange]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setHasEnded(false);
    onPlayStateChange?.(true);
    resetHideTimer();
  }, [onPlayStateChange, resetHideTimer]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (suppressNextPauseEventRef.current) {
      suppressNextPauseEventRef.current = false;
    } else {
      onPlayStateChange?.(false);
    }
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  }, [onPlayStateChange]);

  const handleEnded = useCallback(() => {
    setHasEnded(true);
    setIsPlaying(false);
    setShowControls(true);
    onPlayStateChange?.(false);
    onEnded?.();
  }, [onEnded, onPlayStateChange]);

  const handleProgress = useCallback(() => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const buf = videoRef.current.buffered;
    if (buf.length > 0) {
      setBuffered(buf.end(buf.length - 1) / videoRef.current.duration);
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsSwitching(false);
  }, []);

  const { startSeekTime, scheduleSeekTime, flushSeekTime } = useRafSeek({
    videoRef,
    duration: videoDuration,
    onPreviewTimeChange: useCallback(
      (time: number) => {
        setVideoTime(time);
      },
      [],
    ),
    onCommitTimeChange: useCallback(
      (time: number) => {
        onTimeUpdate?.(time);
      },
      [onTimeUpdate],
    ),
    liveSeekIntervalMs: 110,
  });

  const getSeekRatioFromClientX = (
    clientX: number,
    rect: Pick<DOMRect, "left" | "width">,
  ) => {
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleSeekMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || !seekBarRef.current || videoDuration <= 0) return;
      e.preventDefault();
      const seekRect = seekBarRef.current.getBoundingClientRect();
      setIsSeeking(true);
      isSeekingRef.current = true;
      startSeekTime(getSeekRatioFromClientX(e.clientX, seekRect) * videoDuration);

      const handleMouseMove = (ev: MouseEvent) => {
        ev.preventDefault();
        scheduleSeekTime(
          getSeekRatioFromClientX(ev.clientX, seekRect) * videoDuration,
        );
      };

      const handleMouseUp = () => {
        flushSeekTime();
        isSeekingRef.current = false;
        setIsSeeking(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("blur", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("blur", handleMouseUp);
    },
    [flushSeekTime, scheduleSeekTime, startSeekTime, videoDuration],
  );

  const handleSeekHover = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!seekBarRef.current || !videoDuration) return;
      const rect = seekBarRef.current.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      pendingSeekPreviewRef.current = {
        time: ratio * videoDuration,
        x: e.clientX - rect.left,
      };
      if (seekPreviewFrameRef.current !== null) return;
      seekPreviewFrameRef.current = window.requestAnimationFrame(() => {
        seekPreviewFrameRef.current = null;
        const preview = pendingSeekPreviewRef.current;
        if (!preview) return;
        setSeekPreviewTime(preview.time);
        setSeekPreviewX(preview.x);
      });
    },
    [videoDuration],
  );

  const handleSeekLeave = useCallback(() => {
    if (seekPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(seekPreviewFrameRef.current);
      seekPreviewFrameRef.current = null;
    }
    pendingSeekPreviewRef.current = null;
    setSeekPreviewTime(null);
  }, []);

  useEffect(() => {
    return () => {
      if (seekPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(seekPreviewFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showSpeedMenu && !showSubtitleMenu) return;
    const handleClick = () => {
      setShowSpeedMenu(false);
      setShowSubtitleMenu(false);
    };
    // Delay to avoid closing immediately
    const timer = setTimeout(
      () => window.addEventListener("click", handleClick),
      0,
    );
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
    };
  }, [showSpeedMenu, showSubtitleMenu]);

  const VolumeIcon = isMuted || volume === 0 ? SpeakerSlash : volume < 0.5 ? SpeakerLow : SpeakerHigh;
  const progress = videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0;

  if (!videoSrc) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <div className="flex aspect-video items-center justify-center bg-card">
          <p className="font-sans text-sm text-muted-foreground">
            No lesson selected
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/player video-player-shell relative overflow-hidden rounded-xl border border-border bg-black",
        isFullscreen && "h-screen w-screen rounded-none border-0",
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      <video
        ref={videoRef}
        className={cn(
          "video-player-media w-full bg-black",
          isFullscreen ? "h-full object-cover" : "aspect-video object-contain",
        )}
        src={videoSrc}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onProgress={handleProgress}
        onCanPlay={handleCanPlay}
        onClick={togglePlay}
        onDoubleClick={handleDoubleClick}
        preload="metadata"
        onStalled={() => console.warn("[video] stalled", videoSrc)}
        onAbort={() => console.warn("[video] abort", videoSrc)}
        onError={(e) => {
          const v = e.currentTarget;
          const err = v.error;
          const codeName = err
            ? ["", "MEDIA_ERR_ABORTED", "MEDIA_ERR_NETWORK", "MEDIA_ERR_DECODE", "MEDIA_ERR_SRC_NOT_SUPPORTED"][err.code] ?? `code=${err.code}`
            : "unknown";
          console.error("[video] error", {
            src: v.currentSrc,
            code: err?.code,
            codeName,
            message: err?.message,
            networkState: v.networkState,
            readyState: v.readyState,
          });
        }}
      />

      {isSwitching && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
          <div className="size-7 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      )}

      {displaySubtitleCueTexts.length > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1.5 px-8"
          style={{ bottom: `${subStyle.bottomPct}%` }}
        >
          {displaySubtitleCueTexts.map((cueText, idx) => (
            <span
              key={`${idx}-${cueText}`}
              className="inline-block max-w-[80%] rounded px-3 py-1.5 text-center font-sans leading-relaxed"
              style={{
                fontSize: isFullscreen
                  ? subStyle.fontSize * 1.5
                  : subStyle.fontSize,
                color: subStyle.color,
                backgroundColor: `rgba(0, 0, 0, ${subStyle.bgOpacity})`,
                textShadow:
                  subStyle.bgOpacity < 0.25
                    ? "0 1px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.6)"
                    : "none",
              }}
            >
              {plainTextToSubtitleLines(cueText).map((line, lineIdx) => (
                <span key={`${lineIdx}-${line}`}>
                  {lineIdx > 0 && <br />}
                  {line}
                </span>
              ))}
            </span>
          ))}
        </div>
      )}

      {hasEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div
            className="flex flex-col items-center gap-5"
            style={{
              animation: `fadeInUp 400ms ${EASE_OUT} both`,
            }}
          >
            <p className="font-heading text-base font-semibold text-white">
              {t.lessonComplete}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReplay}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 font-sans text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <CounterClockwise className="size-4" />
                {t.replay}
              </button>
              {hasNext && (
                <div className="relative">
                  {autoSkipEnabled && !autoSkipCancelled && (
                    <svg
                      className="absolute -inset-1 size-[calc(100%+8px)]"
                      viewBox="0 0 100 40"
                      preserveAspectRatio="none"
                    >
                      <rect
                        x="1"
                        y="1"
                        width="98"
                        height="38"
                        rx="10"
                        ry="10"
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="2"
                      />
                      <rect
                        x="1"
                        y="1"
                        width="98"
                        height="38"
                        rx="10"
                        ry="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-primary"
                        strokeDasharray={`${((AUTO_SKIP_SECONDS - autoSkipRemaining) / AUTO_SKIP_SECONDS) * 272} 272`}
                        style={{ transition: "stroke-dasharray 50ms linear" }}
                      />
                    </svg>
                  )}
                  <button
                    onClick={onNext}
                    className="relative flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t.nextLesson}
                    {autoSkipEnabled && !autoSkipCancelled && (
                      <span className="font-mono text-xs font-normal opacity-70">
                        {Math.ceil(autoSkipRemaining)}
                      </span>
                    )}
                    <CaretRight className="size-4" weight="bold" />
                  </button>
                  {autoSkipEnabled && !autoSkipCancelled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutoSkipCancelled(true);
                      }}
                      className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-white/20 font-sans text-[10px] text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                      title={t.cancelAutoSkip}
                    >
                      x
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isPlaying && !hasEnded && videoDuration > 0 && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="flex size-16 items-center justify-center rounded-full text-white backdrop-blur-sm transition-transform hover:scale-110"
            style={{
              transitionTimingFunction: EASE_OUT,
              background: accentColor
                ? `linear-gradient(135deg, ${accentColor}30, ${accentColor}15)`
                : "rgba(255,255,255,0.15)",
              boxShadow: accentColor
                ? `0 0 24px ${accentColor}20`
                : "none",
            }}
          >
            <Play className="size-7 translate-x-0.5" weight="fill" />
          </div>
        </button>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300 sm:px-5 sm:pb-4",
          isFullscreen && "px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 md:px-8",
          showControls || isSeeking ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <div
          ref={seekBarRef}
          className="group/seek relative mb-2 h-1 cursor-pointer rounded-full bg-white/20"
          onMouseDown={handleSeekMouseDown}
          onMouseMove={handleSeekHover}
          onMouseLeave={handleSeekLeave}
        >
          <div
            className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-white/15"
            style={{ transform: `scaleX(${buffered})` }}
          />
          <div
            className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary transition-transform duration-75"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-md transition-opacity group-hover/seek:opacity-100"
            style={{ left: `${progress}%` }}
          />
          <div className="absolute -inset-y-1 inset-x-0 group-hover/seek:-inset-y-0.5" />
          {seekPreviewTime !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 font-mono text-[10px] text-white"
              style={{ left: `${seekPreviewX}px` }}
            >
              {formatVideoTime(seekPreviewTime)}
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <ControlButton onClick={togglePlay} tooltip={`${isPlaying ? t.pause : t.play} (K)`}>
              {isPlaying ? (
                <Pause className="size-5" weight="fill" />
              ) : (
                <Play className="size-5" weight="fill" />
              )}
            </ControlButton>

            <ControlButton
              onClick={skipBackward}
              tooltip={`${t.backSeconds.replace("{seconds}", String(skipSeconds))} (J)`}
            >
              <CounterClockwise className="size-4" weight="bold" />
            </ControlButton>

            <ControlButton
              onClick={skipForward}
              tooltip={`${t.forwardSeconds.replace("{seconds}", String(skipSeconds))} (L)`}
            >
              <Clockwise className="size-4" weight="bold" />
            </ControlButton>

            {hasNext && (
              <ControlButton onClick={onNext} tooltip={t.nextLessonTooltip}>
                <SkipForward className="size-4" weight="fill" />
              </ControlButton>
            )}

            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <ControlButton onClick={toggleMute} tooltip={`${isMuted ? t.unmute : t.mute} (M)`}>
                <VolumeIcon className="size-4" />
              </ControlButton>
              <div
                className={cn(
                  "flex items-center overflow-hidden transition-all duration-200",
                  showVolumeSlider ? "w-20 opacity-100 ml-0.5" : "w-0 opacity-0",
                )}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
            </div>
          </div>

          <span className="min-w-0 truncate whitespace-nowrap font-mono text-[11px] text-white/70 select-none">
            {formatVideoTime(videoTime)}
            {videoDuration > 0 && (
              <span className="text-white/40">
                {" / "}
                {formatVideoTime(videoDuration)}
              </span>
            )}
          </span>

          <div className="ml-auto flex min-w-fit shrink-0 items-center gap-1">
            <ControlButton
              onClick={handleAiTranslateClick}
              tooltip={
                aiConfigured
                  ? sourceSubtitleTextForAi
                    ? t.aiUsingSubtitle
                    : t.aiVoiceTranslate
                  : t.aiTranslateUnavailable
              }
              active={showAiPanel}
              muted={!aiConfigured}
            >
              <Sparkle className="size-4" weight={showAiPanel ? "fill" : "regular"} />
            </ControlButton>

            <div className="relative">
              <ControlButton
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeedMenu((s) => !s);
                  setShowSubtitleMenu(false);
                }}
                tooltip={t.playbackSpeed}
                active={playbackSpeed !== 1}
              >
                {playbackSpeed !== 1 ? (
                  <span className="font-mono text-[11px] font-bold">{playbackSpeed}x</span>
                ) : (
                  <Gauge className="size-4" />
                )}
              </ControlButton>
              {showSpeedMenu && (
                <PopupMenu>
                  <p className="mb-1 px-2 font-sans text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {t.speed}
                  </p>
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => {
                        e.stopPropagation();
                        changeSpeed(s);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1 font-mono text-xs transition-colors hover:bg-white/10",
                        s === playbackSpeed
                          ? "text-primary font-semibold"
                          : "text-white/80",
                      )}
                    >
                      {s}x
                      {s === 1 && (
                        <span className="text-[10px] text-white/30">{t.normal}</span>
                      )}
                    </button>
                  ))}
                </PopupMenu>
              )}
            </div>

            <div className="relative">
              <ControlButton
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubtitleMenu((s) => {
                    if (!s) setSubMenuView("tracks");
                    return !s;
                  });
                  setShowSpeedMenu(false);
                }}
                tooltip={`${t.subtitles} (C)`}
                active={activeSubtitleIdx !== -1}
                muted={!hasSubtitles}
              >
                <Subtitles className="size-4" />
              </ControlButton>
              {showSubtitleMenu && (
                <PopupMenu wide={subMenuView === "settings" || !hasSubtitles}>
                  {subMenuView === "tracks" ? (
                    <>
                      <div className="mb-1 flex items-center justify-between px-2">
                        <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          {t.subtitles}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubMenuView("settings");
                          }}
                          className="rounded p-0.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <GearSix className="size-3.5" />
                        </button>
                      </div>
                      {!hasSubtitles && (
                        <p className="max-w-40 px-2 py-1.5 font-sans text-xs leading-snug text-white/45">
                          {t.noSubtitles}
                        </p>
                      )}
                      {hasSubtitles && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectSubtitle(-1);
                            }}
                            className={cn(
                              "w-full rounded px-2 py-1 text-left font-sans text-xs transition-colors hover:bg-white/10",
                              activeSubtitleIdx === -1
                                ? "text-primary font-semibold"
                                : "text-white/80",
                            )}
                          >
                            {t.subtitlesOff}
                          </button>
                          {bilingualSubtitleIndexes && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectSubtitle(BILINGUAL_SUBTITLE_IDX);
                              }}
                              className={cn(
                                "w-full rounded px-2 py-1 text-left font-sans text-xs transition-colors hover:bg-white/10",
                                activeSubtitleIdx === BILINGUAL_SUBTITLE_IDX
                                  ? "text-primary font-semibold"
                                  : "text-white/80",
                              )}
                            >
                              {BILINGUAL_SUBTITLE_LABEL}
                            </button>
                          )}
                          {subtitles.map((sub, i) => (
                            <button
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectSubtitle(i);
                              }}
                              className={cn(
                                "w-full rounded px-2 py-1 text-left font-sans text-xs transition-colors hover:bg-white/10",
                                activeSubtitleIdx === i
                                  ? "text-primary font-semibold"
                                  : "text-white/80",
                              )}
                            >
                              {getSubtitleDisplayLabel(sub, t.subtitles)}
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center gap-2 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubMenuView("tracks");
                          }}
                          className="font-sans text-xs text-white/50 transition-colors hover:text-white"
                        >
                          &larr;
                        </button>
                        <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          {t.subtitleStyle}
                        </p>
                      </div>

                      <SubSettingRow label={t.size}>
                        {SUB_SIZE_OPTIONS.map((opt) => (
                          <SubSettingChip
                            key={opt.value}
                            label={t[opt.labelKey]}
                            active={subStyle.fontSize === opt.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubStyle((s) => ({ ...s, fontSize: opt.value }));
                            }}
                          />
                        ))}
                      </SubSettingRow>

                      <SubSettingRow label={t.color}>
                        {SUB_COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubStyle((s) => ({ ...s, color: opt.value }));
                            }}
                            className={cn(
                              "size-5 rounded-full border-2 transition-all hover:scale-110",
                              subStyle.color === opt.value
                                ? "border-primary scale-110"
                                : "border-white/20 hover:border-white/40",
                            )}
                            style={{ backgroundColor: opt.value }}
                            title={t[opt.labelKey]}
                          />
                        ))}
                      </SubSettingRow>

                      <SubSettingRow label={t.background}>
                        {SUB_BG_OPTIONS.map((opt) => (
                          <SubSettingChip
                            key={opt.value}
                            label={opt.labelKey ? t[opt.labelKey] : opt.label ?? ""}
                            active={subStyle.bgOpacity === opt.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubStyle((s) => ({ ...s, bgOpacity: opt.value }));
                            }}
                          />
                        ))}
                      </SubSettingRow>

                      <SubSettingRow label={t.position} last>
                        {SUB_BOTTOM_OPTIONS.map((opt) => (
                          <SubSettingChip
                            key={opt.value}
                            label={t[opt.labelKey]}
                            active={subStyle.bottomPct === opt.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubStyle((s) => ({ ...s, bottomPct: opt.value }));
                            }}
                          />
                        ))}
                      </SubSettingRow>
                    </>
                  )}
                </PopupMenu>
              )}
            </div>

            <ControlButton onClick={togglePiP} tooltip={`${t.pictureInPicture} (P)`}>
              <PictureInPicture className="size-4" />
            </ControlButton>

            <ControlButton
              onClick={toggleFullscreen}
              tooltip={isFullscreen ? `${t.exitFullscreen} (Esc)` : `${t.fullscreen} (F)`}
            >
              {isFullscreen ? (
                <CornersIn className="size-4" />
              ) : (
                <CornersOut className="size-4" />
              )}
            </ControlButton>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}));

function ControlButton({
  onClick,
  tooltip,
  active,
  muted,
  children,
}: {
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  tooltip?: string;
  active?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "group/btn relative rounded-md p-1.5 transition-colors hover:bg-white/10",
        active
          ? "text-primary"
          : muted
            ? "text-white/35 hover:text-white/60"
            : "text-white/80 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function PopupMenu({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-full right-0 mb-2 rounded-lg border border-white/10 bg-black/90 p-1.5 shadow-xl backdrop-blur-md",
        wide ? "min-w-44" : "min-w-28",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function SubSettingRow({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(!last && "mb-2.5")}>
      <p className="mb-1 px-2 font-sans text-[10px] font-medium text-white/35">
        {label}
      </p>
      <div className="flex items-center gap-1 px-1.5">{children}</div>
    </div>
  );
}

function SubSettingChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-1 py-1 font-sans text-[10px] transition-colors hover:bg-white/10",
        active
          ? "bg-white/10 font-semibold text-primary"
          : "text-white/60",
      )}
    >
      {label}
    </button>
  );
}
