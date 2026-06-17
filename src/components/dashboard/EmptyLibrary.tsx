import { PlusIcon as Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { SquircleButton } from "@/components/ui/SquircleButton";
import { LoadingOrbit } from "@/components/ui/LoadingOrbit";
import { EASE_OUT } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";

interface EmptyLibraryProps {
  onImport: () => void;
  className?: string;
}

export function EmptyLibrary({ onImport, className }: EmptyLibraryProps) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-24 text-center",
        className
      )}
      style={{
        animation: `card-in 500ms ${EASE_OUT} both`,
      }}
    >
      <div className="mb-7 flex size-32 items-center justify-center rounded-xl border border-border/70 bg-card/60 shadow-[0_8px_14px_rgb(0_0_0/0.12)]">
        <LoadingOrbit size="md" />
      </div>

      <h3 className="font-heading text-xl font-bold text-foreground">
        {t.dashboard.noCoursesYet}
      </h3>
      <p className="mt-2 max-w-sm font-sans text-sm leading-6 text-muted-foreground">
        {t.dashboard.emptyDescription}
      </p>

      <div className="mt-6">
        <SquircleButton variant="primary" onClick={onImport}>
          <Plus className="size-4" weight="bold" />
          {t.dashboard.importCourse}
        </SquircleButton>
      </div>
    </div>
  );
}
