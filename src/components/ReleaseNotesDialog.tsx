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

const RELEASE_NOTES_VERSION = "1.1.8";
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
    title: "\u4e03\u6708\u64ad\u653e\u5668 1.1.8",
    description:
      "\u672c\u6b21\u91cd\u70b9\u4f18\u5316\u64ad\u653e\u5668\u754c\u9762\u3001\u5ba0\u7269\u73a9\u6cd5\u3001AI \u7b14\u8bb0\u548c\u66f4\u65b0\u53d1\u5e03\u6d41\u7a0b\u3002",
    highlights: [
      "\u5168\u9762\u4f18\u5316 HeroUI \u64ad\u653e\u5668\u754c\u9762\uff0c\u6539\u5584\u4fa7\u8fb9\u680f\u3001\u8bfe\u7a0b\u9875\u3001\u8bbe\u7f6e\u9875\u548c\u7a84\u5c4f\u81ea\u9002\u5e94\u5e03\u5c40\u3002",
      "\u4fee\u590d\u5ba0\u7269\u9875\u54cd\u5e94\u5f0f\u6392\u7248\u548c\u684c\u9762\u5ba0\u7269\u7a33\u5b9a\u6027\uff0c\u4f18\u5316\u5ba0\u7269\u72b6\u6001\u3001\u53cd\u9988\u548c\u6e38\u620f\u6570\u503c\u4f53\u9a8c\u3002",
      "\u65b0\u589e AI \u7b14\u8bb0\u52a9\u624b\uff0c\u53ef\u4ece\u8bfe\u7a0b\u5185\u5bb9\u63d0\u53d6\u7b14\u8bb0\u5e76\u7ee7\u7eed\u8ffd\u95ee\u3002",
      "\u4f18\u5316\u89c6\u9891\u62d6\u52a8\u8fdb\u5ea6\u548c\u64ad\u653e\u53cd\u9988\uff0c\u51cf\u5c11\u62d6\u62fd\u65f6\u7684\u5361\u987f\u611f\u3002",
      "\u79fb\u9664 lottie \u52a0\u8f7d\u8d44\u6e90\uff0c\u6362\u6210\u8f7b\u91cf LoadingOrbit\uff0c\u51cf\u5c11\u6784\u5efa\u8b66\u544a\u548c\u4e3b\u5305\u538b\u529b\u3002",
      "\u65b0\u589e\u767b\u5f55\u6a21\u5757\u548c\u5ba0\u7269\u6570\u636e\u8868\u8bbe\u8ba1\u6587\u6863\uff0c\u4fbf\u4e8e\u540e\u7eed\u63a5\u5165\u8d26\u53f7\u3001\u5546\u5e97\u548c\u4e91\u540c\u6b65\u3002",
    ],
    close: "\u5f00\u59cb\u4f7f\u7528",
    dismiss: "\u5173\u95ed\u66f4\u65b0\u8bf4\u660e",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.8",
    description: "This update polishes the player UI, pet experience, AI notes, and release flow.",
    highlights: [
      "Refined the HeroUI interface across navigation, course pages, settings, and responsive layouts.",
      "Improved pet page responsiveness, desktop pet stability, feedback, state, and game-system feel.",
      "Added the AI notes assistant for extracting course notes and follow-up questions.",
      "Improved video seek feedback to reduce stutter while dragging the progress bar.",
      "Replaced lottie loading assets with a lightweight LoadingOrbit to reduce warnings and bundle pressure.",
      "Added login-module and pet-data design docs for account, shop, and cloud-sync integration.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.8",
    description:
      "Cette version am\u00e9liore l'interface, l'animal compagnon, les notes IA et le flux de publication.",
    highlights: [
      "Interface HeroUI affin\u00e9e pour la navigation, les cours, les r\u00e9glages et les layouts responsives.",
      "Stabilit\u00e9 et retours am\u00e9lior\u00e9s pour la page animal et le mode bureau.",
      "Ajout de l'assistant de notes IA pour extraire les notes de cours et poser des questions.",
      "Meilleur retour lors du d\u00e9placement dans la vid\u00e9o afin de r\u00e9duire les saccades.",
      "Remplacement des assets lottie par LoadingOrbit pour r\u00e9duire les avertissements et le poids du bundle.",
      "Ajout de documents de conception pour le compte, la boutique et la synchronisation des donn\u00e9es animal.",
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
