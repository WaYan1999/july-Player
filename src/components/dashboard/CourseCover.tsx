import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import defaultCourseCover from "@/assets/course-default-cover.webp";
import { cn } from "@/lib/utils";

interface CourseCoverProps {
  thumbnailPath?: string | null;
  accentColor: string;
  title: string;
  className?: string;
  eager?: boolean;
  children?: ReactNode;
}

function resolveCoverSource(thumbnailPath?: string | null): string {
  if (!thumbnailPath) return defaultCourseCover;
  if (/^(https?:|data:|blob:)/i.test(thumbnailPath)) return thumbnailPath;

  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      return convertFileSrc(thumbnailPath);
    }
  } catch {
    // Fall through to the bundled default when a stale local path is invalid.
  }

  return defaultCourseCover;
}

export const CourseCover = memo(function CourseCover({
  thumbnailPath,
  accentColor,
  title,
  className,
  eager = false,
  children,
}: CourseCoverProps) {
  const resolvedSource = useMemo(() => resolveCoverSource(thumbnailPath), [thumbnailPath]);
  const [source, setSource] = useState(resolvedSource);

  useEffect(() => {
    setSource(resolvedSource);
  }, [resolvedSource]);

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      <img
        src={source}
        alt=""
        aria-hidden="true"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onError={() => {
          if (source !== defaultCourseCover) setSource(defaultCourseCover);
        }}
        className="h-full w-full object-cover transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:scale-[1.025] motion-reduce:group-hover:scale-100"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, color-mix(in srgb, ${accentColor} 26%, rgb(8 16 24 / 0.72)))`,
        }}
      />
      {children}
      <span className="sr-only">{title}</span>
    </div>
  );
});
