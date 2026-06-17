import { useCallback, useEffect, useMemo, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createPetSpriteStyle } from "@/lib/pets";
import { getPetCareState, PET_CARE_UPDATED_EVENT } from "@/lib/petCare";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import {
  DESKTOP_PET_CLOSE_REQUEST_EVENT,
  DESKTOP_PET_READY_EVENT,
} from "@/lib/desktopPet";

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
  const { settings } = useSettings();
  const copy = COPY[language];
  const [petName, setPetName] = useState("");
  const spriteStyle = useMemo(
    () => createPetSpriteStyle("idle", settings.pet_variant, 128),
    [settings.pet_variant],
  );

  const refreshPetName = useCallback(async () => {
    try {
      const state = await getPetCareState(settings.pet_variant);
      setPetName(state.petName);
    } catch {
      setPetName("");
    }
  }, [settings.pet_variant]);

  useEffect(() => {
    void refreshPetName();
  }, [refreshPetName]);

  useEffect(() => {
    void emit(DESKTOP_PET_READY_EVENT);
  }, []);

  useEffect(() => {
    const handleCareUpdate = () => void refreshPetName();
    window.addEventListener(PET_CARE_UPDATED_EVENT, handleCareUpdate);
    return () => window.removeEventListener(PET_CARE_UPDATED_EVENT, handleCareUpdate);
  }, [refreshPetName]);

  const closeWindow = async () => {
    try {
      await emit(DESKTOP_PET_CLOSE_REQUEST_EVENT);
    } finally {
      await getCurrentWindow().close();
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
        <strong>{petName || copy.title}</strong>
        <span>{copy.message}</span>
      </div>

      <div className="desktop-pet-stage">
        <span className="openpets-ai-pet-sprite desktop-pet-sprite" style={spriteStyle} />
        <span className="desktop-pet-shadow" />
      </div>
    </main>
  );
}
