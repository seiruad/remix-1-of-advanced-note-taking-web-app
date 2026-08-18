CREATE TABLE public.note_paragraphs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  content jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX note_paragraphs_note_id_position_idx ON public.note_paragraphs (note_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_paragraphs TO authenticated;
GRANT ALL ON public.note_paragraphs TO service_role;

ALTER TABLE public.note_paragraphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own note paragraphs"
  ON public.note_paragraphs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shared note paragraphs read"
  ON public.note_paragraphs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.note_shares s
    WHERE s.note_id = note_paragraphs.note_id
      AND s.shared_with_user_id = auth.uid()
  ));

CREATE POLICY "shared note paragraphs insert"
  ON public.note_paragraphs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.note_shares s
    WHERE s.note_id = note_paragraphs.note_id
      AND s.shared_with_user_id = auth.uid()
      AND s.permission = 'edit'
  ));

CREATE POLICY "shared note paragraphs update"
  ON public.note_paragraphs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.note_shares s
    WHERE s.note_id = note_paragraphs.note_id
      AND s.shared_with_user_id = auth.uid()
      AND s.permission = 'edit'
  ));

CREATE POLICY "shared note paragraphs delete"
  ON public.note_paragraphs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.note_shares s
    WHERE s.note_id = note_paragraphs.note_id
      AND s.shared_with_user_id = auth.uid()
      AND s.permission = 'edit'
  ));

CREATE TRIGGER note_paragraphs_set_updated_at
  BEFORE UPDATE ON public.note_paragraphs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.note_files
  ADD COLUMN paragraph_id uuid REFERENCES public.note_paragraphs(id) ON DELETE SET NULL;

CREATE INDEX note_files_paragraph_id_idx ON public.note_files (paragraph_id);