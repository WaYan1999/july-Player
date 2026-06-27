import { memo, useEffect, useMemo, useState } from "react";
import {
  PlayIcon as Play,
  CheckCircleIcon as CheckCircle,
  CaretDownIcon as CaretDown,
  HeartIcon as Heart,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import type { Section, Lesson } from "@/types";
import { useI18n } from "@/hooks/useI18n";

interface SectionAccordionProps {
  section: Section;
  activeLessonId: number | undefined;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: number) => void;
  onToggleFavorite: (lessonId: number) => void;
}

function SectionAccordionComponent({
  section,
  activeLessonId,
  onSelectLesson,
  onToggleComplete,
  onToggleFavorite,
}: SectionAccordionProps) {
  const { t } = useI18n();
  const completedCount = useMemo(
    () => section.lessons.filter((l) => l.completed).length,
    [section.lessons],
  );
  const allComplete =
    completedCount === section.lessons.length && section.lessons.length > 0;
  const hasActiveLesson = section.lessons.some((l) => l.id === activeLessonId);
  const [open, setOpen] = useState(hasActiveLesson);

  useEffect(() => {
    if (hasActiveLesson) setOpen(true);
  }, [hasActiveLesson]);
  const sectionDuration = useMemo(
    () => section.lessons.reduce((sum, l) => sum + l.duration, 0),
    [section.lessons],
  );

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-start gap-3 bg-transparent px-4 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-expanded={open}
      >
        <CaretDown
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          style={{
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: `transform 300ms ${EASE}`,
          }}
        />

        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </span>
            {allComplete && (
              <CheckCircle className="ml-auto size-3.5 text-primary" weight="fill" />
            )}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {section.lessons.length} {section.lessons.length === 1 ? t.common.lesson : t.common.lessons}
            {sectionDuration > 0 && <> · {formatDuration(sectionDuration)}</>}
          </span>
        </div>
      </button>

      {open && (
        <div
          className="flex flex-col gap-px px-2 pt-1 pb-2"
          style={{ animation: `fade-in 140ms ${EASE} both` }}
        >
          {section.lessons.map((lesson) => {
            const isActive = lesson.id === activeLessonId;

            return (
              <button
                type="button"
                key={lesson.id}
                onClick={() => onSelectLesson(lesson)}
                className={cn(
                  "group flex w-full items-center justify-start gap-3 rounded-lg border-0 px-3 py-2.5 text-left transition-colors duration-100 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive && "bg-primary/5",
                )}
              >
                <div
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(lesson.id);
                  }}
                >
                  {lesson.completed ? (
                    <CheckCircle
                      className="size-4 text-primary"
                      weight="fill"
                    />
                  ) : isActive ? (
                    <div className="flex size-4 items-center justify-center">
                      <Play className="size-3.5 text-primary" weight="fill" />
                    </div>
                  ) : (
                    <LessonProgress
                      progress={lesson.duration > 0 ? lesson.lastPosition / (lesson.duration * 60) : 0}
                    />
                  )}
                </div>

                <span
                  className={cn(
                    "flex-1 font-sans text-xs",
                    lesson.completed
                      ? "text-muted-foreground"
                      : "text-foreground",
                    isActive && "font-medium text-primary",
                  )}
                >
                  {lesson.title}
                </span>

                <span
                  className="relative flex shrink-0 items-center justify-end"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(lesson.id);
                  }}
                >
                  {lesson.favorited ? (
                    <Heart className="size-3 text-red-500 transition-colors hover:text-red-400" weight="fill" />
                  ) : (
                    <>
                      <span className="font-mono text-[11px] text-muted-foreground transition-opacity group-hover:opacity-0">
                        {lesson.duration > 0 ? `${lesson.duration}m` : ""}
                      </span>
                      <Heart
                        className="absolute size-3 text-muted-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:!text-red-400"
                        weight="regular"
                      />
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function sectionHasLesson(section: Section, lessonId: number | undefined) {
  return lessonId != null && section.lessons.some((lesson) => lesson.id === lessonId);
}

export const SectionAccordion = memo(
  SectionAccordionComponent,
  (prev, next) => {
    if (prev.section !== next.section) return false;
    if (
      prev.onSelectLesson !== next.onSelectLesson ||
      prev.onToggleComplete !== next.onToggleComplete ||
      prev.onToggleFavorite !== next.onToggleFavorite
    ) {
      return false;
    }

    const wasActiveSection = sectionHasLesson(prev.section, prev.activeLessonId);
    const isActiveSection = sectionHasLesson(next.section, next.activeLessonId);
    if (!wasActiveSection && !isActiveSection) return true;
    return prev.activeLessonId === next.activeLessonId;
  },
);

const CIRCLE_R = 6;
const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

function LessonProgress({ progress }: { progress: number }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const hasProgress = clamped > 0.01;

  return (
    <div className="relative flex size-4 items-center justify-center">
      <svg className="absolute size-4" viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          r={CIRCLE_R}
          fill="none"
          className={cn(
            "transition-colors",
            hasProgress ? "stroke-primary/15" : "stroke-border group-hover:stroke-muted-foreground",
          )}
          strokeWidth="1.5"
        />
        {hasProgress && (
          <circle
            cx="8"
            cy="8"
            r={CIRCLE_R}
            fill="none"
            className="stroke-primary"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_C}
            strokeDashoffset={CIRCLE_C * (1 - clamped)}
            transform="rotate(-90 8 8)"
          />
        )}
      </svg>
    </div>
  );
}
