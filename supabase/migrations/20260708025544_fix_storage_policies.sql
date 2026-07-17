/*
# Fix Storage Bucket Policies

The previous attempt had incorrect syntax for storage folder paths.
This creates correct policies for user-scoped file storage.
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "select_own_storage_files" ON storage.objects;
DROP POLICY IF EXISTS "insert_own_storage_files" ON storage.objects;
DROP POLICY IF EXISTS "update_own_storage_files" ON storage.objects;
DROP POLICY IF EXISTS "delete_own_storage_files" ON storage.objects;

-- Create new policies with correct path matching
-- Files are stored as: {user_id}/{note_id}/{filename}
CREATE POLICY "select_own_storage_files" ON storage.objects FOR SELECT
  TO authenticated 
  USING (bucket_id = 'attachments' AND auth.uid()::text = SPLIT_PART(name, '/', 1));

CREATE POLICY "insert_own_storage_files" ON storage.objects FOR INSERT
  TO authenticated 
  WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = SPLIT_PART(name, '/', 1));

CREATE POLICY "update_own_storage_files" ON storage.objects FOR UPDATE
  TO authenticated 
  USING (bucket_id = 'attachments' AND auth.uid()::text = SPLIT_PART(name, '/', 1));

CREATE POLICY "delete_own_storage_files" ON storage.objects FOR DELETE
  TO authenticated 
  USING (bucket_id = 'attachments' AND auth.uid()::text = SPLIT_PART(name, '/', 1));