/*
# Create workspaces table

1. New Tables
   - `workspaces` - User workspaces (top-level containers above folders/notes)
     - id (uuid, primary key)
     - name (text, not null)
     - user_id (uuid, not null, defaults to auth.uid(), references auth.users)
     - created_at (timestamptz)

2. Modified Tables
   - `folders` - added `workspace_id` column (uuid, references workspaces, ON DELETE CASCADE)
   - `notes` - added `workspace_id` column (uuid, references workspaces, ON DELETE CASCADE)

3. Data Migration
   - For each existing user, create one default workspace named "My Notes".
   - Backfill all existing folders and notes with the new workspace_id pointing
     to that user's default workspace.
   - After backfill, alter columns to NOT NULL so every folder/note belongs to
     a workspace going forward.

4. Security
   - RLS enabled on `workspaces`.
   - Owner-scoped CRUD: authenticated users can only access rows they own.
   - Existing folder/notes RLS policies already check auth.uid() = user_id,
     which remains sufficient; workspace_id is a grouping dimension, not an
     additional security boundary.

5. Important Notes
   1. Existing data is preserved — every folder and note is assigned to a
      default workspace before the NOT NULL constraint is applied.
   2. Deleting a workspace cascades to all its folders and notes.
   3. The app creates a default workspace for new users on first login if none
      exists.
*/

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workspaces" ON workspaces;
CREATE POLICY "select_own_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workspaces" ON workspaces;
CREATE POLICY "insert_own_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workspaces" ON workspaces;
CREATE POLICY "update_own_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workspaces" ON workspaces;
CREATE POLICY "delete_own_workspaces" ON workspaces FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

-- 2. Add workspace_id to folders (nullable first for backfill)
ALTER TABLE folders ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 3. Add workspace_id to notes (nullable first for backfill)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 4. Create a default workspace per user and backfill existing data.
--    Uses a DO block to create one workspace per distinct user_id found in
--    notes/folders, then assigns all that user's rows to it.
DO $$
DECLARE
  u RECORD;
  ws_id uuid;
BEGIN
  -- Find all distinct users that have folders or notes
  FOR u IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM folders
      UNION
      SELECT user_id FROM notes
      UNION
      SELECT user_id FROM workspaces
    ) AS combined
  LOOP
    -- Check if user already has a workspace
    SELECT id INTO ws_id FROM workspaces WHERE workspaces.user_id = u.user_id LIMIT 1;

    -- Create one if none exists
    IF ws_id IS NULL THEN
      INSERT INTO workspaces (name, user_id)
      VALUES ('My Notes', u.user_id)
      RETURNING id INTO ws_id;
    END IF;

    -- Backfill folders
    UPDATE folders SET workspace_id = ws_id WHERE user_id = u.user_id AND workspace_id IS NULL;
    -- Backfill notes
    UPDATE notes SET workspace_id = ws_id WHERE user_id = u.user_id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- 5. Add foreign keys and NOT NULL constraints after backfill
ALTER TABLE folders
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT folders_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE notes
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT notes_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_folders_workspace_id ON folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);
