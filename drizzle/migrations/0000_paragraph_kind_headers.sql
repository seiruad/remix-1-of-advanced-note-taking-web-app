ALTER TABLE public.note_paragraphs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'paragraph';
ALTER TABLE public.note_paragraphs ADD CONSTRAINT note_paragraphs_kind_check CHECK (kind IN ('header','paragraph'));
UPDATE public.note_paragraphs SET position = position * 2 + 1 WHERE kind = 'paragraph';
INSERT INTO public.note_paragraphs (note_id, user_id, position, content, heading, kind)
  SELECT note_id, user_id, position - 1, NULL, heading, 'header' FROM public.note_paragraphs
  WHERE kind = 'paragraph' AND heading IS NOT NULL AND btrim(heading) <> '';
UPDATE public.note_paragraphs SET heading = NULL WHERE kind = 'paragraph' AND heading IS NOT NULL;
DELETE FROM public.note_paragraphs p WHERE p.kind = 'paragraph' AND p.content IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.note_files f WHERE f.paragraph_id = p.id)
  AND EXISTS (SELECT 1 FROM public.note_paragraphs h WHERE h.note_id = p.note_id AND h.kind = 'header' AND h.position = p.position - 1);