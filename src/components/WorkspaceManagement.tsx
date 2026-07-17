import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Pencil,
  Check,
  X,
  Notebook,
  FileText,
  
  AlertTriangle,
} from 'lucide-react';
import { Workspace, NoteWithDetails } from '../types/database';
import { supabase } from '../lib/supabase';

interface WorkspaceManagementProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  notes: NoteWithDetails[];
  onSwitch: (workspaceId: string) => void;
  onBack: () => void;
  onCreated: (workspace: Workspace) => void;
  onDeleted: (workspaceId: string) => void;
  onRenamed: (workspaceId: string, name: string) => void;
}

export function WorkspaceManagement({
  workspaces,
  activeWorkspaceId,
  notes,
  onSwitch,
  onBack,
  onCreated,
  onDeleted,
  onRenamed,
}: WorkspaceManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isCreating && newInputRef.current) newInputRef.current.focus();
  }, [isCreating]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  useEffect(() => {
    if (menuOpenId === null) return;
    const handler = (e: MouseEvent) => {
      const ref = menuRefs.current[menuOpenId];
      if (ref && !ref.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => a.name.localeCompare(b.name)),
    [workspaces]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sortedWorkspaces;
    const q = searchQuery.toLowerCase();
    return sortedWorkspaces.filter((w) => w.name.toLowerCase().includes(q));
  }, [sortedWorkspaces, searchQuery]);

  const noteCountFor = (wsId: string) =>
    notes.filter((n) => n.workspace_id === wsId).length;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    const { data, error: err } = await supabase
      .from('workspaces')
      .insert({ name })
      .select()
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    onCreated(data);
    setNewName('');
    setIsCreating(false);
  };

  const handleRename = async (ws: Workspace) => {
    const name = renameValue.trim();
    if (!name || name === ws.name) {
      setRenamingId(null);
      return;
    }
    const { error: err } = await supabase
      .from('workspaces')
      .update({ name })
      .eq('id', ws.id);
    if (err) {
      setError(err.message);
      return;
    }
    onRenamed(ws.id, name);
    setRenamingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    const { error: err } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', deleteTarget.id);
    if (err) {
      setError(err.message);
      return;
    }
    onDeleted(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white">Workspaces</h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Switch, create, and manage your workspaces
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New</span>
        </button>
      </header>

      {/* Search */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/40 border border-slate-700/50 rounded-lg pl-9 pr-8 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 text-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-3 px-3 py-2 bg-red-600/15 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:text-red-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Create input */}
      {isCreating && (
        <div className="px-4 sm:px-6 pt-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-emerald-500/40 rounded-lg px-3 py-2.5">
            <Notebook className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <input
              ref={newInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                handleCreate();
                setIsCreating(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                  setIsCreating(false);
                }
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewName('');
                }
              }}
              placeholder="Workspace name..."
              className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
                setIsCreating(false);
              }}
              className="p-1 text-emerald-400 hover:text-emerald-300"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setIsCreating(false);
                setNewName('');
              }}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Notebook className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery ? 'No workspaces match your search' : 'No workspaces yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Create your first workspace
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              const noteCount = noteCountFor(ws.id);
              const isRenaming = renamingId === ws.id;

              return (
                <div
                  key={ws.id}
                  className={`group relative rounded-xl border transition-all ${
                    isActive
                      ? 'bg-emerald-600/10 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-2 px-3 py-3">
                      <Notebook className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(ws)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(ws);
                          if (e.key === 'Escape') {
                            setRenamingId(null);
                            setRenameValue('');
                          }
                        }}
                        className="flex-1 bg-slate-900/60 text-white text-sm rounded px-2 py-1 outline-none border border-emerald-500 min-w-0"
                      />
                      <button
                        onClick={() => handleRename(ws)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setRenamingId(null);
                          setRenameValue('');
                        }}
                        className="p-1 text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                      onClick={() => onSwitch(ws.id)}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? 'bg-emerald-600/20 border border-emerald-500/30'
                            : 'bg-slate-700/40 border border-slate-600/30'
                        }`}
                      >
                        <Notebook
                          className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-sm font-semibold truncate ${
                            isActive ? 'text-emerald-100' : 'text-slate-200'
                          }`}
                        >
                          {ws.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {noteCount} note{noteCount !== 1 ? 's' : ''}
                          </span>
                          {isActive && (
                            <span className="text-emerald-400 font-medium">Active</span>
                          )}
                        </div>
                      </div>

                      <div
                        ref={(el) => {
                          menuRefs.current[ws.id] = el;
                        }}
                        className="relative"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === ws.id ? null : ws.id);
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === ws.id && (
                          <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 min-w-[140px] py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameValue(ws.name);
                                setRenamingId(ws.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors"
                            >
                              <Pencil className="w-3 h-3" /> Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(ws);
                                setMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-slate-700/50 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-600/15 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Delete workspace?</h2>
              <p className="text-sm text-slate-400 mb-6">
                "{deleteTarget.name}" and{' '}
                {noteCountFor(deleteTarget.id)} note
                {noteCountFor(deleteTarget.id) !== 1 ? 's' : ''} will be permanently deleted. This
                cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
