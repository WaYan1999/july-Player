import {
  ArrowClockwiseIcon as ArrowClockwise,
  CheckCircleIcon as CheckCircle,
  DownloadSimpleIcon as DownloadSimple,
  WarningCircleIcon as WarningCircle,
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
      updater.status === "ready" ||
      updater.status === "error");

  if (!showBanner) return null;

  const isDownloading = updater.status === "downloading";
  const isReady = updater.status === "ready";
  const isError = updater.status === "error";
  const percent = Math.round(updater.progress * 100);
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;

  const title = isReady
    ? t.updateBanner.updateReady
    : isDownloading
      ? formatMessage(t.updateBanner.downloading, { percent: safePercent })
      : isError
        ? t.updateBanner.updateFailed
        : t.updateBanner.updateAvailable;

  const description = isReady
    ? t.updateBanner.restartFinish
    : isDownloading
      ? formatMessage(t.updateBanner.version, { version: updater.version ?? "" })
      : isError
        ? updater.error ?? t.updateBanner.retryDescription
        : formatMessage(t.updateBanner.versionReady, { version: updater.version ?? "" });

  const Icon = isReady ? CheckCircle : isError ? WarningCircle : ArrowClockwise;
  const progressDetail = formatBytesProgress(updater.downloadedBytes, updater.totalBytes);

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] sm:left-[calc(var(--app-sidebar-current-width,240px)+1.5rem)]"
      style={{ animation: `card-in 300ms ${EASE_OUT} both` }}
    >
      <div
        className={cn(
          "july-dialog pointer-events-auto flex w-full items-center gap-3 overflow-hidden border p-3 pl-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          isError
            ? "border-destructive/35 bg-card/96"
            : "border-primary/25 bg-card/96",
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isError ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
            isDownloading && "animate-pulse",
          )}
        >
          <Icon className={cn("size-4", isDownloading && "animate-spin")} weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate font-sans text-sm font-semibold text-foreground">
              {title}
            </div>
            {!isDownloading && !isError && updater.version && (
              <span className="shrink-0 rounded-full bg-primary/14 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                v{updater.version}
              </span>
            )}
          </div>
          <div className="mt-0.5 line-clamp-2 font-sans text-xs leading-4 text-muted-foreground">
            {description}
          </div>
          {isDownloading && (
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${safePercent}%` }}
                />
              </div>
              {progressDetail && (
                <div className="font-mono text-[10px] leading-none text-muted-foreground/80">
                  {progressDetail}
                </div>
              )}
            </div>
          )}
        </div>
        {!isDownloading && (
          <Button
            type="button"
            onClick={isError ? () => updater.check() : updater.install}
            variant={isError ? "secondary" : "primary"}
            className={cn(
              "july-heroui-button min-h-9 shrink-0 px-3 text-xs",
              isError
                ? "bg-secondary/70 text-foreground hover:bg-secondary"
                : "july-heroui-button-primary",
            )}
          >
            {isError ? (
              <ArrowClockwise className="size-3.5" weight="bold" />
            ) : (
              <DownloadSimple className="size-3.5" weight="bold" />
            )}
            {isError ? t.updateBanner.retry : isReady ? t.updateBanner.restart : t.updateBanner.install}
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

function formatBytesProgress(downloaded?: number, total?: number): string {
  if (!downloaded && !total) return "";
  const downloadedText = formatBytes(downloaded ?? 0);
  if (!total) return downloadedText;
  return `${downloadedText} / ${formatBytes(total)}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
