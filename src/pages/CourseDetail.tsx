import { useState, useEffect, useCallback, useRef, useContext, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ActivePathContext } from "@/hooks/usePageVisible";
import { openPath } from "@tauri-apps/plugin-opener";
import { toast } from "@/components/ui/toast";
import {
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  FileTextIcon as FileText,
  FileIcon as File,
  LinkIcon as LinkSimple,
  ArrowLeftIcon as ArrowLeft,
  NotePencilIcon as NotePencil,
  PencilSimpleIcon as PencilSimple,
  FolderOpenIcon as FolderOpen,
  SpinnerGapIcon as SpinnerGap,
  SidebarSimpleIcon as SidebarSimple,
  BookmarkSimpleIcon as BookmarkSimple,
  HeartIcon as Heart,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { VideoPlayerHandle } from "@/types";
import { VideoPlayer } from "@/components/course-detail/VideoPlayer";
import { SectionAccordion } from "@/components/course-detail/SectionAccordion";
import { NotesPanel } from "@/components/course-detail/NotesPanel";
import { CourseEditPanel } from "@/components/course-detail/CourseEditPanel";
import { CourseCelebration } from "@/components/course-detail/CourseCelebration";
import { EASE_OUT, SNAPPY } from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import type { Note, Course, CourseDetail as CourseDetailData, Lesson, Subtitle } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/hooks/useI18n";
import type { AppTranslations } from "@/lib/i18n";
import { useCourseTitles } from "@/components/app-shell/CourseTitleContext";
import { awardPetCare } from "@/lib/petCare";
import { PET_ACTION_EVENT, PET_SPEAK_EVENT } from "@/lib/pets";
import {
  getCourse,
  getCourseDetail,
  getCourseNotes,
  getLessonSubtitles,
  setLastWatched,
  toggleLessonCompleted,
  saveLessonPosition,
  updateLessonDuration,
  updateCourse,
  resetCourseProgress,
  deleteCourse,
  toggleBookmark,
  toggleFavorite,
  addNote as storeAddNote,
  updateNote as storeUpdateNote,
  deleteNote as storeDeleteNote,
} from "@/lib/store";

interface CourseDetailProps {
  className?: string;
}

function getStatusBadge(status: string, t: AppTranslations) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default">
          {t.status.completed}
        </Badge>
      );
    case "in-progress":
      return (
        <Badge variant="info">
          {t.status.inProgress}
        </Badge>
      );
    case "not-started":
      return (
        <Badge variant="secondary">
          {t.status.notStarted}
        </Badge>
      );
  }
}

const resourceIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  document: FileText,
  text: FileText,
  link: LinkSimple,
  file: File,
  archive: File,
  code: File,
  image: File,
  other: File,
};

export function CourseDetail({ className }: CourseDetailProps) {
  const { t } = useI18n();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const numericId = Number(courseId);
  const isValidId = courseId != null && !isNaN(numericId) && numericId > 0;
  const lessonParam = searchParams.get("lesson");
  const fromParam = searchParams.get("from") || "/";

  const [course, setCourse] = useState<Course | null>(null);
  const [courseData, setCourseData] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const reload = useCallback(() => {
    if (!isValidId) return Promise.resolve();
    return Promise.all([getCourse(numericId), getCourseDetail(numericId)]).then(
      ([c, d]) => {
        setCourse(c);
        setCourseData(d);
      },
    );
  }, [numericId, isValidId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Refresh data when this page becomes visible again (keep-alive)
  const activePath = useContext(ActivePathContext);
  const isVisible = activePath.startsWith(`/course/${courseId}`);
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!isVisible) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    reload();
  }, [isVisible, reload]);

  if (loading) {
    return (
      <div
        className={cn(
          "mx-auto flex max-w-4xl items-center justify-center py-32",
          className,
        )}
      >
        <SpinnerGap className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isValidId || !course || !courseData) {
    return (
      <div className={cn("july-page-narrow", className)}>
        <p className="font-sans text-sm text-muted-foreground">
          {!isValidId ? t.courseDetail.invalidCourse : t.courseDetail.courseNotFound}
        </p>
      </div>
    );
  }

  if (editing) {
    return (
      <CourseEditPanel
        course={course}
        onSave={async (title, author, accentColor, category) => {
          await updateCourse(course.id, title, author, accentColor, category);
          await reload();
        }}
        onResetProgress={async () => {
          await resetCourseProgress(course.id);
          await reload();
        }}
        onDelete={async () => {
          await deleteCourse(course.id);
          navigate(fromParam);
        }}
        onBack={() => setEditing(false)}
        className={className}
      />
    );
  }

  return (
    <CourseDetailInner
      course={course}
      courseData={courseData}
      initialLessonId={lessonParam ? Number(lessonParam) : undefined}
      backTo={fromParam}
      isVisible={isVisible}
      onDataChange={reload}
      onEdit={() => setEditing(true)}
      onToggleBookmark={async () => {
        await toggleBookmark(course.id);
        await reload();
      }}
      className={className}
    />
  );
}

function CourseDetailInner({
  course,
  courseData,
  initialLessonId,
  backTo,
  isVisible,
  onDataChange,
  onEdit,
  onToggleBookmark,
  className,
}: {
  course: Course;
  courseData: CourseDetailData;
  initialLessonId?: number;
  backTo: string;
  isVisible: boolean;
  onDataChange: () => Promise<void>;
  onEdit: () => void;
  onToggleBookmark: () => Promise<void>;
  className?: string;
}) {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { t, language, formatMessage } = useI18n();
  const { setTitle: setBreadcrumbTitle } = useCourseTitles();
  const allLessons = useMemo(
    () => courseData.sections.flatMap((s) => s.lessons),
    [courseData.sections],
  );

  useEffect(() => {
    setBreadcrumbTitle(course.id, course.title);
  }, [course.id, course.title, setBreadcrumbTitle]);

  const requestedLesson = initialLessonId
    ? allLessons.find((l) => l.id === initialLessonId)
    : undefined;
  const lastWatchedLesson = allLessons.find((l) => l.isLastWatched);
  const nextLesson = allLessons.find((l) => !l.completed);
  const initialLesson = requestedLesson ?? lastWatchedLesson ?? nextLesson ?? allLessons[0];

  const [activeLessonId, setActiveLessonId] = useState<number | undefined>(
    initialLesson?.id,
  );

  // Sync active lesson when navigating to a specific lesson (e.g. from favorites)
  useEffect(() => {
    if (initialLessonId && allLessons.some((l) => l.id === initialLessonId)) {
      setActiveLessonId(initialLessonId);
    }
  }, [initialLessonId]);

  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0];
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"resources" | "notes">("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const lessonNotes = useMemo(
    () => activeLesson ? notes.filter((n) => n.lessonId === activeLesson.id) : [],
    [activeLesson?.id, notes],
  );
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const videoTimeRef = useRef(0);
  const lastVideoTimeDisplayRef = useRef(-1);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const [pendingTimestampNav, setPendingTimestampNav] = useState<{
    seconds: number;
    lessonId: number;
    lessonTitle: string;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedRef = useRef(course.completedLessons);

  const handleTimeUpdate = useCallback((time: number) => {
    videoTimeRef.current = time;
    const displaySecond = Math.floor(time);
    if (displaySecond !== lastVideoTimeDisplayRef.current) {
      lastVideoTimeDisplayRef.current = displaySecond;
      setVideoTime(time);
    }
  }, []);

  // Save position when leaving the page
  useEffect(() => {
    return () => {
      if (activeLesson && videoTimeRef.current > 0) {
        void saveLessonPosition(activeLesson.id, videoTimeRef.current).catch(() => {});
      }
    };
  }, [activeLesson?.id]);

  // Pause video when navigating away (keep-alive hides the page but keeps it mounted)
  useEffect(() => {
    if (!isVisible) {
      videoPlayerRef.current?.pause();
      if (activeLesson && videoTimeRef.current > 0) {
        void saveLessonPosition(activeLesson.id, videoTimeRef.current).catch(() => {});
      }
    }
  }, [isVisible, activeLesson?.id]);

  const percentage =
    course.totalLessons > 0
      ? Math.round((course.completedLessons / course.totalLessons) * 100)
      : 0;

  // Detect course completion transition
  useEffect(() => {
    const prev = prevCompletedRef.current;
    prevCompletedRef.current = course.completedLessons;

    if (
      course.totalLessons > 0 &&
      prev < course.totalLessons &&
      course.completedLessons === course.totalLessons
    ) {
      setShowCelebration(true);
    }
  }, [course.completedLessons, course.totalLessons]);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Re-fetch notes on mount and when course prop changes (e.g. after returning from Notes page)
  useEffect(() => {
    getCourseNotes(course.id).then(setNotes).catch(() => {});
  }, [course]);

  useEffect(() => {
    let cancelled = false;
    setSubtitles([]);
    if (!activeLesson) {
      setSubtitles([]);
      return;
    }
    getLessonSubtitles(activeLesson.id)
      .then((items) => {
        if (!cancelled) setSubtitles(items);
      })
      .catch(() => {
        if (!cancelled) setSubtitles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id]);

  const handleSelectLesson = useCallback(
    async (lesson: Lesson) => {
      // Save position of current lesson before switching
      if (activeLesson && videoTimeRef.current > 0) {
        void saveLessonPosition(activeLesson.id, videoTimeRef.current).catch(() => {});
      }

      setActiveLessonId(lesson.id);
      setVideoTime(0);
      lastVideoTimeDisplayRef.current = -1;
      videoTimeRef.current = 0;

      void setLastWatched(course.id, lesson.id).catch(() => {});
    },
    [course.id, activeLesson?.id],
  );

  const handlePlayStateChange = useCallback(
    (playing: boolean) => {
      if (playing) {
        setAutoPlay(false);
      }
      if (!playing && activeLesson && videoTimeRef.current > 0) {
        void saveLessonPosition(activeLesson.id, videoTimeRef.current).catch(() => {});
      }
    },
    [activeLesson?.id],
  );

  const handleNextLesson = useCallback(async () => {
    if (!activeLesson) return;
    const idx = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (idx >= 0 && idx < allLessons.length - 1) {
      const next = allLessons[idx + 1];
      // Save position of current lesson before switching
      if (videoTimeRef.current > 0) {
        void saveLessonPosition(activeLesson.id, videoTimeRef.current).catch(() => {});
      }
      setActiveLessonId(next.id);
      setVideoTime(0);
      lastVideoTimeDisplayRef.current = -1;
      videoTimeRef.current = 0;
      setAutoPlay(true);
      void setLastWatched(course.id, next.id).catch(() => {});
    }
  }, [activeLesson, allLessons, course.id]);

  const showPetReward = useCallback(
    (result: Awaited<ReturnType<typeof awardPetCare>>, lessonTitle: string) => {
      if (result.skipped || !result.event) return;

      const title =
        language === "zh"
          ? "宠物获得奖励"
          : language === "fr"
            ? "Recompense du compagnon"
            : "Pet reward";
      const levelText =
        result.petLevelAfter > result.petLevelBefore
          ? language === "zh"
            ? `，${result.event.petId} 升到 Lv.${result.petLevelAfter}`
            : language === "fr"
              ? `, ${result.event.petId} passe au niv. ${result.petLevelAfter}`
              : `, ${result.event.petId} reached Lv.${result.petLevelAfter}`
          : "";
      const detail =
        language === "zh"
          ? `完成「${lessonTitle}」 +${result.event.tokens} 代币 +${result.event.xp} XP${levelText}`
          : language === "fr"
            ? `"${lessonTitle}" termine, +${result.event.tokens} jetons +${result.event.xp} XP${levelText}`
            : `"${lessonTitle}" completed, +${result.event.tokens} tokens +${result.event.xp} XP${levelText}`;

      window.dispatchEvent(new CustomEvent(PET_ACTION_EVENT, { detail: "hop" }));
      window.dispatchEvent(
        new CustomEvent(PET_SPEAK_EVENT, {
          detail: { title, message: detail, tone: "success", durationMs: 5200 },
        }),
      );
    },
    [language],
  );

  const reportPetRewardError = useCallback(
    (err: unknown) => {
      console.error("pet reward failed", err);
      const title =
        language === "zh"
          ? "宠物奖励未保存"
          : language === "fr"
            ? "Recompense non enregistree"
            : "Pet reward not saved";
      const message =
        language === "zh"
          ? "课程进度已更新，宠物奖励稍后可以继续累积。"
          : language === "fr"
            ? "La progression est enregistree. Les recompenses reprendront ensuite."
            : "Lesson progress was saved. Pet rewards can continue later.";

      window.dispatchEvent(
        new CustomEvent(PET_SPEAK_EVENT, {
          detail: { title, message, tone: "warning", durationMs: 5200 },
        }),
      );
    },
    [language],
  );

  const grantPetLessonReward = useCallback(
    async (lessonId: number, lessonTitle: string) => {
      try {
        const result = await awardPetCare({
          type: "lesson",
          petId: settings.pet_variant,
          lessonId,
          label: lessonTitle,
        });
        showPetReward(result, lessonTitle);
      } catch (err) {
        reportPetRewardError(err);
      }
    },
    [reportPetRewardError, settings.pet_variant, showPetReward],
  );

  const handleToggleComplete = useCallback(
    async (lessonId: number) => {
      try {
        const completed = await toggleLessonCompleted(lessonId);
        await onDataChange();
        if (completed) {
          const lesson = allLessons.find((item) => item.id === lessonId);
          await grantPetLessonReward(lessonId, lesson?.title ?? t.courseDetail.completed);
        }
      } catch (err) {
        console.error("toggleLessonCompleted failed", err);
        toast.error(t.courseDetail.updateLessonFailed, {
          description: t.courseDetail.tryAgainMoment,
        });
      }
    },
    [allLessons, grantPetLessonReward, onDataChange, t.courseDetail.completed],
  );

  const handleToggleFavorite = useCallback(
    async (lessonId: number) => {
      try {
        await toggleFavorite(lessonId);
        await onDataChange();
      } catch (err) {
        console.error("toggleFavorite failed", err);
        toast.error(t.courseDetail.updateFavoriteFailed, {
          description: t.courseDetail.tryAgainMoment,
        });
      }
    },
    [onDataChange],
  );

  const handleVideoEnded = useCallback(async () => {
    if (!activeLesson) return;
    if (!activeLesson.completed) {
      try {
        await toggleLessonCompleted(activeLesson.id);
        await onDataChange();
        await grantPetLessonReward(activeLesson.id, activeLesson.title);
      } catch (err) {
        // Background auto-complete; no toast since it wasn't user-initiated.
        console.error("auto-complete on video end failed", err);
      }
    }
  }, [activeLesson, grantPetLessonReward, onDataChange]);

  const handleDurationChange = useCallback(
    (duration: number) => {
      if (!activeLesson) return;
      const mins = Math.round(duration / 60);
      if (mins > 0 && mins !== activeLesson.duration) {
        void updateLessonDuration(activeLesson.id, mins).catch(() => {});
      }
    },
    [activeLesson],
  );

  async function handleAddNote(content: string) {
    if (!activeLesson) return;
    try {
      await saveCurrentLessonNote(content);
      setShowEditor(false);
    } catch (err) {
      // Keep editor open so the user doesn't lose their content.
      console.error("addNote failed", err);
      toast.error(t.courseDetail.saveNoteFailed, {
        description: t.courseDetail.contentStillEditor,
      });
    }
  }

  async function saveCurrentLessonNote(content: string) {
    if (!activeLesson) {
      throw new Error(t.courseDetail.courseNotFound);
    }

    const note = await storeAddNote(
      course.id,
      activeLesson.id,
      activeLesson.title,
      content,
    );
    setNotes((prev) => [note, ...prev]);
  }

  async function handleEditNote(noteId: number, content: string) {
    try {
      await storeUpdateNote(noteId, content);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, content, updatedAt: new Date().toISOString() }
            : n,
        ),
      );
      setEditingNoteId(null);
    } catch (err) {
      // Keep edit mode open so the user can retry.
      console.error("updateNote failed", err);
      toast.error(t.courseDetail.updateNoteFailed, {
        description: t.courseDetail.changesNotSaved,
      });
    }
  }

  async function handleDeleteNote(noteId: number) {
    try {
      await storeDeleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error("deleteNote failed", err);
      toast.error(t.courseDetail.deleteNoteFailed, {
        description: t.courseDetail.tryAgainMoment,
      });
    }
  }

  const handleTimestampClick = useCallback(
    (seconds: number, lessonId: number) => {
      if (activeLesson && activeLesson.id === lessonId) {
        // Same lesson — just seek
        videoPlayerRef.current?.seekTo(seconds);
      } else {
        // Different lesson — ask for confirmation
        const targetLesson = allLessons.find((l) => l.id === lessonId);
        setPendingTimestampNav({
          seconds,
          lessonId,
        lessonTitle: targetLesson?.title ?? t.courseDetail.anotherLesson,
        });
      }
    },
    [activeLesson, allLessons],
  );

  const confirmTimestampNav = useCallback(async () => {
    if (!pendingTimestampNav) return;
    const { seconds, lessonId } = pendingTimestampNav;
    const targetLesson = allLessons.find((l) => l.id === lessonId);
    if (!targetLesson) return;

    // Save current position
    if (activeLesson && videoTimeRef.current > 0) {
      void saveLessonPosition(activeLesson.id, videoTimeRef.current).catch(() => {});
    }

    setActiveLessonId(lessonId);
    setVideoTime(0);
    lastVideoTimeDisplayRef.current = -1;
    videoTimeRef.current = 0;
    setPendingTimestampNav(null);

    void setLastWatched(course.id, lessonId).catch(() => {});

    // Seek after the new video loads
    requestAnimationFrame(() => {
      setTimeout(() => {
        videoPlayerRef.current?.seekTo(seconds);
      }, 200);
    });
  }, [pendingTimestampNav, activeLesson, allLessons, course.id]);

  const handleOpenResource = async (path: string) => {
    try {
      await openPath(path);
    } catch (err) {
      // Expected when the file was moved/deleted outside the app.
      console.debug("openPath failed", err);
      toast.error(t.courseDetail.openResourceFailed, {
        description: t.courseDetail.resourceMoved,
      });
    }
  };

  const hasNext =
    activeLesson &&
    allLessons.findIndex((l) => l.id === activeLesson.id) <
      allLessons.length - 1;

  return (
    <div className={cn("july-page", className)}>
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(8px)",
          transition: `opacity 220ms ${EASE_OUT}, transform 220ms ${EASE_OUT}`,
        }}
      >
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t.common.back}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurriculumOpen((o) => !o)}
            className={cn(
              "july-heroui-button min-h-8 gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:bg-secondary hover:text-foreground",
              curriculumOpen ? "text-muted-foreground" : "text-foreground bg-secondary",
            )}
            style={{ transitionTimingFunction: SNAPPY }}
          >
            <SidebarSimple
              className="size-3.5 transition-transform duration-300"
              style={{
                transform: curriculumOpen ? "scaleX(1)" : "scaleX(-1)",
                transitionTimingFunction: SNAPPY,
              }}
            />
            {curriculumOpen ? t.courseDetail.hide : t.courseDetail.showCurriculum}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onToggleBookmark}
            className={cn(
              "july-heroui-button min-h-8 gap-1.5 rounded-lg px-2.5 py-1.5 text-xs hover:bg-secondary hover:text-foreground",
              course.bookmarked ? "text-primary" : "text-muted-foreground",
            )}
            style={{ transitionTimingFunction: SNAPPY }}
          >
            <BookmarkSimple className="size-3.5" weight={course.bookmarked ? "fill" : "regular"} />
            {course.bookmarked ? t.courseDetail.bookmarked : t.courseDetail.bookmark}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onEdit}
            className="july-heroui-button min-h-8 gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            style={{ transitionTimingFunction: SNAPPY }}
          >
            <PencilSimple className="size-3.5" />
            {t.common.edit}
          </Button>
        </div>
      </div>

      <div
        className="flex min-w-0 flex-col lg:flex-row"
        style={{
          gap: curriculumOpen ? 20 : 0,
          transition: `gap 400ms ${SNAPPY}`,
        }}
      >
        <div
          className="flex min-w-0 flex-1 flex-col gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: `opacity 240ms ${EASE_OUT} 40ms, transform 240ms ${EASE_OUT} 40ms`,
          }}
        >
          <VideoPlayer
            ref={videoPlayerRef}
            lesson={activeLesson}
            subtitles={subtitles}
            hasNext={!!hasNext}
            accentColor={course.accentColor}
            autoPlay={autoPlay}
            autoSkipEnabled={settings.autoplay_next}
            initialTime={settingsLoaded ? (settings.resume_position ? activeLesson?.lastPosition : 0) : null}
            defaultSpeed={settings.default_speed}
            defaultVolume={settings.default_volume}
            skipSeconds={settings.skip_forward_secs}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlayStateChange={handlePlayStateChange}
            onEnded={handleVideoEnded}
            onNext={handleNextLesson}
          />

          {activeLesson && (
            <div className="flex items-center gap-2">
              <h2 className="font-sans text-base font-semibold text-foreground">
                {activeLesson.title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                onClick={() => handleToggleFavorite(activeLesson.id)}
                className={cn(
                  "july-heroui-button july-heroui-icon-button size-8 min-h-8 min-w-8 rounded-md transition-colors",
                  activeLesson.favorited
                    ? "text-red-500 hover:bg-red-500/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-red-400",
                )}
                aria-label={activeLesson.favorited ? t.bookmarks.favorites : t.courseDetail.bookmark}
              >
                <Heart
                  className="size-3.5"
                  weight={activeLesson.favorited ? "fill" : "regular"}
                />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleToggleComplete(activeLesson.id)}
                className={cn(
                  "july-heroui-button ml-auto min-h-8 gap-1 rounded-md px-2 py-1 text-xs",
                  activeLesson.completed
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <CheckCircle
                  className="size-3.5"
                  weight={activeLesson.completed ? "fill" : "regular"}
                />
                {activeLesson.completed ? t.courseDetail.completed : t.courseDetail.markComplete}
              </Button>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="font-sans text-sm text-muted-foreground">
                {t.common.by} {course.author}
              </p>
              {getStatusBadge(course.status, t)}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {formatDuration(courseData.totalDuration)}
                </span>
              </div>
              <span className="font-mono text-xs font-medium text-muted-foreground">
                {formatMessage(t.courseDetail.lessonsCount, {
                  completed: course.completedLessons,
                  total: course.totalLessons,
                })}
              </span>
              <span className="font-mono text-xs font-medium text-muted-foreground">
                {percentage}%
              </span>
            </div>

            <div className="mt-2">
              <ProgressBar value={percentage} />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-1">
              {courseData.resources.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab("resources")}
                  className={cn(
                    "july-heroui-button min-h-8 rounded-md px-2.5 py-1 text-xs",
                    activeTab === "resources"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  style={{ transitionTimingFunction: SNAPPY }}
                >
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="size-3.5" />
                    {t.courseDetail.resources}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("notes")}
                className={cn(
                  "july-heroui-button min-h-8 rounded-md px-2.5 py-1 text-xs",
                  activeTab === "notes"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                style={{ transitionTimingFunction: SNAPPY }}
              >
                <span className="flex items-center gap-1.5">
                  <NotePencil className="size-3.5" />
                  {t.courseDetail.notes}
                  {lessonNotes.length > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {lessonNotes.length}
                    </span>
                  )}
                </span>
              </Button>
            </div>

            {activeTab === "resources" && courseData.resources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {courseData.resources.map((resource) => {
                  const Icon = resourceIcons[resource.type] || File;
                  return (
                    <Button
                      type="button"
                      variant="secondary"
                      key={resource.id}
                      onClick={() => handleOpenResource(resource.path)}
                      className="july-heroui-button gap-2 rounded-lg px-3 py-2 text-left duration-150 hover:scale-[1.02] hover:bg-secondary active:scale-[0.98]"
                      style={{ transitionTimingFunction: SNAPPY }}
                    >
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="font-sans text-xs font-medium text-foreground">
                        {resource.title}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}

            {activeTab === "notes" && (
              <NotesPanel
                courseTitle={course.title}
                lessonTitle={activeLesson?.title ?? ""}
                subtitles={subtitles}
                notes={lessonNotes}
                videoTime={Math.floor(videoTime)}
                editingNoteId={editingNoteId}
                showEditor={showEditor}
                language={language}
                onAdd={handleAddNote}
                onSaveAiNote={saveCurrentLessonNote}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onSetEditing={setEditingNoteId}
                onSetShowEditor={setShowEditor}
                onTimestampClick={handleTimestampClick}
              />
            )}
          </div>
        </div>

        <div
          className="overflow-clip self-start lg:sticky lg:top-4 lg:shrink-0"
          style={{
            width: curriculumOpen ? "min(320px, 100%)" : 0,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: `width 260ms ${SNAPPY}, opacity 220ms ${EASE_OUT} 80ms, transform 220ms ${EASE_OUT} 80ms`,
          }}
        >
          <div
            className="flex h-[min(85vh,720px)] w-full flex-col overflow-hidden rounded-xl border border-border bg-card lg:w-80"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-heading text-sm font-bold text-foreground">
                {t.courseDetail.curriculum}
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {course.completedLessons}/{course.totalLessons}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {courseData.sections.map((section) => (
                <SectionAccordion
                  key={section.id}
                  section={section}
                  activeLessonId={activeLesson?.id}
                  onSelectLesson={handleSelectLesson}
                  onToggleComplete={handleToggleComplete}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <CourseCelebration
        show={showCelebration}
        onDone={() => setShowCelebration(false)}
      />

      {pendingTimestampNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-5"
            style={{
              animation: "timestamp-dialog-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <h3 className="font-heading text-sm font-bold text-foreground">
              {t.courseDetail.switchLesson}
            </h3>
            <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
              {formatMessage(t.courseDetail.timestampFrom, {
                lessonTitle: pendingTimestampNav.lessonTitle,
              })}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPendingTimestampNav(null)}
                className="july-heroui-button min-h-8 rounded-lg border-0 bg-transparent px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                style={{ transitionTimingFunction: SNAPPY }}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={confirmTimestampNav}
                className="july-heroui-button july-heroui-button-primary min-h-8 rounded-lg px-3 py-1.5 text-xs"
                style={{ transitionTimingFunction: SNAPPY }}
              >
                {t.courseDetail.switchJump}
              </Button>
            </div>
          </div>
          <style>{`
            @keyframes timestamp-dialog-in {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(8px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
