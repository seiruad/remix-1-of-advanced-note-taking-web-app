import { useState, useEffect } from 'react';
import { Share2, X, Link, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { NoteShare } from '../types/database';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
}

export function ShareDialog({ isOpen, onClose, noteId }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && noteId) {
      loadShares();
    }
  }, [isOpen, noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadShares = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('note_shares')
        .select('*')
        .eq('note_id', noteId);

      if (error) throw error;
      setShares(data || []);
    } catch (err) {
      console.error('Error loading shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;

    setSharing(true);
    setError(null);

    try {
      // For sharing with specific users, we need to find their user ID
      // In production, this would be done via an edge function or user search
      // For now, we'll show a message that this feature requires the recipient's email exists in the system

      const trimmedEmail = email.trim().toLowerCase();

      // Check if trying to share with self
      if (user?.email?.toLowerCase() === trimmedEmail) {
        setError("You can't share a note with yourself");
        setSharing(false);
        return;
      }

      // Note: In production, you'd look up the user ID via an edge function
      // For now, we'll show a helpful message
      setError(
        'To share this note, send them the share link below. Full user-to-user sharing coming soon!'
      );

      setEmail('');
    } catch (err) {
      console.error('Share error:', err);
      setError(err instanceof Error ? err.message : 'Failed to share note');
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('note_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      loadShares();
    } catch (err) {
      console.error('Error removing share:', err);
    }
  };

  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/shared/${noteId}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Share Note</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={copyShareLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
          >
            <Link className="w-4 h-4" />
            Copy share link
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-800 px-3 text-sm text-slate-500">
              or share with specific users
            </span>
          </div>
        </div>

        <form onSubmit={handleShare} className="mb-6">
          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!email.trim() || sharing}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {sharing ? 'Sharing...' : 'Share'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : shares.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              Shared with ({shares.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300 uppercase">
                      {share.permission}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveShare(share.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-500 text-sm">
            This note hasn't been shared with anyone yet
          </p>
        )}
      </div>
    </div>
  );
}
