import {
  ArrowCounterClockwiseIcon,
  BatteryChargingIcon,
  BellRingingIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  CoffeeIcon,
  CookieIcon,
  DropIcon,
  ForkKnifeIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PawPrintIcon,
  PlayIcon,
  PuzzlePieceIcon,
  QuestionIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SmileyIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import {
  PET_CATALOG,
  PET_PLUGINS,
  serializePetPlugins,
  type PetCatalogId,
  type PetCatalogPet,
  type PetPluginId,
} from "@/lib/pets";
import { PetSprite } from "@/components/pets/PetSprite";

interface PetsProps {
  className?: string;
}

type FilterId = "all" | "official" | "catalog";
type PetMood = "idle" | "thinking" | "wave" | "hop";

const COPY = {
  en: {
    title: "Pets",
    subtitle: "Choose a resident companion and enable the playful pet modules",
    residentPet: "Resident pet",
    residentPetDescription: "Keep the pet visible across the app. Drag it anywhere while watching.",
    enabled: "Enabled",
    disabled: "Disabled",
    choosePet: "Pet library",
    choosePetDescription: "Built-in OpenPets characters and catalog pets are ready to select.",
    searchPlaceholder: "Search pets...",
    all: "All",
    official: "Official",
    catalog: "Catalog",
    selected: "Selected",
    selectPet: "Use pet",
    protected: "Protected",
    currentCompanion: "Current companion",
    preview: "Preview",
    thinking: "Thinking",
    happy: "Happy",
    wave: "Wave",
    sourceBuiltIn: "Built-in",
    sourceOfficial: "Official",
    sourceCatalog: "Catalog",
    moduleTitle: "Official pet modules",
    moduleDescription: "OpenPets-style features are grouped here so the pet stays playful without black control boxes.",
    activeModules: "{count} active",
    bundled: "Bundled",
    optional: "Optional",
    virtualStats: "Virtual pet stats",
    food: "Food",
    energy: "Energy",
    play: "Play",
    bond: "Bond",
    feed: "Feed snack",
    playGame: "Play",
    pet: "Pet",
    nap: "Nap",
    focusTimer: "Focus timer",
    startFocus: "Start",
    pauseFocus: "Pause",
    resetFocus: "Reset",
    reminderQueue: "Next reminder",
    reminderSoon: "Stretch break in 25 min",
    waterStatus: "Hydration",
    waterSoon: "Drink water every 45 min",
    moodStatus: "Mood check-in",
    moodGood: "Ready for a gentle check-in",
    routineStatus: "Daily routine",
    routineReady: "Morning and evening nudges enabled",
    launchStatus: "Launch buddy",
    launchReady: "Checklist mode available",
    fortuneStatus: "Tiny fortunes",
    fortuneReady: "Ask for a fun answer from the pet",
    noPets: "No pets match your search.",
    remindersPlugin: "Reminders",
    remindersPluginDescription: "Quick due and missed reminders with snooze and done actions.",
    virtualPetPlugin: "Virtual Pet",
    virtualPetPluginDescription: "Track food, energy, play, and bond like a small desktop companion.",
    focusBuddyPlugin: "Focus Buddy",
    focusBuddyPluginDescription: "A pet-led focus timer for work sessions and breaks.",
    waterReminderPlugin: "Water Reminder",
    waterReminderPluginDescription: "Gentle hydration nudges on a configurable cadence.",
    dayRoutinePlugin: "Day Routine",
    dayRoutinePluginDescription: "Morning and evening check-ins from your resident pet.",
    moodCheckInPlugin: "Mood Check-in",
    moodCheckInPluginDescription: "A lightweight mood log and friendly check-in loop.",
    launchBuddyPlugin: "Launch Buddy",
    launchBuddyPluginDescription: "Checklist-style help when you are preparing to publish or ship.",
    magic8BallPlugin: "Magic 8 Ball",
    magic8BallPluginDescription: "Ask the pet a question and get a playful answer.",
    fortuneCookiePlugin: "Fortune Cookie",
    fortuneCookiePluginDescription: "Periodic or command-triggered fortunes.",
  },
  zh: {
    title: "宠物",
    subtitle: "选择一个常驻宠物，并启用可玩的宠物功能模块",
    residentPet: "常驻宠物",
    residentPetDescription: "让宠物一直显示在应用里，看视频时也可以自由拖拽移动。",
    enabled: "已开启",
    disabled: "已关闭",
    choosePet: "宠物库",
    choosePetDescription: "内置 OpenPets 角色和目录宠物都可以直接选择。",
    searchPlaceholder: "搜索宠物...",
    all: "全部",
    official: "官方",
    catalog: "目录",
    selected: "已选择",
    selectPet: "使用宠物",
    protected: "受保护",
    currentCompanion: "当前宠物",
    preview: "动作预览",
    thinking: "思考",
    happy: "开心",
    wave: "挥手",
    sourceBuiltIn: "内置",
    sourceOfficial: "官方",
    sourceCatalog: "目录",
    moduleTitle: "官方宠物功能",
    moduleDescription: "把 OpenPets 风格功能集中放在这里，宠物保持轻量可玩，不再出现黑色控制框。",
    activeModules: "已启用 {count} 个",
    bundled: "内置",
    optional: "可选",
    virtualStats: "虚拟宠物状态",
    food: "食物",
    energy: "能量",
    play: "玩耍",
    bond: "羁绊",
    feed: "喂零食",
    playGame: "玩一下",
    pet: "抚摸",
    nap: "休息",
    focusTimer: "专注计时",
    startFocus: "开始",
    pauseFocus: "暂停",
    resetFocus: "重置",
    reminderQueue: "下次提醒",
    reminderSoon: "25 分钟后伸展休息",
    waterStatus: "饮水状态",
    waterSoon: "每 45 分钟提醒喝水",
    moodStatus: "情绪自检",
    moodGood: "可以进行一次轻量自检",
    routineStatus: "日常习惯",
    routineReady: "早晚提醒已准备",
    launchStatus: "发布伙伴",
    launchReady: "清单模式可用",
    fortuneStatus: "趣味回答",
    fortuneReady: "可以向宠物提问或抽签",
    noPets: "没有找到匹配的宠物。",
    remindersPlugin: "提醒",
    remindersPluginDescription: "提供到期和错过提醒，支持稍后提醒与完成操作。",
    virtualPetPlugin: "虚拟宠物",
    virtualPetPluginDescription: "像电子宠物一样跟踪食物、能量、玩耍和羁绊。",
    focusBuddyPlugin: "专注伙伴",
    focusBuddyPluginDescription: "由宠物陪伴的专注计时器，用于工作周期和休息。",
    waterReminderPlugin: "饮水提醒",
    waterReminderPluginDescription: "按固定节奏给出温和的喝水提醒。",
    dayRoutinePlugin: "早晚日常",
    dayRoutinePluginDescription: "让常驻宠物提醒早晨和夜晚的日常检查。",
    moodCheckInPlugin: "情绪自检",
    moodCheckInPluginDescription: "轻量记录心情，并由宠物做友好的状态确认。",
    launchBuddyPlugin: "发布伙伴",
    launchBuddyPluginDescription: "准备发布或交付时，宠物提供清单式辅助。",
    magic8BallPlugin: "魔法 8 号球",
    magic8BallPluginDescription: "向宠物提问，得到一个有趣的随机回答。",
    fortuneCookiePlugin: "幸运饼干",
    fortuneCookiePluginDescription: "定期或主动触发的趣味签语。",
  },
  fr: {
    title: "Compagnons",
    subtitle: "Choisissez un compagnon resident et activez les modules ludiques",
    residentPet: "Compagnon resident",
    residentPetDescription: "Gardez le compagnon visible dans l'application. Vous pouvez le deplacer pendant la lecture.",
    enabled: "Active",
    disabled: "Desactive",
    choosePet: "Bibliotheque",
    choosePetDescription: "Les personnages OpenPets integres et les compagnons du catalogue sont prets.",
    searchPlaceholder: "Rechercher...",
    all: "Tous",
    official: "Officiels",
    catalog: "Catalogue",
    selected: "Selectionne",
    selectPet: "Utiliser",
    protected: "Protege",
    currentCompanion: "Compagnon actuel",
    preview: "Apercu",
    thinking: "Reflexion",
    happy: "Heureux",
    wave: "Salut",
    sourceBuiltIn: "Integre",
    sourceOfficial: "Officiel",
    sourceCatalog: "Catalogue",
    moduleTitle: "Modules officiels",
    moduleDescription: "Les fonctions type OpenPets sont regroupees ici, sans panneau noir autour du compagnon.",
    activeModules: "{count} actifs",
    bundled: "Integre",
    optional: "Optionnel",
    virtualStats: "Etat virtuel",
    food: "Nourriture",
    energy: "Energie",
    play: "Jeu",
    bond: "Lien",
    feed: "Nourrir",
    playGame: "Jouer",
    pet: "Caresser",
    nap: "Repos",
    focusTimer: "Minuteur",
    startFocus: "Demarrer",
    pauseFocus: "Pause",
    resetFocus: "Reset",
    reminderQueue: "Prochain rappel",
    reminderSoon: "Pause etirement dans 25 min",
    waterStatus: "Hydratation",
    waterSoon: "Boire toutes les 45 min",
    moodStatus: "Humeur",
    moodGood: "Pret pour un petit check-in",
    routineStatus: "Routine",
    routineReady: "Rappels matin et soir prets",
    launchStatus: "Launch buddy",
    launchReady: "Mode checklist disponible",
    fortuneStatus: "Fortunes",
    fortuneReady: "Demandez une reponse amusante",
    noPets: "Aucun compagnon ne correspond.",
    remindersPlugin: "Rappels",
    remindersPluginDescription: "Rappels rapides avec actions repousser et terminer.",
    virtualPetPlugin: "Compagnon virtuel",
    virtualPetPluginDescription: "Suit nourriture, energie, jeu et lien.",
    focusBuddyPlugin: "Focus Buddy",
    focusBuddyPluginDescription: "Minuteur de concentration accompagne par le compagnon.",
    waterReminderPlugin: "Rappel d'eau",
    waterReminderPluginDescription: "Rappels doux pour boire regulierement.",
    dayRoutinePlugin: "Routine quotidienne",
    dayRoutinePluginDescription: "Check-ins matin et soir par le compagnon resident.",
    moodCheckInPlugin: "Humeur",
    moodCheckInPluginDescription: "Journal d'humeur leger et check-in amical.",
    launchBuddyPlugin: "Launch Buddy",
    launchBuddyPluginDescription: "Aide sous forme de checklist avant publication.",
    magic8BallPlugin: "Magic 8 Ball",
    magic8BallPluginDescription: "Posez une question au compagnon.",
    fortuneCookiePlugin: "Fortune Cookie",
    fortuneCookiePluginDescription: "Petites fortunes periodiques ou declenchees.",
  },
} as const satisfies Record<string, Record<string, string>>;

const FILTERS: FilterId[] = ["all", "official", "catalog"];
const PET_ACTIONS: { mood: PetMood; key: "thinking" | "happy" | "wave" }[] = [
  { mood: "thinking", key: "thinking" },
  { mood: "hop", key: "happy" },
  { mood: "wave", key: "wave" },
];

const PLUGIN_ICONS: Record<PetPluginId, typeof BellRingingIcon> = {
  "openpets.reminders": BellRingingIcon,
  "openpets.virtual-pet": HeartIcon,
  "openpets.focus-buddy": TimerIcon,
  "openpets.water-reminder": DropIcon,
  "openpets.day-routine": CalendarCheckIcon,
  "openpets.mood-check-in": SmileyIcon,
  "openpets.launch-buddy": RocketLaunchIcon,
  "openpets.magic-8-ball": QuestionIcon,
  "openpets.fortune-cookie": CookieIcon,
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "block size-4.5 rounded-full bg-background shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

function StatBar({ label, value, icon: Icon }: { label: string; value: number; icon: typeof HeartIcon }) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

function sourceLabel(
  pet: PetCatalogPet,
  copy: { sourceBuiltIn: string; sourceOfficial: string; sourceCatalog: string },
) {
  if (pet.category === "built-in") return copy.sourceBuiltIn;
  if (pet.category === "official") return copy.sourceOfficial;
  return copy.sourceCatalog;
}

export function Pets({ className }: PetsProps) {
  const { language } = useI18n();
  const { settings, update } = useSettings();
  const copy = COPY[language];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [previewMood, setPreviewMood] = useState<PetMood>("idle");
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [petStats, setPetStats] = useState({ food: 78, energy: 64, play: 71, bond: 86 });

  const activePluginIds = settings.pet_plugins_enabled;
  const selectedPet = PET_CATALOG.find((pet) => pet.id === settings.pet_variant) ?? PET_CATALOG[0];

  const pets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return PET_CATALOG.filter((pet) => {
      if (filter === "official" && pet.category !== "built-in" && pet.category !== "official") return false;
      if (filter === "catalog" && pet.category !== "catalog") return false;
      if (!normalizedQuery) return true;
      return `${pet.displayName} ${pet.description} ${pet.id}`.toLowerCase().includes(normalizedQuery);
    });
  }, [filter, query]);

  const activePluginCount = activePluginIds.length;
  const virtualPetEnabled = activePluginIds.includes("openpets.virtual-pet");
  const focusEnabled = activePluginIds.includes("openpets.focus-buddy");

  useEffect(() => {
    if (!focusRunning || !focusEnabled) return;

    const timer = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setFocusRunning(false);
          setPreviewMood("wave");
          return 25 * 60;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [focusEnabled, focusRunning]);

  const selectPet = (petId: PetCatalogId) => {
    void update("pet_variant", petId);
    if (!settings.pet_enabled) void update("pet_enabled", "true");
    setPreviewMood("wave");
  };

  const togglePlugin = (pluginId: PetPluginId, enabled: boolean) => {
    const next = enabled
      ? [...activePluginIds, pluginId]
      : activePluginIds.filter((id) => id !== pluginId);
    void update("pet_plugins_enabled", serializePetPlugins(next));
  };

  const bumpStat = (key: keyof typeof petStats, amount: number) => {
    setPetStats((current) => ({
      ...current,
      [key]: Math.min(100, current[key] + amount),
    }));
    setPreviewMood(key === "energy" ? "idle" : "hop");
  };

  return (
    <div className={cn("mx-auto max-w-7xl px-6 py-8", className)}>
      <div
        className="mb-8 flex flex-wrap items-center justify-between gap-4"
        style={{ animation: `card-in 350ms ${EASE_OUT} both` }}
      >
        <div className="flex items-center gap-3">
          <div className="squircle flex size-10 items-center justify-center bg-primary/15">
            <PawPrintIcon className="size-5 text-primary" weight="bold" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">{copy.title}</h2>
            <p className="font-sans text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/35 px-3 py-2 text-xs font-semibold text-muted-foreground">
          <PuzzlePieceIcon className="size-4 text-primary" />
          {copy.activeModules.replace("{count}", String(activePluginCount))}
        </div>
      </div>

      <section
        className="relative mb-5 overflow-hidden rounded-xl border border-border/70 bg-card"
        style={{ animation: `card-in 350ms ${EASE_OUT} 60ms both` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <PawPrintIcon className="size-4" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground">{copy.residentPet}</h3>
              <p className="font-sans text-xs text-muted-foreground">{copy.residentPetDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {settings.pet_enabled ? copy.enabled : copy.disabled}
            </span>
            <Toggle
              checked={settings.pet_enabled}
              onChange={(value) => void update("pet_enabled", String(value))}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <section
          className="relative overflow-hidden rounded-xl border border-border/70 bg-card"
          style={{ animation: `card-in 350ms ${EASE_OUT} 120ms both` }}
        >
          <div className="border-b border-border/70 p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">{copy.choosePet}</h3>
                <p className="mt-1 font-sans text-xs text-muted-foreground">{copy.choosePetDescription}</p>
              </div>
              <div className="flex gap-1 rounded-lg border border-border/70 bg-secondary/35 p-1">
                {FILTERS.map((filterId) => (
                  <button
                    key={filterId}
                    type="button"
                    onClick={() => setFilter(filterId)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                      filter === filterId
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {copy[filterId]}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-primary/50">
              <MagnifyingGlassIcon className="size-4 shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>

          <div className="grid max-h-[640px] grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3 overflow-y-auto p-5">
            {pets.map((pet) => {
              const selected = settings.pet_variant === pet.id;

              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => selectPet(pet.id)}
                  className={cn(
                    "group relative min-h-48 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    selected
                      ? "border-primary/70 bg-primary/10"
                      : "border-border bg-secondary/20 hover:border-muted-foreground/35 hover:bg-secondary/40",
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      {sourceLabel(pet, copy)}
                    </span>
                    {selected && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                        <CheckCircleIcon className="size-3.5" weight="fill" />
                        {copy.selected}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-heading text-base font-bold text-foreground">
                        {pet.displayName}
                      </h4>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {pet.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {pet.featured && (
                          <span className="rounded-full bg-primary/12 px-2 py-1 text-[11px] font-semibold text-primary">
                            {copy.official}
                          </span>
                        )}
                        {pet.protected && (
                          <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                            {copy.protected}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative flex h-28 w-24 shrink-0 items-end justify-center">
                      <PetSprite
                        variantId={pet.id}
                        state={selected ? "wave" : "idle"}
                        width={86}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {pets.length === 0 && (
            <div className="px-5 pb-5 text-sm text-muted-foreground">{copy.noPets}</div>
          )}
        </section>

        <aside
          className="relative overflow-hidden rounded-xl border border-border/70 bg-card"
          style={{ animation: `card-in 350ms ${EASE_OUT} 180ms both` }}
        >
          <div className="border-b border-border/70 p-5">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{copy.currentCompanion}</p>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate font-heading text-xl font-bold text-foreground">
                  {selectedPet.displayName}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedPet.description}</p>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {sourceLabel(selectedPet, copy)}
              </span>
            </div>
          </div>

          <div className="flex min-h-72 items-end justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(200,241,53,0.13),transparent_38%)] p-8">
            <PetSprite
              key={`${selectedPet.id}-${previewMood}`}
              variantId={selectedPet.id}
              state={previewMood === "hop" ? "hop" : previewMood}
              width={154}
            />
          </div>

          <div className="border-t border-border/70 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-heading text-sm font-bold text-foreground">{copy.preview}</h4>
              <button
                type="button"
                onClick={() => setPreviewMood("idle")}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={copy.resetFocus}
              >
                <ArrowCounterClockwiseIcon className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PET_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => setPreviewMood(action.mood)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                    previewMood === action.mood
                      ? "border-primary/70 bg-primary/10 text-primary"
                      : "border-border bg-secondary/25 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copy[action.key]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => selectPet(selectedPet.id)}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copy.selectPet}
            </button>
          </div>
        </aside>
      </div>

      <section
        className="mt-5 rounded-xl border border-border/70 bg-card"
        style={{ animation: `card-in 350ms ${EASE_OUT} 240ms both` }}
      >
        <div className="border-b border-border/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground">{copy.moduleTitle}</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {copy.moduleDescription}
              </p>
            </div>
            <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {copy.activeModules.replace("{count}", String(activePluginCount))}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PET_PLUGINS.map((plugin) => {
              const Icon = PLUGIN_ICONS[plugin.id];
              const checked = activePluginIds.includes(plugin.id);

              return (
                <article
                  key={plugin.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    checked ? "border-primary/45 bg-primary/8" : "border-border bg-secondary/20",
                  )}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Icon className="size-4.5" weight={checked ? "fill" : "regular"} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-foreground">
                          {copy[plugin.nameKey]}
                        </h4>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          {plugin.bundled ? copy.bundled : copy.optional}
                        </p>
                      </div>
                    </div>
                    <Toggle checked={checked} onChange={(value) => togglePlugin(plugin.id, value)} />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {copy[plugin.descriptionKey]}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className={cn("rounded-xl border border-border bg-secondary/20 p-4", !virtualPetEnabled && "opacity-55")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-heading text-sm font-bold text-foreground">{copy.virtualStats}</h4>
                <HeartIcon className="size-4 text-primary" weight={virtualPetEnabled ? "fill" : "regular"} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <StatBar label={copy.food} value={petStats.food} icon={ForkKnifeIcon} />
                <StatBar label={copy.energy} value={petStats.energy} icon={BatteryChargingIcon} />
                <StatBar label={copy.play} value={petStats.play} icon={SmileyIcon} />
                <StatBar label={copy.bond} value={petStats.bond} icon={HeartIcon} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("food", 8)}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.feed}
                </button>
                <button
                  type="button"
                  disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("play", 8)}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.playGame}
                </button>
                <button
                  type="button"
                  disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("bond", 6)}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.pet}
                </button>
                <button
                  type="button"
                  disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("energy", 10)}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.nap}
                </button>
              </div>
            </div>

            <div className={cn("rounded-xl border border-border bg-secondary/20 p-4", !focusEnabled && "opacity-55")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-heading text-sm font-bold text-foreground">{copy.focusTimer}</h4>
                  <p className="text-xs text-muted-foreground">{formatTimer(focusSeconds)}</p>
                </div>
                <TimerIcon className="size-4 text-primary" weight={focusRunning ? "fill" : "regular"} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={!focusEnabled}
                  onClick={() => setFocusRunning(true)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PlayIcon className="size-3.5" weight="fill" />
                  {copy.startFocus}
                </button>
                <button
                  type="button"
                  disabled={!focusEnabled}
                  onClick={() => setFocusRunning(false)}
                  className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PauseIcon className="size-3.5" weight="fill" />
                  {copy.pauseFocus}
                </button>
                <button
                  type="button"
                  disabled={!focusEnabled}
                  onClick={() => {
                    setFocusRunning(false);
                    setFocusSeconds(25 * 60);
                  }}
                  className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowCounterClockwiseIcon className="size-3.5" />
                  {copy.resetFocus}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              {[
                { icon: BellRingingIcon, label: copy.reminderQueue, text: copy.reminderSoon, enabled: activePluginIds.includes("openpets.reminders") },
                { icon: DropIcon, label: copy.waterStatus, text: copy.waterSoon, enabled: activePluginIds.includes("openpets.water-reminder") },
                { icon: SmileyIcon, label: copy.moodStatus, text: copy.moodGood, enabled: activePluginIds.includes("openpets.mood-check-in") },
                { icon: CalendarCheckIcon, label: copy.routineStatus, text: copy.routineReady, enabled: activePluginIds.includes("openpets.day-routine") },
                { icon: RocketLaunchIcon, label: copy.launchStatus, text: copy.launchReady, enabled: activePluginIds.includes("openpets.launch-buddy") },
                { icon: CoffeeIcon, label: copy.fortuneStatus, text: copy.fortuneReady, enabled: activePluginIds.includes("openpets.fortune-cookie") || activePluginIds.includes("openpets.magic-8-ball") },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2",
                    !item.enabled && "opacity-50",
                  )}
                >
                  <item.icon className="size-4 shrink-0 text-primary" weight={item.enabled ? "fill" : "regular"} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.text}</p>
                  </div>
                  {item.enabled && <ShieldCheckIcon className="ml-auto size-4 shrink-0 text-primary" weight="fill" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
