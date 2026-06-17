import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon as CheckCircle,
  SparkleIcon as Sparkle,
  XIcon as X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { useSettings } from "@/hooks/useSettings";
import type { AppLanguage } from "@/lib/i18n";

const RELEASE_NOTES_VERSION = "1.1.5";
const RELEASE_NOTES_STORAGE_KEY = `july-player:release-notes-seen:${RELEASE_NOTES_VERSION}`;

const RELEASE_NOTES: Record<
  AppLanguage,
  {
    title: string;
    eyebrow: string;
    description: string;
    highlights: string[];
    close: string;
    dismiss: string;
  }
> = {
  zh: {
    eyebrow: "版本更新",
    title: "七月播放器 1.1.5",
    description: "本次重点优化播放器稳定性、字幕同步和更新说明体验。",
    highlights: [
      "新增应用内更新说明：安装或升级到新版本后，首次打开会自动展示一次。",
      "修复拖动视频进度条可能卡死或闪退的问题，拖动时画面会实时跟随。",
      "修复中文字幕和双语字幕显示：中文轨只保留中文，双语字幕去重。",
      "优化 AI 字幕翻译：提前预翻译后续字幕并复用缓存，减少“AI 翻译中”的闪烁。",
      "拆分字幕解析、语言识别、字幕查找和进度条 seek 逻辑，降低播放器维护成本。",
      "优化长字幕性能：字幕 cue 查找改为排序后二分定位，播放中扫描压力更低。",
    ],
    close: "开始使用",
    dismiss: "关闭更新说明",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.5",
    description: "This update focuses on player stability, subtitle sync, and in-app release notes.",
    highlights: [
      "Added in-app release notes shown once after installing or upgrading to a new version.",
      "Fixed freezes or crashes when dragging the video progress bar, with live frame follow-up while seeking.",
      "Fixed Chinese and bilingual subtitles: Chinese tracks keep Chinese only, and bilingual lines are deduplicated.",
      "Improved AI subtitle translation with pre-translation and cache reuse to reduce translation flicker.",
      "Split subtitle parsing, language detection, cue lookup, and seek handling into smaller modules.",
      "Improved long-subtitle performance with sorted cue lookup and binary positioning.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.5",
    description:
      "Cette version améliore la stabilité du lecteur, la synchronisation des sous-titres et les notes intégrées.",
    highlights: [
      "Ajout de notes de version intégrées, affichées une seule fois après installation ou mise à jour.",
      "Correction des blocages ou plantages lors du déplacement de la barre de progression vidéo.",
      "Correction des sous-titres chinois et bilingues : la piste chinoise garde uniquement le chinois.",
      "Amélioration de la traduction IA des sous-titres avec pré-traduction et cache réutilisé.",
      "Séparation de l'analyse des sous-titres, de la détection de langue, de la recherche de cue et du seek.",
      "Meilleures performances sur les longs sous-titres grâce à une recherche triée et binaire.",
    ],
    close: "Commencer",
    dismiss: "Fermer les notes",
  },
};

function hasSeenReleaseNotes(): boolean {
  try {
    return localStorage.getItem(RELEASE_NOTES_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markReleaseNotesSeen() {
  try {
    localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, "1");
    localStorage.setItem("july-player:last-seen-release-notes-version", RELEASE_NOTES_VERSION);
  } catch {
    // localStorage can be unavailable in restricted WebView contexts.
  }
}

export function ReleaseNotesDialog() {
  const { settings, loaded } = useSettings();
  const [open, setOpen] = useState(false);
  const copy = useMemo(
    () => RELEASE_NOTES[settings.language] ?? RELEASE_NOTES.zh,
    [settings.language],
  );

  useEffect(() => {
    if (!loaded) return;
    if (!hasSeenReleaseNotes()) {
      setOpen(true);
    }
  }, [loaded]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        markReleaseNotesSeen();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = useCallback(() => {
    markReleaseNotesSeen();
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/72 px-5 py-8 backdrop-blur-sm"
      role="presentation"
      onPointerDown={close}
    >
      <section
        aria-describedby="release-notes-description"
        aria-labelledby="release-notes-title"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
          "outline-none",
        )}
        role="dialog"
        style={{ animation: `card-in 260ms ${EASE_OUT} both` }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-primary/45" />
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkle className="size-5" weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-sans text-xs font-semibold text-primary">
                {copy.eyebrow}
              </div>
              <h2
                className="font-sans text-xl font-semibold tracking-normal text-foreground"
                id="release-notes-title"
              >
                {copy.title}
              </h2>
              <p
                className="mt-1 max-w-[58ch] font-sans text-sm leading-6 text-muted-foreground"
                id="release-notes-description"
              >
                {copy.description}
              </p>
            </div>
            <button
              aria-label={copy.dismiss}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              type="button"
              onClick={close}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {copy.highlights.map((item) => (
              <div
                className="flex gap-3 rounded-xl border border-border/70 bg-secondary/35 px-3.5 py-3"
                key={item}
              >
                <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" weight="fill" />
                <p className="font-sans text-sm leading-5 text-foreground/88">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              type="button"
              onClick={close}
            >
              {copy.close}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
