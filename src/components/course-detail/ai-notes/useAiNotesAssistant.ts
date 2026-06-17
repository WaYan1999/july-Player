import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { aiTextToNoteHtml, getPreferredNoteSubtitle, vttToAiTranscript } from "@/lib/aiNotes";
import type { AppLanguage } from "@/lib/i18n";
import { noteHtmlToText } from "@/lib/sanitize";
import { askNoteAi, generateAiNote, getSubtitleVtt } from "@/lib/store";
import type { Note, Subtitle } from "@/types";
import { AI_NOTES_COPY } from "./copy";

type BusyState = "idle" | "generate" | "ask" | "save";

export interface UseAiNotesAssistantInput {
  courseTitle: string;
  lessonTitle: string;
  subtitles: Subtitle[];
  notes: Note[];
  language: AppLanguage;
  onSaveNote: (content: string) => void | Promise<void>;
}

export function useAiNotesAssistant({
  courseTitle,
  lessonTitle,
  subtitles,
  notes,
  language,
  onSaveNote,
}: UseAiNotesAssistantInput) {
  const copy = AI_NOTES_COPY[language];
  const activeRequestIdRef = useRef(0);
  const [busy, setBusy] = useState<BusyState>("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [transcriptCache, setTranscriptCache] = useState("");

  const subtitleKey = useMemo(
    () => subtitles.map((subtitle) => `${subtitle.id}:${subtitle.path}`).join("|"),
    [subtitles],
  );

  const existingNotesText = useMemo(
    () =>
      notes
        .map((note) => noteHtmlToText(note.content).trim())
        .filter(Boolean)
        .join("\n\n"),
    [notes],
  );

  const hasContext = subtitles.length > 0 || existingNotesText.trim().length > 0;
  const isBusy = busy !== "idle";

  useEffect(() => {
    activeRequestIdRef.current += 1;
    setBusy("idle");
    setTranscriptCache("");
    setAnswer("");
    setQuestion("");
    setError("");
  }, [courseTitle, language, lessonTitle, subtitleKey]);

  const isCurrentRequest = useCallback(
    (requestId: number) => activeRequestIdRef.current === requestId,
    [],
  );

  const startRequest = useCallback((nextBusy: BusyState) => {
    activeRequestIdRef.current += 1;
    setBusy(nextBusy);
    setError("");
    return activeRequestIdRef.current;
  }, []);

  const loadTranscript = useCallback(
    async (allowEmpty: boolean, requestId: number) => {
      if (transcriptCache.trim()) return transcriptCache;

      const preferred = getPreferredNoteSubtitle(subtitles);
      const candidates = [
        preferred,
        ...subtitles.filter((subtitle) => subtitle.id !== preferred?.id),
      ].filter(Boolean) as Subtitle[];

      if (candidates.length === 0) {
        if (allowEmpty) return "";
        throw new Error(copy.noSubtitle);
      }

      let lastError = "";
      for (const subtitle of candidates) {
        try {
          const vtt = await getSubtitleVtt(subtitle.path);
          if (!isCurrentRequest(requestId)) return "";

          const transcript = vttToAiTranscript(vtt, subtitle);
          if (transcript.trim()) {
            setTranscriptCache(transcript);
            return transcript;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
        }
      }

      if (allowEmpty) return "";
      throw new Error(lastError || copy.noSubtitle);
    },
    [copy.noSubtitle, isCurrentRequest, subtitles, transcriptCache],
  );

  const handleGenerate = useCallback(async () => {
    const requestId = startRequest("generate");
    try {
      const transcript = await loadTranscript(existingNotesText.trim().length > 0, requestId);
      if (!isCurrentRequest(requestId)) return;

      if (!transcript.trim() && !existingNotesText.trim()) {
        throw new Error(copy.noContext);
      }
      const result = await generateAiNote({
        courseTitle,
        lessonTitle,
        transcript,
        existingNotes: existingNotesText,
        language,
      });
      if (!isCurrentRequest(requestId)) return;

      setAnswer(result);
      toast.success(copy.generated);
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(copy.failed, { description: message });
    } finally {
      if (isCurrentRequest(requestId)) {
        setBusy("idle");
      }
    }
  }, [
    copy.failed,
    copy.generated,
    copy.noContext,
    courseTitle,
    existingNotesText,
    isCurrentRequest,
    language,
    lessonTitle,
    loadTranscript,
    startRequest,
  ]);

  const handleAsk = useCallback(async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      toast.message(copy.emptyQuestion);
      return;
    }

    const requestId = startRequest("ask");
    try {
      const transcript = await loadTranscript(true, requestId);
      if (!isCurrentRequest(requestId)) return;

      if (!transcript.trim() && !existingNotesText.trim()) {
        throw new Error(copy.noContext);
      }

      const result = await askNoteAi({
        courseTitle,
        lessonTitle,
        transcript,
        existingNotes: existingNotesText,
        question: trimmedQuestion,
        language,
      });
      if (!isCurrentRequest(requestId)) return;

      setAnswer(result);
      setQuestion("");
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(copy.failed, { description: message });
    } finally {
      if (isCurrentRequest(requestId)) {
        setBusy("idle");
      }
    }
  }, [
    copy.emptyQuestion,
    copy.failed,
    copy.noContext,
    courseTitle,
    existingNotesText,
    isCurrentRequest,
    language,
    lessonTitle,
    loadTranscript,
    question,
    startRequest,
  ]);

  const handleSave = useCallback(async () => {
    if (!answer.trim()) return;

    const requestId = startRequest("save");
    try {
      const html = aiTextToNoteHtml(answer);
      if (!html.trim()) {
        throw new Error(copy.noContext);
      }
      await onSaveNote(html);
      if (!isCurrentRequest(requestId)) return;

      toast.success(copy.saved);
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(copy.failed, { description: message });
    } finally {
      if (isCurrentRequest(requestId)) {
        setBusy("idle");
      }
    }
  }, [
    answer,
    copy.failed,
    copy.noContext,
    copy.saved,
    isCurrentRequest,
    onSaveNote,
    startRequest,
  ]);

  return {
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
  };
}
