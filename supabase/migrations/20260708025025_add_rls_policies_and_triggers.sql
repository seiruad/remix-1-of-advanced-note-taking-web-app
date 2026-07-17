/*
# Notes App Schema - RLS Policies and Triggers

1. Security
   - Owner-scoped CRUD for folders, notes, attachments
   - Shares: owner can manage, shared users can read based on permission
   - Storage usage: users can read/update their own

2. Triggers
   - Auto-update note timestamp
   - Auto-update storage usage on attachment insert/delete
*/

-- Folders policies
DROP POLICY IF EXISTS "select_own_folders" ON folders;
CREATE POLICY "select_own_folders" ON folders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_folders" ON folders;
CREATE POLICY "insert_own_folders" ON folders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_folders" ON folders;
CREATE POLICY "update_own_folders" ON folders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_folders" ON folders;
CREATE POLICY "delete_own_folders" ON folders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Notes policies - owner can do everything, shared users can read/edit based on permission
DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM note_shares 
      WHERE note_shares.note_id = notes.id 
      AND note_shares.shared_with_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM note_shares 
      WHERE note_shares.note_id = notes.id 
      AND note_shares.shared_with_user_id = auth.uid()
      AND note_shares.permission = 'edit'
    )
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM note_shares 
      WHERE note_shares.note_id = notes.id 
      AND note_shares.shared_with_user_id = auth.uid()
      AND note_shares.permission = 'edit'
    )
  );

DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Attachments policies
DROP POLICY IF EXISTS "select_own_attachments" ON attachments;
CREATE POLICY "select_own_attachments" ON attachments FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM notes 
      JOIN note_shares ON note_shares.note_id = notes.id
      WHERE notes.id = attachments.note_id 
      AND note_shares.shared_with_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_attachments" ON attachments;
CREATE POLICY "insert_own_attachments" ON attachments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_attachments" ON attachments;
CREATE POLICY "delete_own_attachments" ON attachments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Note shares policies
DROP POLICY IF EXISTS "select_own_shares" ON note_shares;
CREATE POLICY "select_own_shares" ON note_shares FOR SELECT
  TO authenticated USING (
    auth.uid() = shared_by_user_id OR auth.uid() = shared_with_user_id
  );

DROP POLICY IF EXISTS "insert_own_shares" ON note_shares;
CREATE POLICY "insert_own_shares" ON note_shares FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = shared_by_user_id
    AND EXISTS (SELECT 1 FROM notes WHERE notes.id = note_id AND notes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_shares" ON note_shares;
CREATE POLICY "delete_own_shares" ON note_shares FOR DELETE
  TO authenticated USING (auth.uid() = shared_by_user_id);

-- User storage usage policies
DROP POLICY IF EXISTS "select_own_storage" ON user_storage_usage;
CREATE POLICY "select_own_storage" ON user_storage_usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_storage" ON user_storage_usage;
CREATE POLICY "insert_own_storage" ON user_storage_usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_storage" ON user_storage_usage;
CREATE POLICY "update_own_storage" ON user_storage_usage FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to update note's updated_at timestamp
CREATE OR REPLACE FUNCTION update_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_note_timestamp ON notes;
CREATE TRIGGER trigger_update_note_timestamp
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_note_timestamp();

-- Function to update storage usage when attachment is added
CREATE OR REPLACE FUNCTION update_storage_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_storage_usage (user_id, total_bytes)
  VALUES (NEW.user_id, NEW.file_size)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_bytes = user_storage_usage.total_bytes + NEW.file_size,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_storage_insert ON attachments;
CREATE TRIGGER trigger_update_storage_insert
  AFTER INSERT ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_on_insert();

-- Function to update storage usage when attachment is deleted
CREATE OR REPLACE FUNCTION update_storage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_storage_usage
  SET total_bytes = total_bytes - OLD.file_size, updated_at = now()
  WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_storage_delete ON attachments;
CREATE TRIGGER trigger_update_storage_delete
  AFTER DELETE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_on_delete();