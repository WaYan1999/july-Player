import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import {
  SquareHalfIcon as SquareHalf,
  CornersOutIcon as CornersOut,
  CornersInIcon as CornersIn,
  CaretRightIcon as CaretRight,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animatedThemeToggle";
import { spring, navigationItems, appItems } from "./constants";
import { SquircleClipDefs } from "./SquircleClipDefs";
import { useBreadcrumbs } from "./useBreadcrumbs";
import { CourseTitleProvider } from "./CourseTitleContext";
import { NavSection } from "./NavSection";
import { SidebarSearch } from "./SidebarSearch";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import { isDesktopPetOpen } from "@/lib/store";
import { AppWindowTitleBar } from "./AppWindowTitleBar";
import { ResidentPet } from "@/components/ResidentPet";
import { DESKTOP_PET_CLOSE_REQUEST_EVENT } from "@/lib/desktopPet";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <CourseTitleProvider>
      <AppShellInner>{children}</AppShellInner>
    </CourseTitleProvider>
  );
}

function AppShellInner({ children }: AppShellProps) {
  const breadcrumbs = useBreadcrumbs();
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsSmallScreen(e.matches);
      if (e.matches) setCollapsed(true);
    };
    onChange(mq);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!settings.pet_desktop_enabled) return;

    let cancelled = false;
    let syncing = false;
    let missingChecks = 0;

    const syncDesktopPetState = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const state = await isDesktopPetOpen();
        const open = state.open && state.visible;
        missingChecks = open ? 0 : missingChecks + 1;
        if (!cancelled && missingChecks >= 2) {
          await update("pet_desktop_enabled", "false");
        }
      } catch {
        missingChecks += 1;
        if (!cancelled && missingChecks >= 2) {
          await update("pet_desktop_enabled", "false").catch(() => {});
        }
      } finally {
        syncing = false;
      }
    };

    const firstCheck = window.setTimeout(() => void syncDesktopPetState(), 900);
    const interval = window.setInterval(() => void syncDesktopPetState(), 8000);
    window.addEventListener("focus", syncDesktopPetState);

    return () => {
      cancelled = true;
      window.clearTimeout(firstCheck);
      window.clearInterval(interval);
      window.removeEventListener("focus", syncDesktopPetState);
    };
  }, [settings.pet_desktop_enabled, update]);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];
    const restoreResidentPet = () => {
      if (!cancelled) {
        void update("pet_desktop_enabled", "false").catch(() => {});
      }
    };

    void listen(DESKTOP_PET_CLOSE_REQUEST_EVENT, restoreResidentPet)
      .then((unlisten) => {
        if (cancelled) unlisten();
        else unlisteners.push(unlisten);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [update]);

  const effectiveCollapsed = isSmallScreen || collapsed;

  return (
    <div className="app-shell-root flex h-screen flex-col text-foreground">
      <SquircleClipDefs />

      <AppWindowTitleBar />

      <header className="app-topbar flex h-15 shrink-0 items-center">
        <div
          className="flex shrink-0 items-center px-3"
          style={{
            width: effectiveCollapsed ? 68 : 240,
            transition: `width ${spring()}`,
          }}
        >
          <div className={cn("flex h-10 w-full items-center", effectiveCollapsed ? "justify-center" : "")}>
            {!isSmallScreen && (
              <Button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                variant="ghost"
                isIconOnly
                className={cn(
                  "july-heroui-button july-heroui-icon-button shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  !effectiveCollapsed && "ml-auto",
                )}
                aria-label={effectiveCollapsed ? "展开侧边栏" : "收起侧边栏"}
              >
                <SquareHalf className={cn("size-4", effectiveCollapsed && "-scale-x-100")} />
              </Button>
            )}
          </div>
        </div>

        <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-4 px-4 sm:px-6">
          <nav className="flex min-w-0 items-center gap-1.5">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <div key={i} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && (
                    <CaretRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  {crumb.path && !isLast ? (
                    <Link
                      to={crumb.path}
                      className="truncate font-heading text-lg font-bold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <h1 className="truncate font-heading text-lg font-bold text-foreground">
                      {crumb.label}
                    </h1>
                  )}
                </div>
              );
            })}
          </nav>

          <div data-tauri-drag-region className="flex-1 self-stretch" />

          <div className="flex items-center gap-2">
            <AnimatedThemeToggler className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&_svg]:size-4" />

            <Button
              type="button"
              onClick={toggleFullscreen}
              variant="ghost"
              isIconOnly
              className="july-heroui-button july-heroui-icon-button text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
            >
              {isFullscreen ? <CornersIn className="size-4" /> : <CornersOut className="size-4" />}
            </Button>

            {/* <div className="mx-1 h-6 w-px bg-border" /> */}

            {/* Profile icon and name — hardcoded, hidden until auth is implemented */}
            {/* <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                R
              </div>
              <span className="font-sans text-sm font-medium text-foreground">
                Reda
              </span>
            </button> */}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="app-sidebar flex shrink-0 flex-col will-change-[width]"
          style={{
            width: effectiveCollapsed ? 68 : 240,
            transition: `width ${spring()}`,
          }}
        >
          <div className="px-3 pb-1">
            <SidebarSearch collapsed={effectiveCollapsed} />
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pt-4">
            <NavSection label={t.nav.navigation} collapsed={effectiveCollapsed} items={navigationItems} />
            <div className="mx-3 my-3 border-t border-sidebar-border/50" />
            <NavSection label={t.nav.app} collapsed={effectiveCollapsed} items={appItems} />
          </nav>

          <div className="mx-3 mb-4 mt-auto h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
        </aside>

        <main
          className="app-main flex-1 overflow-y-auto px-4 pb-7 pt-6 sm:px-6 sm:pb-8 sm:pt-8 [scrollbar-gutter:stable]"
        >
          {children}
        </main>
      </div>

      {!settings.pet_desktop_enabled && <ResidentPet />}
    </div>
  );
}
