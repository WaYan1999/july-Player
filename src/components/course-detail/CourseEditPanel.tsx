import { useState, useEffect, useRef } from "react";
import {
  ArrowLeftIcon as ArrowLeft,
  PaletteIcon as Palette,
  TrashIcon as Trash,
  ArrowCounterClockwiseIcon as ArrowCounterClockwise,
  FloppyDiskIcon as FloppyDisk,
  WarningIcon as Warning,
  FolderOpenIcon as FolderOpen,
} from "@phosphor-icons/react";
import { Button, Input } from "@heroui/react";
import { cn } from "@/lib/utils";
import { SquircleButton } from "@/components/ui/SquircleButton";
import { EASE_OUT, SNAPPY } from "@/lib/constants";
import type { CourseCategory, Course } from "@/types";
import { getCustomCategories, addCustomCategory, deleteCustomCategory } from "@/lib/store";
import { useI18n } from "@/hooks/useI18n";

const builtinCategories: { value: CourseCategory; label: string }[] = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "devops", label: "DevOps" },
  { value: "database", label: "Database" },
  { value: "design", label: "Design" },
  { value: "other", label: "Other" },
];

const accentColors = [
  "#6DBEE6",
  "#AFC7F1",
  "#526B96",
  "#75BEEA",
  "#84D4C8",
  "#3F8EC4",
  "#B8CAD8",
  "#2F9B8E",
  "#8EA6C9",
  "#E8B86D",
  "#E58AAE",
  "#7C8DA2",
];

interface CourseEditPanelProps {
  course: Course;
  onSave: (title: string, author: string, accentColor: string, category: string) => Promise<void>;
  onResetProgress: () => Promise<void>;
  onDelete: () => Promise<void>;
  onBack: () => void;
  className?: string;
}

export function CourseEditPanel({
  course,
  onSave,
  onResetProgress,
  onDelete,
  onBack,
  className,
}: CourseEditPanelProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(course.title);
  const [author, setAuthor] = useState(course.author);
  const [category, setCategory] = useState<string>(course.category);
  const [accentColor, setAccentColor] = useState(course.accentColor);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    getCustomCategories().then(setCustomCategories).catch(() => {});
  }, []);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mounted, setMounted] = useState(false);

  useState(() => {
    requestAnimationFrame(() => setMounted(true));
  });

  const hasChanges =
    title.trim() !== course.title ||
    author.trim() !== course.author ||
    category !== course.category ||
    accentColor !== course.accentColor;

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(title.trim(), author.trim(), accentColor, category);
      onBack();
    } finally {
      setSaving(false);
    }
  };

  const handleResetProgress = async () => {
    await onResetProgress();
    setConfirmReset(false);
    onBack();
  };

  const handleDelete = async () => {
    await onDelete();
  };

  return (
    <div className={cn("july-page-narrow", className)}>
      <div
        className="mb-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(8px)",
          transition: `opacity 220ms ${EASE_OUT}, transform 220ms ${EASE_OUT}`,
        }}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="july-heroui-button min-h-8 gap-1.5 border-0 bg-transparent px-0 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t.courseEdit.backToCourse}
        </Button>
      </div>

      <div
        className="mb-8"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 240ms ${EASE_OUT} 30ms, transform 240ms ${EASE_OUT} 30ms`,
        }}
      >
        <h2 className="font-heading text-2xl font-bold text-foreground">
          {t.courseEdit.editCourse}
        </h2>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          {t.courseEdit.subtitle}
        </p>
      </div>

      <div
        className="mb-6"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: `opacity 240ms ${EASE_OUT} 50ms, transform 240ms ${EASE_OUT} 50ms`,
        }}
      >
        <div className="group relative">
          <div className="squircle-subtle absolute inset-0 bg-border" />
          <div className="squircle-subtle absolute inset-px bg-card" />
          <div className="relative flex items-center gap-3 px-4 py-3">
            <FolderOpen className="size-4 shrink-0 text-primary" />
            <span className="truncate font-mono text-xs text-muted-foreground">
              {course.folderPath}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div
          className="flex flex-col gap-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: `opacity 240ms ${EASE_OUT} 70ms, transform 240ms ${EASE_OUT} 70ms`,
          }}
        >
          <h3 className="font-heading text-base font-bold text-foreground">
            {t.courseEdit.courseDetails}
          </h3>

          <FieldGroup label={t.courseEdit.title}>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.courseEdit.titlePlaceholder}
              className="min-h-0 w-full border-0 bg-transparent px-0 py-0 font-sans text-sm text-foreground placeholder:text-muted-foreground/40 shadow-none focus:outline-none"
            />
          </FieldGroup>

          <FieldGroup label={t.courseEdit.author}>
            <Input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t.courseEdit.authorPlaceholder}
              className="min-h-0 w-full border-0 bg-transparent px-0 py-0 font-sans text-sm text-foreground placeholder:text-muted-foreground/40 shadow-none focus:outline-none"
            />
          </FieldGroup>

          <CategoryPicker
            category={category}
            onCategoryChange={setCategory}
            customCategories={customCategories}
            onCustomCategoriesChange={setCustomCategories}
          />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 font-sans text-xs font-medium text-muted-foreground">
              <Palette className="size-3.5" />
              {t.courseEdit.accentColor}
            </label>
            <div className="flex flex-wrap gap-2">
              {accentColors.map((color) => (
                <Button
                  type="button"
                  variant="ghost"
                  isIconOnly
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={cn(
                    "july-heroui-button size-7 min-h-7 min-w-7 rounded-full border-2 p-0 transition-transform duration-150",
                    accentColor === color
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <SquircleButton
              variant="primary"
              onClick={handleSave}
              disabled={!title.trim() || !hasChanges || saving}
            >
              <FloppyDisk className="size-4" weight="bold" />
              {saving ? t.common.saving : t.courseEdit.saveChanges}
            </SquircleButton>
            {hasChanges && (
              <span className="font-sans text-xs text-muted-foreground">
                {t.courseEdit.unsavedChanges}
              </span>
            )}
          </div>
        </div>

        <div
          className="flex flex-col gap-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: `opacity 240ms ${EASE_OUT} 90ms, transform 240ms ${EASE_OUT} 90ms`,
          }}
        >
          <h3 className="font-heading text-base font-bold text-foreground">
            {t.courseEdit.manage}
          </h3>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-info/10">
                <ArrowCounterClockwise className="size-4 text-info" />
              </div>
              <div className="flex-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  {t.courseEdit.resetProgress}
                </p>
                <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                  {t.courseEdit.resetDescription}
                </p>
                {!confirmReset ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmReset(true)}
                    className="july-heroui-button mt-3 min-h-8 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                    style={{ transitionTimingFunction: SNAPPY }}
                  >
                    {t.courseEdit.resetProgress}
                  </Button>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleResetProgress}
                      className="july-heroui-button min-h-8 rounded-md bg-info/15 px-3 py-1.5 text-xs text-info hover:bg-info/25"
                      style={{ transitionTimingFunction: SNAPPY }}
                    >
                      {t.courseEdit.confirmReset}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setConfirmReset(false)}
                      className="july-heroui-button min-h-8 rounded-md border-0 bg-transparent px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t.common.cancel}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <Trash className="size-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  {t.courseEdit.deleteCourse}
                </p>
                <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                  {t.courseEdit.deleteDescription}
                </p>
                {!confirmDelete ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setConfirmDelete(true)}
                    className="july-heroui-button july-heroui-button-danger mt-3 min-h-8 rounded-md px-3 py-1.5 text-xs"
                    style={{ transitionTimingFunction: SNAPPY }}
                  >
                    {t.courseEdit.deleteCourse}
                  </Button>
                ) : (
                  <div className="mt-3">
                    <div className="mb-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
                      <Warning
                        className="size-3.5 shrink-0 text-destructive"
                        weight="bold"
                      />
                      <span className="font-sans text-xs text-destructive">
                        {t.courseEdit.deleteWarning}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleDelete}
                        className="july-heroui-button july-heroui-button-danger min-h-8 rounded-md px-3 py-1.5 text-xs"
                        style={{ transitionTimingFunction: SNAPPY }}
                      >
                        {t.courseEdit.yesDelete}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setConfirmDelete(false)}
                        className="july-heroui-button min-h-8 rounded-md border-0 bg-transparent px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t.common.cancel}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryPicker({
  category,
  onCategoryChange,
  customCategories,
  onCustomCategoriesChange,
}: {
  category: string;
  onCategoryChange: (v: string) => void;
  customCategories: string[];
  onCustomCategoriesChange: (v: string[]) => void;
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const isBuiltin = builtinCategories.some((c) => c.value === trimmed.toLowerCase());
    const isDuplicate = customCategories.includes(trimmed);
    if (!isBuiltin && !isDuplicate) {
      await addCustomCategory(trimmed);
      onCustomCategoriesChange([...customCategories, trimmed]);
    }
    onCategoryChange(trimmed);
    setNewName("");
    setAdding(false);
  };

  const handleDelete = async (name: string) => {
    await deleteCustomCategory(name);
    onCustomCategoriesChange(customCategories.filter((c) => c !== name));
    if (category === name) onCategoryChange("other");
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="font-sans text-xs font-medium text-muted-foreground">
        {t.categories.category}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {builtinCategories.map((cat) => (
          <Button
            type="button"
            variant="ghost"
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={cn(
              "july-heroui-button min-h-8 rounded-full px-3 py-1.5 text-xs duration-150",
              category === cat.value
                ? "border-primary/25 bg-primary/15 text-primary"
                : "border-border/50 bg-secondary text-muted-foreground hover:text-foreground",
            )}
            style={{ transitionTimingFunction: SNAPPY }}
          >
            {cat.label}
          </Button>
        ))}
        {customCategories.map((name) => (
          <div
            key={name}
            className={cn(
              "group flex items-center gap-1 rounded-full border pl-3 pr-1.5 py-1.5 font-sans text-xs font-medium transition-colors duration-150",
              category === name
                ? "border-primary/25 bg-primary/15 text-primary"
                : "border-border/50 bg-secondary text-muted-foreground hover:text-foreground",
            )}
            style={{ transitionTimingFunction: SNAPPY }}
          >
            <Button
              type="button"
              variant="ghost"
              className="min-h-0 border-0 bg-transparent px-0 py-0 text-xs shadow-none"
              onClick={() => onCategoryChange(name)}
            >
              {name}
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              onClick={() => handleDelete(name)}
              className="flex size-5 min-h-5 min-w-5 items-center justify-center rounded-full border-0 bg-transparent p-0.5 opacity-0 shadow-none transition-opacity hover:bg-black/10 group-hover:opacity-100"
              aria-label={t.common.delete}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
        ))}
        {adding ? (
          <div className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 pl-3 pr-1.5 py-1.5">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
              placeholder={t.categories.categoryName}
              className="min-h-0 w-24 border-0 bg-transparent px-0 py-0 font-sans text-xs text-primary placeholder:text-primary/50 shadow-none focus:outline-none"
            />
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAdd}
              className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-full border-0 bg-transparent p-1 text-primary shadow-none transition-colors hover:bg-primary/20"
              aria-label={t.common.save}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setAdding(false); setNewName(""); }}
              className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-full border-0 bg-transparent p-1 text-muted-foreground shadow-none transition-colors hover:bg-black/10"
              aria-label={t.common.cancel}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAdding(true)}
            className="july-heroui-button min-h-8 rounded-full border-dashed border-border/50 px-3 py-1.5 text-xs text-muted-foreground duration-150 hover:border-primary/25 hover:text-primary"
            style={{ transitionTimingFunction: SNAPPY }}
          >
            {t.categories.custom}
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-sans text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="group/field relative">
        <div className="squircle absolute inset-0 bg-border/25 transition-colors group-focus-within/field:bg-primary" />
        <div className="squircle absolute inset-px bg-card" />
        <div className="relative px-4 py-2.5">{children}</div>
      </div>
    </div>
  );
}
