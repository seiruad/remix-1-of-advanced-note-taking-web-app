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
    <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-800">
      {/* Storage row — clickable block with inset usage bar */}
      <button
        onClick={onOpen}
        className="group w-full px-3 py-2.5 flex flex-col gap-2 hover:bg-slate-700/40 active:bg-slate-700/60 transition-colors"
        aria-label="Open storage"
        title="Storage"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-tight">
              Storage
            </p>
            <p
              className={`text-sm font-semibold tabular-nums ${
                isNearLimit ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {formatSize(totalBytes)} / {formatSize(STORAGE_LIMIT)}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
        </div>

        {/* Usage bar — inset like before, but inside the clickable row */}
        <div className="w-full">
          <div className="h-1.5 bg-slate-700/70 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </button>

      {/* Account footer — one clean row, mobile-first tap targets */}
      <div className="h-11 px-3 flex items-center gap-2 border-t border-slate-700/50">
        <span className="flex-1 text-xs text-slate-500 truncate min-w-0 px-1">
          {email}
        </span>

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 active:bg-slate-700/80 transition-colors"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
        <button
          onClick={signOut}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 active:bg-slate-700/80 transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
