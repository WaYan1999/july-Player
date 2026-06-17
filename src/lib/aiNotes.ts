import type { Subtitle } from "@/types";
import {
  getAiSourceSubtitleCueText,
  getDisplaySubtitleCueText,
  getSubtitleLanguageKey,
  parseVttCues,
  uniqueSubtitleCueTexts,
} from "@/lib/subtitles";
import { sanitizeNoteHtml } from "@/lib/sanitize";

const MAX_TRANSCRIPT_CHARS = 18_000;
const FULLWIDTH_COLON = "\uff1a";
const BULLET_PREFIX = "\u2022 ";
const MUSIC_NOTE = "\u266a";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripMarkdownPrefix(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function inlineMarkdownToHtml(line: string): string {
  const escaped = escapeHtml(stripMarkdownPrefix(line));
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function isHeadingLine(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    ((line.endsWith(":") || line.endsWith(FULLWIDTH_COLON)) && line.length <= 24)
  );
}

function removeTrailingColon(value: string): string {
  return value.endsWith(":") || value.endsWith(FULLWIDTH_COLON)
    ? value.slice(0, -1)
    : value;
}

export function aiTextToNoteHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isHeading = isHeadingLine(line);
      const isListItem = /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
      const content = inlineMarkdownToHtml(line);

      if (isHeading) {
        return `<div><strong>${removeTrailingColon(content)}</strong></div>`;
      }
      if (isListItem) {
        return `<div><span>${BULLET_PREFIX}</span>${content}</div>`;
      }
      return `<div>${content}</div>`;
    });

  return sanitizeNoteHtml(blocks.join(""));
}

export function getPreferredNoteSubtitle(subtitles: Subtitle[]): Subtitle | null {
  if (subtitles.length === 0) return null;

  const chinese = subtitles.find((subtitle) => getSubtitleLanguageKey(subtitle) === "zh");
  if (chinese) return chinese;

  const english = subtitles.find((subtitle) => getSubtitleLanguageKey(subtitle) === "en");
  if (english) return english;

  return subtitles[0] ?? null;
}

export function vttToAiTranscript(vtt: string, subtitle?: Subtitle | null): string {
  const cues = parseVttCues(vtt);
  const texts = cues
    .map((cue) => {
      if (!subtitle) return cue.text;
      return (
        getDisplaySubtitleCueText(subtitle, cue.text) ||
        getAiSourceSubtitleCueText(subtitle, cue.text) ||
        cue.text
      );
    })
    .map((text) =>
      text
        .replace(/\s+/g, " ")
        .replace(new RegExp(MUSIC_NOTE, "g"), "")
        .trim(),
    )
    .filter(Boolean);

  return Array.from(uniqueSubtitleCueTexts(texts).join("\n"))
    .slice(0, MAX_TRANSCRIPT_CHARS)
    .join("");
}
