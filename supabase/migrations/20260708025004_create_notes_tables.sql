/*
# Notes App Schema - Tables

1. New Tables
   - `folders` - User folders for organizing notes
     - id (uuid, primary key)
     - name (text, not null)
     - parent_id (uuid, nullable, self-referencing for nested folders)
     - user_id (uuid, not null, defaults to auth.uid())
     - created_at (timestamp)
   
   - `notes` - Rich text notes
     - id (uuid, primary key)
     - title (text, not null)
     - content (jsonb, nullable - stores rich text editor state)
     - folder_id (uuid, nullable, references folders)
     - user_id (uuid, not null, defaults to auth.uid())
     - created_at (timestamp)
     - updated_at (timestamp)
   
   - `attachments` - Files and images attached to notes
     - id (uuid, primary key)
     - note_id (uuid, not null, references notes)
     - user_id (uuid, not null, defaults to auth.uid())
     - filename (text, not null)
     - storage_path (text, not null - Supabase storage path)
     - file_type (text, not null - mime type)
     - file_size (bigint, not null - in bytes)
     - created_at (timestamp)
   
   - `note_shares` - Sharing notes with other users
     - id (uuid, primary key)
     - note_id (uuid, not null, references notes)
     - shared_by_user_id (uuid, not null - owner who shared)
     - shared_with_user_id (uuid, nullable - null means public link)
     - permission (text, not null - 'view' or 'edit')
     - created_at (timestamp)
   
   - `user_storage_usage` - Track total storage per user
     - id (uuid, primary key)
     - user_id (uuid, unique, not null)
     - total_bytes (bigint, not null, default 0)
     - updated_at (timestamp)

2. Indexes for performance
*/

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Note shares table
CREATE TABLE IF NOT EXISTS note_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at timestamptz DEFAULT now()
);

-- User storage usage table
CREATE TABLE IF NOT EXISTS user_storage_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bytes bigint NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_shared_with ON note_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- Enable RLS on all tables
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;