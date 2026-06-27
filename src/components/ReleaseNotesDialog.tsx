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

const RELEASE_NOTES_VERSION = "1.1.10";
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
    eyebrow: "\u7248\u672c\u66f4\u65b0",
    title: "\u4e03\u6708\u64ad\u653e\u5668 1.1.10",
    description:
      "\u672c\u6b21\u91cd\u70b9\u4fee\u590d\u8bfe\u7a0b\u5207\u6362\u5361\u987f\u3001\u64ad\u653e\u5668\u4ea4\u4e92\u7a33\u5b9a\u6027\u3001\u5e03\u5c40\u81ea\u9002\u5e94\u548c\u53d1\u5e03\u7248\u672c\u4e00\u81f4\u6027\u3002",
    highlights: [
      "\u4fee\u590d\u8bfe\u7a0b\u76ee\u5f55\u70b9\u51fb\u5207\u6362\u65f6\u7684\u660e\u663e\u5ef6\u8fdf\uff0c\u51cf\u5c11\u9690\u85cf\u7ae0\u8282\u6309\u94ae\u9020\u6210\u7684\u70b9\u51fb\u62e6\u622a\u3002",
      "\u4f18\u5316\u64ad\u653e\u5668\u6362\u6e90\u6d41\u7a0b\uff0c\u5207\u8bfe\u65f6\u4fdd\u7559\u8fdb\u5ea6\u4fdd\u5b58\u4f46\u4e0d\u963b\u585e\u65b0\u89c6\u9891\u52a0\u8f7d\u3002",
      "\u4f18\u5316\u672c\u5730\u89c6\u9891 stream Range \u8bfb\u53d6\u8fb9\u754c\uff0c\u63d0\u5347\u5927\u6587\u4ef6\u9996\u6b21\u8bfb\u53d6\u7a33\u5b9a\u6027\u3002",
      "\u7ee7\u7eed\u4fee\u590d\u7b14\u8bb0\u3001\u5ba0\u7269\u5e38\u9a7b\u548c\u8bfe\u7a0b\u8be6\u60c5\u5e03\u5c40\u5728\u4e0d\u540c\u7a97\u53e3\u5c3a\u5bf8\u4e0b\u7684\u91cd\u53e0\u95ee\u9898\u3002",
      "\u8865\u9f50 Remotion \u52a8\u6548\u8d44\u6e90\u548c\u8bbe\u8ba1 token\uff0c\u4e3a\u542f\u52a8\u52a8\u753b\u4e0e\u540e\u7eed\u89c6\u89c9\u5347\u7ea7\u505a\u51c6\u5907\u3002",
      "\u7edf\u4e00 1.1.10 \u7248\u672c\u53f7\u3001\u66f4\u65b0\u8bf4\u660e\u548c\u8fdc\u7a0b\u53d1\u5e03\u6784\u5efa\u914d\u7f6e\u3002",
    ],
    close: "\u5f00\u59cb\u4f7f\u7528",
    dismiss: "\u5173\u95ed\u66f4\u65b0\u8bf4\u660e",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.10",
    description: "This update improves lesson switching, player responsiveness, adaptive layouts, and release consistency.",
    highlights: [
      "Reduced visible delay when switching lessons from the curriculum list.",
      "Improved player source switching so progress saving does not block the next video.",
      "Tightened local stream range handling for more stable large-file reads.",
      "Continued layout fixes for notes, resident pet, and course details across window sizes.",
      "Added Remotion motion assets and design tokens for startup animation and future visual upgrades.",
      "Aligned version metadata, release notes, and remote release build configuration for 1.1.10.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.10",
    description:
      "Cette version am\u00e9liore le changement de le\u00e7on, la r\u00e9activit\u00e9 du lecteur, les mises en page adaptatives et la coh\u00e9rence de publication.",
    highlights: [
      "R\u00e9duction du d\u00e9lai visible lors du changement de le\u00e7on depuis le programme.",
      "Am\u00e9lioration du changement de source vid\u00e9o afin que la sauvegarde de progression ne bloque pas la vid\u00e9o suivante.",
      "Gestion plus stricte des plages du flux local pour stabiliser la lecture des gros fichiers.",
      "Corrections de mise en page pour les notes, le compagnon r\u00e9sident et les d\u00e9tails de cours.",
      "Ajout des ressources Remotion et des tokens de design pour les animations de d\u00e9marrage.",
      "Alignement des m\u00e9tadonn\u00e9es, notes de version et configuration de build pour 1.1.10.",
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
