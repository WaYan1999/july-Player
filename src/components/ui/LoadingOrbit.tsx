import { cn } from "@/lib/utils";

interface LoadingOrbitProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<LoadingOrbitProps["size"]>, string> = {
  sm: "size-16",
  md: "size-28",
  lg: "size-40",
};

export function LoadingOrbit({ className, size = "md" }: LoadingOrbitProps) {
  return (
    <div
      className={cn(
        "loading-orbit relative flex items-center justify-center",
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    >
      <span className="loading-orbit-ring loading-orbit-ring-outer" />
      <span className="loading-orbit-ring loading-orbit-ring-middle" />
      <span className="loading-orbit-ring loading-orbit-ring-inner" />
      <span className="loading-orbit-core" />
    </div>
  );
}
