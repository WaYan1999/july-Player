import {
  MagnifyingGlassIcon as MagnifyingGlass,
  XIcon as X,
} from "@phosphor-icons/react";
import { Button, Input } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface SquircleSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SquircleSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SquircleSearchProps) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "group/search relative rounded-xl border border-border/70 bg-secondary/45 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)] backdrop-blur transition-[border-color,background-color,box-shadow]",
        "hover:border-primary/30 hover:bg-secondary/60 focus-within:border-primary/55 focus-within:bg-secondary/75 focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary)_13%,transparent)]",
        className,
      )}
    >
      <div className="relative flex min-h-10 items-center gap-3 px-4 py-2.5 text-muted-foreground">
        <MagnifyingGlass className="size-4 shrink-0" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-0 w-full border-0 bg-transparent px-0 py-0 font-sans text-sm text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange("")}
            aria-label={t.common.clear}
            isIconOnly
            className="july-heroui-button july-heroui-icon-button size-7 min-h-7 min-w-7 shrink-0 border-0 bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
