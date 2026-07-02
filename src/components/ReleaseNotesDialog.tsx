import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon as CheckCircle,
  SparkleIcon as Sparkle,
  XIcon as X,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { useSettings } from "@/hooks/useSettings";
import type { AppLanguage } from "@/lib/i18n";

const RELEASE_NOTES_VERSION = "1.1.12";
const RELEASE_NOTES_STORAGE_KEY = `july-player:release-notes-seen:${RELEASE_NOTES_VERSION}`;

type ReleaseNotesCopy = {
  title: string;
  eyebrow: string;
  description: string;
  highlights: string[];
  close: string;
  dismiss: string;
};

const RELEASE_NOTES: Record<AppLanguage, ReleaseNotesCopy> = {
  zh: {
    eyebrow: "版本更新",
    title: "七月播放器 1.1.12",
    description:
      "本次重点增强远程更新体验，播放器会自动检测新版本，并在左下角展示更新入口、下载进度和失败重试反馈。",
    highlights: [
      "启动后自动静默检查远程 latest.json，有新版本时会在左下角主动提示。",
      "应用重新聚焦时会按冷却时间自动补查，长期运行时每 6 小时后台检查一次。",
      "左下角更新卡片支持发现更新、下载进度、安装完成重启和失败重试四种状态。",
      "下载过程新增百分比和文件大小进度，避免只看到 0% 无反馈。",
      "更新提示会自动避开侧边栏，折叠侧边栏或窄屏时仍保持清晰可用。",
      "设置页的检查更新按钮保留，并与左下角全局提示状态同步。",
    ],
    close: "开始使用",
    dismiss: "关闭更新说明",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.12",
    description:
      "This update improves remote updates with automatic checks and a bottom-left update card for availability, progress, completion, and retry feedback.",
    highlights: [
      "The app now checks the remote latest.json automatically after startup and shows the update card when a new version is found.",
      "Update checks also run when the app regains focus, with cooldown protection, and every 6 hours during long sessions.",
      "The bottom-left update card now covers available, downloading, ready to restart, and retry states.",
      "Download progress now shows both percentage and file size progress to avoid unclear 0% feedback.",
      "The update card avoids the sidebar and stays readable when the sidebar is collapsed or the window is narrow.",
      "The Settings update button remains available and stays in sync with the global update card.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.12",
    description:
      "Cette version améliore les mises à jour distantes avec une vérification automatique et une carte en bas à gauche pour la progression et les erreurs.",
    highlights: [
      "L'application vérifie automatiquement le latest.json distant après le démarrage et affiche une carte si une mise à jour existe.",
      "La vérification se relance au retour au premier plan, avec un délai de protection, puis toutes les 6 heures.",
      "La carte en bas à gauche couvre les états disponible, téléchargement, prêt à redémarrer et réessayer.",
      "La progression affiche maintenant le pourcentage et la taille téléchargée.",
      "La carte évite la barre latérale et reste lisible en mode réduit ou sur une fenêtre étroite.",
      "Le bouton de mise à jour des Paramètres reste disponible et synchronisé avec la carte globale.",
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
          "july-dialog relative w-full max-w-xl overflow-hidden border border-border bg-card text-card-foreground",
          "outline-none",
        )}
        role="dialog"
        style={{ animation: `card-in 240ms ${EASE_OUT} both` }}
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
            <Button
              aria-label={copy.dismiss}
              className="july-heroui-button july-heroui-icon-button size-8 min-h-8 min-w-8 shrink-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
              type="button"
              variant="ghost"
              isIconOnly
              onClick={close}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-2.5">
            {copy.highlights.map((item) => (
              <div
                className="july-feedback-card flex gap-3 rounded-xl border border-border/70 bg-secondary/35 px-3.5 py-3"
                key={item}
              >
                <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" weight="fill" />
                <p className="font-sans text-sm leading-5 text-foreground/88">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              className="july-heroui-button july-heroui-button-primary px-4"
              type="button"
              variant="primary"
              onClick={close}
            >
              {copy.close}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
