import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/Auth';
import { UnifiedSidebar } from './components/UnifiedSidebar';
import { NoteEditor } from './components/NoteEditor';
import { ShareDialog } from './components/ShareDialog';
import { StoragePage } from './components/StoragePage';
import { FilePreviewPage } from './components/FilePreviewPage';
import { WorkspaceManagement } from './components/WorkspaceManagement';
import { SettingsPage, getAutoActivateNewNote } from './components/SettingsPage';
import { AccountPage } from './components/AccountPage';
import { supabase } from './lib/supabase';
import { FileItem, NoteWithDetails, Folder, Workspace } from './types/database';

const ACTIVE_WORKSPACE_KEY = 'active-workspace-id';

function NotesApp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<NoteWithDetails[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [noteFiles, setNoteFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [, setLoading] = useState(true);

  const navState = location.state as { background?: Location } | null;
  const backgroundLocation = navState?.background;
  // When the file preview is shown as an overlay, keep the underlying page (and active note) intact.
  const basePathname = backgroundLocation?.pathname || location.pathname;
  const noteMatch = basePathname.match(/^\/note\/(.+)$/);
  const currentNoteId = noteMatch ? noteMatch[1] : null;


  const currentNote = notes.find((n) => n.id === currentNoteId) || null;

  const totalStorageBytes = allFiles.reduce((sum, f) => sum + f.file_size, 0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(!currentNoteId);
    }
  }, [isMobile, currentNoteId]);

  useEffect(() => {
    if (!user) return;

    const loadWorkspaces = async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading workspaces:', error);
        return;
      }

      const wsList = data || [];
      setWorkspaces(wsList);

      const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const active =
        wsList.find((w) => w.id === saved)?.id || wsList[0]?.id || null;
      setActiveWorkspaceId(active);
      if (active) localStorage.setItem(ACTIVE_WORKSPACE_KEY, active);
    };

    loadWorkspaces();

    const channel = supabase
      .channel('workspaces-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        () => loadWorkspaces()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadFolders = async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading folders:', error);
      } else {
        setFolders(data || []);
      }
    };

    loadFolders();

    const channel = supabase
      .channel('folders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folders' },
        () => loadFolders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadAllFiles = async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading files:', error);
      } else {
        setAllFiles(data || []);
      }
    };

    loadAllFiles();

    const channel = supabase
      .channel('files-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => loadAllFiles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadNotes = async () => {
      setLoading(true);
      try {
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .order('updated_at', { ascending: false });

        if (notesError) throw notesError;

        setNotes(notesData || []);
      } catch (err) {
        console.error('Error loading notes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();

    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => loadNotes()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_files' },
        () => loadNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!currentNoteId) {
      setNoteFiles([]);
      return;
    }

    const loadNoteFiles = async () => {
      const { data, error } = await supabase
        .from('note_files')
        .select('files(*)')
        .eq('note_id', currentNoteId);

      if (error) {
        console.error('Error loading note files:', error);
      } else {
        const files = (data || [])
          .map((nf: { files: FileItem | FileItem[] | null }) =>
            Array.isArray(nf.files) ? nf.files[0] : nf.files
          )
          .filter(Boolean) as FileItem[];
        setNoteFiles(files);
      }
    };

    loadNoteFiles();
  }, [currentNoteId]);

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!activeWorkspaceId || !user) return;
    const { data, error } = await supabase
      .from('folders')
      .insert({ name, parent_id: parentId, workspace_id: activeWorkspaceId, is_new: true, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
    } else if (data) {
      setFolders((prev) => [...prev, data]);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setNotes((prev) =>
      prev.map((n) => (n.folder_id === folderId ? { ...n, folder_id: null } : n))
    );

    const { error: unfileError } = await supabase
      .from('notes')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    const { error } = unfileError
      ? { error: unfileError }
      : await supabase.from('folders').delete().eq('id', folderId);

    if (error) {
      console.error('Error deleting folder:', error);
      const [{ data: folderData }, { data: noteData }] = await Promise.all([
        supabase.from('folders').select('*'),
        supabase.from('notes').select('*'),
      ]);
      if (folderData) setFolders(folderData);
      if (noteData) setNotes((prev) =>
        noteData.map((n) => ({ ...n, files: prev.find((p) => p.id === n.id)?.files || [] }))
      );
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: newName, is_new: false } : f)));

    const { error } = await supabase
      .from('folders')
      .update({ name: newName, is_new: false })
      .eq('id', folderId);

    if (error) {
      console.error('Error renaming folder:', error);
      const { data } = await supabase.from('folders').select('*');
      if (data) setFolders(data);
    }
  };

  const handleCreateNote = async (folderId?: string) => {
    if (!activeWorkspaceId || !user) return;
    const inFolder = folderId !== undefined;
    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: 'Untitled',
        folder_id: inFolder ? folderId : currentFolderId,
        workspace_id: activeWorkspaceId,
        user_id: user.id,
        is_new: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
    } else if (data) {
      setNotes((prev) => [{ ...data, files: [] }, ...prev]);
      if (getAutoActivateNewNote()) navigate(`/note/${data.id}`);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const deletedNote = notes.find((n) => n.id === noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (currentNoteId === noteId) {
      navigate('/');
    }

    const { error } = await supabase.from('notes').delete().eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      if (deletedNote) setNotes((prev) => [...prev, deletedNote]);
    }
  };

  const handleUpdateNote = useCallback(
    async (updates: { title?: string; content?: Record<string, unknown>; folder_id?: string | null }) => {
      if (!currentNote) return;

      const dbUpdates: typeof updates & { is_new?: boolean } = { ...updates };
      if (updates.title !== undefined && currentNote.is_new) {
        dbUpdates.is_new = false;
      }

      setNotes((prev) =>
        prev.map((n) =>
          n.id === currentNote.id ? { ...n, ...dbUpdates, updated_at: new Date().toISOString() } : n
        )
      );

      const { error } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', currentNote.id);

      if (error) {
        console.error('Error updating note:', error);
        const { data } = await supabase.from('notes').select('*');
        if (data) {
          setNotes((prev) =>
            prev.map((n) => {
              const fresh = data.find((d) => d.id === n.id);
              return fresh ? { ...n, ...fresh } : n;
            })
          );
        }
      }
    },
    [currentNote]
  );

  const handleMoveNote = useCallback(
    async (noteId: string, folderId: string | null) => {
      const updates = { folder_id: folderId };

      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
        )
      );

      const { error } = await supabase.from('notes').update(updates).eq('id', noteId);

      if (error) {
        console.error('Error moving note:', error);
        const { data } = await supabase.from('notes').select('*');
        if (data) {
          setNotes((prev) =>
            prev.map((n) => {
              const fresh = data.find((d) => d.id === n.id);
              return fresh ? { ...n, ...fresh } : n;
            })
          );
        }
      }
    },
    []
  );

  const handleFileLinked = (file: FileItem) => {
    setNoteFiles((prev) => [...prev, file]);
    setAllFiles((prev) => {
      if (prev.some((f) => f.id === file.id)) return prev;
      return [file, ...prev];
    });
  };

  const handleFileUnlinked = (fileId: string) => {
    setNoteFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const canEdit = currentNote?.user_id === user?.id;

  const workspaceFolders = folders.filter(
    (f) => f.workspace_id === activeWorkspaceId
  );
  const workspaceNotes = notes.filter(
    (n) => n.workspace_id === activeWorkspaceId
  );

  useEffect(() => {
    if (currentNoteId) navigate('/');
    setCurrentFolderId(null);
  }, [activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || null;

  const handleSwitchWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    navigate('/');
  };

  const handleSelectNote = (id: string | null) => {
    if (id) {
      navigate(`/note/${id}`);
      if (isMobile) setSidebarOpen(false);
    } else {
      navigate('/');
    }
  };

  const handleBack = () => {
    navigate('/');
    if (isMobile) setSidebarOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }




  return (
    <>
    <Routes location={backgroundLocation || location}>
      <Route path="/file/:fileId" element={<FilePreviewPage />} />
      <Route path="/storage" element={
        <div className="h-screen bg-slate-900">
          <StoragePage onBack={() => navigate('/')} />
        </div>
      } />
      <Route path="/workspaces" element={
        <div className="h-screen bg-slate-900">
          <WorkspaceManagement
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            notes={notes}
            onSwitch={handleSwitchWorkspace}
            onBack={() => navigate('/')}
            onCreated={(ws) => {
              setWorkspaces((prev) => [...prev, ws].sort((a, b) => a.name.localeCompare(b.name)));
            }}
            onDeleted={(wsId) => {
              setWorkspaces((prev) => {
                const updated = prev.filter((w) => w.id !== wsId);
                if (wsId === activeWorkspaceId) {
                  const next = updated[0]?.id || null;
                  setActiveWorkspaceId(next);
                  if (next) localStorage.setItem(ACTIVE_WORKSPACE_KEY, next);
                }
                return updated;
              });
            }}
            onRenamed={(wsId, name) => {
              setWorkspaces((prev) =>
                prev
                  .map((w) => (w.id === wsId ? { ...w, name } : w))
                  .sort((a, b) => a.name.localeCompare(b.name))
              );
            }}
          />
        </div>
      } />
      <Route path="/settings" element={
        <div className="h-screen bg-slate-900">
          <SettingsPage onBack={() => navigate('/')} />
        </div>
      } />
      <Route path="/account" element={
        <div className="h-screen bg-slate-900">
          <AccountPage onBack={() => navigate('/')} />
        </div>
      } />
      <Route path="/note/:noteId" element={
        <div className="flex h-screen bg-slate-900">
          <div
            className={`fixed lg:static inset-0 lg:inset-auto z-40 transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } transition-transform duration-300 ease-in-out w-full lg:w-80 xl:w-96 flex-shrink-0`}
          >
            <UnifiedSidebar
              workspaceName={activeWorkspace?.name}
              folders={workspaceFolders}
              notes={workspaceNotes}
              currentNoteId={currentNoteId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteNote={handleDeleteNote}
              onMoveNote={handleMoveNote}
              totalStorageBytes={totalStorageBytes}
              onOpenStorage={() => navigate('/storage')}
              onOpenWorkspaceManagement={() => navigate('/workspaces')}
              onOpenSettings={() => navigate('/settings')}
              onOpenAccount={() => navigate('/account')}
            />
          </div>
          <div className={`flex-1 flex flex-col min-w-0 ${isMobile && !sidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
            <NoteEditor
              key={currentNoteId || 'empty'}
              note={currentNote}
              onUpdateNote={handleUpdateNote}
              onFileLinked={handleFileLinked}
              onFileUnlinked={handleFileUnlinked}
              files={noteFiles}
              canEdit={canEdit}
              onBack={handleBack}
              folders={workspaceFolders}
              workspaces={workspaces}
            />
          </div>
          <ShareDialog
            isOpen={shareDialogOpen}
            onClose={() => setShareDialogOpen(false)}
            noteId={currentNoteId || ''}
          />
        </div>
      } />
      <Route path="/" element={
        <div className="flex h-screen bg-slate-900">
          <div
            className={`fixed lg:static inset-0 lg:inset-auto z-40 transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            } transition-transform duration-300 ease-in-out w-full lg:w-80 xl:w-96 flex-shrink-0`}
          >
            <UnifiedSidebar
              workspaceName={activeWorkspace?.name}
              folders={workspaceFolders}
              notes={workspaceNotes}
              currentNoteId={currentNoteId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteNote={handleDeleteNote}
              onMoveNote={handleMoveNote}
              totalStorageBytes={totalStorageBytes}
              onOpenStorage={() => navigate('/storage')}
              onOpenWorkspaceManagement={() => navigate('/workspaces')}
              onOpenSettings={() => navigate('/settings')}
              onOpenAccount={() => navigate('/account')}
            />
          </div>
          <div className={`flex-1 flex flex-col min-w-0 ${isMobile && !sidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
            <NoteEditor
              key={currentNoteId || 'empty'}
              note={currentNote}
              onUpdateNote={handleUpdateNote}
              onFileLinked={handleFileLinked}
              onFileUnlinked={handleFileUnlinked}
              files={noteFiles}
              canEdit={canEdit}
              onBack={handleBack}
              folders={workspaceFolders}
              workspaces={workspaces}
            />
          </div>
          <ShareDialog
            isOpen={shareDialogOpen}
            onClose={() => setShareDialogOpen(false)}
            noteId={currentNoteId || ''}
          />
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {backgroundLocation && (
      <Routes>
        <Route path="/file/:fileId" element={<FilePreviewPage />} />
      </Routes>
    )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotesApp />
    </AuthProvider>
  );
}

export default App;
