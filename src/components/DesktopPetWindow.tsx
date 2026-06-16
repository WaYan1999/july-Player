import { useMemo } from "react";
import { XIcon } from "@phosphor-icons/react";
import { closeDesktopPet } from "@/lib/store";
import { createPetSpriteStyle } from "@/lib/pets";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";

const COPY = {
  en: {
    title: "Desktop pet",
    message: "I can stay on your desktop now.",
    close: "Return to player",
  },
  zh: {
    title: "桌面宠物",
    message: "我现在可以留在桌面上了。",
    close: "回到播放器",
  },
  fr: {
    title: "Compagnon bureau",
    message: "Je peux rester sur le bureau.",
    close: "Retour au lecteur",
  },
} as const;

export function DesktopPetWindow() {
  const { language } = useI18n();
  const { settings, update } = useSettings();
  const copy = COPY[language];
  const spriteStyle = useMemo(
    () => createPetSpriteStyle("idle", settings.pet_variant, 128),
    [settings.pet_variant],
  );

  const closeWindow = async () => {
    await update("pet_desktop_enabled", "false");
    await closeDesktopPet();
  };

  return (
    <main className="desktop-pet-window" data-tauri-drag-region>
      <button
        type="button"
        className="desktop-pet-close"
        aria-label={copy.close}
        title={copy.close}
        onClick={() => void closeWindow()}
      >
        <XIcon className="size-3.5" weight="bold" />
      </button>

      <div className="desktop-pet-bubble" aria-live="polite">
        <strong>{copy.title}</strong>
        <span>{copy.message}</span>
      </div>

      <div className="desktop-pet-stage">
        <span className="openpets-ai-pet-sprite desktop-pet-sprite" style={spriteStyle} />
        <span className="desktop-pet-shadow" />
      </div>
    </main>
  );
}
