import { useState } from 'react';
import { ArrowLeft, Settings, Zap } from 'lucide-react';

const AUTO_ACTIVATE_KEY = 'setting-auto-activate-new-note';

export function getAutoActivateNewNote(): boolean {
  try {
    const v = localStorage.getItem(AUTO_ACTIVATE_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function setAutoActivateNewNote(value: boolean) {
  try {
    localStorage.setItem(AUTO_ACTIVATE_KEY, String(value));
  } catch {
    // ignore
  }
}

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [autoActivate, setAutoActivate] = useState(getAutoActivateNewNote());

  const handleToggle = (value: boolean) => {
    setAutoActivate(value);
    setAutoActivateNewNote(value);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50">
        <button
          onClick={onBack}
          className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Note Creation
            </h2>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Activate new note immediately
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
                      When enabled, a newly created note is opened in the editor
                      right away. Turn off to keep your current view unchanged
                      after creating a note.
                    </p>
                  </div>
                </div>

                <Toggle value={autoActivate} onChange={handleToggle} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        value ? 'bg-emerald-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
