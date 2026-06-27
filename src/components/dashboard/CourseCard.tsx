import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  ArrowRightIcon as ArrowRight,
  BookmarkSimpleIcon as BookmarkSimple,
  ClockIcon as Clock,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import { toggleBookmark } from "@/lib/store";
import { useI18n } from "@/hooks/useI18n";
import type { AppTranslations } from "@/lib/i18n";

function getStatusBadge(status: Course["status"], t: AppTranslations) {
  switch (status) {
    case "completed":
      return <Badge variant="default">{t.status.completed}</Badge>;
    case "in-progress":
      return <Badge variant="info">{t.status.inProgress}</Badge>;
    case "not-started":
      return <Badge variant="secondary">{t.status.notStarted}</Badge>;
  }
}

function formatLastWatched(
  dateStr: string | null,
  t: AppTranslations,
  formatMessage: (template: string, values: Record<string, string | number>) => string,
): string {
  if (!dateStr) return t.common.never;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t.common.today;
  if (diffDays === 1) return t.common.yesterday;
  if (diffDays < 7) return formatMessage(t.courseCard.daysAgo, { count: diffDays });
  if (diffDays < 30) return formatMessage(t.courseCard.weeksAgo, { count: Math.floor(diffDays / 7) });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCourseInitial(title: string): string {
  return title.trim().split(/[\s._-]+/)[0]?.slice(0, 10) || "Course";
}

export function CourseCard({
  course,
  onBookmarkChange,
}: {
  course: Course;
  onBookmarkChange?: () => void;
}) {
  const location = useLocation();
  const { t, formatMessage } = useI18n();
  const percentage = course.totalLessons > 0
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0;

  return (
    <Link
      to={`/course/${course.id}?from=${encodeURIComponent(location.pathname + location.search)}`}
      className="block h-full"
    >
      <div className="course-card group relative flex h-full flex-col overflow-hidden">
        <div className="course-card-cover relative overflow-hidden">
          <div
            className="relative flex h-24 items-center justify-center px-4"
            style={{
              background:
                `linear-gradient(135deg, ${course.accentColor}24, transparent 58%), color-mix(in srgb, var(--secondary) 54%, transparent)`,
            }}
          >
            <div
              className="absolute left-4 top-4 h-2 w-14 rounded-full opacity-90"
              style={{ backgroundColor: course.accentColor }}
            />
            <div
              className="absolute right-4 top-4 size-12 rounded-full blur-2xl"
              style={{ backgroundColor: `${course.accentColor}40` }}
            />
            <span
              className="max-w-full truncate font-heading text-2xl font-bold opacity-30"
              style={{ color: course.accentColor }}
            >
              {getCourseInitial(course.title)}
            </span>
          </div>
        </div>

        <BookmarkButton
          bookmarked={course.bookmarked}
          courseId={course.id}
          onBookmarkChange={onBookmarkChange}
        />

        <Card className="relative flex flex-1 flex-col gap-0 border-0 bg-transparent py-0 shadow-none">
          <CardContent className="flex flex-1 flex-col gap-3.5 px-4 pb-4 pt-3.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 min-h-[2.5em] font-sans text-[0.9375rem] font-semibold leading-snug text-foreground">
                {course.title}
              </h3>
              {getStatusBadge(course.status, t)}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-sans text-xs text-muted-foreground">
                {course.author || t.common.unknownAuthor}
              </p>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/55 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {formatLastWatched(course.lastWatched, t, formatMessage)}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {formatMessage(t.courseCard.lessons, {
                    completed: course.completedLessons,
                    total: course.totalLessons,
                  })}
                </span>
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {percentage}%
                </span>
              </div>
              <ProgressBar value={percentage} className="bg-border/70" />
            </div>

            <div className="mt-auto pt-3">
              <div className="relative mb-3 h-px">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/20 to-transparent" />
                <div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
                />
              </div>
              <div className="flex items-center justify-center gap-1.5 font-sans text-xs font-semibold text-primary">
                {course.status === "not-started"
                  ? t.courseCard.startCourse
                  : course.status === "completed"
                    ? t.courseCard.reviewCourse
                    : t.courseCard.continue}
                <ArrowRight
                  className="size-3.5 transition-transform duration-150 group-hover:translate-x-1"
                  style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}

function BookmarkButton({
  bookmarked: initialBookmarked,
  courseId,
  onBookmarkChange,
}: {
  bookmarked: boolean;
  courseId: number;
  onBookmarkChange?: () => void;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newState = await toggleBookmark(courseId);
      setBookmarked(newState);
      onBookmarkChange?.();
    },
    [courseId, onBookmarkChange],
  );

  return (
    <Button
      type="button"
      variant="ghost"
      isIconOnly
      onClick={handleClick}
      className={cn(
        "july-heroui-button july-heroui-icon-button absolute right-3 top-3 z-10 size-8 min-h-8 min-w-8 rounded-xl border-white/10 bg-background/38 text-muted-foreground backdrop-blur transition-colors",
        bookmarked
          ? "text-primary"
          : "opacity-0 hover:text-foreground group-hover:opacity-100",
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <BookmarkSimple className="size-4" weight={bookmarked ? "fill" : "regular"} />
    </Button>
  );
}
