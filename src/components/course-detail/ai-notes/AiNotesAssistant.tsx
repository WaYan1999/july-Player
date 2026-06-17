import {
  FloppyDiskIcon as FloppyDisk,
  PaperPlaneTiltIcon as PaperPlaneTilt,
  SparkleIcon as Sparkle,
  SpinnerGapIcon as SpinnerGap,
  WarningCircleIcon as WarningCircle,
} from "@phosphor-icons/react";
import { Button, Input } from "@heroui/react";
import { SNAPPY } from "@/lib/constants";
import type { AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Note, Subtitle } from "@/types";
import { useAiNotesAssistant } from "./useAiNotesAssistant";

interface AiNotesAssistantProps {
  courseTitle: string;
  lessonTitle: string;
  subtitles: Subtitle[];
  notes: Note[];
  language: AppLanguage;
  onSaveNote: (content: string) => void | Promise<void>;
}

export function AiNotesAssistant(props: AiNotesAssistantProps) {
  const {
    answer,
    busy,
    copy,
    error,
    hasContext,
    isBusy,
    question,
    setQuestion,
    handleAsk,
    handleGenerate,
    handleSave,
  } = useAiNotesAssistant(props);

  return (
    <section
      className="ai-notes-assistant rounded-lg border border-primary/20 bg-primary/5 p-3"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkle className="size-4" weight="bold" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-bold text-foreground">
              {copy.title}
            </h3>
            <p className="mt-0.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
              {copy.subtitle}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          isDisabled={isBusy || !hasContext}
          variant="primary"
          className={cn(
            "july-heroui-button min-h-8 shrink-0 px-2.5 py-1.5 text-xs",
            !isBusy && hasContext
              ? "july-heroui-button-primary"
              : "cursor-not-allowed bg-secondary text-muted-foreground/45",
          )}
          style={{ transitionTimingFunction: SNAPPY }}
        >
          {busy === "generate" ? (
            <SpinnerGap className="size-3.5 animate-spin" />
          ) : (
            <Sparkle className="size-3.5" weight="bold" />
          )}
          {busy === "generate" ? copy.generating : copy.generate}
        </Button>
      </div>

      {!hasContext && (
        <div className="mb-3 flex gap-2 rounded-lg bg-secondary/55 px-3 py-2">
          <WarningCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
            {copy.noContext}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAsk();
            }
          }}
          placeholder={copy.askPlaceholder}
          className="july-heroui-field min-h-9 min-w-0 flex-1 text-xs"
        />
        <Button
          type="button"
          onClick={handleAsk}
          isDisabled={isBusy || !question.trim()}
          variant="secondary"
          className={cn(
            "july-heroui-button min-h-9 px-2.5 py-2 text-xs",
            !isBusy && question.trim()
              ? "border border-border bg-secondary text-foreground hover:border-primary/35 hover:bg-secondary/80"
              : "cursor-not-allowed bg-secondary/60 text-muted-foreground/45",
          )}
          style={{ transitionTimingFunction: SNAPPY }}
        >
          {busy === "ask" ? (
            <SpinnerGap className="size-3.5 animate-spin" />
          ) : (
            <PaperPlaneTilt className="size-3.5" weight="fill" />
          )}
          {busy === "ask" ? copy.thinking : copy.ask}
        </Button>
      </div>

      {answer && (
        <div className="mt-3 rounded-lg border border-border/70 bg-card px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-sans text-[11px] font-semibold text-primary">
              {copy.answerLabel}
            </span>
            <Button
              type="button"
              onClick={handleSave}
              isDisabled={isBusy}
              variant="ghost"
              className={cn(
                "july-heroui-button min-h-7 gap-1.5 rounded-md px-2 py-1 text-[11px]",
                isBusy
                  ? "cursor-not-allowed bg-secondary text-muted-foreground/45"
                  : "bg-primary/10 text-primary hover:bg-primary/20",
              )}
            >
              {busy === "save" ? (
                <SpinnerGap className="size-3 animate-spin" />
              ) : (
                <FloppyDisk className="size-3" weight="bold" />
              )}
              {busy === "save" ? copy.saving : copy.save}
            </Button>
          </div>
          <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/90">
            {answer}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <WarningCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <p className="font-sans text-[11px] leading-relaxed text-destructive">
            {error}
          </p>
        </div>
      )}
    </section>
  );
}
