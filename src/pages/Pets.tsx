import {
  ArrowCounterClockwiseIcon,
  BatteryChargingIcon,
  BellRingingIcon,
  CalendarCheckIcon,
  CookieIcon,
  BrainIcon,
  DesktopIcon,
  DropIcon,
  ForkKnifeIcon,
  HeartIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  CoinsIcon,
  RobotIcon,
  PauseIcon,
  PawPrintIcon,
  PlayIcon,
  QuestionIcon,
  RocketLaunchIcon,
  SmileyIcon,
  TimerIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import { askPetAi, closeDesktopPet, isDesktopPetOpen, openDesktopPet } from "@/lib/store";
import { DESKTOP_PET_READY_EVENT, withTimeout } from "@/lib/desktopPet";
import {
  PET_CATALOG,
  PET_ACTION_EVENT,
  PET_PLUGINS,
  PET_SPEAK_EVENT,
  serializePetPlugins,
  type PetCatalogId,
  type PetCatalogPet,
  type PetPluginId,
  type PetSpeechTone,
} from "@/lib/pets";
import {
  PET_CARE_LEVELS,
  PET_CARE_UPDATED_EVENT,
  PET_CARE_ACTIONS,
  PET_PLAY_ACTIONS,
  PET_DAILY_GOALS,
  applyPetCareAction,
  applyPetPlayAction,
  awardPetCare,
  claimPetName,
  dailyPetCheckin,
  defaultPetCareState,
  getCompletedDailyGoalCount,
  getDailyGoalProgress,
  getPetCareDayKey,
  getPetCareProgress,
  getPetCareState,
  getPetVitals,
  getOwnedPetIds,
  getPetStorePrice,
  getPetUnlockLevel,
  getPetXp,
  isPetAvailable,
  isPetOwned,
  isPetUnlocked,
  purchasePet,
  type PetCareActionId,
  type PetCareActionResult,
  type PetPlayActionId,
  type PetPlayActionResult,
  type PetDailyGoalId,
  type PetCareState,
  type PetVitals,
} from "@/lib/petCare";
import { PetSprite } from "@/components/pets/PetSprite";

interface PetsProps {
  className?: string;
}

type FilterId = "all" | "official" | "catalog";
type PetView = "overview" | "shop" | "library" | "modules";
type PetMood = "idle" | "thinking" | "wave" | "hop";
type FeedbackTone = "info" | "success";
type FeedbackState = {
  title: string;
  detail: string;
  tone: FeedbackTone;
  nonce: number;
  pluginId?: PetPluginId;
};

type ModuleAwardFeedback = {
  detail: string;
  tone: FeedbackTone;
};

const COPY = {
  en: {
    title: "Pets",
    subtitle: "Choose a resident companion and enable the playful pet modules",
    growthTitle: "Companion growth",
    growthDescription: "Feed your pet with real learning: daily check-ins, completed videos, tasks, and module play.",
    workFeedsPet: "Videos and tasks feed the active pet. Each pet keeps its own level.",
    dailyCheckin: "Daily check-in",
    checkedIn: "Checked in",
    checkinDone: "Daily check-in complete",
    checkinAlready: "You already checked in today.",
    rewardSummary: "+{tokens} tokens · +{xp} XP",
    level: "Level",
    petLevel: "Pet Lv.",
    globalLevel: "Progress Lv.",
    maxLevel: "Max level",
    nextLevel: "{xp} XP to Lv.{level}",
    totalXp: "Total XP",
    tokens: "Tokens",
    todayTokens: "Today",
    tasks: "Tasks",
    streak: "Streak",
    days: "{count} days",
    recentActivity: "Recent activity",
    noActivity: "No pet rewards yet. Finish a video or check in.",
    locked: "Locked",
    unlockAt: "Unlocks at Lv.{level}",
    unlocked: "Unlocked",
    petLocked: "{name} unlocks at Lv.{level}",
    unlockNotice: "{count} new pets unlocked",
    companionStage1: "Starter",
    companionStage2: "Explorer",
    companionStage3: "Adept",
    companionStage4: "Specialist",
    companionStage5: "Expert",
    companionStage6: "Master",
    companionStage7: "Legend",
    overviewTab: "Overview",
    libraryTab: "Library",
    shopTab: "Store",
    modulesTab: "Modules",
    petModules: "Pet modules",
    openModules: "Open modules",
    closeModules: "Close modules",
    modulePanelHint: "The 9 OpenPets-style functions live here as a compact panel.",
    playgroundTitle: "Pet playground",
    playgroundDescription: "Run small real actions with cooldowns, daily limits, rewards, and combo XP.",
    playCombo: "Combo x{combo}",
    playDailyLeft: "{left}/{total} left",
    playActionEarn: "+{tokens} tokens · +{xp} XP",
    playActionSpend: "{cost} tokens · +{xp} XP",
    playActionDone: "{action} complete",
    playReward: "{tokens} tokens · +{xp} XP · combo x{combo}",
    playTreasure: "Treasure hunt",
    playTreasureDescription: "Search with your pet for a small token cache.",
    playJump: "Jump training",
    playJumpDescription: "A quick energy game that raises play and bond.",
    playGift: "Surprise gift",
    playGiftDescription: "Spend tokens for a stronger bond boost.",
    playTreasureResult: "A small cache was found.",
    playJumpResult: "Training landed cleanly.",
    playGiftResult: "The gift was accepted happily.",
    playCooldown: "This game is cooling down. Try again in {seconds}s.",
    playDailyLimit: "This game reached today's limit.",
    playTokenShort: "Not enough tokens for this game.",
    playStatLow: "Your pet needs more food or energy first.",
    residentPet: "Resident pet",
    residentPetDescription: "Keep the pet visible across the app. Drag it anywhere while watching.",
    desktopPet: "Desktop pet",
    desktopPetDescription: "Let the pet leave the player and stay on the desktop in its own small window.",
    enterDesktop: "Enter desktop",
    backToPlayer: "Back to player",
    desktopPetOpened: "Desktop pet opened",
    desktopPetClosed: "Desktop pet returned",
    aiGrowthTitle: "AI growth",
    aiGrowthDescription: "Allow the pet to use the AI module token for short self-growth thoughts.",
    aiTokenConsent: "Allow token use",
    aiTokenConsentHint: "Off by default. When enabled, pet thinking uses your configured AI module credentials.",
    aiDailyBudget: "Daily budget",
    aiBudgetUse: "{used}/{limit} today",
    aiGrowAction: "Let pet think",
    aiGrowing: "Thinking...",
    aiNotConfigured: "Configure API address and API Key in the AI module first.",
    aiConsentRequired: "Turn on token permission before the pet can use AI.",
    aiBudgetReached: "The pet reached today's AI token budget.",
    aiGrowthSaved: "AI growth saved: {reward}",
    enabled: "Enabled",
    disabled: "Disabled",
    choosePet: "Pet library",
    choosePetDescription: "Built-in OpenPets characters and catalog pets are ready to select.",
    petShop: "Pet store",
    petShopDescription: "Spend pet tokens on unlocked companions. Level gates still come from real progress.",
    owned: "Owned",
    buyPet: "Buy pet",
    buyFor: "Buy for {cost}",
    petBought: "{name} joined your pet library",
    alreadyOwned: "{name} is already in your library.",
    shopLocked: "Reach Lv.{level} before this companion can be purchased.",
    shopTokenShort: "Not enough tokens. Check in, finish lessons, or use modules first.",
    petNameTitle: "Name your companion",
    petNameDescription: "You get one naming chance. Pick the name you want to keep.",
    petNamePlaceholder: "Companion name",
    savePetName: "Save name",
    petNameSaved: "Name saved: {name}",
    petNameLocked: "The name has already been set.",
    petNameInvalid: "Enter a name first.",
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
    petBubbleHint: "The resident pet will answer in a small bubble next to it.",
    askPetQuestion: "Ask your pet",
    askPetPlaceholder: "Should I keep watching this lesson?",
    magicQuestionFallback: "Ask me a yes-or-no question first, then tap Use.",
    reminderSnoozed: "Reminder snoozed for 10 min.",
    reminderDone: "Reminder marked done.",
    dailyHabitChecked: "Habit checked. Stretch once before the next lesson.",
    focusFinished: "Focus session complete. Take a short break.",
    virtualHud: "Food {food}% · Energy {energy}% · Bond {bond}%",
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
    fedResult: "Snack served.",
    playResult: "Mini game played.",
    pettedResult: "Pet received a little attention.",
    napResult: "Nap time started.",
    actionCost: "{cost} tokens · +{xp} XP",
    actionFree: "Free · +{xp} XP",
    careCooldown: "Try again in {seconds}s.",
    careDailyLimit: "Daily care limit reached. Come back tomorrow.",
    careTokenShort: "Not enough tokens. Finish a lesson or check in first.",
    careStatFull: "This need is already high enough.",
    careStatLow: "Your pet needs more food or energy first.",
    careReward: "+{xp} XP · {cost} tokens spent",
    dailyGoals: "Daily goals",
    dailyGoalProgress: "{done}/{total} completed",
    goalCheckin: "Check in",
    goalLesson: "Finish a video",
    goalCare: "Care twice",
    goalModule: "Use modules twice",
    goalFocus: "Complete focus",
    moduleRewardCooldown: "Reward cooling down. Function still ran.",
    moduleRewardCapped: "Daily module reward limit reached. Function still ran.",
    moduleRewardSaved: "Reward saved: {reward}",
    moduleRewardFailed: "Function ran, but reward could not be saved.",
    enableModule: "Enable module",
    focusTimer: "Focus timer",
    startFocus: "Start",
    pauseFocus: "Pause",
    resetFocus: "Reset",
    focusNotRunning: "Focus timer is not running.",
    focusAlreadyReset: "Focus timer is already reset.",
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
    growthTitle: "宠物养成",
    growthDescription: "用真实学习来喂养宠物：每日签到、看完视频、完成任务和模块互动都会产生奖励。",
    workFeedsPet: "视频和任务会喂养当前宠物，每只宠物都有独立等级。",
    dailyCheckin: "每日签到",
    checkedIn: "今日已签到",
    checkinDone: "每日签到完成",
    checkinAlready: "今天已经签到过了。",
    rewardSummary: "+{tokens} 代币 · +{xp} XP",
    level: "等级",
    petLevel: "宠物 Lv.",
    globalLevel: "进度 Lv.",
    maxLevel: "已满级",
    nextLevel: "还差 {xp} XP 到 Lv.{level}",
    totalXp: "总 XP",
    tokens: "代币",
    todayTokens: "今日",
    tasks: "任务",
    streak: "连续",
    days: "{count} 天",
    recentActivity: "最近奖励",
    noActivity: "还没有宠物奖励。看完一个视频或先签到。",
    locked: "未解锁",
    unlockAt: "Lv.{level} 解锁",
    unlocked: "已解锁",
    petLocked: "{name} 需要 Lv.{level} 解锁",
    unlockNotice: "新解锁 {count} 个宠物",
    companionStage1: "入门者",
    companionStage2: "探索者",
    companionStage3: "进阶者",
    companionStage4: "熟练者",
    companionStage5: "专家",
    companionStage6: "大师",
    companionStage7: "传奇",
    overviewTab: "概览",
    libraryTab: "宠物库",
    shopTab: "宠物商店",
    modulesTab: "功能模块",
    petModules: "宠物模块",
    openModules: "打开模块",
    closeModules: "关闭模块",
    modulePanelHint: "9 个 OpenPets 风格功能集中放在这个小面板里。",
    playgroundTitle: "宠物游乐场",
    playgroundDescription: "这里是真实小游戏：有冷却、每日次数、奖励和连击经验。",
    playCombo: "连击 x{combo}",
    playDailyLeft: "剩余 {left}/{total}",
    playActionEarn: "+{tokens} 代币 · +{xp} XP",
    playActionSpend: "{cost} 代币 · +{xp} XP",
    playActionDone: "{action}完成",
    playReward: "{tokens} 代币 · +{xp} XP · 连击 x{combo}",
    playTreasure: "寻宝",
    playTreasureDescription: "和宠物一起找小代币宝箱。",
    playJump: "跳跃训练",
    playJumpDescription: "消耗一点能量，提升玩耍和亲密。",
    playGift: "惊喜礼物",
    playGiftDescription: "消耗代币，换更高亲密度。",
    playTreasureResult: "找到了一个小宝箱。",
    playJumpResult: "训练成功落地。",
    playGiftResult: "宠物开心地收下了礼物。",
    playCooldown: "这个小游戏还在冷却，{seconds} 秒后再试。",
    playDailyLimit: "这个小游戏今天次数已用完。",
    playTokenShort: "代币不够，暂时不能玩这个。",
    playStatLow: "宠物需要先补充食物或能量。",
    residentPet: "常驻宠物",
    residentPetDescription: "让宠物一直显示在应用里，看视频时也可以自由拖拽移动。",
    desktopPet: "桌面宠物",
    desktopPetDescription: "允许宠物离开播放器，进入一个独立的桌面小窗口。",
    enterDesktop: "进入桌面",
    backToPlayer: "回到播放器",
    desktopPetOpened: "桌面宠物已打开",
    desktopPetClosed: "宠物已回到播放器",
    aiGrowthTitle: "AI 自我成长",
    aiGrowthDescription: "允许宠物使用 AI 模块里的 token，生成一次短思考并获得成长。",
    aiTokenConsent: "允许消耗 Token",
    aiTokenConsentHint: "默认关闭。开启后，宠物思考会使用你在 AI 模块配置的 API 地址和 API Key。",
    aiDailyBudget: "每日预算",
    aiBudgetUse: "今日 {used}/{limit}",
    aiGrowAction: "让宠物思考",
    aiGrowing: "思考中...",
    aiNotConfigured: "请先在 AI 模块配置 API 地址和 API Key。",
    aiConsentRequired: "请先允许宠物消耗 AI Token。",
    aiBudgetReached: "宠物今天的 AI Token 预算已用完。",
    aiGrowthSaved: "AI 成长已保存：{reward}",
    enabled: "已开启",
    disabled: "已关闭",
    choosePet: "宠物库",
    choosePetDescription: "内置 OpenPets 角色和目录宠物都可以直接选择。",
    petShop: "宠物商店",
    petShopDescription: "使用宠物代币购买已解锁的伙伴。等级门槛仍然来自真实学习进度。",
    owned: "已拥有",
    buyPet: "购买宠物",
    buyFor: "{cost} 代币购买",
    petBought: "{name} 已加入宠物库",
    alreadyOwned: "{name} 已经在宠物库里。",
    shopLocked: "达到 Lv.{level} 后才可以购买这个伙伴。",
    shopTokenShort: "代币不足。先签到、完成课程或使用模块获取代币。",
    petNameTitle: "给宠物起名",
    petNameDescription: "只有一次自定义名称机会。保存后就不能再改。",
    petNamePlaceholder: "宠物名称",
    savePetName: "保存名称",
    petNameSaved: "名称已保存：{name}",
    petNameLocked: "名称已经设置过了。",
    petNameInvalid: "请先输入名称。",
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
    petBubbleHint: "常驻宠物会在旁边弹出回答气泡。",
    askPetQuestion: "问问宠物",
    askPetPlaceholder: "我现在要继续看这一课吗？",
    magicQuestionFallback: "先输入一个想问的问题，再点击使用。",
    reminderSnoozed: "已稍后提醒 10 分钟。",
    reminderDone: "提醒已完成。",
    dailyHabitChecked: "习惯已打卡，下一节课前伸展一下。",
    focusFinished: "专注完成，休息一下再继续。",
    virtualHud: "食物 {food}% · 能量 {energy}% · 羁绊 {bond}%",
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
    fedResult: "已喂零食。",
    playResult: "已经陪它玩了一下。",
    pettedResult: "宠物收到一次抚摸。",
    napResult: "已进入休息状态。",
    actionCost: "{cost} 代币 · +{xp} XP",
    actionFree: "免费 · +{xp} XP",
    careCooldown: "{seconds} 秒后再试。",
    careDailyLimit: "今天照顾次数已满，明天再来。",
    careTokenShort: "代币不足，先看完一节课或签到。",
    careStatFull: "这个状态已经很高了。",
    careStatLow: "宠物需要先补充食物或能量。",
    careReward: "+{xp} XP · 消耗 {cost} 代币",
    dailyGoals: "每日目标",
    dailyGoalProgress: "已完成 {done}/{total}",
    goalCheckin: "每日签到",
    goalLesson: "完成视频",
    goalCare: "照顾 2 次",
    goalModule: "使用模块 2 次",
    goalFocus: "完成专注",
    moduleRewardCooldown: "奖励冷却中，功能已执行。",
    moduleRewardCapped: "今日模块奖励已达上限，功能已执行。",
    moduleRewardSaved: "奖励已保存：{reward}",
    moduleRewardFailed: "功能已执行，但奖励保存失败。",
    enableModule: "开启模块",
    focusTimer: "专注计时",
    startFocus: "开始",
    pauseFocus: "暂停",
    resetFocus: "重置",
    focusNotRunning: "专注计时还没有开始。",
    focusAlreadyReset: "专注计时已经是初始状态。",
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
    growthTitle: "Evolution du compagnon",
    growthDescription: "Nourrissez le compagnon avec l'apprentissage reel : check-in, videos terminees, taches et modules.",
    workFeedsPet: "Les videos et taches nourrissent le compagnon actif. Chaque compagnon garde son niveau.",
    dailyCheckin: "Check-in quotidien",
    checkedIn: "Deja fait",
    checkinDone: "Check-in termine",
    checkinAlready: "Le check-in est deja fait aujourd'hui.",
    rewardSummary: "+{tokens} jetons · +{xp} XP",
    level: "Niveau",
    petLevel: "Compagnon niv.",
    globalLevel: "Progression niv.",
    maxLevel: "Niveau max",
    nextLevel: "{xp} XP jusqu'au niv.{level}",
    totalXp: "XP total",
    tokens: "Jetons",
    todayTokens: "Aujourd'hui",
    tasks: "Taches",
    streak: "Serie",
    days: "{count} jours",
    recentActivity: "Activite recente",
    noActivity: "Aucune recompense. Terminez une video ou faites le check-in.",
    locked: "Verrouille",
    unlockAt: "Debloque au niv.{level}",
    unlocked: "Debloque",
    petLocked: "{name} se debloque au niv.{level}",
    unlockNotice: "{count} nouveaux compagnons debloques",
    companionStage1: "Debutant",
    companionStage2: "Explorateur",
    companionStage3: "Adepte",
    companionStage4: "Specialiste",
    companionStage5: "Expert",
    companionStage6: "Maitre",
    companionStage7: "Legende",
    overviewTab: "Apercu",
    libraryTab: "Bibliotheque",
    shopTab: "Boutique",
    modulesTab: "Modules",
    petModules: "Modules",
    openModules: "Ouvrir les modules",
    closeModules: "Fermer les modules",
    modulePanelHint: "Les 9 fonctions type OpenPets sont dans ce petit panneau.",
    playgroundTitle: "Terrain de jeu",
    playgroundDescription: "De vraies petites actions avec pause, limite du jour, recompenses et combo XP.",
    playCombo: "Combo x{combo}",
    playDailyLeft: "{left}/{total} restants",
    playActionEarn: "+{tokens} jetons · +{xp} XP",
    playActionSpend: "{cost} jetons · +{xp} XP",
    playActionDone: "{action} termine",
    playReward: "{tokens} jetons · +{xp} XP · combo x{combo}",
    playTreasure: "Chasse au tresor",
    playTreasureDescription: "Cherchez une petite cache de jetons avec le compagnon.",
    playJump: "Entrainement saut",
    playJumpDescription: "Un jeu rapide qui augmente jeu et lien.",
    playGift: "Cadeau surprise",
    playGiftDescription: "Depensez des jetons pour renforcer le lien.",
    playTreasureResult: "Une petite cache a ete trouvee.",
    playJumpResult: "L'entrainement est reussi.",
    playGiftResult: "Le cadeau est accepte avec joie.",
    playCooldown: "Ce jeu est en pause. Reessayez dans {seconds}s.",
    playDailyLimit: "Limite du jour atteinte pour ce jeu.",
    playTokenShort: "Pas assez de jetons pour ce jeu.",
    playStatLow: "Le compagnon a besoin de nourriture ou d'energie.",
    residentPet: "Compagnon resident",
    residentPetDescription: "Gardez le compagnon visible dans l'application. Vous pouvez le deplacer pendant la lecture.",
    desktopPet: "Compagnon bureau",
    desktopPetDescription: "Laissez le compagnon quitter le lecteur et rester dans une petite fenetre de bureau.",
    enterDesktop: "Sur le bureau",
    backToPlayer: "Retour lecteur",
    desktopPetOpened: "Compagnon de bureau ouvert",
    desktopPetClosed: "Compagnon revenu au lecteur",
    aiGrowthTitle: "Croissance IA",
    aiGrowthDescription: "Autorisez le compagnon a utiliser le jeton du module IA pour une courte pensee.",
    aiTokenConsent: "Autoriser les jetons",
    aiTokenConsentHint: "Desactive par defaut. Active, il utilise les identifiants du module IA.",
    aiDailyBudget: "Budget quotidien",
    aiBudgetUse: "{used}/{limit} aujourd'hui",
    aiGrowAction: "Faire reflechir",
    aiGrowing: "Reflexion...",
    aiNotConfigured: "Configurez d'abord l'adresse API et la cle API dans le module IA.",
    aiConsentRequired: "Autorisez d'abord l'utilisation des jetons IA.",
    aiBudgetReached: "Le budget IA du jour est atteint.",
    aiGrowthSaved: "Croissance IA enregistree : {reward}",
    enabled: "Active",
    disabled: "Desactive",
    choosePet: "Bibliotheque",
    choosePetDescription: "Les personnages OpenPets integres et les compagnons du catalogue sont prets.",
    petShop: "Boutique",
    petShopDescription: "Depensez les jetons du compagnon pour acheter les compagnons debloques.",
    owned: "Possede",
    buyPet: "Acheter",
    buyFor: "Acheter pour {cost}",
    petBought: "{name} a rejoint la bibliotheque",
    alreadyOwned: "{name} est deja dans la bibliotheque.",
    shopLocked: "Atteignez le niv.{level} avant l'achat.",
    shopTokenShort: "Pas assez de jetons. Faites le check-in, terminez des lecons ou utilisez des modules.",
    petNameTitle: "Nommer le compagnon",
    petNameDescription: "Vous avez une seule chance de choisir un nom.",
    petNamePlaceholder: "Nom du compagnon",
    savePetName: "Enregistrer",
    petNameSaved: "Nom enregistre : {name}",
    petNameLocked: "Le nom est deja defini.",
    petNameInvalid: "Entrez d'abord un nom.",
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
    petBubbleHint: "Le compagnon repondra dans une petite bulle.",
    askPetQuestion: "Question",
    askPetPlaceholder: "Je continue cette lecon ?",
    magicQuestionFallback: "Posez une question avant d'utiliser.",
    reminderSnoozed: "Rappel repousse de 10 min.",
    reminderDone: "Rappel termine.",
    dailyHabitChecked: "Habitude notee. Etirez-vous avant la suite.",
    focusFinished: "Session terminee. Prenez une pause.",
    virtualHud: "Nourriture {food}% · Energie {energy}% · Lien {bond}%",
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
    fedResult: "Collation donnee.",
    playResult: "Mini-jeu lance.",
    pettedResult: "Le compagnon a recu de l'attention.",
    napResult: "Repos lance.",
    actionCost: "{cost} jetons · +{xp} XP",
    actionFree: "Gratuit · +{xp} XP",
    careCooldown: "Reessayez dans {seconds}s.",
    careDailyLimit: "Limite de soin atteinte. Revenez demain.",
    careTokenShort: "Pas assez de jetons. Terminez une lecon ou faites le check-in.",
    careStatFull: "Ce besoin est deja assez haut.",
    careStatLow: "Le compagnon a besoin de nourriture ou d'energie.",
    careReward: "+{xp} XP · {cost} jetons depenses",
    dailyGoals: "Objectifs du jour",
    dailyGoalProgress: "{done}/{total} termines",
    goalCheckin: "Check-in",
    goalLesson: "Terminer une video",
    goalCare: "Soigner deux fois",
    goalModule: "Utiliser deux modules",
    goalFocus: "Finir le focus",
    moduleRewardCooldown: "Recompense en pause. La fonction a ete lancee.",
    moduleRewardCapped: "Limite de recompense atteinte. La fonction a ete lancee.",
    moduleRewardSaved: "Recompense enregistree : {reward}",
    moduleRewardFailed: "Fonction lancee, mais recompense non enregistree.",
    enableModule: "Activer",
    focusTimer: "Minuteur",
    startFocus: "Demarrer",
    pauseFocus: "Pause",
    resetFocus: "Reset",
    focusNotRunning: "Le minuteur n'est pas en cours.",
    focusAlreadyReset: "Le minuteur est deja reinitialise.",
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
const PET_VIEWS: PetView[] = ["overview", "shop", "library", "modules"];
const PET_VIEW_COPY_KEYS: Record<PetView, "overviewTab" | "shopTab" | "libraryTab" | "modulesTab"> = {
  overview: "overviewTab",
  shop: "shopTab",
  library: "libraryTab",
  modules: "modulesTab",
};

const PET_ACTIONS: { mood: PetMood; key: "thinking" | "happy" | "wave" }[] = [
  { mood: "thinking", key: "thinking" },
  { mood: "hop", key: "happy" },
  { mood: "wave", key: "wave" },
];

const CARE_ACTION_CONFIG: {
  action: PetCareActionId;
  labelKey: "feed" | "playGame" | "pet" | "nap";
  resultKey: "fedResult" | "playResult" | "pettedResult" | "napResult";
  mood: PetMood;
  icon: typeof ForkKnifeIcon;
}[] = [
  {
    action: "feed",
    labelKey: "feed",
    resultKey: "fedResult",
    mood: "hop",
    icon: ForkKnifeIcon,
  },
  {
    action: "play",
    labelKey: "playGame",
    resultKey: "playResult",
    mood: "hop",
    icon: SmileyIcon,
  },
  {
    action: "pet",
    labelKey: "pet",
    resultKey: "pettedResult",
    mood: "wave",
    icon: HeartIcon,
  },
  {
    action: "nap",
    labelKey: "nap",
    resultKey: "napResult",
    mood: "thinking",
    icon: BatteryChargingIcon,
  },
];

const PLAY_ACTION_CONFIG: {
  action: PetPlayActionId;
  labelKey: "playTreasure" | "playJump" | "playGift";
  descriptionKey: "playTreasureDescription" | "playJumpDescription" | "playGiftDescription";
  resultKey: "playTreasureResult" | "playJumpResult" | "playGiftResult";
  mood: PetMood;
  icon: typeof MagnifyingGlassIcon;
}[] = [
  {
    action: "treasure",
    labelKey: "playTreasure",
    descriptionKey: "playTreasureDescription",
    resultKey: "playTreasureResult",
    mood: "thinking",
    icon: MagnifyingGlassIcon,
  },
  {
    action: "jump",
    labelKey: "playJump",
    descriptionKey: "playJumpDescription",
    resultKey: "playJumpResult",
    mood: "hop",
    icon: RocketLaunchIcon,
  },
  {
    action: "gift",
    labelKey: "playGift",
    descriptionKey: "playGiftDescription",
    resultKey: "playGiftResult",
    mood: "wave",
    icon: MagicWandIcon,
  },
];

const DAILY_GOAL_COPY_KEYS: Record<
  PetDailyGoalId,
  "goalCheckin" | "goalLesson" | "goalCare" | "goalModule" | "goalFocus"
> = {
  checkin: "goalCheckin",
  lesson: "goalLesson",
  care: "goalCare",
  module: "goalModule",
  focus: "goalFocus",
};

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
    <div className="pet-stat-card rounded-lg border border-border/70 bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className="pet-progress-fill h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

function formatPetHud(template: string, stats: Pick<PetVitals, "food" | "energy" | "bond">) {
  return template
    .replace("{food}", String(stats.food))
    .replace("{energy}", String(stats.energy))
    .replace("{bond}", String(stats.bond));
}

function formatCareActionMeta(
  copy: { actionCost: string; actionFree: string },
  actionId: PetCareActionId,
) {
  const rule = PET_CARE_ACTIONS[actionId];
  const template = rule.tokenCost > 0 ? copy.actionCost : copy.actionFree;
  return template
    .replace("{cost}", String(rule.tokenCost))
    .replace("{xp}", String(rule.xp));
}

function formatCareReward(
  copy: { careReward: string; actionFree: string },
  result: PetCareActionResult,
) {
  if (result.tokenCost <= 0) {
    return copy.actionFree.replace("{xp}", String(result.xp));
  }
  return copy.careReward
    .replace("{xp}", String(result.xp))
    .replace("{cost}", String(result.tokenCost));
}

function formatPlayActionMeta(
  copy: {
    playActionEarn: string;
    playActionSpend: string;
  },
  actionId: PetPlayActionId,
) {
  const rule = PET_PLAY_ACTIONS[actionId];
  const template = rule.tokenCost > 0 ? copy.playActionSpend : copy.playActionEarn;
  return template
    .replace("{cost}", String(rule.tokenCost))
    .replace("{tokens}", String(rule.rewardTokens))
    .replace("{xp}", String(rule.xp));
}

function formatPlayReward(
  copy: { playReward: string },
  result: PetPlayActionResult,
) {
  const tokenDelta = result.event?.tokens ?? result.rewardTokens - result.tokenCost;
  return copy.playReward
    .replace("{tokens}", formatEventTokens(tokenDelta))
    .replace("{xp}", String(result.xp))
    .replace("{combo}", String(result.combo));
}

function formatRemainingSeconds(ms = 0) {
  return String(Math.max(1, Math.ceil(ms / 1000)));
}

function sourceLabel(
  pet: PetCatalogPet,
  copy: { sourceBuiltIn: string; sourceOfficial: string; sourceCatalog: string },
) {
  if (pet.category === "built-in") return copy.sourceBuiltIn;
  if (pet.category === "official") return copy.sourceOfficial;
  return copy.sourceCatalog;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatReward(copy: { rewardSummary: string }, tokens: number, xp: number) {
  return copy.rewardSummary.replace("{tokens}", String(tokens)).replace("{xp}", String(xp));
}

function formatEventTokens(tokens: number) {
  return tokens >= 0 ? `+${tokens}` : String(tokens);
}

function getModuleAwardFeedback(
  copy: {
    rewardSummary: string;
    moduleRewardSaved: string;
    moduleRewardCooldown: string;
    moduleRewardCapped: string;
    moduleRewardFailed: string;
    actionFailed: string;
  },
  result: Awaited<ReturnType<typeof awardPetCare>>,
): ModuleAwardFeedback {
  if (!result.skipped && result.event) {
    const reward = formatReward(copy, result.event.tokens, result.event.xp);
    return {
      detail: copy.moduleRewardSaved.replace("{reward}", reward),
      tone: "success",
    };
  }

  if (result.reason === "cooldown") {
    return { detail: copy.moduleRewardCooldown, tone: "info" };
  }

  if (result.reason === "daily_limit") {
    return { detail: copy.moduleRewardCapped, tone: "info" };
  }

  return { detail: copy.actionFailed, tone: "info" };
}

function nextFeedbackNonce() {
  return Date.now() + Math.random();
}

export function Pets({ className }: PetsProps) {
  const { language } = useI18n();
  const { settings, update, reload: reloadSettings } = useSettings();
  const copy = COPY[language];
  const [activeView, setActiveView] = useState<PetView>("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [previewPetId, setPreviewPetId] = useState<PetCatalogId>(settings.pet_variant);
  const [previewMood, setPreviewMood] = useState<PetMood>("idle");
  const [applyingPet, setApplyingPet] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [lastFeedback, setLastFeedback] = useState<FeedbackState | null>(null);
  const [moduleResults, setModuleResults] = useState<Partial<Record<PetPluginId, string>>>({});
  const [magicQuestion, setMagicQuestion] = useState("");
  const [runningPlugins, setRunningPlugins] = useState<Partial<Record<PetPluginId, boolean>>>({});
  const [careActionPending, setCareActionPending] = useState<Partial<Record<PetCareActionId, boolean>>>({});
  const [playActionPending, setPlayActionPending] = useState<Partial<Record<PetPlayActionId, boolean>>>({});
  const [pluginTogglePending, setPluginTogglePending] = useState<Partial<Record<PetPluginId, boolean>>>({});
  const [careState, setCareState] = useState<PetCareState>(() =>
    defaultPetCareState(settings.pet_variant),
  );
  const [careLoading, setCareLoading] = useState(true);
  const [aiGrowthPending, setAiGrowthPending] = useState(false);
  const [desktopPetPending, setDesktopPetPending] = useState(false);
  const [petNameDraft, setPetNameDraft] = useState("");
  const [petNameSaving, setPetNameSaving] = useState(false);
  const [buyingPetId, setBuyingPetId] = useState<PetCatalogId | null>(null);

  const activePluginIds = settings.pet_plugins_enabled;
  const currentPet = PET_CATALOG.find((pet) => pet.id === settings.pet_variant) ?? PET_CATALOG[0];
  const previewPet = PET_CATALOG.find((pet) => pet.id === previewPetId) ?? currentPet;
  const currentPetName = careState.petName || currentPet.displayName;
  const growthProgress = getPetCareProgress(careState.xp);
  const previewPetProgress = getPetCareProgress(getPetXp(careState, previewPet.id));
  const currentPetProgress = getPetCareProgress(getPetXp(careState, currentPet.id));
  const petStats = getPetVitals(careState, currentPet.id);
  const dailyGoalProgress = getDailyGoalProgress(careState);
  const completedDailyGoals = getCompletedDailyGoalCount(careState);
  const checkedInToday = careState.lastCheckinDate === getPetCareDayKey();
  const ownedCount = getOwnedPetIds(careState).length;
  const stageKey = `companionStage${growthProgress.level}` as keyof typeof copy;
  const stageLabel = copy[stageKey];
  const activeFeedback =
    lastFeedback ??
    ({
      title: copy.statusReady.replace("{name}", currentPetName),
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

  const nextLevelText = growthProgress.isMaxLevel
    ? copy.maxLevel
    : copy.nextLevel
        .replace("{xp}", String(growthProgress.xpForLevel - growthProgress.xpInLevel))
        .replace("{level}", String(growthProgress.level + 1));

  const pets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return PET_CATALOG.filter((pet) => {
      if (filter === "official" && pet.category !== "built-in" && pet.category !== "official") return false;
      if (filter === "catalog" && pet.category !== "catalog") return false;
      if (!normalizedQuery) return true;
      return `${pet.displayName} ${pet.description} ${pet.id}`.toLowerCase().includes(normalizedQuery);
    });
  }, [filter, query]);

  const shopPets = useMemo(
    () => PET_CATALOG.filter((pet) => !pet.protected),
    [],
  );

  const activePluginCount = activePluginIds.length;
  const virtualPetEnabled = activePluginIds.includes("openpets.virtual-pet");
  const focusEnabled = activePluginIds.includes("openpets.focus-buddy");
  const aiConfigured =
    settings.ai_deepseek_proxy_url.trim().length > 0 &&
    (settings.ai_deepseek_proxy_token.trim().length > 0 ||
      settings.ai_deepseek_api_key.trim().length > 0);
  const aiDailyLimit = settings.pet_ai_daily_token_budget;
  const aiUsedToday = careState.eventCountsToday.ai ?? 0;
  const aiBudgetReached = aiUsedToday >= aiDailyLimit;

  const reloadCareState = useCallback(async () => {
    try {
      setCareState(await getPetCareState(settings.pet_variant));
    } catch {
      setCareState(defaultPetCareState(settings.pet_variant));
    } finally {
      setCareLoading(false);
    }
  }, [settings.pet_variant]);

  useEffect(() => {
    void reloadCareState();
  }, [reloadCareState]);

  useEffect(() => {
    if (careState.petNameClaimed) {
      setPetNameDraft(careState.petName);
    }
  }, [careState.petName, careState.petNameClaimed]);

  useEffect(() => {
    const refresh = () => {
      void reloadCareState();
    };
    window.addEventListener(PET_CARE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(PET_CARE_UPDATED_EVENT, refresh);
  }, [reloadCareState]);

  useEffect(() => {
    if (pets.some((pet) => pet.id === previewPetId)) return;
    setPreviewPetId(currentPet.id);
  }, [currentPet.id, previewPetId, pets]);

  useEffect(() => {
    if (activeView !== "library") {
      setPreviewPetId(settings.pet_variant);
    }
  }, [activeView, settings.pet_variant]);

  const previewPetChoice = (petId: PetCatalogId) => {
    const nextPet = PET_CATALOG.find((pet) => pet.id === petId);
    if (nextPet && !isPetUnlocked(nextPet.id, careState)) {
      const unlockLevel = getPetUnlockLevel(nextPet.id);
      pushFeedback({
        title: copy.petLocked
          .replace("{name}", nextPet.displayName)
          .replace("{level}", String(unlockLevel)),
        detail: copy.workFeedsPet,
        mood: "thinking",
        tone: "info",
      });
      return;
    }
    if (nextPet && !isPetOwned(nextPet.id, careState)) {
      setPreviewPetId(nextPet.id);
      setActiveView("shop");
      pushFeedback({
        title: copy.buyPet,
        detail: copy.buyFor.replace("{cost}", String(getPetStorePrice(nextPet.id))),
        mood: "thinking",
        tone: "info",
      });
      return;
    }
    setPreviewPetId(petId);
    if (nextPet) {
      pushFeedback({
        title: copy.petPreviewed.replace("{name}", nextPet.displayName),
        detail: nextPet.description,
        mood: "wave",
        tone: "info",
      });
    }
  };

  const dispatchPetAction = useCallback((mood: PetMood) => {
    setPreviewMood(mood);
    window.dispatchEvent(new CustomEvent(PET_ACTION_EVENT, { detail: mood }));
  }, []);

  const dispatchPetSpeech = useCallback(({
    title,
    message,
    tone = "success",
    durationMs,
  }: {
    title?: string;
    message: string;
    tone?: PetSpeechTone;
    durationMs?: number;
  }) => {
    window.dispatchEvent(
      new CustomEvent(PET_SPEAK_EVENT, {
        detail: { title, message, tone, durationMs },
      }),
    );
  }, []);

  const pushFeedback = useCallback(({
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
      nonce: nextFeedbackNonce(),
    });

    if (pluginId) {
      setModuleResults((current) => ({ ...current, [pluginId]: detail }));
    }

    dispatchPetAction(mood);
    dispatchPetSpeech({
      title,
      message: detail,
      tone,
      durationMs: pluginId === "openpets.magic-8-ball" ? 7000 : undefined,
    });
    if (tone === "success") {
      toast.success(title, { description: detail });
    } else {
      toast.message(title, { description: detail });
    }
  }, [dispatchPetAction, dispatchPetSpeech]);

  const pushFailureFeedback = useCallback((title: string, pluginId?: PetPluginId) => {
    pushFeedback({
      title,
      detail: copy.actionFailed,
      mood: "thinking",
      tone: "info",
      pluginId,
    });
  }, [copy.actionFailed, pushFeedback]);

  const handleFocusCompleted = useCallback(async () => {
    try {
      const result = await awardPetCare({
        type: "focus",
        petId: settings.pet_variant,
        label: copy.focusTimer,
      });
      setCareState(result.state);
      const reward = result.event
        ? result.event.tokens > 0
          ? formatReward(copy, result.event.tokens, result.event.xp)
          : `+${result.event.xp} XP`
        : "";
      pushFeedback({
        title: copy.focusFinished,
        detail: reward ? `${copy.focusTimer} ${reward}` : copy.focusTimer,
        mood: "wave",
        pluginId: "openpets.focus-buddy",
      });
    } catch {
      pushFeedback({
        title: copy.focusFinished,
        detail: copy.actionFailed,
        mood: "thinking",
        tone: "info",
        pluginId: "openpets.focus-buddy",
      });
    }
  }, [
    copy,
    pushFeedback,
    settings.pet_variant,
  ]);

  useEffect(() => {
    if (!focusRunning || !focusEnabled) return;

    const timer = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setFocusRunning(false);
          void handleFocusCompleted();
          return 25 * 60;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [focusEnabled, focusRunning, handleFocusCompleted]);

  const handleCareResult = (
    result: Awaited<ReturnType<typeof awardPetCare>>,
    title: string,
    skippedDetail?: string,
  ) => {
    setCareState(result.state);

    if (result.skipped || !result.event) {
      pushFeedback({
        title,
        detail: skippedDetail ?? copy.actionFailed,
        mood: "thinking",
        tone: "info",
      });
      return;
    }

    const reward = formatReward(copy, result.event.tokens, result.event.xp);
    const levelDetail =
      result.petLevelAfter > result.petLevelBefore
        ? ` ${copy.petLevel}${result.petLevelAfter}`
        : "";
    const unlockDetail = result.unlockedPets.length
      ? ` ${copy.unlockNotice.replace("{count}", String(result.unlockedPets.length))}`
      : "";

    pushFeedback({
      title,
      detail: `${reward}${levelDetail}${unlockDetail}`,
      mood: "hop",
      tone: "success",
    });
  };

  const getCareFailureDetail = (result: PetCareActionResult) => {
    if (result.reason === "cooldown") {
      return copy.careCooldown.replace(
        "{seconds}",
        formatRemainingSeconds(result.cooldownRemainingMs),
      );
    }
    if (result.reason === "daily_limit") return copy.careDailyLimit;
    if (result.reason === "not_enough_tokens") return copy.careTokenShort;
    if (result.reason === "stat_full") return copy.careStatFull;
    if (result.reason === "stat_low") return copy.careStatLow;
    return copy.actionFailed;
  };

  const getPlayFailureDetail = (result: PetPlayActionResult) => {
    if (result.reason === "cooldown") {
      return copy.playCooldown.replace(
        "{seconds}",
        formatRemainingSeconds(result.cooldownRemainingMs),
      );
    }
    if (result.reason === "daily_limit") return copy.playDailyLimit;
    if (result.reason === "not_enough_tokens") return copy.playTokenShort;
    if (result.reason === "stat_low") return copy.playStatLow;
    return copy.actionFailed;
  };

  const handleDailyCheckin = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const result = await dailyPetCheckin(settings.pet_variant);
      handleCareResult(result, copy.checkinDone, copy.checkinAlready);
    } catch {
      pushFailureFeedback(copy.checkinDone);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSavePetName = async () => {
    if (petNameSaving) return;
    const nextName = petNameDraft.trim();
    if (!nextName) {
      pushFeedback({
        title: copy.petNameTitle,
        detail: copy.petNameInvalid,
        mood: "thinking",
        tone: "info",
      });
      return;
    }

    setPetNameSaving(true);
    try {
      const result = await claimPetName(nextName, settings.pet_variant);
      setCareState(result.state);
      if (!result.saved) {
        pushFeedback({
          title: copy.petNameTitle,
          detail: result.reason === "already_claimed" ? copy.petNameLocked : copy.petNameInvalid,
          mood: "thinking",
          tone: "info",
        });
        return;
      }

      pushFeedback({
        title: copy.petNameSaved.replace("{name}", result.state.petName),
        detail: copy.currentCompanion,
        mood: "wave",
      });
    } catch {
      pushFailureFeedback(copy.petNameTitle);
    } finally {
      setPetNameSaving(false);
    }
  };

  const buyPet = async (pet: PetCatalogPet) => {
    if (buyingPetId) return;
    setBuyingPetId(pet.id);
    try {
      const result = await purchasePet(pet.id, settings.pet_variant);
      setCareState(result.state);
      if (result.skipped) {
        const detail =
          result.reason === "already_owned"
            ? copy.alreadyOwned.replace("{name}", pet.displayName)
            : result.reason === "level_locked"
              ? copy.shopLocked.replace("{level}", String(getPetUnlockLevel(pet.id)))
              : result.reason === "not_enough_tokens"
                ? copy.shopTokenShort
                : copy.actionFailed;
        pushFeedback({
          title: copy.buyPet,
          detail,
          mood: "thinking",
          tone: "info",
        });
        return;
      }

      setPreviewPetId(pet.id);
      pushFeedback({
        title: copy.petBought.replace("{name}", pet.displayName),
        detail: `${copy.buyFor.replace("{cost}", String(result.cost))}. ${copy.selectPet}`,
        mood: "hop",
      });
    } catch {
      pushFailureFeedback(copy.buyPet);
    } finally {
      setBuyingPetId(null);
    }
  };

  const applyOwnedShopPet = async (pet: PetCatalogPet) => {
    if (applyingPet) return;

    setPreviewPetId(pet.id);
    if (settings.pet_variant === pet.id) {
      pushFeedback({
        title: copy.statusReady.replace("{name}", careState.petName || pet.displayName),
        detail: copy.residentEnabled,
        mood: "wave",
        tone: "info",
      });
      return;
    }

    setApplyingPet(true);
    try {
      await update("pet_variant", pet.id);
      if (!settings.pet_enabled) await update("pet_enabled", "true");
      pushFeedback({
        title: copy.petAppliedWithAction
          .replace("{name}", pet.displayName)
          .replace("{action}", copy.wave),
        detail: copy.residentEnabled,
        mood: "wave",
      });
    } catch {
      pushFailureFeedback(copy.selectPet);
      await reloadSettings();
    } finally {
      setApplyingPet(false);
    }
  };

  const applyPreviewPet = async () => {
    if (applyingPet) return;
    if (!isPetAvailable(previewPet.id, careState)) {
      const unlockLevel = getPetUnlockLevel(previewPet.id);
      pushFeedback({
        title: !isPetUnlocked(previewPet.id, careState)
          ? copy.petLocked
              .replace("{name}", previewPet.displayName)
              .replace("{level}", String(unlockLevel))
          : copy.buyPet,
        detail: !isPetUnlocked(previewPet.id, careState)
          ? copy.workFeedsPet
          : copy.buyFor.replace("{cost}", String(getPetStorePrice(previewPet.id))),
        mood: "thinking",
        tone: "info",
      });
      if (isPetUnlocked(previewPet.id, careState)) setActiveView("shop");
      return;
    }

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
      pushFailureFeedback(copy.selectPet);
      await reloadSettings();
    } finally {
      setApplyingPet(false);
    }
  };

  const togglePlugin = async (pluginId: PetPluginId, enabled: boolean) => {
    if (pluginTogglePending[pluginId]) return;
    const plugin = PET_PLUGINS.find((item) => item.id === pluginId);
    const pluginName = plugin ? copy[plugin.nameKey] : pluginId;
    const next = enabled
      ? [...new Set([...activePluginIds, pluginId])]
      : activePluginIds.filter((id) => id !== pluginId);

    setPluginTogglePending((current) => ({ ...current, [pluginId]: true }));
    try {
      await update("pet_plugins_enabled", serializePetPlugins(next));
      if (enabled && !settings.pet_enabled) {
        await update("pet_enabled", "true");
      }
      pushFeedback({
        title: (enabled ? copy.pluginEnabled : copy.pluginDisabled).replace("{name}", pluginName),
        detail: enabled ? copy.petBubbleHint : copy.moduleDisabledHint,
        mood: enabled ? "wave" : "idle",
        pluginId,
      });
    } catch {
      pushFailureFeedback(pluginName, pluginId);
      await reloadSettings();
    } finally {
      setPluginTogglePending((current) => ({ ...current, [pluginId]: false }));
    }
  };

  const requireModule = (enabled: boolean, moduleName: string, pluginId?: PetPluginId) => {
    if (enabled) return true;
    pushFeedback({
      title: copy.moduleRequired.replace("{name}", moduleName),
      detail: copy.moduleDisabledHint,
      mood: "thinking",
      tone: "info",
      pluginId,
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

  const awardModuleCare = async (pluginId: PetPluginId, pluginName: string) => {
    try {
      const result = await awardPetCare({
        type: "module",
        petId: settings.pet_variant,
        label: pluginName,
        moduleKey: pluginId,
      });
      setCareState(result.state);
      return getModuleAwardFeedback(copy, result);
    } catch {
      return { detail: copy.moduleRewardFailed, tone: "info" } satisfies ModuleAwardFeedback;
    }
  };

  const pushPluginFeedback = ({
    pluginId,
    title,
    detail,
    award,
    mood,
    tone,
  }: {
    pluginId: PetPluginId;
    title: string;
    detail: string;
    award?: ModuleAwardFeedback;
    mood: PetMood;
    tone?: FeedbackTone;
  }) => {
    const combinedDetail = award ? `${detail} ${award.detail}` : detail;
    pushFeedback({
      title,
      detail: combinedDetail,
      mood,
      pluginId,
      tone: tone ?? award?.tone ?? "success",
    });
  };

  const careForPet = async ({
    action,
    label,
    resultText,
    mood,
    requireVirtualModule = false,
  }: {
    action: PetCareActionId;
    label: string;
    resultText: string;
    mood: PetMood;
    requireVirtualModule?: boolean;
  }) => {
    if (careActionPending[action]) return;
    if (requireVirtualModule && !requireModule(virtualPetEnabled, copy.virtualPetPlugin, "openpets.virtual-pet")) {
      return;
    }

    setCareActionPending((current) => ({ ...current, [action]: true }));
    try {
      const result = await applyPetCareAction({
        action,
        petId: settings.pet_variant,
        label,
      });
      setCareState(result.state);
      if (result.skipped) {
        pushFeedback({
          title: copy.statUpdated.replace("{name}", label),
          detail: getCareFailureDetail(result),
          mood: "thinking",
          pluginId: "openpets.virtual-pet",
          tone: "info",
        });
        return;
      }

      const reward = formatCareReward(copy, result);
      pushFeedback({
        title: copy.statUpdated.replace("{name}", label),
        detail: `${resultText} ${formatPetHud(copy.virtualHud, result.vitals)} ${reward}`,
        mood,
        pluginId: "openpets.virtual-pet",
      });
    } catch {
      pushFailureFeedback(label, "openpets.virtual-pet");
    } finally {
      setCareActionPending((current) => ({ ...current, [action]: false }));
    }
  };

  const playWithPet = async ({
    action,
    label,
    resultText,
    mood,
  }: {
    action: PetPlayActionId;
    label: string;
    resultText: string;
    mood: PetMood;
  }) => {
    if (playActionPending[action]) return;

    setPlayActionPending((current) => ({ ...current, [action]: true }));
    try {
      const result = await applyPetPlayAction({
        action,
        petId: settings.pet_variant,
        label,
      });
      setCareState(result.state);
      if (result.skipped) {
        pushFeedback({
          title: label,
          detail: getPlayFailureDetail(result),
          mood: "thinking",
          tone: "info",
        });
        return;
      }

      const unlockDetail = result.unlockedPets.length
        ? ` ${copy.unlockNotice.replace("{count}", String(result.unlockedPets.length))}`
        : "";
      pushFeedback({
        title: copy.playActionDone.replace("{action}", label),
        detail: `${resultText} ${formatPetHud(copy.virtualHud, result.vitals)} ${formatPlayReward(copy, result)}${unlockDetail}`,
        mood,
      });
    } catch {
      pushFailureFeedback(label);
    } finally {
      setPlayActionPending((current) => ({ ...current, [action]: false }));
    }
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
      pushFailureFeedback(copy.residentPet);
      await reloadSettings();
    }
  };

  const togglePetAiTokenUse = async (enabled: boolean) => {
    try {
      await update("pet_ai_token_enabled", String(enabled));
      pushFeedback({
        title: enabled ? copy.aiTokenConsent : copy.aiGrowthTitle,
        detail: enabled ? copy.aiTokenConsentHint : copy.aiConsentRequired,
        mood: enabled ? "wave" : "idle",
        tone: enabled ? "success" : "info",
      });
    } catch {
      pushFailureFeedback(copy.aiGrowthTitle);
      await reloadSettings();
    }
  };

  const updateAiDailyBudget = async (budget: number) => {
    try {
      await update("pet_ai_daily_token_budget", String(budget));
      pushFeedback({
        title: copy.aiDailyBudget,
        detail: copy.aiBudgetUse
          .replace("{used}", String(aiUsedToday))
          .replace("{limit}", String(budget)),
        mood: "thinking",
        tone: "info",
      });
    } catch {
      pushFailureFeedback(copy.aiDailyBudget);
      await reloadSettings();
    }
  };

  const runAiGrowth = async () => {
    if (aiGrowthPending) return;

    if (!aiConfigured) {
      pushFeedback({
        title: copy.aiGrowthTitle,
        detail: copy.aiNotConfigured,
        mood: "thinking",
        tone: "info",
      });
      return;
    }

    if (!settings.pet_ai_token_enabled) {
      pushFeedback({
        title: copy.aiGrowthTitle,
        detail: copy.aiConsentRequired,
        mood: "thinking",
        tone: "info",
      });
      return;
    }

    if (aiBudgetReached) {
      pushFeedback({
        title: copy.aiGrowthTitle,
        detail: copy.aiBudgetReached,
        mood: "thinking",
        tone: "info",
      });
      return;
    }

    setAiGrowthPending(true);
    try {
      const prompt = [
        `Pet name: ${currentPet.displayName}`,
        `Pet level: ${currentPetProgress.level}`,
        `Global level: ${growthProgress.level}`,
        `Vitals: food ${petStats.food}, energy ${petStats.energy}, play ${petStats.play}, bond ${petStats.bond}`,
        "Give the user one short companion thought and one tiny next action for study or rest.",
      ].join("\n");
      const message = await askPetAi(prompt, language);
      const result = await awardPetCare({
        type: "ai",
        petId: settings.pet_variant,
        label: copy.aiGrowthTitle,
        dailyLimit: aiDailyLimit,
      });
      setCareState(result.state);

      const reward = result.event ? formatReward(copy, result.event.tokens, result.event.xp) : "";
      pushFeedback({
        title: copy.aiGrowthTitle,
        detail: reward
          ? `${message} ${copy.aiGrowthSaved.replace("{reward}", reward)}`
          : message,
        mood: "thinking",
        tone: "success",
      });
    } catch (error) {
      pushFeedback({
        title: copy.aiGrowthTitle,
        detail: error instanceof Error ? error.message : copy.actionFailed,
        mood: "thinking",
        tone: "info",
      });
    } finally {
      setAiGrowthPending(false);
    }
  };

  const toggleDesktopPet = async (enabled: boolean) => {
    if (desktopPetPending) return;

    setDesktopPetPending(true);
    let unlistenReady: UnlistenFn | null = null;
    try {
      if (enabled) {
        await update("pet_enabled", "true");
        const alreadyOpen = await withTimeout(
          isDesktopPetOpen(),
          1500,
          "Could not check desktop pet window.",
        ).catch(() => false);
        if (alreadyOpen) {
          await withTimeout(
            closeDesktopPet(),
            2500,
            "Could not reset the previous desktop pet window.",
          );
          await new Promise((resolve) => window.setTimeout(resolve, 120));
        }

        let resolveReady: () => void = () => {};
        const readyPromise = new Promise<void>((resolve) => {
          resolveReady = resolve;
        });

        unlistenReady = await listen(DESKTOP_PET_READY_EVENT, () => resolveReady());

        await withTimeout(openDesktopPet(), 4000, "Desktop pet window did not open.");
        await withTimeout(readyPromise, 4000, "Desktop pet window did not finish loading.");
        await update("pet_desktop_enabled", "true");
        pushFeedback({
          title: copy.desktopPetOpened,
          detail: copy.desktopPetDescription,
          mood: "wave",
        });
      } else {
        await update("pet_desktop_enabled", "false");
        await withTimeout(closeDesktopPet(), 2500, "Desktop pet window did not close.");
        pushFeedback({
          title: copy.desktopPetClosed,
          detail: copy.residentPetDescription,
          mood: "wave",
        });
      }
    } catch (error) {
      if (enabled) {
        await update("pet_desktop_enabled", "false").catch(() => {});
        await withTimeout(
          closeDesktopPet(),
          2500,
          "Desktop pet window rollback did not close.",
        ).catch(() => {});
      }
      pushFailureFeedback(copy.desktopPet);
      console.warn("Desktop pet toggle failed", error);
      await reloadSettings();
    } finally {
      unlistenReady?.();
      setDesktopPetPending(false);
    }
  };

  const startFocus = () => {
    if (!requireModule(focusEnabled, copy.focusBuddyPlugin, "openpets.focus-buddy")) return;
    if (focusRunning) {
      pushFeedback({
        title: copy.focusAlreadyRunning,
        detail: formatTimer(focusSeconds),
        mood: "thinking",
        pluginId: "openpets.focus-buddy",
        tone: "info",
      });
      return;
    }
    setFocusRunning(true);
    pushFeedback({
      title: copy.focusStarted,
      detail: formatTimer(focusSeconds),
      mood: "thinking",
      pluginId: "openpets.focus-buddy",
    });
  };

  const pauseFocus = () => {
    if (!requireModule(focusEnabled, copy.focusBuddyPlugin, "openpets.focus-buddy")) return;
    if (!focusRunning) {
      pushFeedback({
        title: copy.focusNotRunning,
        detail: formatTimer(focusSeconds),
        mood: "thinking",
        pluginId: "openpets.focus-buddy",
        tone: "info",
      });
      return;
    }
    setFocusRunning(false);
    pushFeedback({
      title: copy.focusPaused,
      detail: formatTimer(focusSeconds),
      mood: "wave",
      pluginId: "openpets.focus-buddy",
    });
  };

  const resetFocus = () => {
    if (!requireModule(focusEnabled, copy.focusBuddyPlugin, "openpets.focus-buddy")) return;
    if (!focusRunning && focusSeconds === 25 * 60) {
      pushFeedback({
        title: copy.focusAlreadyReset,
        detail: formatTimer(focusSeconds),
        mood: "idle",
        pluginId: "openpets.focus-buddy",
        tone: "info",
      });
      return;
    }
    setFocusRunning(false);
    setFocusSeconds(25 * 60);
    pushFeedback({
      title: copy.focusResetDone,
      detail: formatTimer(25 * 60),
      mood: "idle",
      pluginId: "openpets.focus-buddy",
    });
  };

  const runPluginAction = async (pluginId: PetPluginId) => {
    const plugin = PET_PLUGINS.find((item) => item.id === pluginId);
    const pluginName = plugin ? copy[plugin.nameKey] : pluginId;
    if (!requireModule(activePluginIds.includes(pluginId), pluginName, pluginId)) return;
    if (runningPlugins[pluginId]) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setRunningPlugins((current) => ({ ...current, [pluginId]: true }));
    const finishWithFeedback = async (detail: string, mood: PetMood, tone?: FeedbackTone) => {
      const award = await awardModuleCare(pluginId, pluginName);
      pushPluginFeedback({
        pluginId,
        title: copy.moduleUsed.replace("{name}", pluginName),
        detail,
        award,
        mood,
        tone,
      });
    };

    try {
      switch (pluginId) {
        case "openpets.reminders":
          await finishWithFeedback(
            `${copy.reminderSoon} ${copy.reminderSnoozed} ${copy.reminderDone}`,
            "wave",
          );
          break;
        case "openpets.virtual-pet":
          await careForPet({
            action: "play",
            label: pluginName,
            resultText: copy.virtualPetResult,
            mood: "hop",
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
          await finishWithFeedback(copy.waterLogged.replace("{time}", now), "hop");
          break;
        case "openpets.day-routine":
          await finishWithFeedback(`${copy.routineChecked} ${copy.dailyHabitChecked}`, "wave");
          break;
        case "openpets.mood-check-in":
          await finishWithFeedback(copy.moodChecked, "thinking");
          break;
        case "openpets.launch-buddy":
          await finishWithFeedback(copy.launchChecked, "thinking");
          break;
        case "openpets.magic-8-ball": {
          const question = magicQuestion.trim();
          if (!question) {
            pushFeedback({
              title: copy.magic8BallPlugin,
              detail: copy.magicQuestionFallback,
              mood: "thinking",
              pluginId,
              tone: "info",
            });
            break;
          }
          const answers = [copy.magicAnswerA, copy.magicAnswerB, copy.magicAnswerC];
          const detail = `${question}: ${answers[Math.floor(Math.random() * answers.length)]}`;
          await finishWithFeedback(detail, "wave");
          break;
        }
        case "openpets.fortune-cookie": {
          const answers = [copy.fortuneAnswerA, copy.fortuneAnswerB, copy.fortuneAnswerC];
          const detail = answers[Math.floor(Math.random() * answers.length)];
          await finishWithFeedback(detail, "hop");
          break;
        }
        default:
          await finishWithFeedback(copy.noResultYet, "wave");
      }
    } finally {
      setRunningPlugins((current) => ({ ...current, [pluginId]: false }));
    }
  };

  return (
    <div className={cn("mx-auto max-w-7xl px-6 py-8", className)}>
      <header
        className="mb-6 flex flex-wrap items-center justify-between gap-4"
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
        <button
          type="button"
          onClick={() => setActiveView("shop")}
          className="flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary/45 px-3 text-xs font-bold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/10"
        >
          <CoinsIcon className="size-4 text-primary" weight="bold" />
          {copy.petShop}
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
            {formatNumber(careState.tokens)}
          </span>
        </button>
      </header>

      <nav
        aria-label="Pet sections"
        className="mb-5 flex flex-wrap gap-2 rounded-xl border border-border/70 bg-card p-2"
        style={{ animation: `card-in 350ms ${EASE_OUT} 35ms both` }}
      >
        {PET_VIEWS.map((view) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                "pet-view-tab flex h-10 min-w-28 items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {copy[PET_VIEW_COPY_KEYS[view]]}
            </button>
          );
        })}
      </nav>

      {activeView === "overview" && (
        <section
          className="mb-5 rounded-xl border border-border/70 bg-card p-5"
          style={{ animation: `card-in 350ms ${EASE_OUT} 60ms both` }}
        >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-xl font-bold text-foreground">{copy.growthTitle}</h3>
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                    {copy.level} {growthProgress.level}
                  </span>
                  <span className="rounded-full border border-border/70 bg-secondary/35 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {stageLabel}
                  </span>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {copy.growthDescription}
                </p>
              </div>
              <button
                type="button"
                disabled={careLoading || checkingIn}
                onClick={() => void handleDailyCheckin()}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60",
                  checkedInToday
                    ? "border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                <CalendarCheckIcon className="size-4" weight={checkedInToday ? "regular" : "fill"} />
                {checkingIn ? copy.applying : checkedInToday ? copy.checkedIn : copy.dailyCheckin}
              </button>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{nextLevelText}</span>
                <span>{formatNumber(careState.xp)} XP</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="pet-progress-fill h-full rounded-full bg-primary"
                  style={{ width: `${growthProgress.progress * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">{copy.totalXp}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatNumber(careState.xp)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">{copy.tokens}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatNumber(careState.tokens)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">{copy.tasks}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">
                  {formatNumber(careState.tasksCompleted)}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">{copy.streak}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">
                  {copy.days.replace("{count}", String(careState.checkinStreak))}
                </p>
              </div>
            </div>

            <div className="pet-playground mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <PawPrintIcon className="size-4 text-primary" weight="fill" />
                    {copy.playgroundTitle}
                  </h4>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    {copy.playgroundDescription}
                  </p>
                </div>
                <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  {copy.playCombo.replace("{combo}", String(careState.playCombo))}
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {PLAY_ACTION_CONFIG.map((item) => {
                  const Icon = item.icon;
                  const rule = PET_PLAY_ACTIONS[item.action];
                  const used = careState.playActionCountsToday[item.action] ?? 0;
                  const left = Math.max(0, rule.dailyLimit - used);
                  const pending = Boolean(playActionPending[item.action]);

                  return (
                    <button
                      key={item.action}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void playWithPet({
                          action: item.action,
                          label: copy[item.labelKey],
                          resultText: copy[item.resultKey],
                          mood: item.mood,
                        })
                      }
                      className={cn(
                        "pet-play-card pet-action-button min-h-32 rounded-lg border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-wait disabled:opacity-70",
                        pending && "border-primary/45 bg-primary/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                            <Icon className="size-4.5" weight={pending ? "fill" : "regular"} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-foreground">
                              {copy[item.labelKey]}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-foreground">
                              {copy.playDailyLeft
                                .replace("{left}", String(left))
                                .replace("{total}", String(rule.dailyLimit))}
                            </span>
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
                          {pending
                            ? copy.applying
                            : copy.playDailyLeft
                                .replace("{left}", String(left))
                                .replace("{total}", String(rule.dailyLimit))}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {copy[item.descriptionKey]}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-primary">
                        <CoinsIcon className="size-3.5" weight="fill" />
                        <span className="truncate">{formatPlayActionMeta(copy, item.action)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border/70 bg-secondary/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-foreground">{copy.dailyGoals}</h4>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {copy.dailyGoalProgress
                    .replace("{done}", String(completedDailyGoals))
                    .replace("{total}", String(PET_DAILY_GOALS.length))}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {dailyGoalProgress.map((goal) => (
                  <div
                    key={goal.id}
                    className={cn(
                      "rounded-lg border px-3 py-2 transition-colors",
                      goal.completed
                        ? "border-primary/35 bg-primary/10"
                        : "border-border/70 bg-background/45",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">
                        {copy[DAILY_GOAL_COPY_KEYS[goal.id]]}
                      </span>
                      <span className={cn("text-[11px] font-bold", goal.completed ? "text-primary" : "text-muted-foreground")}>
                        {goal.progress}/{goal.target}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="pet-progress-fill h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(1, goal.progress / goal.target) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="relative flex items-start justify-between gap-2">
                <div className="absolute left-6 right-6 top-5 h-0.5 bg-border" />
                <div
                  className="pet-progress-fill absolute left-6 top-5 h-0.5 bg-primary"
                  style={{ width: `${Math.max(0, (growthProgress.level - 1) / 6) * 100}%` }}
                />
                {PET_CARE_LEVELS.map((item) => {
                  const reached = growthProgress.level >= item.level;
                  const active = growthProgress.level === item.level;
                  const itemStageKey = `companionStage${item.level}` as keyof typeof copy;
                  return (
                    <div key={item.level} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-lg border text-xs font-bold transition-colors",
                          reached
                            ? "border-primary/60 bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground",
                          active && "shadow-[0_0_0_4px_rgba(200,241,53,0.14)]",
                        )}
                      >
                        {item.level}
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-bold text-foreground">Lv.{item.level}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{copy[itemStageKey]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{copy.petNameTitle}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {careState.petNameClaimed ? copy.petNameLocked : copy.petNameDescription}
                  </p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[11px] font-bold",
                  careState.petNameClaimed ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                )}>
                  {careState.petNameClaimed ? currentPetName : "1/1"}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  value={petNameDraft}
                  onChange={(event) => setPetNameDraft(event.target.value)}
                  disabled={careState.petNameClaimed || petNameSaving}
                  placeholder={copy.petNamePlaceholder}
                  maxLength={24}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border/70 bg-background/65 px-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={careState.petNameClaimed || petNameSaving}
                  onClick={() => void handleSavePetName()}
                  className="pet-action-button flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
                >
                  {petNameSaving ? copy.applying : copy.savePetName}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{copy.currentCompanion}</p>
                  <h4 className="mt-1 truncate font-heading text-lg font-bold text-foreground">{currentPetName}</h4>
                </div>
                <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {copy.petLevel}{currentPetProgress.level}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  dispatchPetAction("wave");
                  dispatchPetSpeech({
                    title: copy.currentCompanion,
                    message: formatPetHud(copy.virtualHud, petStats),
                    tone: "info",
                    durationMs: 3600,
                  });
                }}
                className="group flex w-full items-end justify-center rounded-lg bg-background/45 py-4 transition-colors hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                <PetSprite
                  variantId={currentPet.id}
                  state={previewMood === "idle" ? "idle" : previewMood}
                  width={112}
                  className="transition-transform duration-200 group-hover:scale-105"
                />
              </button>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="pet-progress-fill h-full rounded-full bg-primary"
                  style={{ width: `${currentPetProgress.progress * 100}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatBar label={copy.food} value={petStats.food} icon={ForkKnifeIcon} />
                <StatBar label={copy.energy} value={petStats.energy} icon={BatteryChargingIcon} />
                <StatBar label={copy.play} value={petStats.play} icon={SmileyIcon} />
                <StatBar label={copy.bond} value={petStats.bond} icon={HeartIcon} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {CARE_ACTION_CONFIG.map((item) => {
                  const Icon = item.icon;
                  const pending = Boolean(careActionPending[item.action]);
                  return (
                    <button
                      key={item.action}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void careForPet({
                          action: item.action,
                          label: copy[item.labelKey],
                          resultText: copy[item.resultKey],
                          mood: item.mood,
                          requireVirtualModule: false,
                        })
                      }
                      className="pet-action-button flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-2 text-[11px] font-bold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/10 disabled:cursor-wait disabled:opacity-70"
                    >
                      <Icon className="size-4 text-primary" weight={pending ? "fill" : "regular"} />
                      <span className="truncate">{copy[item.labelKey]}</span>
                      <span className="max-w-full truncate text-[9px] font-semibold text-muted-foreground">
                        {formatCareActionMeta(copy, item.action)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.workFeedsPet}</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-secondary/20 p-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">{copy.residentPet}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{copy.residentPetDescription}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {settings.pet_enabled ? copy.enabled : copy.disabled}
                </span>
                <Toggle checked={settings.pet_enabled} onChange={(value) => void toggleResidentPet(value)} />
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <BrainIcon className="size-4 text-primary" weight="fill" />
                    {copy.aiGrowthTitle}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {copy.aiGrowthDescription}
                  </p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[11px] font-bold",
                  aiConfigured ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                )}>
                  {copy.aiBudgetUse
                    .replace("{used}", String(aiUsedToday))
                    .replace("{limit}", String(aiDailyLimit))}
                </span>
              </div>

              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/45 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-foreground">{copy.aiTokenConsent}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {copy.aiTokenConsentHint}
                  </p>
                </div>
                <Toggle
                  checked={settings.pet_ai_token_enabled}
                  onChange={(value) => void togglePetAiTokenUse(value)}
                />
              </div>

              <div className="mb-3">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>{copy.aiDailyBudget}</span>
                  <span>{aiDailyLimit}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 5].map((budget) => (
                    <button
                      key={budget}
                      type="button"
                      onClick={() => void updateAiDailyBudget(budget)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                        aiDailyLimit === budget
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-background/55 text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {budget}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void runAiGrowth()}
                disabled={aiGrowthPending}
                className={cn(
                  "pet-action-button flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors disabled:cursor-wait disabled:opacity-70",
                  aiConfigured && settings.pet_ai_token_enabled && !aiBudgetReached
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <MagicWandIcon className="size-4" weight="fill" />
                {aiGrowthPending ? copy.aiGrowing : copy.aiGrowAction}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-secondary/20 p-3">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <DesktopIcon className="size-4 text-primary" weight="fill" />
                  {copy.desktopPet}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {copy.desktopPetDescription}
                </p>
              </div>
              <button
                type="button"
                disabled={desktopPetPending}
                onClick={() => void toggleDesktopPet(!settings.pet_desktop_enabled)}
                className={cn(
                  "pet-action-button flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors disabled:cursor-wait disabled:opacity-70",
                  settings.pet_desktop_enabled
                    ? "border border-border bg-background/60 text-foreground hover:bg-secondary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                <RobotIcon className="size-4" weight={settings.pet_desktop_enabled ? "regular" : "fill"} />
                {settings.pet_desktop_enabled ? copy.backToPlayer : copy.enterDesktop}
              </button>
            </div>

            <div
              key={`overview-${activeFeedback.nonce}`}
              aria-live="polite"
              className={cn(
                "pet-feedback-card flex items-start gap-3 rounded-lg border p-3",
                activeFeedback.tone === "success"
                  ? "border-primary/45 bg-primary/10"
                  : "border-border bg-secondary/25",
              )}
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
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{copy.latestFeedback}</p>
                <h4 className="text-sm font-bold text-foreground">{activeFeedback.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeFeedback.detail}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-heading text-sm font-bold text-foreground">{copy.recentActivity}</h4>
              {careState.recentEvents.length > 0 ? (
                <div className="space-y-2">
                  {careState.recentEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/25 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{event.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(event.at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary">
                        {formatEventTokens(event.tokens)} / +{event.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-secondary/25 p-3 text-xs leading-relaxed text-muted-foreground">
                  {copy.noActivity}
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
      )}

      {activeView === "library" && (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          className="rounded-xl border border-border/70 bg-card"
          style={{ animation: `card-in 350ms ${EASE_OUT} 120ms both` }}
        >
          <div className="border-b border-border/70 p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">{copy.choosePet}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.choosePetDescription} {copy.owned}: {ownedCount}/{PET_CATALOG.length}
                </p>
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

          <div className="grid max-h-[600px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 overflow-y-auto p-5">
            {pets.map((pet) => {
              const applied = settings.pet_variant === pet.id;
              const previewing = previewPetId === pet.id;
              const unlocked = isPetUnlocked(pet.id, careState);
              const owned = isPetOwned(pet.id, careState);
              const unlockLevel = getPetUnlockLevel(pet.id);
              const petProgress = getPetCareProgress(getPetXp(careState, pet.id));

              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => previewPetChoice(pet.id)}
                  className={cn(
                    "group relative min-h-44 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    previewing && unlocked
                      ? "border-primary/70 bg-primary/10"
                      : "border-border bg-secondary/20 hover:border-muted-foreground/35 hover:bg-secondary/40",
                    (!unlocked || !owned) && "opacity-75",
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      {sourceLabel(pet, copy)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
                        unlocked && owned ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {unlocked && owned
                        ? applied
                          ? copy.selected
                          : previewing
                            ? copy.previewing
                            : `Lv.${petProgress.level}`
                        : unlocked
                          ? copy.buyPet
                          : copy.unlockAt.replace("{level}", String(unlockLevel))}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-heading text-base font-bold text-foreground">
                        {pet.displayName}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {pet.description}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className={cn("h-full rounded-full", unlocked ? "bg-primary" : "bg-muted-foreground/40")}
                          style={{ width: `${unlocked ? petProgress.progress * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className={cn("relative flex h-24 w-20 shrink-0 items-end justify-center", (!unlocked || !owned) && "grayscale")}>
                      <PetSprite
                        variantId={pet.id}
                        state={previewing && unlocked ? "wave" : "idle"}
                        width={76}
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
          className="rounded-xl border border-border/70 bg-card"
          style={{ animation: `card-in 350ms ${EASE_OUT} 180ms both` }}
        >
          <div className="border-b border-border/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">{copy.preview}</p>
                <h3 className="mt-1 truncate font-heading text-xl font-bold text-foreground">
                  {previewPet.displayName}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{previewPet.description}</p>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {copy.petLevel}{previewPetProgress.level}
              </span>
            </div>
          </div>

          <div className="flex min-h-64 items-end justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(200,241,53,0.13),transparent_38%)] p-7">
            <PetSprite
              key={`${previewPet.id}-${previewMood}`}
              variantId={previewPet.id}
              state={previewMood === "hop" ? "hop" : previewMood}
              width={146}
            />
          </div>

          <div className="space-y-4 border-t border-border/70 p-5">
            <div>
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
                      "pet-action-button rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                      previewMood === action.mood
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border bg-secondary/25 text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={previewMood === action.mood}
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
                  "pet-action-button mt-3 flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                  applyingPet
                    ? "cursor-wait bg-secondary text-muted-foreground"
                    : isPetUnlocked(previewPet.id, careState)
                      ? isPetAvailable(previewPet.id, careState)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border bg-secondary/40 text-muted-foreground"
                      : "border border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                {applyingPet
                  ? copy.applying
                  : isPetAvailable(previewPet.id, careState)
                    ? copy.selectPet
                    : isPetUnlocked(previewPet.id, careState)
                      ? copy.buyFor.replace("{cost}", String(getPetStorePrice(previewPet.id)))
                      : copy.unlockAt.replace("{level}", String(getPetUnlockLevel(previewPet.id)))}
              </button>
            </div>

            <div
              key={`side-${activeFeedback.nonce}`}
              aria-live="polite"
              className={cn(
                "pet-feedback-card flex items-start gap-3 rounded-lg border p-3",
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
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{copy.latestFeedback}</p>
                <h4 className="text-sm font-bold text-foreground">{activeFeedback.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeFeedback.detail}</p>
              </div>
            </div>

          </div>
        </aside>
      </div>
      )}

      {activeView === "shop" && (
        <section
          className="rounded-xl border border-border/70 bg-card"
          style={{ animation: `card-in 350ms ${EASE_OUT} 90ms both` }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 p-5">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">{copy.petShop}</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {copy.petShopDescription}
              </p>
            </div>
            <span className="flex h-9 items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 text-xs font-bold text-primary">
              <CoinsIcon className="size-4" weight="fill" />
              {formatNumber(careState.tokens)} {copy.tokens}
            </span>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {shopPets.map((pet) => {
              const unlocked = isPetUnlocked(pet.id, careState);
              const owned = isPetOwned(pet.id, careState);
              const price = getPetStorePrice(pet.id);
              const unlockLevel = getPetUnlockLevel(pet.id);
              const buying = buyingPetId === pet.id;
              const canBuy = unlocked && !owned && careState.tokens >= price;

              return (
                <article
                  key={pet.id}
                  className={cn(
                    "flex min-h-52 flex-col rounded-lg border p-4 transition-colors",
                    owned
                      ? "border-primary/40 bg-primary/8"
                      : unlocked
                        ? "border-border bg-secondary/20"
                        : "border-border/70 bg-secondary/10 opacity-75",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                          {sourceLabel(pet, copy)}
                        </span>
                        <span className={cn(
                          "rounded-full px-2 py-1 text-[11px] font-bold",
                          owned ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                        )}>
                          {owned
                            ? copy.owned
                            : unlocked
                              ? copy.buyFor.replace("{cost}", String(price))
                              : copy.unlockAt.replace("{level}", String(unlockLevel))}
                        </span>
                      </div>
                      <h4 className="truncate font-heading text-base font-bold text-foreground">{pet.displayName}</h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {pet.description}
                      </p>
                    </div>
                    <div className={cn("relative flex h-24 w-20 shrink-0 items-end justify-center", !owned && "grayscale")}>
                      <PetSprite
                        variantId={pet.id}
                        state={owned ? "wave" : "idle"}
                        width={78}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2"
                      />
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      disabled={buying || applyingPet}
                      onClick={() => owned ? void applyOwnedShopPet(pet) : void buyPet(pet)}
                      className={cn(
                        "pet-action-button flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-70",
                        owned || canBuy
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {owned ? (
                        <PawPrintIcon className="size-4" weight="fill" />
                      ) : (
                        <CoinsIcon className="size-4" weight={canBuy ? "fill" : "regular"} />
                      )}
                      {buying
                        ? copy.applying
                        : owned
                          ? settings.pet_variant === pet.id
                            ? copy.selected
                            : copy.selectPet
                          : unlocked
                            ? copy.buyFor.replace("{cost}", String(price))
                            : copy.unlockAt.replace("{level}", String(unlockLevel))}
                    </button>
                    {!owned && unlocked && careState.tokens < price && (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {copy.shopTokenShort}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeView === "modules" && (
          <section
            role="region"
            aria-labelledby="pet-modules-title"
            className="rounded-xl border border-border/70 bg-card"
            style={{ animation: `card-in 350ms ${EASE_OUT} 80ms both` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 p-5">
              <div>
                <h3 id="pet-modules-title" className="font-heading text-lg font-bold text-foreground">{copy.moduleTitle}</h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {copy.modulePanelHint}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {copy.activeModules.replace("{count}", String(activePluginCount))}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveView("overview")}
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  aria-label={copy.closeModules}
                >
                  <XIcon className="size-4" weight="bold" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PET_PLUGINS.map((plugin) => {
                  const Icon = PLUGIN_ICONS[plugin.id];
                  const checked = activePluginIds.includes(plugin.id);
                  const result = moduleResults[plugin.id] ?? copy.noResultYet;

                  return (
                    <article
                      key={plugin.id}
                      className={cn(
                        "flex min-h-48 flex-col rounded-lg border p-4 transition-colors",
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
                        <Toggle
                          checked={checked}
                          disabled={Boolean(pluginTogglePending[plugin.id])}
                          onChange={(value) => void togglePlugin(plugin.id, value)}
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {copy[plugin.descriptionKey]}
                      </p>
                      {plugin.id === "openpets.magic-8-ball" && (
                        <label className="mt-3 block">
                          <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                            {copy.askPetQuestion}
                          </span>
                          <input
                            value={magicQuestion}
                            onChange={(event) => setMagicQuestion(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void runPluginAction(plugin.id);
                            }}
                            placeholder={copy.askPetPlaceholder}
                            className="h-9 w-full rounded-lg border border-border/70 bg-background/65 px-3 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                            maxLength={160}
                          />
                        </label>
                      )}
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
                          onClick={() => checked ? void runPluginAction(plugin.id) : void togglePlugin(plugin.id, true)}
                          disabled={Boolean(runningPlugins[plugin.id] || pluginTogglePending[plugin.id])}
                          className={cn(
                            "flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-wait disabled:opacity-70",
                            checked
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "border border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          <PlayIcon className="size-3.5" weight={checked ? "fill" : "regular"} />
                          {runningPlugins[plugin.id]
                            ? copy.applying
                            : checked
                              ? copy.useModule
                              : copy.enableModule}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className={cn("rounded-lg border border-border bg-secondary/20 p-4", !virtualPetEnabled && "opacity-80")}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-heading text-sm font-bold text-foreground">{copy.virtualStats}</h4>
                    <HeartIcon className="size-4 text-primary" weight={virtualPetEnabled ? "fill" : "regular"} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <StatBar label={copy.food} value={petStats.food} icon={ForkKnifeIcon} />
                    <StatBar label={copy.energy} value={petStats.energy} icon={BatteryChargingIcon} />
                    <StatBar label={copy.play} value={petStats.play} icon={SmileyIcon} />
                    <StatBar label={copy.bond} value={petStats.bond} icon={HeartIcon} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {CARE_ACTION_CONFIG.map((item) => {
                      const Icon = item.icon;
                      const pending = Boolean(careActionPending[item.action]);
                      return (
                        <button
                          key={item.action}
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            void careForPet({
                              action: item.action,
                              label: copy[item.labelKey],
                              resultText: copy[item.resultKey],
                              mood: item.mood,
                              requireVirtualModule: true,
                            })
                          }
                          className={cn(
                            "pet-action-button flex min-h-14 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-wait disabled:opacity-70",
                            pending && "border-primary/45 bg-primary/10",
                            !virtualPetEnabled && "text-muted-foreground",
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-primary" weight={pending ? "fill" : "regular"} />
                          <span className="min-w-0">
                            <span className="block truncate">{copy[item.labelKey]}</span>
                            <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">
                              {formatCareActionMeta(copy, item.action)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={cn("rounded-lg border border-border bg-secondary/20 p-4", !focusEnabled && "opacity-55")}>
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
                      onClick={startFocus}
                      className={cn(
                        "pet-action-button flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground",
                        !focusEnabled && "border border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                        focusRunning && "bg-primary/80",
                      )}
                    >
                      <PlayIcon className="size-3.5" weight="fill" />
                      {copy.startFocus}
                    </button>
                    <button
                      type="button"
                      onClick={pauseFocus}
                      className={cn(
                        "pet-action-button flex items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground",
                        !focusEnabled && "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <PauseIcon className="size-3.5" weight="fill" />
                      {copy.pauseFocus}
                    </button>
                    <button
                      type="button"
                      onClick={resetFocus}
                      className={cn(
                        "pet-action-button flex items-center justify-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-foreground",
                        !focusEnabled && "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <ArrowCounterClockwiseIcon className="size-3.5" />
                      {copy.resetFocus}
                    </button>
                  </div>
                </div>

                <div
                  key={`module-${activeFeedback.nonce}`}
                  aria-live="polite"
                  className="pet-feedback-card rounded-lg border border-border/70 bg-secondary/20 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <FeedbackIcon className="size-4 text-primary" weight="fill" />
                    <h4 className="font-heading text-sm font-bold text-foreground">{copy.latestFeedback}</h4>
                  </div>
                  <p className="text-sm font-bold text-foreground">{activeFeedback.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeFeedback.detail}</p>
                </div>
              </div>
            </div>
          </section>
      )}
    </div>
  );
}
