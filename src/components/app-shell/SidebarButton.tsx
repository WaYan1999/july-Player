import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";
import { spring } from "./constants";
import { sectionMemory } from "@/hooks/useSectionMemory";
import { useI18n } from "@/hooks/useI18n";

export function SidebarButton({
  item,
  collapsed,
  index,
}: {
  item: NavItem;
  collapsed: boolean;
  index: number;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const searchParams = new URLSearchParams(location.search);
  const from = searchParams.get("from");
  const fromPathname = from ? from.split("?")[0] : null;
  const isCourseRoute = location.pathname.startsWith("/course/");

  const isActive =
    item.path === "/"
      ? location.pathname === "/" || (isCourseRoute && (!fromPathname || fromPathname === "/"))
      : fromPathname === item.path
        ? isCourseRoute
        : location.pathname.startsWith(item.path);
  const Icon = item.icon;
  const label = t.nav[item.key as keyof typeof t.nav] ?? item.label;
  const delay = `${index * 25}ms`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) return;
    // Navigate to the last remembered path in this section
    const target = sectionMemory.get(item.path);
    navigate(target);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      variant="ghost"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 w-full items-center overflow-visible rounded-xl border border-transparent py-2.5 font-sans text-sm shadow-none transition-[border-color,background-color,color,transform]",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "border-primary/18 bg-primary/10 font-semibold text-primary"
          : "text-muted-foreground hover:border-sidebar-border/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-xl transition-[background,box-shadow] duration-200",
          isActive
            ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_55%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_7%,transparent)]"
            : "bg-transparent group-hover:bg-sidebar-accent"
        )}
      />

      {isActive && !collapsed && (
        <span className="absolute left-1.5 top-1/2 z-10 h-5 w-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_36%,transparent)]" />
      )}

      <div className="relative z-10 shrink-0">
        <Icon className="size-4" />
      </div>

      <span
        className="relative z-10 overflow-hidden whitespace-nowrap"
        style={{
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? 0 : 160,
          transform: collapsed ? "translateX(-8px)" : "translateX(0)",
          transition: `opacity ${spring()} ${delay}, max-width ${spring()}, transform ${spring()} ${delay}`,
        }}
      >
        {label}
      </span>

      {collapsed && (
        <span className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-1.5 font-sans text-xs font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
          {label}
        </span>
      )}
    </Button>
  );
}
