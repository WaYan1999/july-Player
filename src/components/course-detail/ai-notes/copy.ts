import type { AppLanguage } from "@/lib/i18n";

export interface AiNotesCopy {
  title: string;
  subtitle: string;
  generate: string;
  generating: string;
  askPlaceholder: string;
  ask: string;
  thinking: string;
  save: string;
  saving: string;
  noSubtitle: string;
  noContext: string;
  emptyQuestion: string;
  generated: string;
  saved: string;
  failed: string;
  answerLabel: string;
}

export const AI_NOTES_COPY: Record<AppLanguage, AiNotesCopy> = {
  en: {
    title: "AI study notes",
    subtitle: "Extract the current lesson into notes, or ask about anything that is unclear.",
    generate: "Generate note",
    generating: "Generating",
    askPlaceholder: "Ask a question about this lesson...",
    ask: "Ask AI",
    thinking: "Thinking",
    save: "Save as note",
    saving: "Saving",
    noSubtitle: "No readable subtitles are available for this lesson yet.",
    noContext: "Add subtitles or write a note first, then AI can help with this lesson.",
    emptyQuestion: "Type a question first.",
    generated: "AI note generated",
    saved: "Saved to notes",
    failed: "AI notes failed",
    answerLabel: "AI response",
  },
  zh: {
    title: "AI \u5b66\u4e60\u7b14\u8bb0",
    subtitle: "\u81ea\u52a8\u63d0\u53d6\u5f53\u524d\u8bfe\u65f6\u91cd\u70b9\uff0c\u4e5f\u53ef\u4ee5\u968f\u65f6\u95ee\u4e0d\u61c2\u7684\u5185\u5bb9\u3002",
    generate: "\u751f\u6210\u7b14\u8bb0",
    generating: "\u751f\u6210\u4e2d",
    askPlaceholder: "\u8f93\u5165\u4f60\u4e0d\u61c2\u7684\u95ee\u9898...",
    ask: "\u95ee AI",
    thinking: "\u601d\u8003\u4e2d",
    save: "\u4fdd\u5b58\u4e3a\u7b14\u8bb0",
    saving: "\u4fdd\u5b58\u4e2d",
    noSubtitle: "\u5f53\u524d\u8bfe\u65f6\u8fd8\u6ca1\u6709\u53ef\u8bfb\u53d6\u7684\u5b57\u5e55\u3002",
    noContext: "\u5148\u5bfc\u5165\u5b57\u5e55\u6216\u5199\u4e00\u6761\u7b14\u8bb0\uff0cAI \u5c31\u53ef\u4ee5\u56f4\u7ed5\u5f53\u524d\u8bfe\u65f6\u56de\u7b54\u3002",
    emptyQuestion: "\u5148\u8f93\u5165\u4e00\u4e2a\u95ee\u9898\u3002",
    generated: "AI \u7b14\u8bb0\u5df2\u751f\u6210",
    saved: "\u5df2\u4fdd\u5b58\u5230\u7b14\u8bb0",
    failed: "AI \u7b14\u8bb0\u5931\u8d25",
    answerLabel: "AI \u56de\u7b54",
  },
  fr: {
    title: "Notes IA",
    subtitle: "Extraire cette lecon en notes, ou poser une question sur un point flou.",
    generate: "Generer une note",
    generating: "Generation",
    askPlaceholder: "Posez une question sur cette lecon...",
    ask: "Demander",
    thinking: "Reflexion",
    save: "Enregistrer",
    saving: "Enregistrement",
    noSubtitle: "Aucun sous-titre lisible n'est disponible pour cette lecon.",
    noContext: "Ajoutez des sous-titres ou une note, puis l'IA pourra aider.",
    emptyQuestion: "Saisissez d'abord une question.",
    generated: "Note IA generee",
    saved: "Note enregistree",
    failed: "Echec des notes IA",
    answerLabel: "Reponse IA",
  },
};
