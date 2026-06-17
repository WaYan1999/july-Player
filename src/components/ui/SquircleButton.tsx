import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";

type SquircleButtonVariant = "primary" | "secondary" | "ghost";

interface SquircleButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "className" | "isDisabled" | "variant"> {
  variant?: SquircleButtonVariant;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

const textStyles: Record<SquircleButtonVariant, { base: string; active: string }> = {
  primary: {
    base: "july-heroui-button-primary font-semibold",
    active: "july-heroui-button-primary font-semibold",
  },
  secondary: {
    base: "bg-card font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
    active: "border-primary/30 bg-primary/10 font-medium text-primary",
  },
  ghost: {
    base: "border-transparent bg-transparent font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
    active: "border-primary/25 bg-primary/10 font-medium text-primary",
  },
};

export function SquircleButton({
  variant = "secondary",
  active = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: SquircleButtonProps) {
  const state = active ? "active" : "base";

  return (
    <Button
      type={type}
      variant={variant}
      isDisabled={disabled}
      className={cn(
        "july-heroui-button px-4 py-2.5",
        textStyles[variant][state],
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
