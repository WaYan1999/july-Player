import { useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOutIcon as ArrowSquareOut,
  CaretDownIcon as CaretDown,
  CheckCircleIcon as CheckCircle,
  CloudArrowDownIcon as CloudArrowDown,
  FloppyDiskIcon as FloppyDisk,
  GlobeHemisphereEastIcon as GlobeHemisphereEast,
  KeyIcon as Key,
  MicrophoneIcon as Microphone,
  SpinnerGapIcon as SpinnerGap,
  SparkleIcon as Sparkle,
  TranslateIcon as Translate,
  WarningCircleIcon as WarningCircle,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { TRANSLATION_LANGUAGE_OPTIONS, type TranslationLanguage } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import { getAiModels, translateWithDeepSeek } from "@/lib/store";
import type { AiModelOption } from "@/types";

const FALLBACK_MODEL_OPTIONS: AiModelOption[] = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { id: "deepseek-chat", label: "DeepSeek Chat" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

const JULY_LINKS = [
  {
    title: "July API \u4e2d\u8f6c",
    host: "julyapi.top",
    url: "https://julyapi.top/",
    descriptionKey: "julyApiDescription",
  },
  {
    title: "July Res",
    host: "julyres.top",
    url: "https://julyres.top/",
    descriptionKey: "julyResDescription",
  },
] as const;

interface AiModuleProps {
  className?: string;
}

interface SoftSelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  loading?: boolean;
  helper?: string;
  className?: string;
}

function SoftSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  loading,
  helper,
  className,
}: SoftSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <label className={cn("relative flex flex-col gap-1.5", className)}>
      <span className="font-sans text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-secondary/70 px-3 py-2 text-left font-sans text-sm text-foreground outline-none transition-colors",
          "hover:border-primary/35 hover:bg-secondary focus:border-primary/65 focus:ring-2 focus:ring-primary/15",
          open && "border-primary/65 ring-2 ring-primary/15",
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}>
          {loading ? placeholder : selected?.label ?? placeholder}
        </span>
        {loading ? (
          <SpinnerGap className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <CaretDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        )}
      </button>
      {helper && (
        <span className="font-sans text-[11px] leading-relaxed text-muted-foreground">
          {helper}
        </span>
      )}
      {open && !loading && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left font-sans text-sm transition-colors",
                option.value === value
                  ? "bg-primary/12 text-primary"
                  : "text-foreground hover:bg-secondary/80",
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <CheckCircle className="size-4 shrink-0" weight="fill" />}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

export function AiModule({ className }: AiModuleProps) {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [testText, setTestText] = useState("This lesson explains component state.");
  const [result, setResult] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [modelOptions, setModelOptions] = useState<AiModelOption[]>(FALLBACK_MODEL_OPTIONS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const [form, setForm] = useState({
    apiUrl: settings.ai_deepseek_proxy_url,
    apiKey: settings.ai_deepseek_proxy_token || settings.ai_deepseek_api_key,
    model: settings.ai_deepseek_model,
    targetLanguage: settings.ai_translation_target,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasCredential =
    settings.ai_deepseek_proxy_url.trim().length > 0 &&
    (settings.ai_deepseek_proxy_token.trim().length > 0 ||
      settings.ai_deepseek_api_key.trim().length > 0);
  const hasFormCredential =
    form.apiUrl.trim().length > 0 && form.apiKey.trim().length > 0;
  const configured = hasCredential;
  const hasChanges =
    form.apiUrl !== settings.ai_deepseek_proxy_url ||
    form.apiKey !== (settings.ai_deepseek_proxy_token || settings.ai_deepseek_api_key) ||
    form.model !== settings.ai_deepseek_model ||
    form.targetLanguage !== settings.ai_translation_target;
  const maskedKey = useMemo(() => {
    const key = (settings.ai_deepseek_proxy_token || settings.ai_deepseek_api_key).trim();
    if (key.length <= 8) return key ? "********" : "";
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  }, [settings.ai_deepseek_api_key, settings.ai_deepseek_proxy_token]);

  const modelSelectOptions = useMemo(() => {
    const merged = [...modelOptions];
    if (form.model && !merged.some((option) => option.id === form.model)) {
      merged.unshift({ id: form.model, label: form.model });
    }
    return merged.map((option) => ({ value: option.id, label: option.label }));
  }, [form.model, modelOptions]);

  useEffect(() => {
    setForm({
      apiUrl: settings.ai_deepseek_proxy_url,
      apiKey: settings.ai_deepseek_proxy_token || settings.ai_deepseek_api_key,
      model: settings.ai_deepseek_model,
      targetLanguage: settings.ai_translation_target,
    });
  }, [
    settings.ai_deepseek_api_key,
    settings.ai_deepseek_proxy_url,
    settings.ai_deepseek_proxy_token,
    settings.ai_deepseek_model,
    settings.ai_translation_target,
  ]);

  const saveConfiguration = async () => {
    if (!hasChanges) return true;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      await update("ai_deepseek_proxy_url", form.apiUrl.trim());
      await update("ai_deepseek_proxy_token", form.apiKey.trim());
      await update("ai_deepseek_api_key", "");
      await update("ai_deepseek_model", form.model);
      await update("ai_asr_api_key", "");
      await update("ai_asr_model", "offline-whisper-tiny");
      await update("ai_asr_endpoint", "");
      await update("ai_translation_target", form.targetLanguage);
      setSaveSuccess(true);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const refreshModels = async () => {
    setLoadingModels(true);
    setModelError("");
    try {
      const saved = await saveConfiguration();
      if (!saved) return;
      const models = await getAiModels();
      if (models.length > 0) {
        setModelOptions(models);
        if (!models.some((model) => model.id === form.model)) {
          const nextModel = models[0].id;
          setForm((current) => ({ ...current, model: nextModel }));
          await update("ai_deepseek_model", nextModel);
        }
      }
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err));
      setModelOptions(FALLBACK_MODEL_OPTIONS);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (!form.apiKey.trim()) return;

    const timer = window.setTimeout(() => {
      void refreshModels();
    }, 900);

    return () => window.clearTimeout(timer);
    // Fetch after the upstream credentials settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.apiUrl, form.apiKey]);

  const openExternal = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const testDeepSeek = async () => {
    setTesting(true);
    setError("");
    setResult("");
    try {
      const saved = await saveConfiguration();
      if (!saved) return;
      const translated = await translateWithDeepSeek(
        testText,
        form.targetLanguage,
      );
      setResult(translated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={cn("mx-auto max-w-6xl px-6 py-8", className)}>
      <div
        className="mb-8 flex items-center gap-3"
        style={{ animation: `card-in 350ms ${EASE_OUT} both` }}
      >
        <div className="squircle flex size-10 items-center justify-center bg-primary/15">
          <Sparkle className="size-5 text-primary" weight="bold" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            {t.ai.title}
          </h2>
          <p className="font-sans text-sm text-muted-foreground">
            {t.ai.subtitle}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="relative">
            <div className="squircle-subtle absolute inset-0 bg-border/50" />
            <div className="squircle-subtle absolute inset-px bg-card" />
            <div className="relative p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Key className="size-4 text-primary" weight="bold" />
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    {t.ai.deepseekConfig}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {saving && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1 font-sans text-[11px] font-semibold text-muted-foreground">
                      <SpinnerGap className="size-3 animate-spin" />
                      {t.ai.saving}
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 font-sans text-[11px] font-semibold",
                      configured
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {configured ? t.ai.configured : t.ai.notConfigured}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-xs font-medium text-muted-foreground">
                      {t.ai.apiUrl}
                    </span>
                    <input
                      value={form.apiUrl}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, apiUrl: event.target.value }))
                      }
                      placeholder="https://api.example.com/v1"
                      className="rounded-xl border border-border/80 bg-secondary/70 px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 hover:border-primary/35 focus:border-primary/65 focus:ring-2 focus:ring-primary/15"
                    />
                    <span className="font-sans text-[11px] leading-relaxed text-muted-foreground">
                      {t.ai.apiUrlHint}
                    </span>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-xs font-medium text-muted-foreground">
                      {t.ai.apiKey}
                    </span>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, apiKey: event.target.value }))
                      }
                      placeholder="sk-..."
                      className="rounded-xl border border-border/80 bg-secondary/70 px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 hover:border-primary/35 focus:border-primary/65 focus:ring-2 focus:ring-primary/15"
                    />
                    <span className="font-sans text-[11px] leading-relaxed text-muted-foreground">
                      {t.ai.apiKeyHint}
                    </span>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SoftSelect
                    label={t.ai.model}
                    value={form.model}
                    options={modelSelectOptions}
                    loading={loadingModels}
                    placeholder={loadingModels ? t.ai.loadingModels : t.ai.modelPlaceholder}
                    helper={modelError ? `${t.ai.modelLoadFailed}: ${modelError}` : t.ai.modelHint}
                    onChange={(model) =>
                      setForm((current) => ({ ...current, model }))
                    }
                  />

                  <SoftSelect<TranslationLanguage>
                    label={t.ai.targetLanguage}
                    value={form.targetLanguage}
                    options={TRANSLATION_LANGUAGE_OPTIONS}
                    placeholder={t.ai.languagePlaceholder}
                    helper={t.ai.languageHint}
                    onChange={(targetLanguage) =>
                      setForm((current) => ({ ...current, targetLanguage }))
                    }
                  />
                </div>

                <div className="rounded-xl border border-info/25 bg-info/8 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Microphone className="size-4 text-info" weight="bold" />
                      <h4 className="font-heading text-xs font-bold text-foreground">
                        {t.ai.speechRecognition}
                      </h4>
                    </div>
                    <span className="rounded-full bg-info/10 px-2 py-1 font-sans text-[11px] font-semibold text-info">
                      {t.ai.builtIn}
                    </span>
                  </div>
                  <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                    {t.ai.speechBuiltinHint}
                  </p>
                </div>

                {configured && (
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 font-mono text-xs text-muted-foreground">
                    <FloppyDisk className="size-3.5 shrink-0" />
                    <span>
                      {t.ai.savedKey}: {maskedKey}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-sans text-xs text-muted-foreground">
                    {saveSuccess && !hasChanges ? t.ai.saved : hasChanges ? t.ai.unsaved : t.ai.saved}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void refreshModels()}
                      disabled={saving || loadingModels || !hasFormCredential}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-border/80 px-3 py-2 font-sans text-sm font-semibold transition-colors",
                        hasFormCredential && !saving && !loadingModels
                          ? "bg-secondary/60 text-foreground hover:border-primary/40 hover:bg-secondary"
                          : "cursor-not-allowed bg-secondary/35 text-muted-foreground/40",
                      )}
                    >
                      {loadingModels ? (
                        <SpinnerGap className="size-4 animate-spin" />
                      ) : (
                        <CloudArrowDown className="size-4" />
                      )}
                      {t.ai.refreshModels}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void saveConfiguration();
                      }}
                      disabled={!hasChanges || saving}
                      className={cn(
                        "rounded-lg px-4 py-2 font-sans text-sm font-semibold transition-colors",
                        hasChanges && !saving
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "cursor-not-allowed bg-secondary text-muted-foreground/40",
                      )}
                    >
                      {saving ? t.ai.saving : t.ai.saveConfig}
                    </button>
                  </div>
                </div>
                {saveError && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 font-sans text-xs text-destructive">
                    {t.ai.saveFailed}: {saveError}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="squircle-subtle absolute inset-0 bg-border/50" />
            <div className="squircle-subtle absolute inset-px bg-card" />
            <div className="relative p-5">
              <div className="mb-4 flex items-center gap-2">
                <Translate className="size-4 text-info" weight="bold" />
                <h3 className="font-heading text-sm font-bold text-foreground">
                  {t.ai.testTranslation}
                </h3>
              </div>
              <textarea
                value={testText}
                onChange={(event) => setTestText(event.target.value)}
                className="min-h-24 w-full resize-none rounded-xl border border-border/80 bg-secondary/70 px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 hover:border-primary/35 focus:border-primary/65 focus:ring-2 focus:ring-primary/15"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-sans text-xs text-muted-foreground">
                  {t.ai.playerHint}
                </p>
                <button
                  type="button"
                  onClick={testDeepSeek}
                  disabled={saving || testing || !hasFormCredential || !testText.trim()}
                  className={cn(
                    "rounded-lg px-4 py-2 font-sans text-sm font-semibold transition-colors",
                    hasFormCredential && !saving && testText.trim()
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "cursor-not-allowed bg-secondary text-muted-foreground/40",
                  )}
                >
                  {testing ? t.ai.testing : t.ai.test}
                </button>
              </div>

              {result && (
                <div className="mt-4 flex gap-2 rounded-lg bg-primary/10 px-3 py-2.5">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" weight="bold" />
                  <p className="font-sans text-sm leading-relaxed text-foreground">
                    {result}
                  </p>
                </div>
              )}
              {error && (
                <div className="mt-4 flex gap-2 rounded-lg bg-destructive/10 px-3 py-2.5">
                  <WarningCircle className="mt-0.5 size-4 shrink-0 text-destructive" weight="bold" />
                  <p className="font-sans text-xs leading-relaxed text-destructive">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside
          className="relative overflow-hidden rounded-xl border border-primary/20 bg-card p-4"
          style={{ animation: `card-in 350ms ${EASE_OUT} 80ms both` }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,241,53,0.15),transparent_42%)]" />
          <div className="relative flex h-full flex-col gap-3">
            {JULY_LINKS.map((link) => (
              <button
                key={link.host}
                type="button"
                onClick={() => void openExternal(link.url)}
                className="group rounded-xl border border-border/80 bg-secondary/35 p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <GlobeHemisphereEast className="size-4.5 text-primary" weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold text-foreground">
                      {link.title}
                    </p>
                    <p className="truncate font-mono text-[11px] text-primary">
                      {link.host}
                    </p>
                  </div>
                </div>
                <p className="mb-4 font-sans text-xs leading-relaxed text-muted-foreground">
                  {t.ai[link.descriptionKey]}
                </p>
                <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 font-sans text-xs font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
                  {t.ai.openLink}
                  <ArrowSquareOut className="size-4" weight="bold" />
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
