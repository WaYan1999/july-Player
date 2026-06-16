import {
  DEFAULT_PET_VARIANT,
  PET_CATALOG,
  type PetCatalogId,
} from "@/lib/pets";
import { getAllSettings, setSetting } from "@/lib/store";

export const PET_CARE_STATE_KEY = "pet_care_state";
export const PET_CARE_UPDATED_EVENT = "july-player:pet-care-updated";

export type PetCareEventType =
  | "checkin"
  | "lesson"
  | "task"
  | "module"
  | "care"
  | "focus"
  | "ai"
  | "tokens";

export type PetVitalId = "food" | "energy" | "play" | "bond";
export type PetCareActionId = "feed" | "play" | "pet" | "nap";
export type PetDailyGoalId = "checkin" | "lesson" | "care" | "module" | "focus";
export type PetCareAwardSkipReason =
  | "already_checked_in"
  | "lesson_already_rewarded"
  | "daily_limit"
  | "cooldown"
  | "not_enough_tokens"
  | "stat_full"
  | "stat_low";

export type PetCareActionSkipReason =
  | "cooldown"
  | "daily_limit"
  | "not_enough_tokens"
  | "stat_full"
  | "stat_low";

export interface PetCareEvent {
  id: string;
  type: PetCareEventType;
  label: string;
  petId: PetCatalogId;
  xp: number;
  tokens: number;
  at: string;
}

export interface PetVitals {
  food: number;
  energy: number;
  play: number;
  bond: number;
}

export interface PetCareState {
  xp: number;
  tokens: number;
  tokensToday: number;
  totalTokensEarned: number;
  tasksCompleted: number;
  tasksToday: number;
  lessonsCompleted: number;
  checkinStreak: number;
  lastCheckinDate: string | null;
  lastFedAt: string | null;
  dayKey: string;
  petXp: Partial<Record<PetCatalogId, number>>;
  petVitals: Partial<Record<PetCatalogId, PetVitals>>;
  careActionCountsToday: Partial<Record<PetCareActionId, number>>;
  moduleActionCountsToday: Record<string, number>;
  eventCountsToday: Partial<Record<PetCareEventType, number>>;
  lastCareActionAt: Partial<Record<PetCareActionId, string>>;
  lastModuleActionAt: Record<string, string>;
  dailyGoals: Partial<Record<PetDailyGoalId, boolean>>;
  rewardedLessonIds: number[];
  recentEvents: PetCareEvent[];
}

export interface PetCareProgress {
  level: number;
  threshold: number;
  nextThreshold: number;
  xpInLevel: number;
  xpForLevel: number;
  progress: number;
  isMaxLevel: boolean;
}

export interface PetCareAwardResult {
  state: PetCareState;
  event: PetCareEvent | null;
  skipped: boolean;
  reason?: PetCareAwardSkipReason;
  cooldownRemainingMs?: number;
  levelBefore: number;
  levelAfter: number;
  petLevelBefore: number;
  petLevelAfter: number;
  unlockedPets: PetCatalogId[];
}

type AwardPetCareInput = {
  type: PetCareEventType;
  petId?: PetCatalogId;
  label?: string;
  lessonId?: number;
  moduleKey?: string;
  xp?: number;
  tokens?: number;
  dailyLimit?: number;
  baseState?: PetCareState;
};

export interface PetCareActionResult {
  state: PetCareState;
  action: PetCareActionId;
  vitals: PetVitals;
  event: PetCareEvent | null;
  skipped: boolean;
  reason?: PetCareActionSkipReason;
  cooldownRemainingMs?: number;
  tokenCost: number;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  petLevelBefore: number;
  petLevelAfter: number;
  unlockedPets: PetCatalogId[];
}

type ApplyPetCareActionInput = {
  petId?: PetCatalogId;
  action: PetCareActionId;
  label?: string;
};

export const PET_CARE_LEVELS = [
  { level: 1, threshold: 0 },
  { level: 2, threshold: 120 },
  { level: 3, threshold: 360 },
  { level: 4, threshold: 720 },
  { level: 5, threshold: 1200 },
  { level: 6, threshold: 1800 },
  { level: 7, threshold: 2520 },
] as const;

const MAX_LEVEL = PET_CARE_LEVELS[PET_CARE_LEVELS.length - 1].level;

const AWARDS: Record<PetCareEventType, { xp: number; tokens: number }> = {
  checkin: { xp: 15, tokens: 20 },
  lesson: { xp: 25, tokens: 12 },
  task: { xp: 18, tokens: 8 },
  module: { xp: 5, tokens: 2 },
  care: { xp: 0, tokens: 0 },
  focus: { xp: 20, tokens: 8 },
  ai: { xp: 14, tokens: 0 },
  tokens: { xp: 0, tokens: 0 },
};

const DAILY_TOKEN_LIMIT = 180;
const MODULE_DAILY_LIMIT = 3;
const MODULE_TOTAL_DAILY_LIMIT = 12;
const MODULE_COOLDOWN_MS = 90 * 1000;

export const DEFAULT_PET_VITALS: PetVitals = {
  food: 78,
  energy: 64,
  play: 71,
  bond: 86,
};

export const PET_DAILY_GOALS: { id: PetDailyGoalId; target: number }[] = [
  { id: "checkin", target: 1 },
  { id: "lesson", target: 1 },
  { id: "care", target: 2 },
  { id: "module", target: 2 },
  { id: "focus", target: 1 },
];

export const PET_CARE_ACTIONS: Record<
  PetCareActionId,
  {
    tokenCost: number;
    xp: number;
    cooldownMs: number;
    dailyLimit: number;
    deltas: Partial<Record<PetVitalId, number>>;
    maxBefore?: Partial<Record<PetVitalId, number>>;
    minBefore?: Partial<Record<PetVitalId, number>>;
  }
> = {
  feed: {
    tokenCost: 6,
    xp: 4,
    cooldownMs: 45 * 1000,
    dailyLimit: 6,
    deltas: { food: 24, bond: 3 },
    maxBefore: { food: 92 },
  },
  play: {
    tokenCost: 0,
    xp: 7,
    cooldownMs: 75 * 1000,
    dailyLimit: 8,
    deltas: { play: 22, energy: -12, food: -4, bond: 6 },
    minBefore: { energy: 18, food: 12 },
    maxBefore: { play: 95 },
  },
  pet: {
    tokenCost: 0,
    xp: 3,
    cooldownMs: 25 * 1000,
    dailyLimit: 10,
    deltas: { bond: 12, play: 4 },
    maxBefore: { bond: 96 },
  },
  nap: {
    tokenCost: 0,
    xp: 4,
    cooldownMs: 90 * 1000,
    dailyLimit: 5,
    deltas: { energy: 30, food: -5, play: -2 },
    minBefore: { food: 8 },
    maxBefore: { energy: 90 },
  },
};

let careWriteQueue: Promise<unknown> = Promise.resolve();

function queueCareWrite<T>(operation: () => Promise<T>): Promise<T> {
  const run = careWriteQueue.then(operation, operation);
  careWriteQueue = run.catch(() => undefined);
  return run;
}

export function getPetCareDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampInt(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function clampStat(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function clampSignedStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isPetId(value: string): value is PetCatalogId {
  return PET_CATALOG.some((pet) => pet.id === value);
}

function isCareActionId(value: string): value is PetCareActionId {
  return value === "feed" || value === "play" || value === "pet" || value === "nap";
}

function isPetCareEventType(value: string): value is PetCareEventType {
  return (
    value === "checkin" ||
    value === "lesson" ||
    value === "task" ||
    value === "module" ||
    value === "care" ||
    value === "focus" ||
    value === "ai" ||
    value === "tokens"
  );
}

function eventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseIsoDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(fromDayKey: string, toDayKey: string) {
  const from = new Date(`${fromDayKey}T00:00:00`);
  const to = new Date(`${toDayKey}T00:00:00`);
  const delta = to.getTime() - from.getTime();
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.min(7, Math.floor(delta / 86_400_000));
}

function normalizeVitals(value: unknown): PetVitals {
  if (!value || typeof value !== "object") return { ...DEFAULT_PET_VITALS };
  const data = value as Partial<PetVitals>;
  return {
    food: clampStat(data.food, DEFAULT_PET_VITALS.food),
    energy: clampStat(data.energy, DEFAULT_PET_VITALS.energy),
    play: clampStat(data.play, DEFAULT_PET_VITALS.play),
    bond: clampStat(data.bond, DEFAULT_PET_VITALS.bond),
  };
}

function decayVitalsForDays(vitals: PetVitals, days: number) {
  if (days <= 0) return vitals;
  return {
    food: clampSignedStat(vitals.food - 9 * days),
    energy: clampSignedStat(vitals.energy - 6 * days),
    play: clampSignedStat(vitals.play - 8 * days),
    bond: clampSignedStat(vitals.bond - 3 * days),
  };
}

function normalizePetVitals(
  value: unknown,
  activePetId: PetCatalogId,
): Partial<Record<PetCatalogId, PetVitals>> {
  const petVitals: Partial<Record<PetCatalogId, PetVitals>> = {};
  if (value && typeof value === "object") {
    for (const [key, vitals] of Object.entries(value as Record<string, unknown>)) {
      if (isPetId(key)) petVitals[key] = normalizeVitals(vitals);
    }
  }
  if (!petVitals[activePetId]) petVitals[activePetId] = { ...DEFAULT_PET_VITALS };
  return petVitals;
}

function normalizeCareActionCounts(value: unknown): Partial<Record<PetCareActionId, number>> {
  const counts: Partial<Record<PetCareActionId, number>> = {};
  if (!value || typeof value !== "object") return counts;
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (isCareActionId(key)) counts[key] = clampInt(count);
  }
  return counts;
}

function normalizeEventCounts(value: unknown): Partial<Record<PetCareEventType, number>> {
  const counts: Partial<Record<PetCareEventType, number>> = {};
  if (!value || typeof value !== "object") return counts;
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (isPetCareEventType(key)) counts[key] = clampInt(count);
  }
  return counts;
}

function normalizeStringNumberRecord(value: unknown) {
  const record: Record<string, number> = {};
  if (!value || typeof value !== "object") return record;
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    const safeKey = key.trim().slice(0, 80);
    if (safeKey) record[safeKey] = clampInt(count);
  }
  return record;
}

function normalizeStringDateRecord(value: unknown) {
  const record: Record<string, string> = {};
  if (!value || typeof value !== "object") return record;
  for (const [key, dateValue] of Object.entries(value as Record<string, unknown>)) {
    const safeKey = key.trim().slice(0, 80);
    const date = parseIsoDate(dateValue);
    if (safeKey && date) record[safeKey] = date.toISOString();
  }
  return record;
}

function normalizeCareActionDates(value: unknown): Partial<Record<PetCareActionId, string>> {
  const record: Partial<Record<PetCareActionId, string>> = {};
  if (!value || typeof value !== "object") return record;
  for (const [key, dateValue] of Object.entries(value as Record<string, unknown>)) {
    const date = parseIsoDate(dateValue);
    if (isCareActionId(key) && date) record[key] = date.toISOString();
  }
  return record;
}

function normalizeDailyGoals(value: unknown): Partial<Record<PetDailyGoalId, boolean>> {
  const goals: Partial<Record<PetDailyGoalId, boolean>> = {};
  if (!value || typeof value !== "object") return goals;
  for (const goal of PET_DAILY_GOALS) {
    goals[goal.id] = Boolean((value as Record<string, unknown>)[goal.id]);
  }
  return goals;
}

function rolloverDay(state: PetCareState, now = new Date()) {
  const currentDay = getPetCareDayKey(now);
  if (state.dayKey === currentDay) return state;
  const elapsedDays = daysBetween(state.dayKey, currentDay);
  const petVitals: Partial<Record<PetCatalogId, PetVitals>> = {};

  for (const [petId, vitals] of Object.entries(state.petVitals)) {
    if (isPetId(petId) && vitals) {
      petVitals[petId] = decayVitalsForDays(vitals, elapsedDays);
    }
  }

  return {
    ...state,
    dayKey: currentDay,
    tokensToday: 0,
    tasksToday: 0,
    petVitals,
    careActionCountsToday: {},
    moduleActionCountsToday: {},
    eventCountsToday: {},
    dailyGoals: {},
  };
}

export function defaultPetCareState(activePetId: PetCatalogId = DEFAULT_PET_VARIANT): PetCareState {
  return {
    xp: 0,
    tokens: 0,
    tokensToday: 0,
    totalTokensEarned: 0,
    tasksCompleted: 0,
    tasksToday: 0,
    lessonsCompleted: 0,
    checkinStreak: 0,
    lastCheckinDate: null,
    lastFedAt: null,
    dayKey: getPetCareDayKey(),
    petXp: { [activePetId]: 0 },
    petVitals: { [activePetId]: { ...DEFAULT_PET_VITALS } },
    careActionCountsToday: {},
    moduleActionCountsToday: {},
    eventCountsToday: {},
    lastCareActionAt: {},
    lastModuleActionAt: {},
    dailyGoals: {},
    rewardedLessonIds: [],
    recentEvents: [],
  };
}

export function parsePetCareState(
  raw: string | undefined,
  activePetId: PetCatalogId = DEFAULT_PET_VARIANT,
): PetCareState {
  if (!raw?.trim()) return defaultPetCareState(activePetId);

  try {
    const data = JSON.parse(raw) as Partial<PetCareState>;
    const petXp: Partial<Record<PetCatalogId, number>> = {};
    for (const [key, value] of Object.entries(data.petXp ?? {})) {
      if (isPetId(key)) petXp[key] = clampInt(value);
    }
    if (petXp[activePetId] === undefined) petXp[activePetId] = 0;
    const petVitals = normalizePetVitals(data.petVitals, activePetId);

    const recentEvents = Array.isArray(data.recentEvents)
      ? data.recentEvents
          .filter((event): event is PetCareEvent => {
            return (
              typeof event === "object" &&
              event !== null &&
              "type" in event &&
              "label" in event &&
              "petId" in event &&
              isPetCareEventType(String(event.type)) &&
              isPetId(String(event.petId))
            );
          })
          .slice(0, 8)
      : [];

    return rolloverDay({
      xp: clampInt(data.xp),
      tokens: clampInt(data.tokens),
      tokensToday: clampInt(data.tokensToday),
      totalTokensEarned: clampInt(data.totalTokensEarned),
      tasksCompleted: clampInt(data.tasksCompleted),
      tasksToday: clampInt(data.tasksToday),
      lessonsCompleted: clampInt(data.lessonsCompleted),
      checkinStreak: clampInt(data.checkinStreak),
      lastCheckinDate: data.lastCheckinDate ?? null,
      lastFedAt: data.lastFedAt ?? null,
      dayKey: data.dayKey || getPetCareDayKey(),
      petXp,
      petVitals,
      careActionCountsToday: normalizeCareActionCounts(data.careActionCountsToday),
      moduleActionCountsToday: normalizeStringNumberRecord(data.moduleActionCountsToday),
      eventCountsToday: normalizeEventCounts(data.eventCountsToday),
      lastCareActionAt: normalizeCareActionDates(data.lastCareActionAt),
      lastModuleActionAt: normalizeStringDateRecord(data.lastModuleActionAt),
      dailyGoals: normalizeDailyGoals(data.dailyGoals),
      rewardedLessonIds: Array.isArray(data.rewardedLessonIds)
        ? [...new Set(data.rewardedLessonIds.map((id) => clampInt(id)).filter(Boolean))]
        : [],
      recentEvents,
    });
  } catch {
    return defaultPetCareState(activePetId);
  }
}

export function serializePetCareState(state: PetCareState) {
  return JSON.stringify(state);
}

export async function getPetCareState(activePetId: PetCatalogId = DEFAULT_PET_VARIANT) {
  const settings = await getAllSettings();
  return parsePetCareState(settings[PET_CARE_STATE_KEY], activePetId);
}

export async function savePetCareState(state: PetCareState) {
  await setSetting(PET_CARE_STATE_KEY, serializePetCareState(state));
}

export function getPetCareProgress(xp: number): PetCareProgress {
  const safeXp = clampInt(xp);
  let level = 1;

  for (const entry of PET_CARE_LEVELS) {
    if (safeXp >= entry.threshold) level = entry.level;
  }

  const current = PET_CARE_LEVELS[level - 1];
  const next = PET_CARE_LEVELS[Math.min(level, PET_CARE_LEVELS.length - 1)];
  const threshold = current.threshold;
  const nextThreshold = level >= MAX_LEVEL ? current.threshold : next.threshold;
  const xpForLevel = Math.max(1, nextThreshold - threshold);
  const xpInLevel = level >= MAX_LEVEL ? xpForLevel : Math.max(0, safeXp - threshold);

  return {
    level,
    threshold,
    nextThreshold,
    xpInLevel,
    xpForLevel,
    progress: level >= MAX_LEVEL ? 1 : Math.min(1, xpInLevel / xpForLevel),
    isMaxLevel: level >= MAX_LEVEL,
  };
}

export function getPetXp(state: PetCareState, petId: PetCatalogId) {
  return clampInt(state.petXp[petId]);
}

export function getPetVitals(state: PetCareState, petId: PetCatalogId): PetVitals {
  return normalizeVitals(state.petVitals[petId]);
}

export function getCompletedDailyGoalCount(state: PetCareState) {
  return getDailyGoalProgress(state).filter((goal) => goal.completed).length;
}

export function getDailyGoalProgress(state: PetCareState) {
  return PET_DAILY_GOALS.map((goal) => {
    const sourceType =
      goal.id === "lesson" ? "lesson" : goal.id === "checkin" ? "checkin" : goal.id;
    const progress =
      goal.id === "lesson"
        ? (state.eventCountsToday.lesson ?? 0) + (state.eventCountsToday.task ?? 0)
        : state.eventCountsToday[sourceType as PetCareEventType] ?? 0;

    return {
      ...goal,
      progress: Math.min(goal.target, progress),
      completed: progress >= goal.target || Boolean(state.dailyGoals[goal.id]),
    };
  });
}

function getDailyGoalState(
  type: PetCareEventType,
  current: Partial<Record<PetDailyGoalId, boolean>>,
  eventCounts: Partial<Record<PetCareEventType, number>>,
) {
  const next = { ...current };
  if (type === "checkin" && (eventCounts.checkin ?? 0) >= 1) next.checkin = true;
  if ((type === "lesson" || type === "task") && (eventCounts.lesson ?? 0) + (eventCounts.task ?? 0) >= 1) {
    next.lesson = true;
  }
  if (type === "care" && (eventCounts.care ?? 0) >= 2) next.care = true;
  if (type === "module" && (eventCounts.module ?? 0) >= 2) next.module = true;
  if (type === "focus" && (eventCounts.focus ?? 0) >= 1) next.focus = true;
  return next;
}

function canAddDailyTokens(state: PetCareState, tokens: number) {
  return Math.max(0, Math.min(tokens, DAILY_TOKEN_LIMIT - state.tokensToday));
}

function getCooldownRemaining(lastAt: string | undefined, cooldownMs: number, now: Date) {
  const lastDate = parseIsoDate(lastAt);
  if (!lastDate) return 0;
  const elapsed = now.getTime() - lastDate.getTime();
  return Math.max(0, cooldownMs - elapsed);
}

export function getPetUnlockLevel(petId: PetCatalogId) {
  return PET_CATALOG.find((pet) => pet.id === petId)?.unlockLevel ?? 1;
}

export function isPetUnlocked(petId: PetCatalogId, state: PetCareState) {
  return getPetCareProgress(state.xp).level >= getPetUnlockLevel(petId);
}

export function getUnlockedPetIds(state: PetCareState) {
  return PET_CATALOG.filter((pet) => isPetUnlocked(pet.id, state)).map((pet) => pet.id);
}

function emitCareUpdated(result: PetCareAwardResult) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PET_CARE_UPDATED_EVENT, { detail: result }));
}

async function awardPetCareNow({
  type,
  petId = DEFAULT_PET_VARIANT,
  label,
  lessonId,
  moduleKey,
  xp,
  tokens,
  dailyLimit: aiDailyLimitInput,
  baseState,
}: AwardPetCareInput): Promise<PetCareAwardResult> {
  const now = new Date();
  const state = baseState ?? (await getPetCareState(petId));
  const current = rolloverDay(state, now);
  const levelBefore = getPetCareProgress(current.xp).level;
  const petLevelBefore = getPetCareProgress(getPetXp(current, petId)).level;
  const unlockedBefore = new Set(getUnlockedPetIds(current));

  if (type === "lesson" && lessonId && current.rewardedLessonIds.includes(lessonId)) {
    const skipped = {
      state: current,
      event: null,
      skipped: true,
      reason: "lesson_already_rewarded" as const,
      levelBefore,
      levelAfter: levelBefore,
      petLevelBefore,
      petLevelAfter: petLevelBefore,
      unlockedPets: [],
    };
    emitCareUpdated(skipped);
    return skipped;
  }

  const moduleKeySafe = moduleKey?.trim().slice(0, 80) || undefined;
  if (type === "module" && moduleKeySafe) {
    const moduleCount = current.moduleActionCountsToday[moduleKeySafe] ?? 0;
    const totalModuleCount = Object.values(current.moduleActionCountsToday).reduce(
      (sum, value) => sum + clampInt(value),
      0,
    );
    if (moduleCount >= MODULE_DAILY_LIMIT || totalModuleCount >= MODULE_TOTAL_DAILY_LIMIT) {
      const skipped = {
        state: current,
        event: null,
        skipped: true,
        reason: "daily_limit" as const,
        levelBefore,
        levelAfter: levelBefore,
        petLevelBefore,
        petLevelAfter: petLevelBefore,
        unlockedPets: [],
      };
      emitCareUpdated(skipped);
      return skipped;
    }

    const cooldownRemainingMs = getCooldownRemaining(
      current.lastModuleActionAt[moduleKeySafe],
      MODULE_COOLDOWN_MS,
      now,
    );
    if (cooldownRemainingMs > 0) {
      const skipped = {
        state: current,
        event: null,
        skipped: true,
        reason: "cooldown" as const,
        cooldownRemainingMs,
        levelBefore,
        levelAfter: levelBefore,
        petLevelBefore,
        petLevelAfter: petLevelBefore,
        unlockedPets: [],
      };
      emitCareUpdated(skipped);
      return skipped;
    }
  }

  if (type === "ai") {
    const aiDailyLimit = dailyLimitFromInput(aiDailyLimitInput);
    if ((current.eventCountsToday.ai ?? 0) >= aiDailyLimit) {
      const skipped = {
        state: current,
        event: null,
        skipped: true,
        reason: "daily_limit" as const,
        levelBefore,
        levelAfter: levelBefore,
        petLevelBefore,
        petLevelAfter: petLevelBefore,
        unlockedPets: [],
      };
      emitCareUpdated(skipped);
      return skipped;
    }
  }

  const award = AWARDS[type];
  const streakBonus = type === "checkin" ? Math.min(20, Math.max(0, current.checkinStreak - 1) * 2) : 0;
  const gainedXp = clampInt(xp ?? award.xp) + streakBonus;
  const gainedTokens = canAddDailyTokens(current, clampInt(tokens ?? award.tokens) + (type === "checkin" ? Math.min(15, Math.max(0, current.checkinStreak - 1)) : 0));
  const at = now.toISOString();
  const event: PetCareEvent = {
    id: eventId(),
    type,
    label: label || type,
    petId,
    xp: gainedXp,
    tokens: gainedTokens,
    at,
  };

  const nextPetXp = getPetXp(current, petId) + gainedXp;
  const nextPetVitals =
    type === "ai"
      ? applyVitalDeltas(getPetVitals(current, petId), { play: 4, bond: 8, energy: -3 })
      : current.petVitals[petId];
  const nextEventCounts = {
    ...current.eventCountsToday,
    [type]: (current.eventCountsToday[type] ?? 0) + 1,
  };
  const next: PetCareState = {
    ...current,
    xp: current.xp + gainedXp,
    tokens: current.tokens + gainedTokens,
    tokensToday: current.tokensToday + gainedTokens,
    totalTokensEarned: current.totalTokensEarned + gainedTokens,
    tasksCompleted:
      current.tasksCompleted + (type === "lesson" || type === "task" ? 1 : 0),
    tasksToday: current.tasksToday + (type === "lesson" || type === "task" ? 1 : 0),
    lessonsCompleted: current.lessonsCompleted + (type === "lesson" ? 1 : 0),
    lastFedAt: at,
    eventCountsToday: nextEventCounts,
    moduleActionCountsToday:
      type === "module" && moduleKeySafe
        ? {
            ...current.moduleActionCountsToday,
            [moduleKeySafe]: (current.moduleActionCountsToday[moduleKeySafe] ?? 0) + 1,
          }
        : current.moduleActionCountsToday,
    lastModuleActionAt:
      type === "module" && moduleKeySafe
        ? {
            ...current.lastModuleActionAt,
            [moduleKeySafe]: at,
          }
        : current.lastModuleActionAt,
    dailyGoals: getDailyGoalState(type, current.dailyGoals, nextEventCounts),
    petXp: {
      ...current.petXp,
      [petId]: nextPetXp,
    },
    petVitals:
      type === "ai" && nextPetVitals
        ? {
            ...current.petVitals,
            [petId]: nextPetVitals,
          }
        : current.petVitals,
    rewardedLessonIds:
      type === "lesson" && lessonId
        ? [...current.rewardedLessonIds, lessonId]
        : current.rewardedLessonIds,
    recentEvents: [event, ...current.recentEvents].slice(0, 8),
  };

  await savePetCareState(next);

  const levelAfter = getPetCareProgress(next.xp).level;
  const petLevelAfter = getPetCareProgress(nextPetXp).level;
  const unlockedPets = getUnlockedPetIds(next).filter((id) => !unlockedBefore.has(id));
  const result = {
    state: next,
    event,
    skipped: false,
    levelBefore,
    levelAfter,
    petLevelBefore,
    petLevelAfter,
    unlockedPets,
  };
  emitCareUpdated(result);
  return result;
}

function dailyLimitFromInput(value: unknown) {
  return Math.max(1, Math.min(10, clampInt(value, 3)));
}

export async function awardPetCare(input: AwardPetCareInput): Promise<PetCareAwardResult> {
  return queueCareWrite(() => awardPetCareNow(input));
}

function applyVitalDeltas(vitals: PetVitals, deltas: Partial<Record<PetVitalId, number>>) {
  return {
    food: clampSignedStat(vitals.food + (deltas.food ?? 0)),
    energy: clampSignedStat(vitals.energy + (deltas.energy ?? 0)),
    play: clampSignedStat(vitals.play + (deltas.play ?? 0)),
    bond: clampSignedStat(vitals.bond + (deltas.bond ?? 0)),
  };
}

function getBlockedStatReason(
  vitals: PetVitals,
  rule: (typeof PET_CARE_ACTIONS)[PetCareActionId],
): PetCareActionSkipReason | null {
  for (const [vital, max] of Object.entries(rule.maxBefore ?? {})) {
    if (vitals[vital as PetVitalId] >= Number(max)) return "stat_full";
  }

  for (const [vital, min] of Object.entries(rule.minBefore ?? {})) {
    if (vitals[vital as PetVitalId] < Number(min)) return "stat_low";
  }

  return null;
}

function buildSkippedCareActionResult(
  current: PetCareState,
  petId: PetCatalogId,
  action: PetCareActionId,
  reason: PetCareActionSkipReason,
  cooldownRemainingMs = 0,
): PetCareActionResult {
  const levelBefore = getPetCareProgress(current.xp).level;
  const petLevelBefore = getPetCareProgress(getPetXp(current, petId)).level;
  return {
    state: current,
    action,
    vitals: getPetVitals(current, petId),
    event: null,
    skipped: true,
    reason,
    cooldownRemainingMs,
    tokenCost: PET_CARE_ACTIONS[action].tokenCost,
    xp: 0,
    levelBefore,
    levelAfter: levelBefore,
    petLevelBefore,
    petLevelAfter: petLevelBefore,
    unlockedPets: [],
  };
}

async function applyPetCareActionNow({
  petId = DEFAULT_PET_VARIANT,
  action,
  label,
}: ApplyPetCareActionInput): Promise<PetCareActionResult> {
  const now = new Date();
  const state = await getPetCareState(petId);
  const current = rolloverDay(state, now);
  const rule = PET_CARE_ACTIONS[action];
  const vitals = getPetVitals(current, petId);

  const cooldownRemainingMs = getCooldownRemaining(
    current.lastCareActionAt[action],
    rule.cooldownMs,
    now,
  );
  if (cooldownRemainingMs > 0) {
    const skipped = buildSkippedCareActionResult(
      current,
      petId,
      action,
      "cooldown",
      cooldownRemainingMs,
    );
    emitCareUpdated({
      state: skipped.state,
      event: null,
      skipped: true,
      reason: "cooldown",
      cooldownRemainingMs,
      levelBefore: skipped.levelBefore,
      levelAfter: skipped.levelAfter,
      petLevelBefore: skipped.petLevelBefore,
      petLevelAfter: skipped.petLevelAfter,
      unlockedPets: [],
    });
    return skipped;
  }

  if ((current.careActionCountsToday[action] ?? 0) >= rule.dailyLimit) {
    const skipped = buildSkippedCareActionResult(current, petId, action, "daily_limit");
    emitCareUpdated({
      state: skipped.state,
      event: null,
      skipped: true,
      reason: "daily_limit",
      levelBefore: skipped.levelBefore,
      levelAfter: skipped.levelAfter,
      petLevelBefore: skipped.petLevelBefore,
      petLevelAfter: skipped.petLevelAfter,
      unlockedPets: [],
    });
    return skipped;
  }

  if (current.tokens < rule.tokenCost) {
    const skipped = buildSkippedCareActionResult(current, petId, action, "not_enough_tokens");
    emitCareUpdated({
      state: skipped.state,
      event: null,
      skipped: true,
      reason: "not_enough_tokens",
      levelBefore: skipped.levelBefore,
      levelAfter: skipped.levelAfter,
      petLevelBefore: skipped.petLevelBefore,
      petLevelAfter: skipped.petLevelAfter,
      unlockedPets: [],
    });
    return skipped;
  }

  const statReason = getBlockedStatReason(vitals, rule);
  if (statReason) {
    const skipped = buildSkippedCareActionResult(current, petId, action, statReason);
    emitCareUpdated({
      state: skipped.state,
      event: null,
      skipped: true,
      reason: statReason,
      levelBefore: skipped.levelBefore,
      levelAfter: skipped.levelAfter,
      petLevelBefore: skipped.petLevelBefore,
      petLevelAfter: skipped.petLevelAfter,
      unlockedPets: [],
    });
    return skipped;
  }

  const levelBefore = getPetCareProgress(current.xp).level;
  const petLevelBefore = getPetCareProgress(getPetXp(current, petId)).level;
  const unlockedBefore = new Set(getUnlockedPetIds(current));
  const at = now.toISOString();
  const nextVitals = applyVitalDeltas(vitals, rule.deltas);
  const event: PetCareEvent = {
    id: eventId(),
    type: "care",
    label: label || action,
    petId,
    xp: rule.xp,
    tokens: -rule.tokenCost,
    at,
  };
  const nextEventCounts = {
    ...current.eventCountsToday,
    care: (current.eventCountsToday.care ?? 0) + 1,
  };
  const nextPetXp = getPetXp(current, petId) + rule.xp;
  const next: PetCareState = {
    ...current,
    xp: current.xp + rule.xp,
    tokens: Math.max(0, current.tokens - rule.tokenCost),
    lastFedAt: at,
    petXp: {
      ...current.petXp,
      [petId]: nextPetXp,
    },
    petVitals: {
      ...current.petVitals,
      [petId]: nextVitals,
    },
    careActionCountsToday: {
      ...current.careActionCountsToday,
      [action]: (current.careActionCountsToday[action] ?? 0) + 1,
    },
    lastCareActionAt: {
      ...current.lastCareActionAt,
      [action]: at,
    },
    eventCountsToday: nextEventCounts,
    dailyGoals: getDailyGoalState("care", current.dailyGoals, nextEventCounts),
    recentEvents: [event, ...current.recentEvents].slice(0, 8),
  };

  await savePetCareState(next);

  const levelAfter = getPetCareProgress(next.xp).level;
  const petLevelAfter = getPetCareProgress(nextPetXp).level;
  const unlockedPets = getUnlockedPetIds(next).filter((id) => !unlockedBefore.has(id));
  const result: PetCareActionResult = {
    state: next,
    action,
    vitals: nextVitals,
    event,
    skipped: false,
    tokenCost: rule.tokenCost,
    xp: rule.xp,
    levelBefore,
    levelAfter,
    petLevelBefore,
    petLevelAfter,
    unlockedPets,
  };

  emitCareUpdated({
    state: next,
    event,
    skipped: false,
    levelBefore,
    levelAfter,
    petLevelBefore,
    petLevelAfter,
    unlockedPets,
  });
  return result;
}

export async function applyPetCareAction(input: ApplyPetCareActionInput) {
  return queueCareWrite(() => applyPetCareActionNow(input));
}

export async function dailyPetCheckin(petId: PetCatalogId = DEFAULT_PET_VARIANT) {
  return queueCareWrite(() => dailyPetCheckinNow(petId));
}

async function dailyPetCheckinNow(petId: PetCatalogId = DEFAULT_PET_VARIANT) {
  const now = new Date();
  const state = await getPetCareState(petId);
  const current = rolloverDay(state, now);
  const today = getPetCareDayKey(now);
  const levelBefore = getPetCareProgress(current.xp).level;
  const petLevelBefore = getPetCareProgress(getPetXp(current, petId)).level;

  if (current.lastCheckinDate === today) {
    const skipped = {
      state: current,
      event: null,
      skipped: true,
      reason: "already_checked_in" as const,
      levelBefore,
      levelAfter: levelBefore,
      petLevelBefore,
      petLevelAfter: petLevelBefore,
      unlockedPets: [],
    };
    emitCareUpdated(skipped);
    return skipped;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const streak =
    current.lastCheckinDate === getPetCareDayKey(yesterday) ? current.checkinStreak + 1 : 1;

  const withCheckin = {
    ...current,
    checkinStreak: streak,
    lastCheckinDate: today,
  };

  return awardPetCareNow({
    type: "checkin",
    petId,
    label: "Daily check-in",
    baseState: withCheckin,
  });
}
