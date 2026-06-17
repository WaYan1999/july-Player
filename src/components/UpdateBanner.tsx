import {
  ArrowClockwiseIcon as ArrowClockwise,
  DownloadSimpleIcon as DownloadSimple,
  XIcon as X,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useUpdater } from "@/hooks/useUpdater";
import { EASE_OUT } from "@/lib/constants";
import { useI18n } from "@/hooks/useI18n";

export function UpdateBanner() {
  const updater = useUpdater();
  const { t, formatMessage } = useI18n();

  const showBanner =
    !updater.dismissed &&
    (updater.status === "available" ||
      updater.status === "downloading" ||
      updater.status === "ready");

  if (!showBanner) return null;

  const isDownloading = updater.status === "downloading";
  const isReady = updater.status === "ready";
  const percent = Math.round(updater.progress * 100);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-6"
      style={{ animation: `card-in 300ms ${EASE_OUT} both` }}
    >
      <div className="july-dialog pointer-events-auto flex w-full max-w-md items-center gap-3 border border-border bg-card/95 p-3 pl-4 backdrop-blur">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ArrowClockwise className="size-4" weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-sans text-sm font-semibold text-foreground">
            {isReady
              ? t.updateBanner.updateReady
              : isDownloading
                ? formatMessage(t.updateBanner.downloading, { percent })
                : t.updateBanner.updateAvailable}
          </div>
          <div className="truncate font-sans text-xs text-muted-foreground">
            {isReady
              ? t.updateBanner.restartFinish
              : isDownloading
                ? formatMessage(t.updateBanner.version, { version: updater.version ?? "" })
                : formatMessage(t.updateBanner.versionReady, { version: updater.version ?? "" })}
          </div>
          {isDownloading && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
        {!isDownloading && (
          <Button
            type="button"
            onClick={updater.install}
            variant="primary"
            className={cn(
              "july-heroui-button july-heroui-button-primary min-h-9 shrink-0 px-3 text-xs",
            )}
          >
            <DownloadSimple className="size-3.5" weight="bold" />
            {isReady ? t.updateBanner.restart : t.updateBanner.install}
          </Button>
        )}
        <Button
          type="button"
          onClick={updater.dismiss}
          isDisabled={isDownloading}
          variant="ghost"
          isIconOnly
          className={cn(
            "july-heroui-button july-heroui-icon-button size-8 min-h-8 min-w-8 shrink-0 text-muted-foreground hover:bg-secondary hover:text-foreground",
            isDownloading && "cursor-not-allowed opacity-40",
          )}
          aria-label={t.updateBanner.dismiss}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
