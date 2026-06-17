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

const RELEASE_NOTES_VERSION = "1.1.7";
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
    title: "\u4e03\u6708\u64ad\u653e\u5668 1.1.7",
    description:
      "\u672c\u6b21\u91cd\u70b9\u4f18\u5316\u56fd\u5185\u66f4\u65b0\u901f\u5ea6\uff0c\u5e76\u63a5\u5165\u540e\u7aef latest.json \u66f4\u65b0\u63a5\u53e3\u3002",
    highlights: [
      "\u65b0\u589e\u56fd\u5185\u66f4\u65b0\u6e90\u4f18\u5148\u68c0\u67e5\uff1a\u5148\u8bf7\u6c42 julyres.top \u7684 latest.json\uff0cGitHub \u4f5c\u4e3a\u5907\u7528\u3002",
      "\u7f29\u77ed\u66f4\u65b0\u68c0\u67e5\u8d85\u65f6\uff1a\u542f\u52a8\u9759\u9ed8\u68c0\u67e5 3 \u79d2\uff0c\u624b\u52a8\u68c0\u67e5 5 \u79d2\u3002",
      "\u65b0\u589e UPDATE_MANIFEST.md\uff0c\u540e\u7aef\u53ef\u6309\u6587\u6863\u63d0\u4f9b version\u3001notes\u3001pub_date\u3001platforms\u3001url \u548c signature\u3002",
      "\u652f\u6301\u540e\u7aef\u628a\u5b89\u88c5\u5305\u548c\u7b7e\u540d\u6587\u4ef6\u653e\u5230\u56fd\u5185 CDN\uff0c\u8ba9\u68c0\u67e5\u548c\u4e0b\u8f7d\u66f4\u5feb\u3002",
      "\u4fdd\u7559 GitHub Release \u66f4\u65b0\u6e05\u5355\u4f5c\u4e3a\u5907\u7528\u6e90\uff0c\u56fd\u5185\u6e90\u4e0d\u53ef\u7528\u65f6\u4ecd\u53ef\u7ee7\u7eed\u68c0\u67e5\u3002",
      "\u5b8c\u5584 1.1.7 \u53d1\u5e03\u8bf4\u660e\uff0c\u660e\u786e\u8fdc\u7a0b\u66f4\u65b0\u63a5\u53e3\u548c\u56fd\u5185\u52a0\u901f\u65b9\u6848\u3002",
    ],
    close: "\u5f00\u59cb\u4f7f\u7528",
    dismiss: "\u5173\u95ed\u66f4\u65b0\u8bf4\u660e",
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
    description:
      "Cette version am\u00e9liore la recherche de mises \u00e0 jour et documente le manifeste serveur.",
    highlights: [
      "Ajout d'un endpoint de mise \u00e0 jour prioritaire sur julyres.top avec GitHub en secours.",
      "R\u00e9duction du d\u00e9lai d'attente des v\u00e9rifications de mise \u00e0 jour.",
      "Ajout de UPDATE_MANIFEST.md pour d\u00e9crire le format latest.json attendu par le backend.",
      "Prise en charge des installateurs et signatures h\u00e9berg\u00e9s sur CDN pour acc\u00e9l\u00e9rer les t\u00e9l\u00e9chargements.",
      "Conservation de GitHub Releases comme source de secours si l'endpoint domestique est indisponible.",
      "Mise \u00e0 jour des notes 1.1.7 pour expliquer le manifeste distant et l'acc\u00e9l\u00e9ration.",
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
