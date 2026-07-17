/*
# Add is_new column to folders

1. Modified Tables
- `folders`: adds `is_new` boolean column, default `true`, to track newly-created folders
  that haven't been renamed yet. Once renamed, the app sets `is_new = false`.

2. Notes
- The column is nullable=false with default true so existing folders are treated as "not new"
  only if explicitly set. For existing data, we set all current rows to `is_new = false`
  so they sort normally.
- No RLS policy changes needed — existing folder policies already cover the new column.
*/

ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

-- Existing folders are not "new" — only freshly created ones should be.
UPDATE folders SET is_new = false WHERE is_new = true;
