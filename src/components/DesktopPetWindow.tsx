import { useMemo } from "react";
import { XIcon } from "@phosphor-icons/react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createPetSpriteStyle,
  DEFAULT_PET_VARIANT,
  isPetVariantId,
  PET_CATALOG,
} from "@/lib/pets";
import { isAppLanguage, type AppLanguage } from "@/lib/i18n";
import { DESKTOP_PET_CLOSE_REQUEST_EVENT } from "@/lib/desktopPet";

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

function getDesktopPetParams() {
  const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const language = params.get("language") ?? "";
  const pet = params.get("pet") ?? "";

  return {
    language: isAppLanguage(language) ? language : "en",
    petVariant: isPetVariantId(pet) ? pet : DEFAULT_PET_VARIANT,
  };
}

export function DesktopPetWindow() {
  const { language, petVariant } = useMemo(getDesktopPetParams, []);
  const copy = COPY[language as AppLanguage];
  const pet = PET_CATALOG.find((item) => item.id === petVariant);
  const spriteStyle = useMemo(
    () => createPetSpriteStyle("idle", petVariant, 128),
    [petVariant],
  );

  const closeWindow = async () => {
    try {
      await emit(DESKTOP_PET_CLOSE_REQUEST_EVENT).catch(() => {});
    } finally {
      await getCurrentWindow().close().catch(() => {});
    }
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
        <strong>{pet?.displayName || copy.title}</strong>
        <span>{copy.message}</span>
      </div>

      <div className="desktop-pet-stage">
        <span className="openpets-ai-pet-sprite desktop-pet-sprite" style={spriteStyle} />
        <span className="desktop-pet-shadow" />
      </div>
    </main>
  );
}
