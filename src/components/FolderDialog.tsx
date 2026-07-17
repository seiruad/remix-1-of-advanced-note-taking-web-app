import { useState } from 'react';
import { FolderPlus, X, Folder, Notebook } from 'lucide-react';

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  parentName?: string;
  workspaceName?: string;
}

export function FolderDialog({
  isOpen,
  onClose,
  onSave,
  parentName,
  workspaceName,
}: FolderDialogProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">New Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {parentName && (
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
            <Folder className="w-4 h-4" />
            <span>Inside: {parentName}</span>
          </div>
        )}

        {workspaceName && (
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
            <Notebook className="w-4 h-4" />
            <span>Workspace: {workspaceName}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
