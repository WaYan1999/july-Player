import { useCallback, useEffect, useRef } from "react";

interface UseRafSeekOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  onTimeChange: (time: number) => void;
}

export function useRafSeek({ videoRef, duration, onTimeChange }: UseRafSeekOptions) {
  const frameRef = useRef<number | null>(null);
  const pendingTimeRef = useRef<number | null>(null);

  const applySeekTime = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(time)) return;
      const videoDuration =
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
      const clampedTime =
        videoDuration > 0
          ? Math.max(0, Math.min(time, videoDuration))
          : Math.max(0, time);
      video.currentTime = clampedTime;
    },
    [duration, videoRef],
  );

  const scheduleSeekTime = useCallback(
    (time: number) => {
      if (!Number.isFinite(time) || duration <= 0) return;
      const clampedTime = Math.max(0, Math.min(time, duration));
      pendingTimeRef.current = clampedTime;

      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const pendingTime = pendingTimeRef.current;
        if (pendingTime !== null) {
          onTimeChange(pendingTime);
          applySeekTime(pendingTime);
        }
      });
    },
    [applySeekTime, duration, onTimeChange],
  );

  const flushSeekTime = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const pendingTime = pendingTimeRef.current;
    pendingTimeRef.current = null;
    if (pendingTime !== null) {
      onTimeChange(pendingTime);
      applySeekTime(pendingTime);
    }
  }, [applySeekTime, onTimeChange]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      pendingTimeRef.current = null;
    };
  }, []);

  return { scheduleSeekTime, flushSeekTime };
}
