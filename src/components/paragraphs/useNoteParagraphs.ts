import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface NoteParagraph {
  id: string;
  note_id: string;
  position: number;
  content: Record<string, unknown> | null;
  heading: string | null;
  kind: 'header' | 'paragraph';
}

type Doc = Record<string, unknown> | null;

export function isDocEmpty(doc: Doc): boolean {
  if (!doc) return true;
  const content = (doc as { content?: unknown[] }).content;
  if (!Array.isArray(content) || content.length === 0) return true;
  const serialized = JSON.stringify(content);
  const hasText = /"text":"[^"]*\S[^"]*"/.test(serialized);
  const hasMedia = serialized.includes('"type":"image"');
  return !hasText && !hasMedia;
}


function mergeDocs(a: Doc, b: Doc): Doc {
  const aContent = (a as { content?: unknown[] } | null)?.content ?? [];
  const bContent = (b as { content?: unknown[] } | null)?.content ?? [];
  return { type: 'doc', content: [...aContent, ...bContent] };
}

export function useNoteParagraphs(params: {
  noteId: string | null;
  userId: string | null;
  initialContent: Doc;
  canEdit: boolean;
}) {
  const { noteId, userId, initialContent, canEdit } = params;
  const [paragraphs, setParagraphs] = useState<NoteParagraph[]>([]);
  const [loading, setLoading] = useState(true);
  /** file_id -> paragraph_id (null = attached to the note only) */
  const [fileParagraph, setFileParagraph] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;

  const loadLinks = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('note_files')
      .select('file_id, paragraph_id')
      .eq('note_id', id);
    const map: Record<string, string | null> = {};
    (data ?? []).forEach((row) => {
      map[row.file_id as string] = (row.paragraph_id as string | null) ?? null;
    });
    setFileParagraph(map);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!noteId) {
      setParagraphs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error: loadError } = await supabase
        .from('note_paragraphs')
        .select('id, note_id, position, content, heading, kind')
        .eq('note_id', noteId)
        .order('position', { ascending: true });

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      let rows = (data ?? []) as NoteParagraph[];

      // First open of a legacy note: convert its single document into one paragraph.
      if (rows.length === 0 && userId && canEdit) {
        const { data: inserted, error: insertError } = await supabase
          .from('note_paragraphs')
          .insert({
            note_id: noteId,
            user_id: userId,
            position: 0,
            content: (initialContentRef.current ?? null) as never,
          })
          .select('id, note_id, position, content, heading, kind')
          .single();
        if (!cancelled && !insertError && inserted) {
          rows = [inserted as NoteParagraph];
        }
      }

      if (cancelled) return;
      setParagraphs(rows);
      await loadLinks(noteId);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId, userId, canEdit, loadLinks]);

  // ---- persistence helpers -------------------------------------------------

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(
    () => () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    },
    [],
  );

  const persistPositions = useCallback(async (rows: NoteParagraph[]) => {
    await Promise.all(
      rows.map((p, i) =>
        p.position === i
          ? Promise.resolve()
          : supabase.from('note_paragraphs').update({ position: i }).eq('id', p.id),
      ),
    );
  }, []);

  const setContent = useCallback((id: string, content: Doc) => {
    setParagraphs((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      supabase
        .from('note_paragraphs')
        .update({ content: content as never })
        .eq('id', id)
        .then(({ error: e }) => {
          if (e) setError(e.message);
        });
    }, 600);
  }, []);

  const headingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(
    () => () => {
      Object.values(headingTimers.current).forEach(clearTimeout);
    },
    [],
  );

  const setHeading = useCallback((id: string, heading: string | null, immediate = false) => {
    setParagraphs((prev) => prev.map((p) => (p.id === id ? { ...p, heading } : p)));
    if (headingTimers.current[id]) clearTimeout(headingTimers.current[id]);
    const run = () => {
      supabase
        .from('note_paragraphs')
        .update({ heading })
        .eq('id', id)
        .then(({ error: e }) => {
          if (e) setError(e.message);
        });
    };
    if (immediate) run();
    else headingTimers.current[id] = setTimeout(run, 600);
  }, []);

  const insertAt = useCallback(
    async (index: number, kind: 'header' | 'paragraph' = 'paragraph') => {
      if (!noteId || !userId) return null;
      const { data, error: insertError } = await supabase
        .from('note_paragraphs')
        .insert({ note_id: noteId, user_id: userId, position: index, content: null, kind })
        .select('id, note_id, position, content, heading, kind')
        .single();
      if (insertError || !data) {
        setError(insertError?.message ?? 'Failed to add paragraph');
        return null;
      }
      const created = data as NoteParagraph;
      let next: NoteParagraph[] = [];
      setParagraphs((prev) => {
        next = [...prev.slice(0, index), created, ...prev.slice(index)].map((p, i) => ({
          ...p,
          position: i,
        }));
        return next;
      });
      // positions are recalculated after state settles
      setTimeout(() => persistPositions(next), 0);
      return created.id;
    },
    [noteId, userId, persistPositions],
  );

  const removeParagraph = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('note_paragraphs').delete().eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      let next: NoteParagraph[] = [];
      setParagraphs((prev) => {
        next = prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, position: i }));
        return next;
      });
      setFileParagraph((prev) => {
        const copy = { ...prev };
        Object.keys(copy).forEach((fileId) => {
          if (copy[fileId] === id) copy[fileId] = null;
        });
        return copy;
      });
      setTimeout(() => persistPositions(next), 0);
    },
    [persistPositions],
  );

  const mergeInto = useCallback(
    async (sourceId: string, targetId: string, where: 'above' | 'below') => {
      if (sourceId === targetId) return;
      const source = paragraphs.find((p) => p.id === sourceId);
      const target = paragraphs.find((p) => p.id === targetId);
      if (!source || !target) return;

      const merged =
        where === 'above'
          ? mergeDocs(source.content, target.content)
          : mergeDocs(target.content, source.content);

      const { error: updateError } = await supabase
        .from('note_paragraphs')
        .update({ content: merged as never })
        .eq('id', targetId);
      if (updateError) {
        setError(updateError.message);
        return;
      }

      // move attachments of the source paragraph to the target
      const movedFiles = Object.entries(fileParagraph)
        .filter(([, pid]) => pid === sourceId)
        .map(([fileId]) => fileId);
      if (movedFiles.length && noteId) {
        await supabase
          .from('note_files')
          .update({ paragraph_id: targetId })
          .eq('note_id', noteId)
          .in('file_id', movedFiles);
        setFileParagraph((prev) => {
          const copy = { ...prev };
          movedFiles.forEach((fileId) => {
            copy[fileId] = targetId;
          });
          return copy;
        });
      }

      await supabase.from('note_paragraphs').delete().eq('id', sourceId);
      let next: NoteParagraph[] = [];
      setParagraphs((prev) => {
        next = prev
          .filter((p) => p.id !== sourceId)
          .map((p) => (p.id === targetId ? { ...p, content: merged } : p))
          .map((p, i) => ({ ...p, position: i }));
        return next;
      });
      setTimeout(() => persistPositions(next), 0);
    },
    [paragraphs, fileParagraph, noteId, persistPositions],
  );

  const attachFileToParagraph = useCallback(
    async (fileId: string, paragraphId: string | null) => {
      if (!noteId) return;
      // Optimistic: the chip appears/disappears instantly, DB catches up after.
      let previous: string | null | undefined;
      setFileParagraph((prev) => {
        previous = prev[fileId];
        if (prev[fileId] === paragraphId) return prev;
        return { ...prev, [fileId]: paragraphId };
      });
      const { error: updateError } = await supabase
        .from('note_files')
        .update({ paragraph_id: paragraphId })
        .eq('note_id', noteId)
        .eq('file_id', fileId);
      if (updateError) {
        setError(updateError.message);
        setFileParagraph((prev) => ({ ...prev, [fileId]: previous ?? null }));
      }
    },
    [noteId],
  );

  const refreshLinks = useCallback(() => {
    if (noteId) loadLinks(noteId);
  }, [noteId, loadLinks]);

  return {
    paragraphs,
    loading,
    error,
    setError,
    fileParagraph,
    setContent,
    setHeading,
    insertAt,
    removeParagraph,
    mergeInto,
    attachFileToParagraph,
    refreshLinks,
  };
}
