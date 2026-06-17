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

const RELEASE_NOTES_VERSION = "1.1.6";
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
    title: "七月播放器 1.1.6",
    description: "本次重点修复桌面宠物卡死、消失和状态恢复问题。",
    highlights: [
      "修复宠物进入桌面模式后可能消失、卡死或导致宠物模块锁死的问题。",
      "新增桌面宠物加载完成确认，窗口真正打开后才隐藏播放器内的常驻宠物。",
      "进入桌面模式前会清理旧的桌面宠物窗口，避免复用异常 WebView。",
      "打开和关闭桌面宠物增加超时保护，失败时自动回滚状态。",
      "桌面宠物窗口不再直接写入共享设置，改为通知主窗口统一恢复状态。",
      "从主窗口关闭桌面宠物时改用更可靠的 Windows WebView2 销毁流程。",
    ],
    close: "开始使用",
    dismiss: "关闭更新说明",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.6",
    description: "This update fixes desktop pet freezes, disappearing pets, and state recovery.",
    highlights: [
      "Fixed a desktop pet issue where entering desktop mode could freeze, disappear, or lock the pet module.",
      "Added a desktop pet ready handshake before hiding the in-player resident pet.",
      "Desktop mode now resets any stale desktop pet window before creating a fresh one.",
      "Opening and closing desktop pet mode now has timeout protection and automatic rollback.",
      "The desktop pet window no longer writes shared settings directly; it notifies the main window instead.",
      "Main-window shutdown of the desktop pet now uses a stronger window destroy path on Windows.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.6",
    description: "Cette version corrige les blocages et disparitions du compagnon de bureau.",
    highlights: [
      "Correction du blocage possible lors du passage du compagnon en mode bureau.",
      "Ajout d'une confirmation de chargement avant de masquer le compagnon du lecteur.",
      "Le mode bureau recrée une fenêtre propre au lieu de réutiliser une ancienne fenêtre bloquée.",
      "Ouverture et fermeture ont maintenant une protection par délai et un retour automatique.",
      "La petite fenêtre du compagnon notifie la fenêtre principale au lieu d'écrire les réglages directement.",
      "La fermeture depuis la fenêtre principale utilise un chemin plus robuste sous Windows.",
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
