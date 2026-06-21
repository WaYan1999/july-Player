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

const RELEASE_NOTES_VERSION = "1.1.9";
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
    title: "\u4e03\u6708\u64ad\u653e\u5668 1.1.9",
    description:
      "\u672c\u6b21\u91cd\u70b9\u4f18\u5316\u89c6\u9891\u5207\u6362\u6027\u80fd\u3001\u4e66\u7b7e\u6392\u7248\u3001\u5168\u5c4f\u64ad\u653e\u4f53\u9a8c\u548c\u53d1\u5e03\u4e0a\u4f20\u6d41\u7a0b\u3002",
    highlights: [
      "\u4fee\u590d\u4e66\u7b7e\u9875\u8bfe\u7a0b\u5361\u7247\u53d8\u5f62\uff0c\u6062\u590d\u5355\u5217\u6a2a\u5411\u5927\u5361\u7247\u6392\u7248\u3002",
      "\u4fee\u590d\u5168\u5c4f\u64ad\u653e\u65f6\u5e95\u90e8\u63a7\u5236\u6761\u6324\u538b\u3001\u8d34\u8fb9\u548c\u53f3\u4fa7\u6309\u94ae\u88c1\u5207\u95ee\u9898\u3002",
      "\u5207\u6362\u89c6\u9891\u66f4\u6d41\u7545\uff0c\u9ad8\u6e05\u8f6c\u7801\u6539\u4e3a\u7528\u6237\u9009\u62e9\u6e05\u6670\u5ea6\u65f6\u624d\u89e6\u53d1\u3002",
      "\u5b57\u5e55\u89e3\u6790\u6539\u4e3a\u6309\u9700\u61d2\u52a0\u8f7d\uff0c\u964d\u4f4e\u5207\u8bfe\u548c\u5207\u6362\u89c6\u9891\u65f6\u7684\u5361\u987f\u3002",
      "\u6574\u4f53\u914d\u8272\u5207\u6362\u4e3a\u66f4\u67d4\u548c\u7684\u84dd\u7070\u4e3b\u9898\uff0c\u51cf\u5c11\u9ed1\u767d\u5bf9\u6bd4\u8fc7\u786c\u7684\u89c6\u89c9\u95ee\u9898\u3002",
      "\u65b0\u589e JulyRes \u6784\u5efa\u4ea7\u7269\u4e0a\u4f20\u6d41\u7a0b\uff0c\u4fbf\u4e8e\u540e\u53f0\u4eba\u5de5\u6838\u5bf9\u5e76\u53d1\u5e03 latest.json\u3002",
    ],
    close: "\u5f00\u59cb\u4f7f\u7528",
    dismiss: "\u5173\u95ed\u66f4\u65b0\u8bf4\u660e",
  },
  en: {
    eyebrow: "Release notes",
    title: "July Player 1.1.9",
    description: "This update improves video switching, bookmarks, fullscreen playback, and release uploads.",
    highlights: [
      "Fixed deformed course cards on the bookmarks page with a dedicated horizontal card layout.",
      "Fixed fullscreen player controls being clipped or squeezed near the bottom edge.",
      "Made video switching smoother by running HD upscaling only after the user selects a quality.",
      "Lazy-loads subtitle parsing for the selected and bilingual tracks to reduce lesson-switch stutter.",
      "Updated the app palette to a softer blue-gray theme with less harsh black-and-white contrast.",
      "Added the JulyRes release-artifact upload flow for manual backend publishing.",
    ],
    close: "Start watching",
    dismiss: "Dismiss release notes",
  },
  fr: {
    eyebrow: "Notes de version",
    title: "July Player 1.1.9",
    description:
      "Cette version am\u00e9liore le changement de vid\u00e9o, les favoris, le plein \u00e9cran et le flux de publication.",
    highlights: [
      "Correction des cartes de cours d\u00e9form\u00e9es dans les favoris avec une carte horizontale d\u00e9di\u00e9e.",
      "Correction des contr\u00f4les plein \u00e9cran coup\u00e9s ou comprim\u00e9s en bas du lecteur.",
      "Changement de vid\u00e9o plus fluide gr\u00e2ce \u00e0 la conversion HD lanc\u00e9e seulement sur choix utilisateur.",
      "Analyse des sous-titres charg\u00e9e \u00e0 la demande pour r\u00e9duire les saccades.",
      "Palette bleu-gris plus douce pour r\u00e9duire le contraste noir et blanc trop dur.",
      "Ajout du flux d'envoi des fichiers de build vers JulyRes pour publication manuelle.",
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
