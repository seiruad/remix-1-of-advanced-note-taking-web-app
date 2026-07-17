export interface Workspace {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: string;
  is_new?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: Record<string, unknown> | null;
  folder_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_new?: boolean;
}

export interface FileItem {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface NoteFile {
  id: string;
  note_id: string;
  file_id: string;
  user_id: string;
  created_at: string;
}

export interface NoteShare {
  id: string;
  note_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface UserStorageUsage {
  id: string;
  user_id: string;
  total_bytes: number;
  updated_at: string;
}

export interface NoteWithDetails extends Note {
  files?: FileItem[];
  shares?: NoteShare[];
  folder?: Folder;
}
