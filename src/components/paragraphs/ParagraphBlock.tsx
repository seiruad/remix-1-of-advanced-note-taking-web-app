import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  ArrowUpToLine,
  ArrowDownToLine,
  Merge,
  Paperclip,
  Trash2,
  Type,
  Unlink,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  File as FileIcon,
} from 'lucide-react';
import { RichTextEditor } from '../RichTextEditor';
import { UnifiedMenu, type UnifiedMenuItem } from '../UnifiedMenu';
import type { FileItem } from '../../types/database';
import { isDocEmpty, type NoteParagraph } from './useNoteParagraphs';

function iconFor(type: string) {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('audio/')) return Music;
  if (type.startsWith('video/')) return Video;
  if (type === 'application/pdf') return FileText;
  return FileIcon;
}

function shortName(name: string, max = 14) {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot) : '';
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base.slice(0, Math.max(3, max - ext.length - 1))}…${ext}`;
}

interface ParagraphBlockProps {
  paragraph: NoteParagraph;
  index: number;
  total: number;
  isLast: boolean;
  files: FileItem[];
  canEdit: boolean;
  onChange: (content: Record<string, unknown>) => void;
  onFocusEditor: (editor: unknown) => void;
  onAddNew: () => void;
  onMergeUp: () => void;
  onMergeDown: () => void;
  onDelete: () => void;
  onAutoDelete: () => void;
  onAttach: () => void;
  onDetach: (fileId: string) => void;
  onOpenFile: (file: FileItem) => void;
}

export function ParagraphBlock({
  paragraph,
  index,
  total,
  isLast,
  files,
  canEdit,
  onChange,
  onFocusEditor,
  onAddNew,
  onMergeUp,
  onMergeDown,
  onDelete,
  onAutoDelete,
  onAttach,
  onDetach,
  onOpenFile,
}: ParagraphBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const empty = isDocEmpty(paragraph.content);
  const hasFiles = files.length > 0;
  // Empty + files: hide the text row until the user asks for it.
  const textHidden = canEdit && empty && hasFiles && !textRevealed;
  // The hint lives only in the very last paragraph, while it is empty and unfocused.
  const showEmptyHint = canEdit && isLast && empty && !hasFiles && !focused;

  const revealText = () => {
    setTextRevealed(true);
    onAddNew();
    // focus once the collapsed row has expanded
    setTimeout(() => editorRef.current?.commands.focus('end'), 0);
  };

  const handleAttachFromHint = () => {
    onAddNew();
    onAttach();
  };

  // Leaving an empty paragraph without files removes it silently.
  const handleBlur = () => {
    setFocused(false);
    if (isDocEmpty(paragraph.content)) {
      setTextRevealed(false);
      if (!hasFiles && !isLast) {
        setTimeout(() => onAutoDelete(), 0);
      }
    }
  };

  const items: UnifiedMenuItem[] = [
        ...(textHidden
          ? [{ id: 'add-text', label: 'Add Text', icon: Type, onSelect: revealText }]
          : []),
        { id: 'attach', label: 'Attach File', icon: Paperclip, onSelect: onAttach },
        { id: 'add-new', label: 'Add new', icon: Plus, onSelect: () => {} },
        ...(index > 0
          ? [{ id: 'merge-up', label: 'Merge Up', icon: Merge, onSelect: onMergeUp }]
          : []),
        ...(index < total - 1
          ? [{ id: 'merge-down', label: 'Merge Down', icon: Merge, onSelect: onMergeDown }]
          : []),
        { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
      ];

  const showBorder = !showEmptyHint && (hovered || focused || menuOpen);

  return (
    <div
      className={`group relative rounded-xl border transition-colors bg-transparent ${
        showBorder ? 'border-slate-700/60' : 'border-transparent'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-1.5 px-2 sm:px-3 py-2">
        <div
          className="flex-1 min-w-0"
          onFocus={() => onFocusEditor(null)}
          onBlur={handleBlur}
        >
          <div className={`relative ${textHidden ? 'h-0 max-h-0 overflow-hidden' : ''}`}>
            <div className={showEmptyHint ? 'pointer-events-none opacity-0' : ''}>
              <RichTextEditor
                content={paragraph.content}
                onChange={onChange}
                editable={canEdit}
                onEditorReady={(editor) => {
                  editorRef.current = (editor as Editor) ?? null;
                  onFocusEditor(editor);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                minHeightClassName="min-h-[1.75rem]"
                placeholder=""
              />
            </div>

            {showEmptyHint && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-start gap-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={revealText}
                  aria-label="Write text in paragraph"
                  className="pointer-events-auto inline-flex items-center gap-1 h-7 px-1.5 rounded-lg bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
                >
                  <Type className="w-4 h-4" />
                  <span className="text-xs font-medium">Write text</span>
                </button>
                <span className="text-slate-500">or</span>
                <button
                  type="button"
                  onClick={onAttach}
                  aria-label="Attach file to paragraph"
                  className="pointer-events-auto inline-flex items-center gap-1 h-7 px-1.5 rounded-lg bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs font-medium">Attach file</span>
                </button>
                <span className="flex-shrink-0 text-[10px] uppercase tracking-wider font-bold text-amber-400/80 bg-amber-500/15 rounded-full px-1.5 py-0.5">
                  Empty
                </span>
              </div>
            )}
          </div>



          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {files.map((file) => {
                const Icon = iconFor(file.file_type);
                return (
                  <span
                    key={file.id}
                    className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenFile(file)}
                      className="inline-flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-slate-300"
                      title={file.filename}
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-[110px]">{shortName(file.filename)}</span>
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onDetach(file.id)}
                        aria-label={`Unlink ${file.filename}`}
                        title="Unlink from paragraph"
                        className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Unlink className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {canEdit && (
          <UnifiedMenu
            items={items}
            ariaLabel="Paragraph options"
            onOpenChange={setMenuOpen}
            triggerClassName={`w-7 h-7 text-slate-500 hover:text-slate-200 transition-opacity ${
              hovered || focused || menuOpen ? 'opacity-100' : 'opacity-0 sm:opacity-0 max-sm:opacity-100'
            }`}
            iconClassName="w-4 h-4"
            openTriggerClassName="text-slate-100"
          />
        )}
      </div>
    </div>
  );
}
