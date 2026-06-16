import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
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

type Point = { x: number; y: number };
type SpeechState = Required<Pick<PetSpeechPayload, "message" | "tone">> &
  Pick<PetSpeechPayload, "title"> & {
    nonce: number;
  };

const PET_COPY = {
  en: {
    clickTitle: "Pet",
    clickMessage: "I am here. Drag me anywhere while you watch.",
  },
  zh: {
    clickTitle: "宠物",
    clickMessage: "我在这里，看视频时也可以拖动我换位置。",
  },
  fr: {
    clickTitle: "Compagnon",
    clickMessage: "Je suis la. Vous pouvez me deplacer pendant la lecture.",
  },
} as const;

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

function getInitialPosition(): Point {
  if (typeof window === "undefined") return { x: PET_MARGIN, y: PET_MARGIN };

  try {
    const saved = localStorage.getItem(PET_POSITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Point>;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return clampPosition({ x: parsed.x, y: parsed.y });
      }
    }
  } catch {
    // Ignore invalid saved positions.
  }

  return clampPosition({
    x: window.innerWidth - PET_SIZE.width - 24,
    y: window.innerHeight - PET_SIZE.height - 24,
  });
}

export function ResidentPet() {
  const { language } = useI18n();
  const { settings } = useSettings();
  const copy = PET_COPY[language];
  const [position, setPosition] = useState<Point>(getInitialPosition);
  const [petState, setPetState] = useState<PetState>("idle");
  const [animationNonce, setAnimationNonce] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [speech, setSpeech] = useState<SpeechState | null>(null);
  const positionRef = useRef(position);
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
  const suppressClickRef = useRef(false);
  const bubbleOnRight = typeof window !== "undefined" && position.x < window.innerWidth / 2;

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
    setPosition(nextPosition);
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
    positionRef.current = nextPosition;
    setPosition(nextPosition);
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
    setPosition(finalPosition);
    persistPosition(finalPosition);
    setIsDragging(false);
    setPetState(moved ? "hop" : "wave");
    settleToIdle(moved ? 850 : 700);
    dragRef.current = null;
  };

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        const next = clampPosition(current);
        positionRef.current = next;
        persistPosition(next);
        return next;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [persistPosition]);

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
    },
    [],
  );

  if (!settings.pet_enabled) return null;

  return (
    <button
      type="button"
      aria-label="July Player pet"
      title="July Player pet"
      className={cn(
        "resident-pet fixed z-[80] cursor-grab touch-none border-0 bg-transparent p-0 outline-none",
        "transition-transform duration-150 ease-out hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/70",
        isDragging && "cursor-grabbing scale-105",
      )}
      style={{
        left: position.x,
        top: position.y,
        width: PET_SIZE.width,
        height: PET_SIZE.height,
      }}
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
        showSpeech({
          title: copy.clickTitle,
          message: copy.clickMessage,
          tone: "info",
          durationMs: 3600,
        });
        settleToIdle(800);
      }}
    >
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
      <span
        key={`${petState}-${animationNonce}`}
        className="openpets-ai-pet-sprite resident-pet-sprite"
        style={spriteStyle}
      />
      <span className="resident-pet-shadow" />
    </button>
  );
}
