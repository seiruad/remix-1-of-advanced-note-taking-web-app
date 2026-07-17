/*
# Create Storage Bucket for Attachments

Create a storage bucket for user file attachments (images, documents, etc.)
with RLS policies so users can only access their own files.
*/

-- Create the attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the attachments bucket
DROP POLICY IF EXISTS "select_own_storage_files" ON storage.objects;
CREATE POLICY "select_own_storage_files" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "insert_own_storage_files" ON storage.objects;
CREATE POLICY "insert_own_storage_files" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "update_own_storage_files" ON storage.objects;
CREATE POLICY "update_own_storage_files" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "delete_own_storage_files" ON storage.objects;
CREATE POLICY "delete_own_storage_files" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);