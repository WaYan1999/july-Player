import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon as CheckCircle,
  FloppyDiskIcon as FloppyDisk,
  KeyIcon as Key,
  MicrophoneIcon as Microphone,
  SpinnerGapIcon as SpinnerGap,
  SparkleIcon as Sparkle,
  TranslateIcon as Translate,
  WarningCircleIcon as WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/constants";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useSettings } from "@/hooks/useSettings";
import { translateWithDeepSeek } from "@/lib/store";

const MODEL_OPTIONS = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

interface AiModuleProps {
  className?: string;
}

export function AiModule({ className }: AiModuleProps) {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [testText, setTestText] = useState("This lesson explains component state.");
  const [result, setResult] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    apiKey: settings.ai_deepseek_api_key,
    model: settings.ai_deepseek_model,
    asrApiKey: settings.ai_asr_api_key,
    asrModel: settings.ai_asr_model,
    asrEndpoint: settings.ai_asr_endpoint,
    targetLanguage: settings.ai_translation_target,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const configured =
    settings.ai_deepseek_api_key.trim().length > 0 &&
    settings.ai_asr_api_key.trim().length > 0;
  const hasChanges =
    form.apiKey !== settings.ai_deepseek_api_key ||
    form.model !== settings.ai_deepseek_model ||
    form.asrApiKey !== settings.ai_asr_api_key ||
    form.asrModel !== settings.ai_asr_model ||
    form.asrEndpoint !== settings.ai_asr_endpoint ||
    form.targetLanguage !== settings.ai_translation_target;
  const maskedKey = useMemo(() => {
    const key = settings.ai_deepseek_api_key.trim();
    if (key.length <= 8) return key ? "••••••••" : "";
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }, [settings.ai_deepseek_api_key]);

  useEffect(() => {
    setForm({
      apiKey: settings.ai_deepseek_api_key,
      model: settings.ai_deepseek_model,
      asrApiKey: settings.ai_asr_api_key,
      asrModel: settings.ai_asr_model,
      asrEndpoint: settings.ai_asr_endpoint,
      targetLanguage: settings.ai_translation_target,
    });
  }, [
    settings.ai_deepseek_api_key,
    settings.ai_deepseek_model,
    settings.ai_asr_api_key,
    settings.ai_asr_model,
    settings.ai_asr_endpoint,
    settings.ai_translation_target,
  ]);

  const saveConfiguration = async () => {
    if (!hasChanges) return true;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      await update("ai_deepseek_api_key", form.apiKey);
      await update("ai_deepseek_model", form.model);
      await update("ai_asr_api_key", form.asrApiKey);
      await update("ai_asr_model", form.asrModel);
      await update("ai_asr_endpoint", form.asrEndpoint);
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
    <div className={cn("mx-auto max-w-3xl px-6 py-8", className)}>
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

      <div className="flex flex-col gap-4">
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
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-xs font-medium text-muted-foreground">
                  {t.ai.apiKey}
                </span>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, apiKey: e.target.value }))
                  }
                  placeholder="sk-..."
                  className="rounded-lg border border-border bg-secondary px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/60"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-xs font-medium text-muted-foreground">
                    {t.ai.model}
                  </span>
                  <select
                    value={form.model}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, model: e.target.value }))
                    }
                    className="rounded-lg border border-border bg-secondary px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors focus:border-primary/60"
                  >
                    {MODEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-xs font-medium text-muted-foreground">
                    {t.ai.targetLanguage}
                  </span>
                  <select
                    value={form.targetLanguage}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        targetLanguage: e.target.value as typeof settings.ai_translation_target,
                      }))
                    }
                    className="rounded-lg border border-border bg-secondary px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors focus:border-primary/60"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {configured && (
                <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 font-mono text-xs text-muted-foreground">
                  <FloppyDisk className="size-3.5 shrink-0" />
                  <span>
                    {t.ai.savedKey}: {maskedKey}
                  </span>
                </div>
              )}

              <div className="mt-2 rounded-xl border border-border/70 bg-secondary/35 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Microphone className="size-4 text-info" weight="bold" />
                    <h4 className="font-heading text-xs font-bold text-foreground">
                      {t.ai.speechRecognition}
                    </h4>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 font-sans text-[11px] font-semibold",
                      form.asrApiKey.trim()
                        ? "bg-info/10 text-info"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    {form.asrApiKey.trim() ? t.ai.configured : t.ai.notConfigured}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-xs font-medium text-muted-foreground">
                      {t.ai.speechApiKey}
                    </span>
                    <input
                      type="password"
                      value={form.asrApiKey}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, asrApiKey: e.target.value }))
                      }
                      placeholder="sk-..."
                      className="rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/60"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-sans text-xs font-medium text-muted-foreground">
                        {t.ai.speechModel}
                      </span>
                      <input
                        value={form.asrModel}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, asrModel: e.target.value }))
                        }
                        placeholder="whisper-1"
                        className="rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/60"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="font-sans text-xs font-medium text-muted-foreground">
                        {t.ai.speechEndpoint}
                      </span>
                      <input
                        value={form.asrEndpoint}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, asrEndpoint: e.target.value }))
                        }
                        placeholder="https://api.openai.com/v1/audio/transcriptions"
                        className="rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/60"
                      />
                    </label>
                  </div>

                  <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                    {t.ai.speechEndpointHint}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-sans text-xs text-muted-foreground">
                  {saveSuccess && !hasChanges ? t.ai.saved : hasChanges ? t.ai.unsaved : t.ai.saved}
                </p>
                <button
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
              onChange={(e) => setTestText(e.target.value)}
              className="min-h-24 w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 font-sans text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/60"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-sans text-xs text-muted-foreground">
                {t.ai.playerHint}
              </p>
              <button
                onClick={testDeepSeek}
                disabled={saving || testing || !form.apiKey.trim() || !testText.trim()}
                className={cn(
                  "rounded-lg px-4 py-2 font-sans text-sm font-semibold transition-colors",
                  form.apiKey.trim() && !saving && testText.trim()
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
    </div>
  );
}
