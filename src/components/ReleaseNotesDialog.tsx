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

const RELEASE_NOTES_VERSION = "1.1.11";
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
    title: "\u4e03\u6708\u64ad\u653e\u5668 1.1.11",
    description:
      "\u672c\u6b21\u91cd\u70b9\u589e\u52a0 Gemini API \u652f\u6301\uff0c\u5207\u6362 July API \u65b0\u57df\u540d\uff0c\u5e76\u4fee\u590d\u4e2d\u6587\u8bfe\u7a0b\u6392\u5e8f\u548c\u89c6\u9891\u52a0\u8f7d\u9ed1\u5c4f\u53cd\u9988\u3002",
    highlights: [
      "July API \u4e2d\u8f6c\u9ed8\u8ba4\u5730\u5740\u5207\u6362\u5230 https://julyapi.com/ \uff0cAI \u914d\u7f6e\u9884\u89c8\u9ed8\u8ba4\u4f7f\u7528 https://julyapi.com/v1\u3002",
      "\u003cAI \u6a21\u5757\u003e API \u5730\u5740\u65b0\u589e Gemini \u517c\u5bb9\uff0c\u53ef\u586b\u5199 Google Gemini \u5730\u5740\u6216 OpenAI \u517c\u5bb9 /v1 \u5730\u5740\u3002",
      "\u7ffb\u8bd1\u3001AI \u7b14\u8bb0\u548c\u5ba0\u7269 AI \u7edf\u4e00\u8d70\u901a\u7528 AI \u8bf7\u6c42\u5c42\uff0c\u81ea\u52a8\u8bc6\u522b Gemini/OpenAI \u517c\u5bb9\u63a5\u53e3\u3002",
      "\u4fee\u590d\u201c\u7b2c\u4e00\u8bfe\u3001\u7b2c\u4e8c\u5341\u4e00\u8bfe\u201d\u7b49\u4e2d\u6587\u5e8f\u53f7\u8bfe\u7a0b\u76ee\u5f55\u6392\u5e8f\u9519\u4e71\u95ee\u9898\u3002",
      "\u64ad\u653e\u5668\u9047\u5230\u4e0d\u652f\u6301\u7684\u89c6\u9891\u683c\u5f0f\u6216\u672c\u5730\u6587\u4ef6\u52a0\u8f7d\u5931\u8d25\u65f6\uff0c\u4f1a\u5728\u753b\u9762\u4e2d\u76f4\u63a5\u663e\u793a\u539f\u56e0\u3002",
      "\u4f18\u5316\u672c\u5730\u89c6\u9891 stream Range \u8bfb\u53d6\u8fb9\u754c\uff0c\u63d0\u5347\u9996\u6b21\u8bfb\u53d6\u7a33\u5b9a\u6027\u3002",
      "\u7edf\u4e00 1.1.11 \u7248\u672c\u53f7\u548c\u672c\u5730\u6784\u5efa\u4fe1\u606f\u3002",
    ],
    close: "\u5f00\u59cb\u4f7f\u7528",
    dismiss: "\u5173\u95ed\u66f4\u65b0\u8bf4\u660e",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.11",
    description:
      "This update adds Gemini API support, switches July API to the new domain, and improves Chinese lesson ordering plus video loading feedback.",
    highlights: [
      "July API relay now points to https://julyapi.com/ and the AI preview default uses https://julyapi.com/v1.",
      "AI Module now supports Gemini API addresses in addition to OpenAI-compatible /v1 endpoints.",
      "Translation, AI notes, and pet AI now share one provider layer that auto-detects Gemini or OpenAI-compatible APIs.",
      "Fixed Chinese ordinal lesson ordering such as 第一课, 第九课, and 第二十一课.",
      "The player now shows an in-video message when a local video format is unsupported or fails to load.",
      "Improved local stream range handling for more stable first reads.",
      "Aligned version metadata and local build information for 1.1.11.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.11",
    description:
      "Cette version ajoute Gemini API, bascule July API vers le nouveau domaine et am\u00e9liore l'ordre des le\u00e7ons chinoises ainsi que les retours de chargement vid\u00e9o.",
    highlights: [
      "Le relais July API pointe maintenant vers https://julyapi.com/ et l'aper\u00e7u IA utilise https://julyapi.com/v1.",
      "Le module IA accepte maintenant Gemini API en plus des endpoints compatibles OpenAI /v1.",
      "La traduction, les notes IA et le compagnon IA utilisent une couche fournisseur commune.",
      "Correction du tri des le\u00e7ons avec num\u00e9rotation chinoise.",
      "Le lecteur affiche un message quand le format vid\u00e9o local n'est pas pris en charge ou ne charge pas.",
      "Am\u00e9lioration de la lecture locale stream Range.",
      "Alignement des m\u00e9tadonn\u00e9es de version pour 1.1.11.",
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
