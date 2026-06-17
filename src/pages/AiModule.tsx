import { useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOutIcon as ArrowSquareOut,
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
import { Button, Input, ListBox, ListBoxItem, Select, TextArea } from "@heroui/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "@/components/ui/toast";
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
  previewMode?: boolean;
}

type FeedbackTone = "success" | "info" | "error";

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
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("ai-soft-select relative flex min-w-0 flex-col gap-1.5", className)}>
      <span className="font-sans text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Select
        selectedKey={value}
        onSelectionChange={(key) => {
          if (key) onChange(String(key) as T);
        }}
        aria-label={label}
        isDisabled={loading || options.length === 0}
        className="w-full min-w-0"
      >
        <Select.Trigger
          className={cn(
            "july-select ai-soft-select-trigger flex min-h-10 w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left font-sans text-sm text-foreground outline-none",
            loading && "cursor-wait opacity-70",
          )}
        >
          <Select.Value className="min-w-0 flex-1 overflow-hidden">
            <span className={cn("block min-w-0 truncate", !selected && "text-muted-foreground")}>
              {loading ? placeholder : selected?.label ?? placeholder}
            </span>
          </Select.Value>
          {loading ? (
            <SpinnerGap className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <Select.Indicator className="size-4 shrink-0 text-muted-foreground transition-transform data-[open=true]:rotate-180" />
          )}
        </Select.Trigger>
        <Select.Popover
          placement="bottom start"
          offset={6}
          containerPadding={16}
          className="july-popover ai-soft-select-popover z-[80] overflow-y-auto p-1.5"
        >
          <ListBox className="ai-soft-select-listbox outline-none">
            {options.map((option) => (
              <ListBoxItem
                id={option.value}
                key={option.value}
                textValue={option.label}
                className="ai-soft-select-option cursor-pointer rounded-lg px-3 py-2 text-left font-sans text-sm text-foreground outline-none transition-colors hover:bg-secondary/80 data-[focus-visible=true]:bg-secondary data-[selected=true]:bg-primary/12 data-[selected=true]:text-primary"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <CheckCircle
                  className={cn(
                    "size-4 shrink-0 transition-opacity",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                  weight="fill"
                  aria-hidden="true"
                />
              </ListBoxItem>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {helper && (
        <span className="font-sans text-[11px] leading-relaxed text-muted-foreground">
          {helper}
        </span>
      )}
    </div>
  );
}

export function AiModule({ className, previewMode = false }: AiModuleProps) {
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
  const [configFeedback, setConfigFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);

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

  const saveConfiguration = async (options: { successToast?: boolean } = {}) => {
    if (!hasChanges) {
      if (options.successToast) {
        setConfigFeedback({ tone: "success", text: t.ai.saved });
        toast.success(t.ai.saved);
      }
      return true;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    setConfigFeedback({ tone: "info", text: t.ai.saving });
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
      setConfigFeedback({ tone: "success", text: t.ai.saved });
      if (options.successToast) toast.success(t.ai.saved);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSaveError(message);
      setConfigFeedback({ tone: "error", text: `${t.ai.saveFailed}: ${message}` });
      toast.error(t.ai.saveFailed, { description: message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const refreshModels = async (options: { notify?: boolean } = { notify: true }) => {
    setLoadingModels(true);
    setModelError("");
    if (options.notify) setConfigFeedback({ tone: "info", text: t.ai.loadingModels });
    try {
      const saved = await saveConfiguration();
      if (!saved) return;
      if (previewMode) {
        const previewModels = [
          { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
          { id: "deepseek-chat", label: "DeepSeek Chat" },
          { id: "qwen-plus", label: "Qwen Plus" },
        ];
        setModelOptions(previewModels);
        if (!previewModels.some((model) => model.id === form.model)) {
          setForm((current) => ({ ...current, model: previewModels[0].id }));
        }
        if (options.notify) setConfigFeedback({ tone: "success", text: t.ai.refreshModels });
        if (options.notify) toast.success(t.ai.refreshModels);
        return;
      }
      const models = await getAiModels();
      if (models.length > 0) {
        setModelOptions(models);
        if (!models.some((model) => model.id === form.model)) {
          const nextModel = models[0].id;
          setForm((current) => ({ ...current, model: nextModel }));
          await update("ai_deepseek_model", nextModel);
        }
        if (options.notify) setConfigFeedback({ tone: "success", text: t.ai.refreshModels });
        if (options.notify) toast.success(t.ai.refreshModels);
      } else {
        setModelError(t.ai.modelLoadFailed);
        if (options.notify) setConfigFeedback({ tone: "error", text: t.ai.modelLoadFailed });
        if (options.notify) toast.error(t.ai.modelLoadFailed);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setModelError(message);
      if (options.notify) setConfigFeedback({ tone: "error", text: `${t.ai.modelLoadFailed}: ${message}` });
      if (options.notify) toast.error(t.ai.modelLoadFailed, { description: message });
      setModelOptions(FALLBACK_MODEL_OPTIONS);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (!hasFormCredential || hasChanges || !configured) return;

    const timer = window.setTimeout(() => {
      void refreshModels({ notify: false });
    }, 900);

    return () => window.clearTimeout(timer);
    // Fetch after the upstream credentials settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.apiUrl, form.apiKey, hasFormCredential, hasChanges, configured]);

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
      if (previewMode) {
        setResult("Preview translation: the desktop app will call your configured API here.");
        toast.success(t.ai.testTranslation);
        return;
      }
      const translated = await translateWithDeepSeek(
        testText,
        form.targetLanguage,
      );
      setResult(translated);
      toast.success(t.ai.testTranslation);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(t.ai.testTranslation, { description: message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={cn("july-page", className)}>
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

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(min(100%,280px),320px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="relative overflow-visible rounded-xl border border-border/70 bg-card/95">
            <div className="relative p-5 sm:p-6">
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
                    <Input
                      value={form.apiUrl}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, apiUrl: event.target.value }))
                      }
                      placeholder="https://api.example.com/v1"
                      fullWidth
                      className="july-heroui-field w-full"
                    />
                    <span className="font-sans text-[11px] leading-relaxed text-muted-foreground">
                      {t.ai.apiUrlHint}
                    </span>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-xs font-medium text-muted-foreground">
                      {t.ai.apiKey}
                    </span>
                    <Input
                      type="password"
                      value={form.apiKey}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, apiKey: event.target.value }))
                      }
                      placeholder="sk-..."
                      fullWidth
                      className="july-heroui-field w-full"
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
                  <div className="flex items-center gap-2 rounded-lg border border-border/45 bg-secondary/45 px-3 py-2 font-mono text-xs text-muted-foreground">
                    <FloppyDisk className="size-3.5 shrink-0" />
                    <span>
                      {t.ai.savedKey}: {maskedKey}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className={cn(
                      "inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold",
                      hasChanges
                        ? "border-info/25 bg-info/8 text-info"
                        : saveSuccess
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "border-border/55 bg-secondary/35 text-muted-foreground",
                    )}
                  >
                    {hasChanges ? (
                      <WarningCircle className="size-3.5" weight="bold" />
                    ) : saveSuccess ? (
                      <CheckCircle className="size-3.5" weight="bold" />
                    ) : (
                      <FloppyDisk className="size-3.5" />
                    )}
                    {saveSuccess && !hasChanges ? t.ai.saved : hasChanges ? t.ai.unsaved : configured ? t.ai.configured : t.ai.notConfigured}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => void refreshModels({ notify: true })}
                      isDisabled={saving || loadingModels || !hasFormCredential}
                      variant="secondary"
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 px-3 font-sans text-sm font-semibold whitespace-nowrap shadow-none",
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
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        void saveConfiguration({ successToast: true });
                      }}
                      isDisabled={!hasChanges || saving}
                      variant="primary"
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-lg px-4 font-sans text-sm font-semibold whitespace-nowrap shadow-none",
                        hasChanges && !saving
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "cursor-not-allowed bg-secondary text-muted-foreground/40",
                      )}
                    >
                      {saving ? (
                        <SpinnerGap className="size-4 animate-spin" />
                      ) : saveSuccess && !hasChanges ? (
                        <CheckCircle className="size-4" weight="bold" />
                      ) : (
                        <FloppyDisk className="size-4" />
                      )}
                      {saving ? t.ai.saving : saveSuccess && !hasChanges ? t.ai.saved : t.ai.saveConfig}
                    </Button>
                  </div>
                </div>
                {configFeedback && (
                  <div
                    className={cn(
                      "july-feedback-card flex items-start gap-2 rounded-lg border px-3 py-2 font-sans text-xs leading-relaxed",
                      configFeedback.tone === "success" && "border-primary/25 bg-primary/10 text-primary",
                      configFeedback.tone === "info" && "border-info/25 bg-info/8 text-info",
                      configFeedback.tone === "error" && "border-destructive/25 bg-destructive/10 text-destructive",
                    )}
                  >
                    {configFeedback.tone === "info" ? (
                      <SpinnerGap className="mt-0.5 size-3.5 shrink-0 animate-spin" />
                    ) : configFeedback.tone === "error" ? (
                      <WarningCircle className="mt-0.5 size-3.5 shrink-0" weight="bold" />
                    ) : (
                      <CheckCircle className="mt-0.5 size-3.5 shrink-0" weight="bold" />
                    )}
                    <span>{configFeedback.text}</span>
                  </div>
                )}
                {saveError && (
                  <div className="july-feedback-card rounded-lg bg-destructive/10 px-3 py-2 font-sans text-xs text-destructive">
                    {t.ai.saveFailed}: {saveError}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="relative overflow-visible rounded-xl border border-border/70 bg-card/95">
            <div className="relative p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Translate className="size-4 text-info" weight="bold" />
                <h3 className="font-heading text-sm font-bold text-foreground">
                  {t.ai.testTranslation}
                </h3>
              </div>
              <TextArea
                value={testText}
                onChange={(event) => setTestText(event.target.value)}
                fullWidth
                className="july-heroui-field min-h-24 w-full resize-none"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl font-sans text-xs leading-relaxed text-muted-foreground">
                  {t.ai.playerHint}
                </p>
                <Button
                  type="button"
                  onClick={testDeepSeek}
                  isDisabled={saving || testing || !hasFormCredential || !testText.trim()}
                  variant="primary"
                  className={cn(
                    "inline-flex h-10 w-full items-center gap-2 rounded-lg px-4 font-sans text-sm font-semibold whitespace-nowrap shadow-none sm:w-auto",
                    hasFormCredential && !saving && testText.trim()
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "cursor-not-allowed bg-secondary text-muted-foreground/40",
                  )}
                >
                  {testing ? (
                    <SpinnerGap className="size-4 animate-spin" />
                  ) : (
                    <Translate className="size-4" weight="bold" />
                  )}
                  {testing ? t.ai.testing : t.ai.test}
                </Button>
              </div>

              {result && (
                <div className="mt-4 flex gap-2 rounded-lg bg-primary/10 px-3 py-2.5">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" weight="bold" />
                  <p className="font-sans text-sm leading-relaxed text-foreground">
                    {result}
                  </p>
                </div>
              )}
              {testing && !result && !error && (
                <div className="mt-4 flex gap-2 rounded-lg border border-info/25 bg-info/8 px-3 py-2.5">
                  <SpinnerGap className="mt-0.5 size-4 shrink-0 animate-spin text-info" />
                  <p className="font-sans text-sm leading-relaxed text-info">
                    {t.ai.testing}
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
          className="relative min-w-0 overflow-hidden rounded-xl border border-primary/18 bg-card/95 p-4 lg:sticky lg:top-4 lg:self-start"
          style={{ animation: `card-in 350ms ${EASE_OUT} 80ms both` }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,241,53,0.11),transparent_46%)]" />
          <div className="relative flex h-full flex-col gap-3">
            {JULY_LINKS.map((link) => (
              <Button
                key={link.host}
                type="button"
                onClick={() => void openExternal(link.url)}
                variant="ghost"
                className="july-feedback-card group h-auto w-full flex-col items-stretch justify-start rounded-xl border border-border/80 bg-secondary/35 p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
              </Button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
