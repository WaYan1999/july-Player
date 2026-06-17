import { useCallback, useEffect, useRef } from "react";

interface UseRafSeekOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  onPreviewTimeChange: (time: number) => void;
  onCommitTimeChange?: (time: number) => void;
  liveSeekIntervalMs?: number;
}

export function useRafSeek({
  videoRef,
  duration,
  onPreviewTimeChange,
  onCommitTimeChange,
  liveSeekIntervalMs = 90,
}: UseRafSeekOptions) {
  const frameRef = useRef<number | null>(null);
  const pendingTimeRef = useRef<number | null>(null);
  const lastLiveSeekAtRef = useRef(0);
  const lastAppliedTimeRef = useRef<number | null>(null);

  const clampTime = useCallback(
    (time: number) => {
      if (!Number.isFinite(time)) return null;
      const video = videoRef.current;
      const videoDuration =
        video && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : duration;
      if (videoDuration > 0) {
        return Math.max(0, Math.min(time, videoDuration));
      }
      return Math.max(0, time);
    },
    [duration, videoRef],
  );

  const applySeekTime = useCallback(
    (time: number, approximate: boolean) => {
      const video = videoRef.current;
      const clampedTime = clampTime(time);
      if (!video || clampedTime === null) return;

      const seekableVideo = video as HTMLVideoElement & {
        fastSeek?: (time: number) => void;
      };
      if (approximate && typeof seekableVideo.fastSeek === "function") {
        seekableVideo.fastSeek(clampedTime);
      } else {
        video.currentTime = clampedTime;
      }
      lastAppliedTimeRef.current = clampedTime;
    },
    [clampTime, videoRef],
  );

  const startSeekTime = useCallback(
    (time: number) => {
      const clampedTime = clampTime(time);
      if (clampedTime === null) return;

      pendingTimeRef.current = clampedTime;
      lastLiveSeekAtRef.current = performance.now();
      onPreviewTimeChange(clampedTime);
      applySeekTime(clampedTime, true);
    },
    [applySeekTime, clampTime, onPreviewTimeChange],
  );

  const scheduleSeekTime = useCallback(
    (time: number) => {
      const clampedTime = clampTime(time);
      if (clampedTime === null || duration <= 0) return;
      pendingTimeRef.current = clampedTime;

      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const pendingTime = pendingTimeRef.current;
        if (pendingTime !== null) {
          onPreviewTimeChange(pendingTime);

          const now = performance.now();
          const appliedTime = lastAppliedTimeRef.current;
          const jumpedFar =
            appliedTime === null || Math.abs(appliedTime - pendingTime) >= 3;
          if (
            jumpedFar ||
            now - lastLiveSeekAtRef.current >= liveSeekIntervalMs
          ) {
            lastLiveSeekAtRef.current = now;
            applySeekTime(pendingTime, true);
          }
        }
      });
    },
    [applySeekTime, clampTime, duration, liveSeekIntervalMs, onPreviewTimeChange],
  );

  const flushSeekTime = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const pendingTime = pendingTimeRef.current;
    pendingTimeRef.current = null;
    if (pendingTime !== null) {
      onPreviewTimeChange(pendingTime);
      applySeekTime(pendingTime, false);
      onCommitTimeChange?.(pendingTime);
    }
  }, [applySeekTime, onCommitTimeChange, onPreviewTimeChange]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      pendingTimeRef.current = null;
    };
  }, []);

  return { startSeekTime, scheduleSeekTime, flushSeekTime };
}
