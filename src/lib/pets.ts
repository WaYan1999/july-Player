import type { CSSProperties } from "react";
import openPetsSpriteUrl from "@/assets/openpets/default-pet-spritesheet.webp";
import openPetsThumbnailUrl from "@/assets/openpets/default-pet-thumbnail.png";

export type PetState = "idle" | "wave" | "hop" | "walk" | "thinking";

export type PetCatalogId =
  | "builtin"
  | "tmuxai"
  | "nori"
  | "bitty"
  | "fixer"
  | "robot"
  | "shadow-kit"
  | "fox"
  | "azure"
  | "penguin"
  | "orchestrator"
  | "snoopy"
  | "clippit"
  | "tux"
  | "wall-e"
  | "dobby"
  | "cartman"
  | "panda"
  | "shiba";

export type PetPluginId =
  | "openpets.reminders"
  | "openpets.virtual-pet"
  | "openpets.focus-buddy"
  | "openpets.water-reminder"
  | "openpets.day-routine"
  | "openpets.mood-check-in"
  | "openpets.launch-buddy"
  | "openpets.magic-8-ball"
  | "openpets.fortune-cookie";

interface SpriteStateDefinition {
  row: number;
  frames: number;
  durationMs: number;
  iterations?: number | "infinite";
}

export interface PetCatalogPet {
  id: PetCatalogId;
  displayName: string;
  description: string;
  thumbnail: string;
  spritesheet: string;
  category: "built-in" | "official" | "catalog";
  featured?: boolean;
  protected?: boolean;
}

export interface PetPlugin {
  id: PetPluginId;
  nameKey: keyof PetPluginTranslationKeys;
  descriptionKey: keyof PetPluginTranslationKeys;
  bundled?: boolean;
  defaultEnabled?: boolean;
}

type PetPluginTranslationKeys = {
  remindersPlugin: string;
  remindersPluginDescription: string;
  virtualPetPlugin: string;
  virtualPetPluginDescription: string;
  focusBuddyPlugin: string;
  focusBuddyPluginDescription: string;
  waterReminderPlugin: string;
  waterReminderPluginDescription: string;
  dayRoutinePlugin: string;
  dayRoutinePluginDescription: string;
  moodCheckInPlugin: string;
  moodCheckInPluginDescription: string;
  launchBuddyPlugin: string;
  launchBuddyPluginDescription: string;
  magic8BallPlugin: string;
  magic8BallPluginDescription: string;
  fortuneCookiePlugin: string;
  fortuneCookiePluginDescription: string;
};

export const DEFAULT_PET_VARIANT: PetCatalogId = "builtin";

export const DEFAULT_PET_PLUGINS: PetPluginId[] = [
  "openpets.reminders",
  "openpets.virtual-pet",
];

const openPetsPetUrl = (slug: string, file: "thumb.webp" | "spritesheet.webp") =>
  `https://openpets.dev/pets/${slug}/${file}`;

export const PET_CATALOG: PetCatalogPet[] = [
  {
    id: "builtin",
    displayName: "Built-in Pet",
    description: "A friendly coding companion bundled with the player.",
    thumbnail: openPetsThumbnailUrl,
    spritesheet: openPetsSpriteUrl,
    category: "built-in",
    featured: true,
    protected: true,
  },
  {
    id: "tmuxai",
    displayName: "TmuxAI Official",
    description: "A floating rounded white cube robot with an antenna.",
    thumbnail: openPetsPetUrl("tmuxai-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("tmuxai-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "nori",
    displayName: "Nori",
    description: "A tiny smiling salmon sushi companion.",
    thumbnail: openPetsPetUrl("nori-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("nori-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "bitty",
    displayName: "Bitty",
    description: "A tiny retro handheld console with a smiling green screen.",
    thumbnail: openPetsPetUrl("bitty-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("bitty-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "fixer",
    displayName: "Fixer",
    description: "A cybernetic helper with glowing blue eyes and a repair aura.",
    thumbnail: openPetsPetUrl("fixer-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("fixer-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "robot",
    displayName: "Robot",
    description: "A small friendly white robot with cyan screen eyes.",
    thumbnail: openPetsPetUrl("robot-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("robot-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "shadow-kit",
    displayName: "Shadow Kit",
    description: "A black kitten with amber eyes and a purple collar.",
    thumbnail: openPetsPetUrl("shadow-kit-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("shadow-kit-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "fox",
    displayName: "Fox",
    description: "A bright orange pixel fox with a white-tipped tail.",
    thumbnail: openPetsPetUrl("fox-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("fox-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "azure",
    displayName: "Azure",
    description: "A tiny blue dragon with small wings and a friendly snout.",
    thumbnail: openPetsPetUrl("azure-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("azure-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "penguin",
    displayName: "Penguin",
    description: "A cozy pixel penguin bundled in a blue scarf.",
    thumbnail: openPetsPetUrl("penguin-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("penguin-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "orchestrator",
    displayName: "Orchestrator",
    description: "A crowned orchestrator companion with a gold aura.",
    thumbnail: openPetsPetUrl("orchestrator-openpets", "thumb.webp"),
    spritesheet: openPetsPetUrl("orchestrator-openpets", "spritesheet.webp"),
    category: "official",
    featured: true,
  },
  {
    id: "snoopy",
    displayName: "Snoopy",
    description: "A tiny black-and-white beagle with a red collar.",
    thumbnail: openPetsPetUrl("snoopy-23e05847", "thumb.webp"),
    spritesheet: openPetsPetUrl("snoopy-23e05847", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "clippit",
    displayName: "Clippy",
    description: "A classic paperclip assistant rebuilt from Microsoft Agent frames.",
    thumbnail: openPetsPetUrl("clippit-904b393f", "thumb.webp"),
    spritesheet: openPetsPetUrl("clippit-904b393f", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "tux",
    displayName: "Tux",
    description: "A tiny pixel-adjacent Linux mascot for calm sessions.",
    thumbnail: openPetsPetUrl("tux-de2f300f", "thumb.webp"),
    spritesheet: openPetsPetUrl("tux-de2f300f", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "wall-e",
    displayName: "Wall-E",
    description: "A tiny weathered robot with binocular eyes and treads.",
    thumbnail: openPetsPetUrl("wall-e-779d5202", "thumb.webp"),
    spritesheet: openPetsPetUrl("wall-e-779d5202", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "dobby",
    displayName: "Dobby",
    description: "An earnest helpful house-elf companion with huge ears.",
    thumbnail: openPetsPetUrl("dobby-3f6746e0", "thumb.webp"),
    spritesheet: openPetsPetUrl("dobby-3f6746e0", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "cartman",
    displayName: "Cartman",
    description: "A compact cutout-style character companion.",
    thumbnail: openPetsPetUrl("cartman-3e20c8d0", "thumb.webp"),
    spritesheet: openPetsPetUrl("cartman-3e20c8d0", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "panda",
    displayName: "Panda",
    description: "A tiny cute panda companion.",
    thumbnail: openPetsPetUrl("panda-9afe6a6d", "thumb.webp"),
    spritesheet: openPetsPetUrl("panda-9afe6a6d", "spritesheet.webp"),
    category: "catalog",
  },
  {
    id: "shiba",
    displayName: "Shiba",
    description: "A tiny cheerful shiba inu companion.",
    thumbnail: openPetsPetUrl("shiba-4c9bdc8c", "thumb.webp"),
    spritesheet: openPetsPetUrl("shiba-4c9bdc8c", "spritesheet.webp"),
    category: "catalog",
  },
];

export const PET_PLUGINS: PetPlugin[] = [
  {
    id: "openpets.reminders",
    nameKey: "remindersPlugin",
    descriptionKey: "remindersPluginDescription",
    bundled: true,
    defaultEnabled: true,
  },
  {
    id: "openpets.virtual-pet",
    nameKey: "virtualPetPlugin",
    descriptionKey: "virtualPetPluginDescription",
    bundled: true,
    defaultEnabled: true,
  },
  {
    id: "openpets.focus-buddy",
    nameKey: "focusBuddyPlugin",
    descriptionKey: "focusBuddyPluginDescription",
  },
  {
    id: "openpets.water-reminder",
    nameKey: "waterReminderPlugin",
    descriptionKey: "waterReminderPluginDescription",
  },
  {
    id: "openpets.day-routine",
    nameKey: "dayRoutinePlugin",
    descriptionKey: "dayRoutinePluginDescription",
  },
  {
    id: "openpets.mood-check-in",
    nameKey: "moodCheckInPlugin",
    descriptionKey: "moodCheckInPluginDescription",
  },
  {
    id: "openpets.launch-buddy",
    nameKey: "launchBuddyPlugin",
    descriptionKey: "launchBuddyPluginDescription",
  },
  {
    id: "openpets.magic-8-ball",
    nameKey: "magic8BallPlugin",
    descriptionKey: "magic8BallPluginDescription",
  },
  {
    id: "openpets.fortune-cookie",
    nameKey: "fortuneCookiePlugin",
    descriptionKey: "fortuneCookiePluginDescription",
  },
];

export const PET_SPRITE = {
  frameWidth: 192,
  frameHeight: 208,
  columns: 8,
  rows: 9,
  states: {
    idle: { row: 0, frames: 6, durationMs: 5500, iterations: "infinite" },
    wave: { row: 3, frames: 4, durationMs: 700, iterations: 2 },
    hop: { row: 4, frames: 5, durationMs: 840, iterations: 2 },
    walk: { row: 7, frames: 6, durationMs: 820, iterations: "infinite" },
    thinking: { row: 8, frames: 6, durationMs: 1550, iterations: "infinite" },
  } satisfies Record<PetState, SpriteStateDefinition>,
} as const;

type SpriteStyle = CSSProperties & {
  "--openpets-render-width": string;
  "--openpets-render-height": string;
  "--openpets-bg-width": string;
  "--openpets-bg-height": string;
  "--openpets-row-y": string;
  "--openpets-end-x": string;
  "--openpets-frames": number;
  "--openpets-duration": string;
  "--openpets-iterations": number | "infinite";
  "--openpets-sprite-url": string;
  "--openpets-filter": string;
};

export function isPetVariantId(value: string): value is PetCatalogId {
  return PET_CATALOG.some((pet) => pet.id === value);
}

export function getPetVariant(value: string | undefined): PetCatalogPet {
  return PET_CATALOG.find((pet) => pet.id === value) ?? PET_CATALOG[0];
}

export function parsePetPlugins(value: string | undefined): PetPluginId[] {
  if (value === undefined) return DEFAULT_PET_PLUGINS;
  if (!value.trim()) return [];

  const ids = value
    .split(",")
    .map((pluginId) => pluginId.trim())
    .filter((pluginId): pluginId is PetPluginId =>
      PET_PLUGINS.some((plugin) => plugin.id === pluginId),
    );

  return [...new Set(ids)];
}

export function serializePetPlugins(ids: PetPluginId[]): string {
  return ids
    .filter(
      (id, index, arr) =>
        PET_PLUGINS.some((plugin) => plugin.id === id) && arr.indexOf(id) === index,
    )
    .join(",");
}

export function createPetSpriteStyle(
  state: PetState,
  variantId: string | undefined,
  width: number,
): SpriteStyle {
  const stateDef = PET_SPRITE.states[state];
  const pet = getPetVariant(variantId);
  const scale = width / PET_SPRITE.frameWidth;

  return {
    "--openpets-render-width": `${PET_SPRITE.frameWidth * scale}px`,
    "--openpets-render-height": `${PET_SPRITE.frameHeight * scale}px`,
    "--openpets-bg-width": `${PET_SPRITE.columns * PET_SPRITE.frameWidth * scale}px`,
    "--openpets-bg-height": `${PET_SPRITE.rows * PET_SPRITE.frameHeight * scale}px`,
    "--openpets-row-y": `-${stateDef.row * PET_SPRITE.frameHeight * scale}px`,
    "--openpets-end-x": `-${PET_SPRITE.frameWidth * stateDef.frames * scale}px`,
    "--openpets-frames": stateDef.frames,
    "--openpets-duration": `${stateDef.durationMs}ms`,
    "--openpets-iterations": stateDef.iterations ?? "infinite",
    "--openpets-sprite-url": `url("${pet.spritesheet}")`,
    "--openpets-filter": "drop-shadow(0 12px 13px rgb(0 0 0 / 0.34))",
  };
}
