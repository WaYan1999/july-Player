import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePageVisible } from "@/hooks/usePageVisible";
import { useSettings } from "@/hooks/useSettings";
import {
  GearSixIcon as GearSix,
  PlayIcon as Play,
  DatabaseIcon as Database,
  FolderIcon as Folder,
  NotepadIcon as Notepad,
  BookmarkSimpleIcon as BookmarkSimple,
  HeartIcon as Heart,
  SpinnerGapIcon as SpinnerGap,
  StackIcon as Stack,
  MonitorPlayIcon as MonitorPlay,
  ArrowsClockwiseIcon as ArrowsClockwise,
  FastForwardIcon as FastForward,
  SpeakerHighIcon as SpeakerHigh,
  SkipForwardIcon as SkipForward,
  TranslateIcon as Translate,
  TrashIcon as Trash,
  WarningCircleIcon as WarningCircle,
  XIcon as X,
} from "@phosphor-icons/react";
import { Button, Input, ListBox, ListBoxItem, Select as HeroSelect, Slider, Switch } from "@heroui/react";
import { cn } from "@/lib/utils";
import type { LibraryStats } from "@/types";
import { getLibraryStats, deleteAllData } from "@/lib/store";
import { EASE_OUT } from "@/lib/constants";
import { useUpdater } from "@/hooks/useUpdater";
import { getVersion } from "@tauri-apps/api/app";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <Switch
      isSelected={checked}
      onChange={onChange}
      className="group"
      aria-label="toggle"
    >
      <Switch.Content className="inline-flex items-center">
        <Switch.Control
          className={cn(
            "relative flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200",
            checked ? "border-primary/70 bg-primary" : "border-border bg-secondary",
            "group-data-[focus-visible=true]:ring-2 group-data-[focus-visible=true]:ring-primary/20",
          )}
        >
          <Switch.Thumb
            className={cn(
              "block size-4.5 rounded-full bg-background shadow-sm transition-transform duration-200",
              checked ? "translate-x-[22px]" : "translate-x-[2px]",
            )}
          />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

function Select({ value, onChange, options }: SelectProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <HeroSelect
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key) onChange(String(key));
      }}
      aria-label={selectedOption?.label ?? "select"}
      className="min-w-28"
    >
      <HeroSelect.Trigger
        className={cn(
          "july-select flex min-h-9 min-w-28 items-center justify-between gap-2 px-3 py-1.5",
          "font-sans text-sm text-foreground outline-none",
        )}
      >
        <HeroSelect.Value>{selectedOption?.label}</HeroSelect.Value>
        <HeroSelect.Indicator className="size-4 text-muted-foreground transition-transform data-[open=true]:rotate-180" />
      </HeroSelect.Trigger>
      <HeroSelect.Popover className="july-popover z-50 max-h-72 min-w-32 overflow-y-auto p-1.5">
        <ListBox className="outline-none">
          {options.map((opt) => (
            <ListBoxItem
              key={opt.value}
              id={opt.value}
              textValue={opt.label}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors hover:bg-secondary data-[selected=true]:bg-primary/12 data-[selected=true]:text-primary"
            >
              {opt.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  );
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  index: number;
}

function SectionCard({ title, icon, children, index }: SectionCardProps) {
  return (
    <div
      className="july-section-card relative overflow-hidden"
      style={{
        animation: `card-in 350ms ${EASE_OUT} ${index * 60}ms both`,
      }}
    >
      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2">
          {icon}
          <h3 className="font-heading text-sm font-bold text-foreground">{title}</h3>
        </div>
        <div className="flex flex-col gap-0.5">{children}</div>
      </div>
    </div>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ icon, label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-sans text-sm font-medium text-foreground">{label}</div>
          {description && (
            <div className="max-w-[52ch] font-sans text-xs leading-5 text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 justify-end">{children}</div>
    </div>
  );
}

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatChip({ icon, label, value }: StatChipProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/50 px-3 py-2.5">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="font-mono text-sm font-bold text-foreground">{value}</div>
        <div className="font-sans text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

const CONFIRM_PHRASE = "delete all";

function DeleteConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const matches = input.toLowerCase().trim() === CONFIRM_PHRASE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="july-dialog relative w-full max-w-md border border-border bg-card p-6"
        style={{ animation: `card-in 250ms ${EASE_OUT} both` }}
      >
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          isIconOnly
          className="july-heroui-button july-heroui-icon-button absolute right-4 top-4 size-8 min-h-8 min-w-8 text-muted-foreground hover:text-foreground"
          aria-label={t.common.cancel}
        >
          <X className="size-4" />
        </Button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
            <WarningCircle className="size-5 text-destructive" weight="bold" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              {t.settings.deleteAllData}
            </h3>
            <p className="font-sans text-xs text-muted-foreground">
              {t.settings.cannotBeUndone}
            </p>
          </div>
        </div>

        <p className="mb-4 font-sans text-sm text-muted-foreground">
          {t.settings.deleteAllWarning}
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block font-sans text-xs font-medium text-muted-foreground">
            {t.settings.typeToConfirmPrefix}{" "}
            <span className="font-mono font-bold text-foreground">{CONFIRM_PHRASE}</span>
            {" "}{t.settings.typeToConfirmSuffix}
          </label>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoFocus
            className={cn(
              "july-heroui-field w-full font-mono",
              input && !matches && "border-destructive/55",
              matches && "border-primary/70",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches) onConfirm();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            className="july-heroui-button px-4 text-muted-foreground hover:text-foreground"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            isDisabled={!matches}
            variant="danger"
            className={cn(
              "july-heroui-button px-4",
              matches
                ? "july-heroui-button-danger"
                : "cursor-not-allowed bg-secondary text-muted-foreground/40",
            )}
          >
            {t.settings.deleteEverything}
          </Button>
        </div>
      </div>
    </div>
  );
}

const SPEED_OPTIONS: SelectOption[] = [
  { value: "0.5", label: "0.5x" },
  { value: "0.75", label: "0.75x" },
  { value: "1", label: "1x" },
  { value: "1.25", label: "1.25x" },
  { value: "1.5", label: "1.5x" },
  { value: "1.75", label: "1.75x" },
  { value: "2", label: "2x" },
];

const SKIP_OPTIONS: SelectOption[] = [
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
];

interface SettingsProps {
  className?: string;
}

function UpdatesSection({ index }: { index: number }) {
  const updater = useUpdater();
  const { t, formatMessage } = useI18n();
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion(""));
  }, []);

  const isChecking = updater.status === "checking";
  const isDownloading = updater.status === "downloading";
  const isReady = updater.status === "ready";
  const hasUpdate = updater.status === "available" || isDownloading || isReady;
  const percent = Math.round(updater.progress * 100);

  let buttonLabel = t.settings.checkForUpdates;
  if (isChecking) buttonLabel = t.settings.checking;
  else if (isReady) buttonLabel = t.settings.restartToUpdate;
  else if (isDownloading) buttonLabel = formatMessage(t.settings.downloading, { percent });
  else if (updater.status === "available") {
    buttonLabel = formatMessage(t.settings.installVersion, { version: updater.version ?? "" });
  }

  const onClick = () => {
    if (hasUpdate) updater.install();
    else updater.check();
  };

  let description = appVersion
    ? formatMessage(t.settings.currentVersion, { version: appVersion })
    : t.settings.checkForNewVersions;
  if (updater.status === "up-to-date") {
    description = formatMessage(t.settings.latestVersion, { version: appVersion });
  } else if (updater.status === "available") {
    description = formatMessage(t.settings.versionAvailable, { version: updater.version ?? "" });
  } else if (updater.status === "error") {
    description = updater.error ?? t.settings.updateCheckFailed;
  }

  return (
    <SectionCard
      title={t.settings.updates}
      icon={<ArrowsClockwise className="size-4 text-info" weight="bold" />}
      index={index}
    >
      <SettingRow
        icon={<ArrowsClockwise className={cn("size-4", isChecking && "animate-spin")} />}
        label={t.settings.appUpdates}
        description={description}
      >
        <Button
          type="button"
          onClick={onClick}
          isDisabled={isChecking || isDownloading}
          aria-busy={isChecking || isDownloading}
          variant={hasUpdate ? "primary" : "secondary"}
          className={cn(
            "july-heroui-button shrink-0 px-4",
            hasUpdate
              ? "july-heroui-button-primary"
              : "bg-secondary/60 text-foreground hover:bg-secondary",
            (isChecking || isDownloading) && "cursor-not-allowed opacity-60",
          )}
        >
          {buttonLabel}
        </Button>
      </SettingRow>
      {isDownloading && (
        <div className="px-2 pb-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
      {updater.status === "available" && updater.notes && (
        <div className="mx-2 mb-2 max-h-32 overflow-y-auto rounded-lg bg-secondary/50 px-3 py-2 font-sans text-xs whitespace-pre-wrap text-muted-foreground">
          {updater.notes}
        </div>
      )}
    </SectionCard>
  );
}

export function Settings({ className }: SettingsProps) {
  const { settings, update } = useSettings();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadStats = useCallback(() => {
    return getLibraryStats().then(setStats);
  }, []);

  useEffect(() => {
    loadStats().finally(() => setLoading(false));
  }, [loadStats]);

  usePageVisible("/settings", loadStats);

  const handleDeleteAll = useCallback(async () => {
    await deleteAllData();
    setShowDeleteDialog(false);
    navigate("/");
    window.location.reload();
  }, [navigate]);

  if (loading) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <SpinnerGap className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("july-page-narrow", className)}>
      <div
        className="july-page-header mb-6 flex items-center gap-3 p-4 sm:p-5"
        style={{ animation: `card-in 350ms ${EASE_OUT} both` }}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/18 bg-primary/12">
          <GearSix className="size-5 text-primary" weight="bold" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{t.settings.title}</h2>
          <p className="font-sans text-sm text-muted-foreground">
            {t.settings.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionCard
          title={t.settings.playback}
          icon={<Play className="size-4 text-primary" weight="bold" />}
          index={0}
        >
          <SettingRow
            icon={<Translate className="size-4" />}
            label={t.settings.interfaceLanguage}
            description={t.settings.interfaceLanguageDescription}
          >
            <Select
              value={settings.language}
              onChange={(v) => update("language", v)}
              options={LANGUAGE_OPTIONS}
            />
          </SettingRow>
          <SettingRow
            icon={<SkipForward className="size-4" />}
            label={t.settings.autoplayNext}
            description={t.settings.autoplayNextDescription}
          >
            <Toggle
              checked={settings.autoplay_next}
              onChange={(v) => update("autoplay_next", String(v))}
            />
          </SettingRow>
          <SettingRow
            icon={<ArrowsClockwise className="size-4" />}
            label={t.settings.resumePosition}
            description={t.settings.resumePositionDescription}
          >
            <Toggle
              checked={settings.resume_position}
              onChange={(v) => update("resume_position", String(v))}
            />
          </SettingRow>
          <SettingRow
            icon={<FastForward className="size-4" />}
            label={t.settings.defaultPlaybackSpeed}
          >
            <Select
              value={String(settings.default_speed)}
              onChange={(v) => update("default_speed", v)}
              options={SPEED_OPTIONS}
            />
          </SettingRow>
          <SettingRow
            icon={<SpeakerHigh className="size-4" />}
            label={t.settings.defaultVolume}
          >
            <div className="flex items-center gap-3">
              <Slider
                minValue={0}
                maxValue={100}
                step={1}
                value={Number(settings.default_volume)}
                onChange={(value) => {
                  const nextValue = Array.isArray(value) ? value[0] : value;
                  update("default_volume", String(nextValue));
                }}
                aria-label={t.settings.defaultVolume}
                className="w-28"
              >
                <Slider.Track className="relative h-2 w-full rounded-full bg-secondary">
                  <Slider.Fill className="absolute h-full rounded-full bg-primary" />
                  <Slider.Thumb className="top-1/2 size-4 -translate-y-1/2 rounded-full border border-primary/55 bg-background shadow-sm outline-none ring-primary/20 transition-shadow data-[focus-visible=true]:ring-4" />
                </Slider.Track>
              </Slider>
              <span className="w-8 font-mono text-xs text-muted-foreground">
                {settings.default_volume}%
              </span>
            </div>
          </SettingRow>
          <SettingRow
            icon={<MonitorPlay className="size-4" />}
            label={t.settings.skipForwardBackward}
          >
            <Select
              value={String(settings.skip_forward_secs)}
              onChange={(v) => {
                update("skip_forward_secs", v);
                update("skip_backward_secs", v);
              }}
              options={SKIP_OPTIONS}
            />
          </SettingRow>
        </SectionCard>

        <SectionCard
          title={t.settings.library}
          icon={<Database className="size-4 text-info" weight="bold" />}
          index={1}
        >
          {stats && (
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-2.5">
              <StatChip
                icon={<Stack className="size-3.5" />}
                label={t.settings.courses}
                value={stats.totalCourses}
              />
              <StatChip
                icon={<MonitorPlay className="size-3.5" />}
                label={t.settings.lessons}
                value={stats.totalLessons}
              />
              <StatChip
                icon={<Notepad className="size-3.5" />}
                label={t.settings.notes}
                value={stats.totalNotes}
              />
              <StatChip
                icon={<BookmarkSimple className="size-3.5" />}
                label={t.settings.bookmarks}
                value={stats.totalBookmarks}
              />
              <StatChip
                icon={<Heart className="size-3.5" />}
                label={t.settings.favorites}
                value={stats.totalFavorites}
              />
              <StatChip
                icon={<Folder className="size-3.5" />}
                label={t.settings.sections}
                value={stats.totalSections}
              />
            </div>
          )}
          <div className="mt-3 rounded-lg bg-secondary/50 px-3 py-2.5">
            <div className="font-sans text-xs text-muted-foreground">{t.settings.databaseLocation}</div>
            <div className="mt-0.5 truncate font-mono text-xs text-foreground/70">
              {stats?.dbPath}
            </div>
          </div>
        </SectionCard>

        <UpdatesSection index={2} />

        <SectionCard
          title={t.settings.dangerZone}
          icon={<WarningCircle className="size-4 text-destructive" weight="bold" />}
          index={3}
        >
          <div className="flex flex-col gap-3 rounded-lg px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Trash className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="font-sans text-sm font-medium text-foreground">
                  {t.settings.deleteAllData}
                </div>
                <div className="font-sans text-xs text-muted-foreground">
                  {t.settings.deleteAllDataDescription}
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              variant="danger"
              className={cn(
                "july-heroui-button july-heroui-button-danger shrink-0 self-end px-4 sm:self-auto",
              )}
            >
              {t.settings.deleteAll}
            </Button>
          </div>
        </SectionCard>
      </div>

      {showDeleteDialog && (
        <DeleteConfirmDialog
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
