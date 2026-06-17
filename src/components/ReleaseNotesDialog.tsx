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

const RELEASE_NOTES_VERSION = "1.1.7";
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
    title: "七月播放器 1.1.7",
    description: "本次重点优化国内更新速度，并接入后端 latest.json 更新接口。",
    highlights: [
      "新增国内更新源优先检查：优先请求 julyres.top 的 latest.json，GitHub 保留兜底。",
      "缩短更新检查超时时间：启动静默检查 3 秒，手动检查 5 秒，避免界面长时间等待。",
      "新增 UPDATE_MANIFEST.md，后端可按文档提供 version、notes、pub_date、platforms、url 和 signature。",
      "支持后端把安装包和签名文件放到国内 CDN，让检查更新和下载安装都更快。",
      "保留 GitHub Release 更新清单作为备用源，国内源不可用时仍可继续检查更新。",
      "完善 1.1.7 发布说明，明确本次新增的远程更新接口和国内加速方案。",
    ],
    close: "开始使用",
    dismiss: "关闭更新说明",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.7",
    description: "This update improves update checks in China and documents the backend manifest API.",
    highlights: [
      "Added a China-friendly update endpoint that checks julyres.top before falling back to GitHub.",
      "Reduced update-check waiting time with 3-second silent checks and 5-second manual checks.",
      "Added UPDATE_MANIFEST.md so the backend can serve the required latest.json fields.",
      "Supports CDN-hosted installers and signatures for faster update downloads.",
      "Keeps GitHub Releases as a fallback update source when the domestic endpoint is unavailable.",
      "Updated 1.1.7 release notes for the remote update manifest and acceleration flow.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.7",
    description: "Cette version améliore la recherche de mises à jour et documente le manifeste serveur.",
    highlights: [
      "Ajout d'un endpoint de mise à jour prioritaire sur julyres.top avec GitHub en secours.",
      "Réduction du délai d'attente des vérifications de mise à jour.",
      "Ajout de UPDATE_MANIFEST.md pour décrire le format latest.json attendu par le backend.",
      "Prise en charge des installateurs et signatures hébergés sur CDN pour accélérer les téléchargements.",
      "Conservation de GitHub Releases comme source de secours si l'endpoint domestique est indisponible.",
      "Mise à jour des notes 1.1.7 pour expliquer le manifeste distant et l'accélération.",
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
