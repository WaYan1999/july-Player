import {
  NotePencilIcon as NotePencil,
  PencilSimpleIcon as PencilSimple,
  TrashIcon as Trash,
} from "@phosphor-icons/react";
import { Button } from "@heroui/react";
import { AiNotesAssistant } from "./ai-notes";
import { NoteEditor } from "./NoteEditor";
import { SNAPPY } from "@/lib/constants";
import type { AppLanguage } from "@/lib/i18n";
import type { Note, Subtitle } from "@/types";
import { useI18n } from "@/hooks/useI18n";
import { sanitizeNoteHtml } from "@/lib/sanitize";

interface NotesPanelProps {
  courseTitle: string;
  lessonTitle: string;
  subtitles: Subtitle[];
  notes: Note[];
  videoTime: number;
  editingNoteId: number | null;
  showEditor: boolean;
  language: AppLanguage;
  onAdd: (content: string) => void;
  onSaveAiNote: (content: string) => Promise<void>;
  onEdit: (noteId: number, content: string) => void;
  onDelete: (noteId: number) => void;
  onSetEditing: (id: number | null) => void;
  onSetShowEditor: (show: boolean) => void;
  onTimestampClick?: (seconds: number, lessonId: number) => void;
}

export function NotesPanel({
  courseTitle,
  lessonTitle,
  subtitles,
  notes,
  videoTime,
  editingNoteId,
  showEditor,
  language,
  onAdd,
  onSaveAiNote,
  onEdit,
  onDelete,
  onSetEditing,
  onSetShowEditor,
  onTimestampClick,
}: NotesPanelProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <AiNotesAssistant
        courseTitle={courseTitle}
        lessonTitle={lessonTitle}
        subtitles={subtitles}
        notes={notes}
        language={language}
        onSaveNote={onSaveAiNote}
      />

      {showEditor ? (
        <NoteEditor
          videoTime={videoTime}
          onSubmit={onAdd}
          onCancel={() => onSetShowEditor(false)}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSetShowEditor(true)}
          className="july-heroui-button justify-start gap-2 rounded-lg border-dashed px-3 py-2.5 text-xs text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
          style={{ transitionTimingFunction: SNAPPY }}
        >
          <NotePencil className="size-3.5" />
          {t.notesPanel.addNote}
        </Button>
      )}

      {notes.length === 0 && !showEditor && (
        <p className="py-4 text-center font-sans text-xs text-muted-foreground/60">
          {t.notesPanel.noNotes}
        </p>
      )}

      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          videoTime={videoTime}
          isEditing={editingNoteId === note.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onStartEdit={() => onSetEditing(note.id)}
          onCancelEdit={() => onSetEditing(null)}
          onTimestampClick={onTimestampClick}
        />
      ))}
    </div>
  );
}

interface NoteCardProps {
  note: Note;
  videoTime: number;
  isEditing: boolean;
  onEdit: (noteId: number, content: string) => void;
  onDelete: (noteId: number) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onTimestampClick?: (seconds: number, lessonId: number) => void;
}

function NoteCard({
  note,
  videoTime,
  isEditing,
  onEdit,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onTimestampClick,
}: NoteCardProps) {
  const { t } = useI18n();

  if (isEditing) {
    return (
      <NoteEditor
        videoTime={videoTime}
        initialContent={note.content}
        onSubmit={(content) => onEdit(note.id, content)}
        onCancel={onCancelEdit}
      />
    );
  }

  const date = new Date(note.updatedAt);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="group rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-secondary/50"
      style={{ transitionTimingFunction: SNAPPY }}
    >
      <div className="flex items-start gap-2">
        <div
          className="note-content flex-1 font-sans text-xs leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(note.content) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains("note-timestamp")) {
              const seconds = Number(target.dataset.timestamp);
              if (!isNaN(seconds) && onTimestampClick) {
                onTimestampClick(seconds, note.lessonId);
              }
            }
          }}
        />
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            isIconOnly
            onClick={onStartEdit}
            className="july-heroui-button july-heroui-icon-button size-7 min-h-7 min-w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t.common.edit}
          >
            <PencilSimple className="size-3" />
          </Button>
          <Button
            type="button"
            variant="danger"
            isIconOnly
            onClick={() => onDelete(note.id)}
            className="july-heroui-button july-heroui-icon-button size-7 min-h-7 min-w-7 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            aria-label={t.common.delete}
          >
            <Trash className="size-3" />
          </Button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground/50">
          {note.lessonTitle}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/50">
          {formatted}
        </span>
      </div>
    </div>
  );
}
