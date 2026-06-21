import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePageVisible } from "@/hooks/usePageVisible";
import {
  ArrowRightIcon as ArrowRight,
  BookmarkSimpleIcon as BookmarkSimple,
  HeartIcon as Heart,
  SpinnerGapIcon as SpinnerGap,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Course, FavoriteLesson } from "@/types";
import {
  getBookmarkedCourses,
  getAllFavorites,
  toggleBookmark,
  toggleFavorite,
} from "@/lib/store";
import { EASE_OUT } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";
import type { AppTranslations } from "@/lib/i18n";

interface BookmarksProps {
  className?: string;
}

export function Bookmarks({ className }: BookmarksProps) {
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [favorites, setFavorites] = useState<FavoriteLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"courses" | "favorites">("courses");

  const reload = useCallback(() => {
    return Promise.all([getBookmarkedCourses(), getAllFavorites()]).then(
      ([c, f]) => {
        setCourses(c);
        setFavorites(f);
      },
    );
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Refresh data when page becomes visible again (keep-alive)
  usePageVisible("/bookmarks", reload);

  const handleRemoveFavorite = useCallback(
    async (lessonId: number) => {
      await toggleFavorite(lessonId);
      await reload();
    },
    [reload],
  );

  if (loading) {
    return (
      <div className={cn("mx-auto flex max-w-6xl items-center justify-center py-32", className)}>
        <SpinnerGap className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = courses.length === 0 && favorites.length === 0;

  return (
    <div className={cn("july-page", className)}>
      {isEmpty ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-32 text-center"
          style={{ animation: `card-in 350ms ${EASE_OUT} both` }}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
            <BookmarkSimple className="size-6 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            {t.bookmarks.noBookmarksYet}
          </h2>
          <p className="max-w-xs font-sans text-sm text-muted-foreground">
            {t.bookmarks.emptyDescription}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("courses")}
              className={cn(
                "july-heroui-button min-h-8 gap-1.5 rounded-md px-2.5 py-1 text-sm",
                activeTab === "courses"
                  ? "border border-border bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BookmarkSimple className="size-3.5" />
              {t.bookmarks.courses}
              {courses.length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full border border-border bg-muted font-mono text-[9px] font-medium text-muted-foreground">
                  {courses.length}
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("favorites")}
              className={cn(
                "july-heroui-button min-h-8 gap-1.5 rounded-md px-2.5 py-1 text-sm",
                activeTab === "favorites"
                  ? "border border-border bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart className="size-3.5" />
              {t.bookmarks.favorites}
              {favorites.length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full border border-border bg-muted font-mono text-[9px] font-medium text-muted-foreground">
                  {favorites.length}
                </span>
              )}
            </Button>
          </div>

          {activeTab === "courses" && (
            <>
              {courses.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {courses.map((course, index) => (
                    <BookmarkedCourseCard
                      key={course.id}
                      course={course}
                      index={index}
                      onBookmarkChange={reload}
                    />
                  ))}
                </div>
              ) : (
                <EmptySection
                  icon={BookmarkSimple}
                  message={t.bookmarks.noBookmarkedCourses}
                  description={t.bookmarks.noBookmarkedCoursesDescription}
                />
              )}
            </>
          )}

          {activeTab === "favorites" && (
            <>
              {favorites.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {favorites.map((fav, index) => (
                    <FavoriteItem
                      key={fav.id}
                      favorite={fav}
                      index={index}
                      onRemove={handleRemoveFavorite}
                    />
                  ))}
                </div>
              ) : (
                <EmptySection
                  icon={Heart}
                  message={t.bookmarks.noFavoriteVideos}
                  description={t.bookmarks.noFavoriteVideosDescription}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

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

function getCourseAction(status: Course["status"], t: AppTranslations) {
  switch (status) {
    case "completed":
      return t.courseCard.reviewCourse;
    case "not-started":
      return t.courseCard.startCourse;
    case "in-progress":
      return t.courseCard.continue;
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

function getCoverWord(title: string) {
  const firstWord = title.trim().split(/\s+/)[0];
  return firstWord || title.slice(0, 2) || "Course";
}

function BookmarkedCourseCard({
  course,
  index,
  onBookmarkChange,
}: {
  course: Course;
  index: number;
  onBookmarkChange: () => void;
}) {
  const { t, formatMessage } = useI18n();
  const percentage = course.totalLessons > 0
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0;

  return (
    <Link
      to={`/course/${course.id}?from=${encodeURIComponent("/bookmarks")}`}
      className="group block min-w-0"
      style={{ animation: `card-in 350ms ${EASE_OUT} ${index * 50}ms both` }}
    >
      <article className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-[border-color,background-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/70 md:min-h-44 md:flex-row">
        <div
          className="relative flex h-32 shrink-0 items-center justify-center overflow-hidden sm:h-36 md:h-auto md:w-64 lg:w-72"
          style={{ backgroundColor: `${course.accentColor}14` }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1.5 md:inset-y-0 md:left-0 md:h-auto md:w-1.5"
            style={{ backgroundColor: course.accentColor }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at 50% 25%, ${course.accentColor}24, transparent 44%)`,
            }}
          />
          <span
            className="relative max-w-[70%] truncate font-heading text-2xl font-bold opacity-25 sm:text-3xl"
            style={{ color: course.accentColor }}
          >
            {getCoverWord(course.title)}
          </span>
          <BookmarkToggle
            bookmarked={course.bookmarked}
            courseId={course.id}
            onBookmarkChange={onBookmarkChange}
          />
        </div>

        <div className="flex min-w-0 flex-1 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-sans text-base font-semibold leading-snug text-foreground sm:text-lg">
                  {course.title}
                </h3>
                <p className="mt-2 truncate font-sans text-sm text-muted-foreground">
                  {course.author || t.common.unknownAuthor}
                </p>
              </div>
              <div className="shrink-0 self-start">
                {getStatusBadge(course.status, t)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-sm font-medium text-muted-foreground">
                {formatMessage(t.courseCard.lessons, {
                  completed: course.completedLessons,
                  total: course.totalLessons,
                })}
              </span>
              <div className="flex items-center gap-5 font-mono text-sm font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {formatLastWatched(course.lastWatched, t, formatMessage)}
                </span>
                <span>{percentage}%</span>
              </div>
            </div>

            <ProgressBar value={percentage} className="bg-border" />

            <div className="mt-auto pt-2">
              <div className="relative mb-3 h-px">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/20 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              </div>
              <div className="flex items-center justify-center gap-2 font-sans text-sm font-semibold text-primary">
                {getCourseAction(course.status, t)}
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function BookmarkToggle({
  bookmarked: initialBookmarked,
  courseId,
  onBookmarkChange,
}: {
  bookmarked: boolean;
  courseId: number;
  onBookmarkChange: () => void;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  const handleClick = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nextBookmarked = await toggleBookmark(courseId);
    setBookmarked(nextBookmarked);
    onBookmarkChange();
  }, [courseId, onBookmarkChange]);

  return (
    <Button
      type="button"
      variant="ghost"
      isIconOnly
      onClick={handleClick}
      className={cn(
        "july-heroui-button july-heroui-icon-button absolute right-3 top-3 z-10 size-10 min-h-10 min-w-10 rounded-xl bg-card/85 text-foreground shadow-none backdrop-blur transition-colors hover:bg-secondary",
        bookmarked ? "text-primary" : "text-muted-foreground",
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <BookmarkSimple className="size-4.5" weight={bookmarked ? "fill" : "regular"} />
    </Button>
  );
}

function EmptySection({
  icon: Icon,
  message,
  description,
}: {
  icon: React.ElementType;
  message: string;
  description: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-20 text-center"
      style={{ animation: `card-in 350ms ${EASE_OUT} both` }}
    >
      <Icon className="size-8 text-muted-foreground/40" />
      <p className="font-sans text-sm font-medium text-muted-foreground">{message}</p>
      <p className="font-sans text-xs text-muted-foreground/60">{description}</p>
    </div>
  );
}

function FavoriteItem({
  favorite,
  index,
  onRemove,
}: {
  favorite: FavoriteLesson;
  index: number;
  onRemove: (lessonId: number) => void;
}) {
  const { t } = useI18n();
  const progress = favorite.duration > 0
    ? Math.min(favorite.lastPosition / (favorite.duration * 60), 1)
    : 0;
  const percentage = Math.round(progress * 100);

  return (
    <Link
      to={`/course/${favorite.courseId}?lesson=${favorite.lessonId}&from=/bookmarks`}
      className="group flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary"
      style={{
        animation: `card-in 350ms ${EASE_OUT} ${index * 40}ms both`,
      }}
    >
      <div
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: favorite.accentColor }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-sans text-sm font-medium text-foreground">
          {favorite.lessonTitle}
        </span>
        <span className="truncate font-sans text-xs text-muted-foreground">
          {favorite.courseTitle}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {favorite.completed ? (
          <CheckCircle className="size-3.5 text-primary" weight="fill" />
        ) : percentage > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="w-12">
              <ProgressBar value={percentage} />
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {percentage}%
            </span>
          </div>
        ) : null}

        <span className="flex w-10 items-center justify-end gap-1 font-mono text-[11px] text-muted-foreground">
          {favorite.duration > 0 && (
            <>
              <Clock className="size-3 shrink-0" />
              {favorite.duration}m
            </>
          )}
        </span>

        <Button
          type="button"
          variant="ghost"
          isIconOnly
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(favorite.lessonId);
          }}
          className="july-heroui-button july-heroui-icon-button size-8 min-h-8 min-w-8 text-red-500 opacity-0 transition-all hover:bg-red-500/10 group-hover:opacity-100"
          aria-label={t.bookmarks.favorites}
        >
          <Heart className="size-3.5" weight="fill" />
        </Button>
      </div>
    </Link>
  );
}
