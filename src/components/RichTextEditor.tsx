import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  content: Record<string, unknown> | null;
  onChange: (content: Record<string, unknown>) => void;
  editable?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  onEditorReady,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onEditorReady);
  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onEditorReady;
  }, [onChange, onEditorReady]);

  const isEditingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-emerald-400 hover:text-emerald-300 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      isEditingRef.current = true;
      onChangeRef.current(editor.getJSON());
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
      className="prose prose-invert max-w-none min-h-[300px] focus:outline-none"
    />
  );
}
