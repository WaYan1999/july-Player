import type { Subtitle } from "@/types";

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const HAN_TEXT_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

export function getSubtitleFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function getSubtitleSearchText(sub: Subtitle): string {
  return [sub.language, getSubtitleFileName(sub.path)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSubtitleTokens(sub: Subtitle): string[] {
  return getSubtitleSearchText(sub)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function getSubtitleLanguageKey(sub: Subtitle): string {
  const tokens = getSubtitleTokens(sub);
  const searchText = getSubtitleSearchText(sub);

  if (
    searchText.includes("中文") ||
    searchText.includes("简体") ||
    searchText.includes("繁体") ||
    tokens.some((token) => token.startsWith("zh")) ||
    tokens.some((token) =>
      ["chinese", "china", "chi", "zho", "cmn"].includes(token),
    )
  ) {
    return "zh";
  }

  if (tokens.some((token) => ["en", "eng", "english"].includes(token))) {
    return "en";
  }

  if (
    tokens.some((token) =>
      ["fr", "fra", "fre", "french", "francais", "français"].includes(token),
    )
  ) {
    return "fr";
  }

  return sub.language?.trim().toLowerCase() || getSubtitleFileName(sub.path).toLowerCase();
}

export function getSubtitleDisplayLabel(sub: Subtitle, fallback: string): string {
  const key = getSubtitleLanguageKey(sub);
  if (key === "zh") return "中文字幕";
  if (key === "en") return "English";
  if (key === "fr") return "Français";
  return sub.language?.trim() || getSubtitleFileName(sub.path) || fallback;
}

export function getDefaultSubtitleIndex(subtitles: Subtitle[]): number {
  return subtitles.findIndex((sub) => getSubtitleLanguageKey(sub) === "zh");
}

export function getTranslationSourceSubtitleIndex(subtitles: Subtitle[]): number {
  const englishIdx = subtitles.findIndex((sub) => getSubtitleLanguageKey(sub) === "en");
  if (englishIdx >= 0) return englishIdx;

  const nonChineseIdx = subtitles.findIndex((sub) => getSubtitleLanguageKey(sub) !== "zh");
  return nonChineseIdx >= 0 ? nonChineseIdx : subtitles.length > 0 ? 0 : -1;
}

export function getBilingualSubtitleIndexes(subtitles: Subtitle[]): [number, number] | null {
  const chineseIdx = subtitles.findIndex((sub) => getSubtitleLanguageKey(sub) === "zh");
  if (chineseIdx < 0) return null;

  const englishIdx = subtitles.findIndex(
    (sub, idx) => idx !== chineseIdx && getSubtitleLanguageKey(sub) === "en",
  );
  const otherLanguageIdx = subtitles.findIndex(
    (sub, idx) => idx !== chineseIdx && getSubtitleLanguageKey(sub) !== "zh",
  );
  const sourceIdx = englishIdx >= 0 ? englishIdx : otherLanguageIdx;

  return sourceIdx >= 0 ? [sourceIdx, chineseIdx] : null;
}

export function normalizeLiveSubtitleText(text: string): string {
  return text
    .replace(/\[[^\]]*]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripSubtitleMarkup(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function getSubtitleTextLines(text: string): string[] {
  return stripSubtitleMarkup(text)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function hasChineseText(text: string): boolean {
  return HAN_TEXT_RE.test(text);
}

function uniqueSubtitleLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = normalizeLiveSubtitleText(line).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

function getChineseOnlySubtitleText(text: string): string | null {
  const chineseLines = getSubtitleTextLines(text)
    .filter(hasChineseText)
    .map((line) =>
      line
        .replace(/^[^\u3400-\u9fff\uf900-\ufaff]+(?=[\u3400-\u9fff\uf900-\ufaff])/, "")
        .trim(),
    )
    .filter(Boolean);
  return uniqueSubtitleLines(chineseLines).join("\n") || null;
}

function getNonChineseSubtitleText(text: string): string | null {
  const sourceLines = getSubtitleTextLines(text)
    .map((line) => {
      if (!hasChineseText(line)) return line;
      const firstChineseIndex = line.search(HAN_TEXT_RE);
      const prefix = firstChineseIndex > 0 ? line.slice(0, firstChineseIndex).trim() : "";
      return /[a-zA-Z]{2,}/.test(prefix) ? prefix : "";
    })
    .filter(Boolean);
  return uniqueSubtitleLines(sourceLines).join("\n") || null;
}

export function getDisplaySubtitleCueText(sub: Subtitle, text: string | null): string | null {
  if (!text) return null;
  const key = getSubtitleLanguageKey(sub);
  if (key === "zh") {
    return (getChineseOnlySubtitleText(text) ?? getSubtitleTextLines(text).join("\n")) || null;
  }

  const lines = getSubtitleTextLines(text);
  const hasChineseLine = lines.some(hasChineseText);
  const hasSourceLine = lines.some((line) => !hasChineseText(line));
  if (hasChineseLine && hasSourceLine) {
    return (getNonChineseSubtitleText(text) ?? lines.join("\n")) || null;
  }
  return lines.join("\n") || null;
}

export function getAiSourceSubtitleCueText(sub: Subtitle, text: string | null): string {
  if (!text) return "";
  const nonChineseText = getNonChineseSubtitleText(text);
  const preferredText =
    nonChineseText ||
    (getSubtitleLanguageKey(sub) === "zh" ? getChineseOnlySubtitleText(text) : null) ||
    getSubtitleTextLines(text).join("\n");
  return normalizeLiveSubtitleText(preferredText);
}

export function uniqueSubtitleCueTexts(texts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const text of texts) {
    const key = normalizeLiveSubtitleText(text).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

export function parseVttTimestamp(ts: string): number {
  const parts = ts.trim().split(":");
  if (parts.length === 3) {
    const [h, m, rest] = parts;
    const [s, ms] = rest.split(".");
    return (
      parseInt(h) * 3600 +
      parseInt(m) * 60 +
      parseInt(s) +
      parseInt(ms || "0") / 1000
    );
  }
  if (parts.length === 2) {
    const [m, rest] = parts;
    const [s, ms] = rest.split(".");
    return parseInt(m) * 60 + parseInt(s) + parseInt(ms || "0") / 1000;
  }
  return 0;
}

export function parseVttCues(vtt: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = vtt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n\n");

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const tsLine = lines.find((line) => line.includes(" --> "));
    if (!tsLine) continue;

    const [startStr, endStr] = tsLine.split(" --> ");
    const start = parseVttTimestamp(startStr);
    const end = parseVttTimestamp(endStr.split(" ")[0]);
    const tsIdx = lines.indexOf(tsLine);
    const text = lines.slice(tsIdx + 1).join("\n").trim();
    if (text) {
      cues.push({ start, end, text });
    }
  }

  return cues.sort((a, b) => a.start - b.start);
}

function findFirstCueEndingAfter(cues: SubtitleCue[], time: number): number {
  let left = 0;
  let right = cues.length - 1;
  let result = cues.length;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (cues[mid].end >= time) {
      result = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return result;
}

export function getActiveCue(cues: SubtitleCue[] | undefined, time: number): string | null {
  if (!cues) return null;
  const startIdx = findFirstCueEndingAfter(cues, time);
  for (let idx = startIdx; idx < cues.length; idx += 1) {
    const cue = cues[idx];
    if (cue.start > time) break;
    if (time >= cue.start && time <= cue.end) {
      return cue.text;
    }
  }
  return null;
}

export function findUpcomingCues(cues: SubtitleCue[] | undefined, time: number, limit: number) {
  if (!cues?.length || limit <= 0) return [];
  const startIdx = findFirstCueEndingAfter(cues, time - 0.2);
  if (startIdx >= cues.length) return [];
  return cues.slice(startIdx, startIdx + limit);
}
