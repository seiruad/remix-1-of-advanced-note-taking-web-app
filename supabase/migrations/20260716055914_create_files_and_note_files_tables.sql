/*
# Create files and note_files tables for storage management

1. New Tables
   - `files` — Stores all user-uploaded files, independent of notes.
     - id (uuid, primary key)
     - user_id (uuid, not null, defaults to auth.uid())
     - filename (text, not null) — original file name
     - storage_path (text, not null) — path in Supabase storage bucket
     - file_type (text, not null) — MIME type
     - file_size (bigint, not null) — size in bytes
     - created_at (timestamentz, default now())

   - `note_files` — Many-to-many junction between notes and files.
     - id (uuid, primary key)
     - note_id (uuid, not null, references notes, ON DELETE CASCADE)
     - file_id (uuid, not null, references files, ON DELETE CASCADE)
     - user_id (uuid, not null, defaults to auth.uid())
     - created_at (timestamptz, default now())
     - UNIQUE (note_id, file_id) — prevents duplicate linking

2. Changes to existing tables
   - The old `attachments` table data is migrated into `files` + `note_files`.
   - The old `attachments` table is dropped after migration.
   - The `user_storage_usage` table is kept and its triggers are updated to
     track `files` instead of `attachments`.

3. Security
   - RLS enabled on `files` and `note_files`.
   - Owner-scoped CRUD on `files` (auth.uid() = user_id).
   - Owner-scoped CRUD on `note_files` (auth.uid() = user_id).
   - Storage bucket policies remain unchanged (path starts with user_id).

4. Storage limit enforcement
   - A trigger function `enforce_storage_limit()` checks that the user's
     total file size does not exceed 100 MB before allowing a new insert
     into `files`. Raises an exception if the limit would be exceeded.

5. Important notes
   - Files are stored once in the `files` table and can be linked to
     zero, one, or many notes via `note_files`.
   - Deleting a note removes its `note_files` rows (CASCADE) but does NOT
     delete the file itself.
   - Deleting a file removes it from storage and all its `note_files` links.
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create note_files junction table
CREATE TABLE IF NOT EXISTS note_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (note_id, file_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_note_files_note_id ON note_files(note_id);
CREATE INDEX IF NOT EXISTS idx_note_files_file_id ON note_files(file_id);
CREATE INDEX IF NOT EXISTS idx_note_files_user_id ON note_files(user_id);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_files ENABLE ROW LEVEL SECURITY;

-- Policies for files table
DROP POLICY IF EXISTS "select_own_files" ON files;
CREATE POLICY "select_own_files" ON files FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_files" ON files;
CREATE POLICY "insert_own_files" ON files FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_files" ON files;
CREATE POLICY "update_own_files" ON files FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_files" ON files;
CREATE POLICY "delete_own_files" ON files FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Policies for note_files table
DROP POLICY IF EXISTS "select_own_note_files" ON note_files;
CREATE POLICY "select_own_note_files" ON note_files FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_note_files" ON note_files;
CREATE POLICY "insert_own_note_files" ON note_files FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_note_files" ON note_files;
CREATE POLICY "delete_own_note_files" ON note_files FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Migrate existing attachments data into files + note_files
INSERT INTO files (user_id, filename, storage_path, file_type, file_size, created_at)
SELECT user_id, filename, storage_path, file_type, file_size, created_at
FROM attachments
ON CONFLICT DO NOTHING;

INSERT INTO note_files (note_id, file_id, user_id, created_at)
SELECT a.note_id, f.id, a.user_id, a.created_at
FROM attachments a
JOIN files f ON f.storage_path = a.storage_path AND f.user_id = a.user_id
ON CONFLICT (note_id, file_id) DO NOTHING;

-- Storage limit enforcement: 100 MB per user
CREATE OR REPLACE FUNCTION enforce_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_total bigint;
  max_bytes bigint := 100 * 1024 * 1024; -- 100 MB
BEGIN
  SELECT COALESCE(sum(file_size), 0) INTO current_total
  FROM files
  WHERE user_id = NEW.user_id;

  IF current_total + NEW.file_size > max_bytes THEN
    RAISE EXCEPTION 'Storage limit exceeded. You cannot upload more than 100 MB total.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_storage_limit ON files;
CREATE TRIGGER trigger_enforce_storage_limit
  BEFORE INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION enforce_storage_limit();

-- Update storage usage trigger to track files instead of attachments
CREATE OR REPLACE FUNCTION update_storage_on_file_insert()
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

CREATE OR REPLACE FUNCTION update_storage_on_file_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_storage_usage
  SET total_bytes = total_bytes - OLD.file_size, updated_at = now()
  WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_storage_file_insert ON files;
CREATE TRIGGER trigger_update_storage_file_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_on_file_insert();

DROP TRIGGER IF EXISTS trigger_update_storage_file_delete ON files;
CREATE TRIGGER trigger_update_storage_file_delete
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_on_file_delete();

-- Drop old attachment triggers
DROP TRIGGER IF EXISTS trigger_update_storage_insert ON attachments;
DROP TRIGGER IF EXISTS trigger_update_storage_delete ON attachments;

-- Drop old attachment policies
DROP POLICY IF EXISTS "select_own_attachments" ON attachments;
DROP POLICY IF EXISTS "insert_own_attachments" ON attachments;
DROP POLICY IF EXISTS "delete_own_attachments" ON attachments;

-- Drop the old attachments table
DROP TABLE IF EXISTS attachments;

-- Recalculate user_storage_usage from files (in case of drift)
DO $$
BEGIN
  -- Delete old usage rows
  DELETE FROM user_storage_usage;

  -- Recalculate from files
  INSERT INTO user_storage_usage (user_id, total_bytes)
  SELECT user_id, sum(file_size)
  FROM files
  GROUP BY user_id
  ON CONFLICT (user_id) DO UPDATE SET total_bytes = EXCLUDED.total_bytes;
END $$;
