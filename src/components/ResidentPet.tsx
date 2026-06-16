import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { createPetSpriteStyle, type PetState } from "@/lib/pets";

const PET_POSITION_KEY = "july-player:resident-pet-position";
const PET_SIZE = { width: 82, height: 88 };
const PET_MARGIN = 12;

type Point = { x: number; y: number };

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
  const { settings } = useSettings();
  const [position, setPosition] = useState<Point>(getInitialPosition);
  const [petState, setPetState] = useState<PetState>("idle");
  const [isDragging, setIsDragging] = useState(false);
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
    const finalPosition = clampPosition(positionRef.current);
    setPosition(finalPosition);
    persistPosition(finalPosition);
    setIsDragging(false);
    setPetState(drag.moved ? "hop" : "wave");
    settleToIdle(drag.moved ? 850 : 700);
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

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
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
        if (dragRef.current?.moved) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <span key={petState} className="openpets-ai-pet-sprite resident-pet-sprite" style={spriteStyle} />
      <span className="resident-pet-shadow" />
    </button>
  );
}
