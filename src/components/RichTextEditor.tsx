import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';


interface RichTextEditorProps {
  content: Record<string, unknown> | null;
  onChange: (content: Record<string, unknown>) => void;
  editable?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
  minHeightClassName?: string;
  /** Empty string disables the placeholder entirely. */
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  onEditorReady,
  minHeightClassName = 'min-h-[300px]',
  placeholder = 'Start writing your note...',
  onFocus,
  onBlur,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onEditorReady);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onEditorReady;
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
  }, [onChange, onEditorReady, onFocus, onBlur]);

  const isEditingRef = useRef(false);
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;

  const editor = useEditor({
    extensions: [
      // Plain-text only: every rich-formatting node/mark is disabled so the
      // paragraph body always renders with the single standard style.
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
      }),
    ],
    editorProps: {
      // Strip any formatting coming from the clipboard.
      transformPastedHTML: (html) => html.replace(/<[^>]*>/g, ''),
    },
    content: content || '',
    editable,

    onUpdate: ({ editor }) => {
      isEditingRef.current = true;
      onChangeRef.current(editor.getJSON());
    },
    onFocus: () => {
      onFocusRef.current?.();
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
  });

  useEffect(() => {
    if (editor && onReadyRef.current) {
      onReadyRef.current(editor);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    // Never overwrite the document while the user is typing in it —
    // remote/echoed props would reset the cursor and cause visible lag.
    if (isEditingRef.current || editor.isFocused) return;
    const currentJSON = JSON.stringify(editor.getJSON());
    const newJSON = JSON.stringify(content || '');
    if (currentJSON !== newJSON) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);


  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      editor={editor}
      className={`prose prose-invert max-w-none prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0 ${minHeightClassName} focus:outline-none`}
    />
  );
}
