import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWindow, type Window as TauriWindow } from "@tauri-apps/api/window";
import {
  CopySimpleIcon as CopySimple,
  MinusIcon as Minus,
  SquareIcon as Square,
  XIcon as X,
} from "@phosphor-icons/react";
import logo from "@/assets/icons/july-player.png";
import { cn } from "@/lib/utils";

const isTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function getAppWindow() {
  return isTauriRuntime() ? getCurrentWindow() : null;
}

interface WindowControlButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}

function WindowControlButton({
  label,
  onClick,
  variant = "default",
  disabled,
  children,
}: WindowControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "app-window-control",
        variant === "danger" && "app-window-control-danger"
      )}
    >
      {children}
    </button>
  );
}

export function AppWindowTitleBar() {
  const appWindow = useMemo<TauriWindow | null>(() => getAppWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);
  const canControlWindow = Boolean(appWindow);

  const syncMaximized = useCallback(async () => {
    if (!appWindow) return;

    try {
      setIsMaximized(await appWindow.isMaximized());
    } catch {
      setIsMaximized(false);
    }
  }, [appWindow]);

  useEffect(() => {
    if (!appWindow) return;

    void syncMaximized();

    let unlisten: (() => void) | undefined;
    void appWindow.onResized(() => {
      void syncMaximized();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [appWindow, syncMaximized]);

  const runWindowAction = useCallback(
    async (action: (window: TauriWindow) => Promise<void>) => {
      if (!appWindow) return;

      try {
        await action(appWindow);
        await syncMaximized();
      } catch (error) {
        console.warn("Window action failed", error);
      }
    },
    [appWindow, syncMaximized]
  );

  return (
    <div className="app-titlebar flex shrink-0 items-center">
      <div
        data-tauri-drag-region
        onDoubleClick={() => void runWindowAction((window) => window.toggleMaximize())}
        className="flex min-w-0 flex-1 items-center gap-2 self-stretch pl-3"
      >
        <img
          src={logo}
          alt="七月播放器 logo"
          className="size-6 shrink-0 rounded-full"
          draggable={false}
        />
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
          七月播放器
        </span>
        <span className="size-1 rounded-full bg-primary/90" />
      </div>

      <div data-tauri-drag-region className="h-full flex-1" />

      <div className="flex h-full shrink-0 items-center pr-2">
        <WindowControlButton
          label="最小化窗口"
          disabled={!canControlWindow}
          onClick={() => void runWindowAction((window) => window.minimize())}
        >
          <Minus className="size-3.5" weight="regular" />
        </WindowControlButton>
        <WindowControlButton
          label={isMaximized ? "还原窗口" : "最大化窗口"}
          disabled={!canControlWindow}
          onClick={() => void runWindowAction((window) => window.toggleMaximize())}
        >
          {isMaximized ? (
            <CopySimple className="size-3.5" weight="regular" />
          ) : (
            <Square className="size-3.5" weight="regular" />
          )}
        </WindowControlButton>
        <WindowControlButton
          label="关闭窗口"
          variant="danger"
          disabled={!canControlWindow}
          onClick={() => void runWindowAction((window) => window.close())}
        >
          <X className="size-3.5" weight="regular" />
        </WindowControlButton>
      </div>
    </div>
  );
}
