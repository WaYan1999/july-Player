import {
  ArrowCounterClockwiseIcon,
  BatteryChargingIcon,
  BellRingingIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
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
  SmileyIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import {
  PET_CATALOG,
  PET_ACTION_EVENT,
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
type FeedbackTone = "info" | "success";
type FeedbackState = {
  title: string;
  detail: string;
  tone: FeedbackTone;
  nonce: number;
  pluginId?: PetPluginId;
};

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
    previewing: "Previewing",
    selectPet: "Use pet",
    petApplied: "{name} is now your resident pet",
    petAppliedWithAction: "{name} is active. Action: {action}",
    petPreviewed: "Previewing {name}",
    actionPreviewed: "Previewing {action}",
    previewReset: "Preview reset",
    applying: "Applying...",
    protected: "Protected",
    currentCompanion: "Current companion",
    preview: "Preview",
    idle: "Idle",
    thinking: "Thinking",
    happy: "Happy",
    wave: "Wave",
    sourceBuiltIn: "Built-in",
    sourceOfficial: "Official",
    sourceCatalog: "Catalog",
    moduleTitle: "Official pet modules",
    moduleDescription: "OpenPets-style features are grouped here so the pet stays playful without black control boxes.",
    activeModules: "{count} active",
    latestFeedback: "Pet feedback",
    useModule: "Use",
    lastResult: "Last result",
    noResultYet: "Tap Use to run this module.",
    moduleDisabledHint: "Turn this module on first, then click Use.",
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
    residentEnabled: "Resident pet enabled",
    residentDisabled: "Resident pet hidden",
    pluginEnabled: "{name} enabled",
    pluginDisabled: "{name} disabled",
    moduleRequired: "Enable {name} first",
    statUpdated: "{name} updated",
    focusStarted: "Focus timer started",
    focusPaused: "Focus timer paused",
    focusResetDone: "Focus timer reset",
    statusReady: "{name} is ready",
    moduleUsed: "{name} completed",
    virtualPetResult: "The pet played with you. Play and bond increased.",
    focusAlreadyRunning: "Focus timer is already running.",
    waterLogged: "Water check logged at {time}.",
    routineChecked: "Morning and evening routine checked.",
    moodChecked: "Mood check-in recorded. The pet is watching your pace.",
    launchChecked: "Launch checklist prepared: title, assets, package, release notes.",
    magicAnswerA: "The pet says yes, but test it once first.",
    magicAnswerB: "The answer is almost there. Wait one minute.",
    magicAnswerC: "Ask again after the next video scene.",
    fortuneAnswerA: "Small progress still counts today.",
    fortuneAnswerB: "A clear release note saves future trouble.",
    fortuneAnswerC: "Drink water, then ship the next small fix.",
    actionFailed: "Action failed. Please try again.",
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
    previewing: "预览中",
    selectPet: "使用宠物",
    petApplied: "已切换为 {name}",
    petAppliedWithAction: "已使用 {name}，动作：{action}",
    petPreviewed: "正在预览 {name}",
    actionPreviewed: "正在预览{action}",
    previewReset: "预览已重置",
    applying: "应用中...",
    protected: "受保护",
    currentCompanion: "当前宠物",
    preview: "动作预览",
    idle: "默认",
    thinking: "思考",
    happy: "开心",
    wave: "挥手",
    sourceBuiltIn: "内置",
    sourceOfficial: "官方",
    sourceCatalog: "目录",
    moduleTitle: "官方宠物功能",
    moduleDescription: "把 OpenPets 风格功能集中放在这里，宠物保持轻量可玩，不再出现黑色控制框。",
    activeModules: "已启用 {count} 个",
    latestFeedback: "宠物反馈",
    useModule: "使用",
    lastResult: "最近结果",
    noResultYet: "点击使用后，这里会显示结果。",
    moduleDisabledHint: "请先打开这个模块，再点击使用。",
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
    residentEnabled: "常驻宠物已开启",
    residentDisabled: "常驻宠物已隐藏",
    pluginEnabled: "已开启 {name}",
    pluginDisabled: "已关闭 {name}",
    moduleRequired: "请先开启 {name}",
    statUpdated: "{name} 已生效",
    focusStarted: "专注计时已开始",
    focusPaused: "专注计时已暂停",
    focusResetDone: "专注计时已重置",
    statusReady: "{name} 已准备好",
    moduleUsed: "{name} 已执行",
    virtualPetResult: "宠物和你互动了一下，玩耍和羁绊提升了。",
    focusAlreadyRunning: "专注计时正在运行中。",
    waterLogged: "{time} 已记录一次喝水。",
    routineChecked: "早晚日常已检查。",
    moodChecked: "情绪自检已记录，宠物会陪你放慢一点。",
    launchChecked: "发布清单已准备：标题、素材、安装包、更新说明。",
    magicAnswerA: "宠物说可以，但先本地测试一次。",
    magicAnswerB: "答案快出现了，再等一分钟。",
    magicAnswerC: "下一段视频之后再问一次。",
    fortuneAnswerA: "今天的小进度也算数。",
    fortuneAnswerB: "写清楚更新说明，以后会少很多麻烦。",
    fortuneAnswerC: "先喝口水，再发下一个小版本。",
    actionFailed: "操作失败，请再试一次",
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
    previewing: "Apercu",
    selectPet: "Utiliser",
    petApplied: "{name} est maintenant votre compagnon",
    petAppliedWithAction: "{name} est actif. Action : {action}",
    petPreviewed: "Apercu de {name}",
    actionPreviewed: "Apercu : {action}",
    previewReset: "Apercu reinitialise",
    applying: "Application...",
    protected: "Protege",
    currentCompanion: "Compagnon actuel",
    preview: "Apercu",
    idle: "Repos",
    thinking: "Reflexion",
    happy: "Heureux",
    wave: "Salut",
    sourceBuiltIn: "Integre",
    sourceOfficial: "Officiel",
    sourceCatalog: "Catalogue",
    moduleTitle: "Modules officiels",
    moduleDescription: "Les fonctions type OpenPets sont regroupees ici, sans panneau noir autour du compagnon.",
    activeModules: "{count} actifs",
    latestFeedback: "Retour du compagnon",
    useModule: "Utiliser",
    lastResult: "Dernier resultat",
    noResultYet: "Cliquez sur Utiliser pour lancer ce module.",
    moduleDisabledHint: "Activez d'abord ce module, puis cliquez sur Utiliser.",
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
    residentEnabled: "Compagnon resident active",
    residentDisabled: "Compagnon resident masque",
    pluginEnabled: "{name} active",
    pluginDisabled: "{name} desactive",
    moduleRequired: "Activez d'abord {name}",
    statUpdated: "{name} mis a jour",
    focusStarted: "Minuteur demarre",
    focusPaused: "Minuteur en pause",
    focusResetDone: "Minuteur reinitialise",
    statusReady: "{name} est pret",
    moduleUsed: "{name} termine",
    virtualPetResult: "Le compagnon a joue avec vous. Jeu et lien augmentent.",
    focusAlreadyRunning: "Le minuteur est deja en cours.",
    waterLogged: "Hydratation notee a {time}.",
    routineChecked: "Routine matin et soir verifiee.",
    moodChecked: "Check-in d'humeur note. Le compagnon suit le rythme.",
    launchChecked: "Checklist preparee : titre, assets, package, notes.",
    magicAnswerA: "Le compagnon dit oui, mais testez une fois.",
    magicAnswerB: "La reponse arrive. Attendez une minute.",
    magicAnswerC: "Redemandez apres la prochaine scene.",
    fortuneAnswerA: "Un petit progres compte aussi.",
    fortuneAnswerB: "Une note claire evite des soucis plus tard.",
    fortuneAnswerC: "Buvez de l'eau, puis livrez le prochain correctif.",
    actionFailed: "Action impossible. Reessayez.",
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
  const [previewPetId, setPreviewPetId] = useState<PetCatalogId>(settings.pet_variant);
  const [previewMood, setPreviewMood] = useState<PetMood>("idle");
  const [applyingPet, setApplyingPet] = useState(false);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [petStats, setPetStats] = useState({ food: 78, energy: 64, play: 71, bond: 86 });
  const [lastFeedback, setLastFeedback] = useState<FeedbackState | null>(null);
  const [moduleResults, setModuleResults] = useState<Partial<Record<PetPluginId, string>>>({});

  const activePluginIds = settings.pet_plugins_enabled;
  const currentPet = PET_CATALOG.find((pet) => pet.id === settings.pet_variant) ?? PET_CATALOG[0];
  const previewPet = PET_CATALOG.find((pet) => pet.id === previewPetId) ?? currentPet;
  const activeFeedback =
    lastFeedback ??
    ({
      title: copy.statusReady.replace("{name}", currentPet.displayName),
      detail: copy.moduleDescription,
      tone: "info",
      nonce: 0,
    } satisfies FeedbackState);
  const FeedbackIcon = activeFeedback.pluginId ? PLUGIN_ICONS[activeFeedback.pluginId] : PawPrintIcon;
  const previewIsApplied = previewPet.id === settings.pet_variant;
  const selectedActionLabel =
    previewMood === "thinking"
      ? copy.thinking
      : previewMood === "hop"
        ? copy.happy
        : previewMood === "wave"
          ? copy.wave
          : copy.idle;

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

  useEffect(() => {
    if (pets.some((pet) => pet.id === previewPetId)) return;
    setPreviewPetId(currentPet.id);
  }, [currentPet.id, previewPetId, pets]);

  const previewPetChoice = (petId: PetCatalogId) => {
    const nextPet = PET_CATALOG.find((pet) => pet.id === petId);
    setPreviewPetId(petId);
    if (nextPet) {
      toast.message(copy.petPreviewed.replace("{name}", nextPet.displayName));
    }
  };

  const dispatchPetAction = (mood: PetMood) => {
    setPreviewMood(mood);
    window.dispatchEvent(new CustomEvent(PET_ACTION_EVENT, { detail: mood }));
  };

  const pushFeedback = ({
    title,
    detail,
    mood = "wave",
    pluginId,
    tone = "success",
  }: {
    title: string;
    detail: string;
    mood?: PetMood;
    pluginId?: PetPluginId;
    tone?: FeedbackTone;
  }) => {
    setLastFeedback({
      title,
      detail,
      tone,
      pluginId,
      nonce: Date.now(),
    });

    if (pluginId) {
      setModuleResults((current) => ({ ...current, [pluginId]: detail }));
    }

    dispatchPetAction(mood);
    if (tone === "success") {
      toast.success(title, { description: detail });
    } else {
      toast.message(title, { description: detail });
    }
  };

  const applyPreviewPet = async () => {
    if (applyingPet) return;

    setApplyingPet(true);
    try {
      if (!previewIsApplied) await update("pet_variant", previewPet.id);
      if (!settings.pet_enabled) await update("pet_enabled", "true");

      pushFeedback({
        title: copy.petAppliedWithAction
          .replace("{name}", previewPet.displayName)
          .replace("{action}", selectedActionLabel),
        detail: copy.residentEnabled,
        mood: previewMood === "idle" ? "wave" : previewMood,
      });
    } catch {
      toast.error(copy.actionFailed);
    } finally {
      setApplyingPet(false);
    }
  };

  const togglePlugin = async (pluginId: PetPluginId, enabled: boolean) => {
    const plugin = PET_PLUGINS.find((item) => item.id === pluginId);
    const pluginName = plugin ? copy[plugin.nameKey] : pluginId;
    const next = enabled
      ? [...new Set([...activePluginIds, pluginId])]
      : activePluginIds.filter((id) => id !== pluginId);

    try {
      await update("pet_plugins_enabled", serializePetPlugins(next));
      pushFeedback({
        title: (enabled ? copy.pluginEnabled : copy.pluginDisabled).replace("{name}", pluginName),
        detail: enabled ? copy.noResultYet : copy.moduleDisabledHint,
        mood: enabled ? "wave" : "idle",
        pluginId,
      });
    } catch {
      toast.error(copy.actionFailed);
    }
  };

  const requireModule = (enabled: boolean, moduleName: string) => {
    if (enabled) return true;
    pushFeedback({
      title: copy.moduleRequired.replace("{name}", moduleName),
      detail: copy.moduleDisabledHint,
      mood: "thinking",
      tone: "info",
    });
    return false;
  };

  const playPreviewAction = (mood: PetMood, label: string) => {
    pushFeedback({
      title: copy.actionPreviewed.replace("{action}", label),
      detail: copy.currentCompanion,
      mood,
      tone: "info",
    });
  };

  const resetPreviewAction = () => {
    pushFeedback({
      title: copy.previewReset,
      detail: copy.idle,
      mood: "idle",
      tone: "info",
    });
  };

  const bumpStat = (key: keyof typeof petStats, amount: number, label: string) => {
    if (!requireModule(virtualPetEnabled, copy.virtualPetPlugin)) return;

    setPetStats((current) => ({
      ...current,
      [key]: Math.min(100, current[key] + amount),
    }));
    pushFeedback({
      title: copy.statUpdated.replace("{name}", label),
      detail: copy.virtualPetResult,
      mood: key === "energy" ? "idle" : "hop",
      pluginId: "openpets.virtual-pet",
    });
  };

  const toggleResidentPet = async (enabled: boolean) => {
    try {
      await update("pet_enabled", String(enabled));
      pushFeedback({
        title: enabled ? copy.residentEnabled : copy.residentDisabled,
        detail: copy.residentPetDescription,
        mood: enabled ? "wave" : "idle",
      });
    } catch {
      toast.error(copy.actionFailed);
    }
  };

  const startFocus = () => {
    if (!requireModule(focusEnabled, copy.focusBuddyPlugin)) return;
    setFocusRunning(true);
    pushFeedback({
      title: copy.focusStarted,
      detail: formatTimer(focusSeconds),
      mood: "thinking",
      pluginId: "openpets.focus-buddy",
    });
  };

  const pauseFocus = () => {
    if (!requireModule(focusEnabled, copy.focusBuddyPlugin)) return;
    setFocusRunning(false);
    pushFeedback({
      title: copy.focusPaused,
      detail: formatTimer(focusSeconds),
      mood: "wave",
      pluginId: "openpets.focus-buddy",
    });
  };

  const resetFocus = () => {
    if (!requireModule(focusEnabled, copy.focusBuddyPlugin)) return;
    setFocusRunning(false);
    setFocusSeconds(25 * 60);
    pushFeedback({
      title: copy.focusResetDone,
      detail: formatTimer(25 * 60),
      mood: "idle",
      pluginId: "openpets.focus-buddy",
    });
  };

  const runPluginAction = (pluginId: PetPluginId) => {
    const plugin = PET_PLUGINS.find((item) => item.id === pluginId);
    const pluginName = plugin ? copy[plugin.nameKey] : pluginId;
    if (!requireModule(activePluginIds.includes(pluginId), pluginName)) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    switch (pluginId) {
      case "openpets.reminders":
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail: copy.reminderSoon,
          mood: "wave",
          pluginId,
        });
        break;
      case "openpets.virtual-pet":
        setPetStats((current) => ({
          ...current,
          play: Math.min(100, current.play + 5),
          bond: Math.min(100, current.bond + 5),
        }));
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail: copy.virtualPetResult,
          mood: "hop",
          pluginId,
        });
        break;
      case "openpets.focus-buddy":
        if (!focusRunning) {
          setFocusRunning(true);
          pushFeedback({
            title: copy.focusStarted,
            detail: formatTimer(focusSeconds),
            mood: "thinking",
            pluginId,
          });
        } else {
          pushFeedback({
            title: copy.focusAlreadyRunning,
            detail: formatTimer(focusSeconds),
            mood: "thinking",
            pluginId,
          });
        }
        break;
      case "openpets.water-reminder":
        setPetStats((current) => ({
          ...current,
          energy: Math.min(100, current.energy + 3),
        }));
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail: copy.waterLogged.replace("{time}", now),
          mood: "hop",
          pluginId,
        });
        break;
      case "openpets.day-routine":
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail: copy.routineChecked,
          mood: "wave",
          pluginId,
        });
        break;
      case "openpets.mood-check-in":
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail: copy.moodChecked,
          mood: "thinking",
          pluginId,
        });
        break;
      case "openpets.launch-buddy":
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail: copy.launchChecked,
          mood: "thinking",
          pluginId,
        });
        break;
      case "openpets.magic-8-ball": {
        const answers = [copy.magicAnswerA, copy.magicAnswerB, copy.magicAnswerC];
        const detail = answers[Math.floor(Math.random() * answers.length)];
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail,
          mood: "wave",
          pluginId,
        });
        break;
      }
      case "openpets.fortune-cookie": {
        const answers = [copy.fortuneAnswerA, copy.fortuneAnswerB, copy.fortuneAnswerC];
        const detail = answers[Math.floor(Math.random() * answers.length)];
        pushFeedback({
          title: copy.moduleUsed.replace("{name}", pluginName),
          detail,
          mood: "hop",
          pluginId,
        });
        break;
      }
      default:
        pushFeedback({
          title: copy.statusReady.replace("{name}", pluginName),
          detail: copy.noResultYet,
          mood: "wave",
          pluginId,
        });
    }
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
              onChange={(value) => void toggleResidentPet(value)}
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
              const applied = settings.pet_variant === pet.id;
              const previewing = previewPetId === pet.id;

              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => previewPetChoice(pet.id)}
                  className={cn(
                    "group relative min-h-48 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    previewing
                      ? "border-primary/70 bg-primary/10"
                      : "border-border bg-secondary/20 hover:border-muted-foreground/35 hover:bg-secondary/40",
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      {sourceLabel(pet, copy)}
                    </span>
                    {(applied || previewing) && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                        <CheckCircleIcon className="size-3.5" weight="fill" />
                        {applied ? copy.selected : copy.previewing}
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
                        state={previewing ? "wave" : "idle"}
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
                  {previewPet.displayName}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{previewPet.description}</p>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {sourceLabel(previewPet, copy)}
              </span>
            </div>
          </div>

          <div className="flex min-h-72 items-end justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(200,241,53,0.13),transparent_38%)] p-8">
            <PetSprite
              key={`${previewPet.id}-${previewMood}`}
              variantId={previewPet.id}
              state={previewMood === "hop" ? "hop" : previewMood}
              width={154}
            />
          </div>

          <div className="border-t border-border/70 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-heading text-sm font-bold text-foreground">{copy.preview}</h4>
              <button
                type="button"
                onClick={resetPreviewAction}
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
                  onClick={() => playPreviewAction(action.mood, copy[action.key])}
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
              onClick={() => void applyPreviewPet()}
              disabled={applyingPet}
              className={cn(
                "mt-4 flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors",
                applyingPet
                  ? "cursor-wait bg-secondary text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {applyingPet ? copy.applying : copy.selectPet}
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

        <div
          key={activeFeedback.nonce}
          className={cn(
            "mx-5 mt-5 flex items-start gap-3 rounded-lg border p-4",
            activeFeedback.tone === "success"
              ? "border-primary/45 bg-primary/10"
              : "border-border bg-secondary/25",
          )}
          style={{ animation: `card-in 220ms ${EASE_OUT} both` }}
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              activeFeedback.tone === "success" ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
            )}
          >
            <FeedbackIcon className="size-4.5" weight="fill" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
              {copy.latestFeedback}
            </p>
            <h4 className="text-sm font-bold text-foreground">{activeFeedback.title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeFeedback.detail}</p>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PET_PLUGINS.map((plugin) => {
              const Icon = PLUGIN_ICONS[plugin.id];
              const checked = activePluginIds.includes(plugin.id);
              const result = moduleResults[plugin.id] ?? copy.noResultYet;

              return (
                <article
                  key={plugin.id}
                  className={cn(
                    "flex min-h-48 flex-col rounded-xl border p-4 transition-colors",
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
                    <Toggle checked={checked} onChange={(value) => void togglePlugin(plugin.id, value)} />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {copy[plugin.descriptionKey]}
                  </p>
                  <div className="mt-auto pt-4">
                    <div
                      className={cn(
                        "mb-3 rounded-lg border px-3 py-2",
                        checked ? "border-primary/20 bg-background/55" : "border-border/70 bg-background/35",
                      )}
                    >
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        {copy.lastResult}
                      </p>
                      <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-foreground/85">
                        {checked ? result : copy.moduleDisabledHint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => runPluginAction(plugin.id)}
                      className={cn(
                        "flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                        checked
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <PlayIcon className="size-3.5" weight={checked ? "fill" : "regular"} />
                      {copy.useModule}
                    </button>
                  </div>
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
                  aria-disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("food", 8, copy.feed)}
                  className={cn(
                    "rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary",
                    !virtualPetEnabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {copy.feed}
                </button>
                <button
                  type="button"
                  aria-disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("play", 8, copy.playGame)}
                  className={cn(
                    "rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary",
                    !virtualPetEnabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {copy.playGame}
                </button>
                <button
                  type="button"
                  aria-disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("bond", 6, copy.pet)}
                  className={cn(
                    "rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary",
                    !virtualPetEnabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {copy.pet}
                </button>
                <button
                  type="button"
                  aria-disabled={!virtualPetEnabled}
                  onClick={() => bumpStat("energy", 10, copy.nap)}
                  className={cn(
                    "rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary",
                    !virtualPetEnabled && "cursor-not-allowed opacity-60",
                  )}
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
                  aria-disabled={!focusEnabled}
                  onClick={startFocus}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground",
                    !focusEnabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <PlayIcon className="size-3.5" weight="fill" />
                  {copy.startFocus}
                </button>
                <button
                  type="button"
                  aria-disabled={!focusEnabled}
                  onClick={pauseFocus}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground",
                    !focusEnabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <PauseIcon className="size-3.5" weight="fill" />
                  {copy.pauseFocus}
                </button>
                <button
                  type="button"
                  aria-disabled={!focusEnabled}
                  onClick={resetFocus}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground",
                    !focusEnabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <ArrowCounterClockwiseIcon className="size-3.5" />
                  {copy.resetFocus}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircleIcon className="size-4 text-primary" weight="fill" />
                <h4 className="font-heading text-sm font-bold text-foreground">{copy.latestFeedback}</h4>
              </div>
              <div
                key={`side-${activeFeedback.nonce}`}
                className="rounded-lg border border-border/70 bg-background/55 p-3"
                style={{ animation: `card-in 220ms ${EASE_OUT} both` }}
              >
                <p className="text-sm font-bold text-foreground">{activeFeedback.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {activeFeedback.detail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
