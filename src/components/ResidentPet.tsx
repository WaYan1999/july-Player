import {
  BatteryChargingIcon,
  ForkKnifeIcon,
  HeartIcon,
  SmileyIcon,
  type Icon,
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import {
  applyPetCareAction,
  getPetCareState,
  PET_CARE_ACTIONS,
  PET_CARE_UPDATED_EVENT,
  type PetCareActionId,
  type PetCareActionResult,
  type PetVitals,
} from "@/lib/petCare";
import {
  createPetSpriteStyle,
  PET_ACTION_EVENT,
  PET_SPEAK_EVENT,
  type PetSpeechPayload,
  type PetState,
} from "@/lib/pets";

const PET_POSITION_KEY = "july-player:resident-pet-position";
const PET_SIZE = { width: 82, height: 88 };
const PET_MARGIN = 12;
const WHEEL_ARC_SIZE = { width: 154, height: 188 };
const PetWheelButton = Button as (
  props: ComponentProps<typeof Button> & { title?: string },
) => ReactElement;

type Point = { x: number; y: number };
type SpeechState = Required<Pick<PetSpeechPayload, "message" | "tone">> &
  Pick<PetSpeechPayload, "title"> & {
    nonce: number;
  };
type ResidentPetCopy = Record<
  | "clickTitle"
  | "clickMessage"
  | "wheelTitle"
  | "feed"
  | "play"
  | "pet"
  | "nap"
  | "food"
  | "energy"
  | "bond"
  | "fedMessage"
  | "playMessage"
  | "petMessage"
  | "napMessage"
  | "careReward"
  | "careCost"
  | "careFree"
  | "careBlocked"
  | "careCooldown"
  | "careDailyLimit"
  | "careTokenShort"
  | "careStatFull"
  | "careStatLow"
  | "actionFailed",
  string
>;

const PET_COPY = {
  en: {
    clickTitle: "Pet",
    clickMessage: "Choose a care action, or drag me anywhere while you watch.",
    wheelTitle: "Care",
    feed: "Feed",
    play: "Play",
    pet: "Pet",
    nap: "Rest",
    food: "Food",
    energy: "Energy",
    bond: "Bond",
    fedMessage: "Snack served.",
    playMessage: "A quick game helped.",
    petMessage: "Thanks for the attention.",
    napMessage: "Rest time started.",
    careReward: "+{xp} XP",
    careCost: "{cost} tokens spent",
    careFree: "Free action",
    careBlocked: "Not now",
    careCooldown: "Try again in {seconds}s.",
    careDailyLimit: "Daily care limit reached.",
    careTokenShort: "Not enough tokens. Finish a lesson or check in first.",
    careStatFull: "That need is already high.",
    careStatLow: "Food or energy is too low.",
    actionFailed: "Action failed. Please try again.",
  },
  zh: {
    clickTitle: "宠物",
    clickMessage: "选择一个照顾动作，也可以拖动我换位置。",
    wheelTitle: "照顾",
    feed: "喂养",
    play: "玩耍",
    pet: "抚摸",
    nap: "休息",
    food: "食物",
    energy: "能量",
    bond: "羁绊",
    fedMessage: "零食已经送到。",
    playMessage: "陪宠物玩了一会儿。",
    petMessage: "宠物收到了抚摸。",
    napMessage: "宠物开始休息。",
    careReward: "+{xp} XP",
    careCost: "消耗 {cost} 代币",
    careFree: "免费动作",
    careBlocked: "暂时不能执行",
    careCooldown: "还在冷却，{seconds} 秒后再试。",
    careDailyLimit: "今天照顾次数已达上限。",
    careTokenShort: "代币不够，先完成课程或签到。",
    careStatFull: "这个状态已经很高了。",
    careStatLow: "食物或能量太低了。",
    actionFailed: "操作失败，请再试一次。",
  },
  fr: {
    clickTitle: "Compagnon",
    clickMessage: "Choisissez une action, ou deplacez-moi pendant la lecture.",
    wheelTitle: "Soin",
    feed: "Nourrir",
    play: "Jouer",
    pet: "Calin",
    nap: "Repos",
    food: "Nourriture",
    energy: "Energie",
    bond: "Lien",
    fedMessage: "Collation servie.",
    playMessage: "Petit jeu termine.",
    petMessage: "Merci pour l'attention.",
    napMessage: "Repos commence.",
    careReward: "+{xp} XP",
    careCost: "{cost} jetons utilises",
    careFree: "Action gratuite",
    careBlocked: "Pas maintenant",
    careCooldown: "Reessayez dans {seconds}s.",
    careDailyLimit: "Limite quotidienne atteinte.",
    careTokenShort: "Pas assez de jetons.",
    careStatFull: "Ce besoin est deja eleve.",
    careStatLow: "Nourriture ou energie trop basse.",
    actionFailed: "Action echouee. Reessayez.",
  },
} as const satisfies Record<string, ResidentPetCopy>;

const CARE_WHEEL_ACTIONS: {
  id: PetCareActionId;
  icon: Icon;
  mood: PetState;
  labelKey: "feed" | "play" | "pet" | "nap";
  messageKey: "fedMessage" | "playMessage" | "petMessage" | "napMessage";
  x: number;
  y: number;
}[] = [
  {
    id: "feed",
    icon: ForkKnifeIcon,
    mood: "hop",
    labelKey: "feed",
    messageKey: "fedMessage",
    x: 26,
    y: 4,
  },
  {
    id: "play",
    icon: SmileyIcon,
    mood: "hop",
    labelKey: "play",
    messageKey: "playMessage",
    x: 86,
    y: 43,
  },
  {
    id: "pet",
    icon: HeartIcon,
    mood: "wave",
    labelKey: "pet",
    messageKey: "petMessage",
    x: 86,
    y: 99,
  },
  {
    id: "nap",
    icon: BatteryChargingIcon,
    mood: "thinking",
    labelKey: "nap",
    messageKey: "napMessage",
    x: 26,
    y: 137,
  },
];

function clampPosition(point: Point): Point {
  if (typeof window === "undefined") return point;

  return {
    x: Math.min(
      Math.max(PET_MARGIN, point.x),
      Math.max(PET_MARGIN, window.innerWidth - PET_SIZE.width - PET_MARGIN),
    ),
    y: Math.min(
      Math.max(PET_MARGIN, point.y),
      Math.max(PET_MARGIN, window.innerHeight - PET_SIZE.height - PET_MARGIN),
    ),
  };
}

function getDefaultPosition(): Point {
  if (typeof window === "undefined") return { x: PET_MARGIN, y: PET_MARGIN };

  return clampPosition({
    x: window.innerWidth - PET_SIZE.width - 24,
    y: window.innerHeight - PET_SIZE.height - 24,
  });
}

function isNotesRoute() {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#/notes");
}

function overlapsProtectedContent(point: Point) {
  if (typeof window === "undefined" || !isNotesRoute()) return false;

  const centerX = point.x + PET_SIZE.width / 2;
  const centerY = point.y + PET_SIZE.height / 2;
  const protectedLeft = Math.min(220, window.innerWidth * 0.26);
  const protectedRight = window.innerWidth * 0.78;
  const protectedTop = 110;
  const protectedBottom = Math.max(protectedTop, window.innerHeight - 170);

  return (
    centerX >= protectedLeft &&
    centerX <= protectedRight &&
    centerY >= protectedTop &&
    centerY <= protectedBottom
  );
}

function getInitialPosition(): Point {
  if (typeof window === "undefined") return { x: PET_MARGIN, y: PET_MARGIN };

  try {
    const saved = localStorage.getItem(PET_POSITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Point>;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        const restored = clampPosition({ x: parsed.x, y: parsed.y });
        return overlapsProtectedContent(restored) ? getDefaultPosition() : restored;
      }
    }
  } catch {
    // Ignore invalid saved positions.
  }

  return getDefaultPosition();
}

function formatRemainingSeconds(ms = 0) {
  return String(Math.max(1, Math.ceil(ms / 1000)));
}

function formatPetTransform(point: Point) {
  return `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0)`;
}

function formatActionMeta(
  copy: Pick<ResidentPetCopy, "careCost" | "careFree">,
  action: PetCareActionId,
) {
  const cost = PET_CARE_ACTIONS[action].tokenCost;
  return cost > 0 ? copy.careCost.replace("{cost}", String(cost)) : copy.careFree;
}

function formatVitals(copy: Pick<ResidentPetCopy, "food" | "energy" | "bond">, vitals: PetVitals) {
  return `${copy.food} ${vitals.food}% · ${copy.energy} ${vitals.energy}% · ${copy.bond} ${vitals.bond}%`;
}

function getCareFailureDetail(copy: ResidentPetCopy, result: PetCareActionResult) {
  if (result.reason === "cooldown") {
    return copy.careCooldown.replace("{seconds}", formatRemainingSeconds(result.cooldownRemainingMs));
  }
  if (result.reason === "daily_limit") return copy.careDailyLimit;
  if (result.reason === "not_enough_tokens") return copy.careTokenShort;
  if (result.reason === "stat_full") return copy.careStatFull;
  if (result.reason === "stat_low") return copy.careStatLow;
  return copy.actionFailed;
}

export function ResidentPet() {
  const { language } = useI18n();
  const { settings } = useSettings();
  const copy = PET_COPY[language as keyof typeof PET_COPY] ?? PET_COPY.en;
  const [position, setPosition] = useState<Point>(getInitialPosition);
  const [petState, setPetState] = useState<PetState>("idle");
  const [animationNonce, setAnimationNonce] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [speech, setSpeech] = useState<SpeechState | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PetCareActionId | null>(null);
  const [petName, setPetName] = useState("");
  const positionRef = useRef(position);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<Point | null>(null);
  const pendingActionRef = useRef<PetCareActionId | null>(null);
  const suppressClickRef = useRef(false);
  const bubbleOnRight = typeof window !== "undefined" && position.x < window.innerWidth / 2;
  const wheelOnRight =
    typeof window !== "undefined" &&
    position.x < window.innerWidth - WHEEL_ARC_SIZE.width - PET_SIZE.width - PET_MARGIN;
  const wheelTop = useMemo(() => {
    const centeredTop = (PET_SIZE.height - WHEEL_ARC_SIZE.height) / 2;
    if (typeof window === "undefined") return centeredTop;

    const minTop = PET_MARGIN - position.y;
    const maxTop = window.innerHeight - PET_MARGIN - position.y - WHEEL_ARC_SIZE.height;
    return Math.min(Math.max(centeredTop, minTop), maxTop);
  }, [position.y]);

  const spriteStyle = useMemo(
    () => createPetSpriteStyle(petState, settings.pet_variant, PET_SIZE.width),
    [petState, settings.pet_variant],
  );

  const settleToIdle = useCallback((delay = 900) => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => setPetState("idle"), delay);
  }, []);

  const persistPosition = useCallback((point: Point) => {
    try {
      localStorage.setItem(PET_POSITION_KEY, JSON.stringify(point));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const schedulePositionCommit = useCallback((point: Point) => {
    positionRef.current = point;
    pendingPositionRef.current = point;

    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const nextPosition = pendingPositionRef.current;
      if (!nextPosition) return;
      pendingPositionRef.current = null;
      if (rootRef.current) {
        rootRef.current.style.transform = formatPetTransform(nextPosition);
      }
    });
  }, []);

  const flushPositionCommit = useCallback((point: Point) => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    pendingPositionRef.current = null;
    positionRef.current = point;
    setPosition(point);
  }, []);

  const showSpeech = useCallback((payload: PetSpeechPayload) => {
    if (!payload.message.trim()) return;

    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setSpeech({
      title: payload.title,
      message: payload.message.trim(),
      tone: payload.tone ?? "info",
      nonce: Date.now(),
    });
    speechTimerRef.current = setTimeout(
      () => setSpeech(null),
      payload.durationMs ?? 5200,
    );
  }, []);

  const closeWheel = useCallback(() => {
    if (wheelTimerRef.current) {
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    setWheelOpen(false);
  }, []);

  const openWheel = useCallback(() => {
    setWheelOpen(true);
    showSpeech({
      title: petName || copy.clickTitle,
      message: copy.clickMessage,
      tone: "info",
      durationMs: 3600,
    });
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      wheelTimerRef.current = null;
      setWheelOpen(false);
    }, 9000);
  }, [copy.clickMessage, copy.clickTitle, petName, showSpeech]);

  const refreshVitals = useCallback(async () => {
    try {
      const state = await getPetCareState(settings.pet_variant);
      setPetName(state.petName);
    } catch {
      setPetName("");
    }
  }, [settings.pet_variant]);

  const runCareAction = async (action: (typeof CARE_WHEEL_ACTIONS)[number]) => {
    if (pendingActionRef.current) return;

    pendingActionRef.current = action.id;
    setPendingAction(action.id);
    setPetState(action.mood);
    setAnimationNonce((current) => current + 1);
    showSpeech({
      title: copy[action.labelKey],
      message: formatActionMeta(copy, action.id),
      tone: "info",
      durationMs: 1600,
    });

    try {
      const result = await applyPetCareAction({
        action: action.id,
        petId: settings.pet_variant,
        label: copy[action.labelKey],
      });
      if (result.skipped) {
        showSpeech({
          title: copy.careBlocked,
          message: getCareFailureDetail(copy, result),
          tone: "warning",
          durationMs: 4200,
        });
        setPetState("thinking");
        settleToIdle(1200);
        return;
      }

      const reward = copy.careReward.replace("{xp}", String(result.xp));
      showSpeech({
        title: petName || copy[action.labelKey],
        message: `${copy[action.messageKey]} ${formatVitals(copy, result.vitals)} ${reward}`,
        tone: "success",
        durationMs: 5200,
      });
      settleToIdle(1000);
    } catch {
      showSpeech({
        title: petName || copy.careBlocked,
        message: copy.actionFailed,
        tone: "warning",
        durationMs: 4200,
      });
      setPetState("thinking");
      settleToIdle(1200);
    } finally {
      pendingActionRef.current = null;
      setPendingAction(null);
      closeWheel();
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextPosition = clampPosition(positionRef.current);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - nextPosition.x,
      offsetY: event.clientY - nextPosition.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    closeWheel();
    flushPositionCommit(nextPosition);
    setIsDragging(true);
    setPetState("walk");
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 4) drag.moved = true;

    const nextPosition = clampPosition({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    });
    schedulePositionCommit(nextPosition);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    const moved = drag.moved;
    suppressClickRef.current = moved;
    const finalPosition = clampPosition(positionRef.current);
    flushPositionCommit(finalPosition);
    persistPosition(finalPosition);
    setIsDragging(false);
    setPetState(moved ? "hop" : "wave");
    settleToIdle(moved ? 850 : 700);
    dragRef.current = null;
  };

  useEffect(() => {
    if (dragRef.current) return;
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    void refreshVitals();
  }, [refreshVitals]);

  useEffect(() => {
    const handleCareUpdate = () => void refreshVitals();
    window.addEventListener(PET_CARE_UPDATED_EVENT, handleCareUpdate);
    return () => window.removeEventListener(PET_CARE_UPDATED_EVENT, handleCareUpdate);
  }, [refreshVitals]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        const clamped = clampPosition(current);
        const next = overlapsProtectedContent(clamped) ? getDefaultPosition() : clamped;
        positionRef.current = next;
        persistPosition(next);
        return next;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [persistPosition]);

  useEffect(() => {
    const moveAwayFromProtectedContent = () => {
      if (!isNotesRoute()) return;
      const current = clampPosition(positionRef.current);
      if (!overlapsProtectedContent(current)) {
        persistPosition(current);
        return;
      }
      const next = getDefaultPosition();
      flushPositionCommit(next);
      persistPosition(next);
    };

    moveAwayFromProtectedContent();
    window.addEventListener("hashchange", moveAwayFromProtectedContent);
    return () => {
      window.removeEventListener("hashchange", moveAwayFromProtectedContent);
    };
  }, [flushPositionCommit, persistPosition]);

  useEffect(() => {
    if (!wheelOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      closeWheel();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWheel();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeWheel, wheelOpen]);

  useEffect(() => {
    const handlePetAction = (event: Event) => {
      const nextState = (event as CustomEvent<PetState>).detail;
      if (!nextState) return;

      setPetState(nextState);
      setAnimationNonce((current) => current + 1);
      settleToIdle(nextState === "thinking" ? 1500 : 900);
    };

    window.addEventListener(PET_ACTION_EVENT, handlePetAction);
    return () => window.removeEventListener(PET_ACTION_EVENT, handlePetAction);
  }, [settleToIdle]);

  useEffect(() => {
    const handlePetSpeech = (event: Event) => {
      const payload = (event as CustomEvent<PetSpeechPayload>).detail;
      if (payload) showSpeech(payload);
    };

    window.addEventListener(PET_SPEAK_EVENT, handlePetSpeech);
    return () => window.removeEventListener(PET_SPEAK_EVENT, handlePetSpeech);
  }, [showSpeech]);

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    },
    [],
  );

  if (!settings.pet_enabled) return null;

  return (
    <div
      ref={rootRef}
      className="resident-pet fixed z-[80] border-0 bg-transparent p-0"
      style={{
        left: 0,
        top: 0,
        transform: formatPetTransform(position),
        width: PET_SIZE.width,
        height: PET_SIZE.height,
      }}
    >
      {wheelOpen && (
        <div
          className={cn(
            "resident-pet-wheel absolute z-20",
            wheelOnRight ? "resident-pet-wheel-right left-[68px]" : "resident-pet-wheel-left right-[68px]",
          )}
          style={{ top: wheelTop }}
          role="menu"
          aria-label={copy.wheelTitle}
        >
          {CARE_WHEEL_ACTIONS.map((action, index) => {
            const IconComponent = action.icon;
            const running = pendingAction === action.id;
            return (
              <PetWheelButton
                key={action.id}
                type="button"
                variant="ghost"
                isDisabled={Boolean(pendingAction)}
                className={cn("resident-pet-wheel-item", running && "is-running")}
                style={
                  {
                    "--pet-wheel-x": `${action.x}px`,
                    "--pet-wheel-y": `${action.y}px`,
                    "--pet-wheel-index": index,
                  } as CSSProperties
                }
                onClick={(event) => {
                  event.stopPropagation();
                  void runCareAction(action);
                }}
                title={`${copy[action.labelKey]} · ${formatActionMeta(copy, action.id)}`}
              >
                <IconComponent className="size-4.5" weight={running ? "fill" : "regular"} />
                <span>{copy[action.labelKey]}</span>
              </PetWheelButton>
            );
          })}
        </div>
      )}

      {speech && (
        <span
          key={speech.nonce}
          className={cn(
            "resident-pet-bubble pointer-events-none absolute top-[-8px] z-10 block w-[min(260px,calc(100vw-132px))] rounded-xl border px-3.5 py-3 text-left shadow-lg",
            bubbleOnRight ? "resident-pet-bubble-right left-[72px]" : "resident-pet-bubble-left right-[72px]",
            speech.tone === "success"
              ? "border-primary/35 bg-card text-foreground"
              : speech.tone === "warning"
                ? "border-yellow-500/40 bg-card text-foreground"
                : "border-border/80 bg-card text-foreground",
          )}
        >
          {speech.title && (
            <span className="mb-1 block text-[11px] font-bold text-primary">
              {speech.title}
            </span>
          )}
          <span className="block text-xs leading-relaxed text-foreground/90">
            {speech.message}
          </span>
        </span>
      )}

      <button
        type="button"
        aria-label={petName || copy.clickTitle}
        title={copy.clickMessage}
        className={cn(
          "absolute inset-0 z-[2] cursor-grab touch-none border-0 bg-transparent p-0 outline-none",
          "transition-transform duration-150 ease-out hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/70",
          isDragging && "cursor-grabbing scale-105",
          wheelOpen && "scale-105",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          setPetState("wave");
          setAnimationNonce((current) => current + 1);
          openWheel();
          settleToIdle(900);
        }}
      >
        <span
          key={`${petState}-${animationNonce}`}
          className="openpets-ai-pet-sprite resident-pet-sprite"
          style={spriteStyle}
        />
        <span className="resident-pet-shadow" />
      </button>
    </div>
  );
}
