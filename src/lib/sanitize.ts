const NOTE_ALLOWED_TAGS = new Set([
  "B",
  "BR",
  "DIV",
  "EM",
  "I",
  "P",
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "U",
]);

const NOTE_ALLOWED_CLASSES = new Set(["note-timestamp"]);

function unwrapNode(node: Node) {
  const parent = node.parentNode;
  if (!parent) return;

  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }
  parent.removeChild(node);
}

function sanitizeElement(element: Element) {
  const tagName = element.tagName.toUpperCase();
  if (!NOTE_ALLOWED_TAGS.has(tagName)) {
    unwrapNode(element);
    return;
  }

  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;
    const isEventHandler = name.startsWith("on");
    const isAllowedTimestamp =
      tagName === "SPAN" &&
      name === "data-timestamp" &&
      Number.isFinite(Number(value));
    const isAllowedClass =
      name === "class" &&
      value
        .split(/\s+/)
        .filter(Boolean)
        .every((className) => NOTE_ALLOWED_CLASSES.has(className));
    const isAllowedContentEditable =
      tagName === "SPAN" &&
      name === "contenteditable" &&
      value.toLowerCase() === "false";

    if (
      isEventHandler ||
      (!isAllowedTimestamp && !isAllowedClass && !isAllowedContentEditable)
    ) {
      element.removeAttribute(attr.name);
    }
  }
}

function normalizeNoteHtml(root: HTMLElement) {
  root.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => {
    node.remove();
  });

  for (const element of Array.from(root.querySelectorAll("*"))) {
    sanitizeElement(element);
  }
}

export function sanitizeNoteHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const wrapper = document.createElement("div");
  wrapper.appendChild(template.content.cloneNode(true));
  normalizeNoteHtml(wrapper);
  return wrapper.innerHTML.trim();
}

export function noteHtmlToText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = sanitizeNoteHtml(html);
  return template.content.textContent ?? "";
}

export function plainTextToSubtitleLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
