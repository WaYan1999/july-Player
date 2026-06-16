import { cn } from "@/lib/utils";
import { createPetSpriteStyle, type PetState } from "@/lib/pets";

interface PetSpriteProps {
  variantId: string;
  state?: PetState;
  width?: number;
  className?: string;
}

export function PetSprite({
  variantId,
  state = "idle",
  width = 82,
  className,
}: PetSpriteProps) {
  return (
    <span
      className={cn("openpets-ai-pet-sprite", className)}
      style={createPetSpriteStyle(state, variantId, width)}
    />
  );
}
