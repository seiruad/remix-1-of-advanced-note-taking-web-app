import { HardDrive, LogOut, ChevronRight, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StorageUsageProps {
  totalBytes: number;
  onOpen: () => void;
  onOpenSettings: () => void;
}

const STORAGE_LIMIT = 100 * 1024 * 1024;

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export function StorageUsage({ totalBytes, onOpen, onOpenSettings }: StorageUsageProps) {
  const { user, signOut } = useAuth();

  const percentage = Math.min((totalBytes / STORAGE_LIMIT) * 100, 100);
  const isNearLimit = percentage > 80;
  const email = user?.email ?? '';

  return (
    <div className="border-t border-slate-700/60">
      {/* Storage bar */}
      <button
        onClick={onOpen}
        className="w-full px-4 pt-4 pb-3.5 text-left hover:bg-slate-700/20 transition-colors group"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wide">Storage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs tabular-nums ${isNearLimit ? 'text-amber-400' : 'text-slate-500'}`}>
              {formatSize(totalBytes)} / {formatSize(STORAGE_LIMIT)}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>
        <div className="w-full h-2 bg-slate-700/70 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </button>

      {/* Account — desktop: single line */}
      <div className="hidden sm:flex items-center gap-1 px-3 pb-3 pt-1">
        <span className="flex-1 text-[11px] text-slate-500 truncate min-w-0 px-1">
          {email}
        </span>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-slate-400
                     hover:text-emerald-400 hover:bg-slate-700/50 active:scale-95
                     transition-all flex-shrink-0 text-[11px] font-medium"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-slate-400
                     hover:text-red-400 hover:bg-slate-700/50 active:scale-95
                     transition-all flex-shrink-0 text-[11px] font-medium"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account — mobile: single row, large tap-target icon buttons */}
      <div className="sm:hidden flex items-center gap-2 px-3 pb-3 pt-2">
        <span className="flex-1 text-[11px] text-slate-500 truncate min-w-0 px-1">
          {email}
        </span>
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-400
                     hover:text-emerald-400 hover:bg-slate-700/50 active:scale-90
                     transition-all flex-shrink-0"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
        <button
          onClick={signOut}
          className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-400
                     hover:text-red-400 hover:bg-slate-700/50 active:scale-90
                     transition-all flex-shrink-0"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
