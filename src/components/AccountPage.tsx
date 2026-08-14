import { useState, useEffect } from 'react';
import { ArrowLeft, User, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AccountPageProps {
  onBack: () => void;
}

export function AccountPage({ onBack }: AccountPageProps) {
  const { user } = useAuth();
  const [publicName, setPublicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const saved = user?.user_metadata?.public_name;
    if (typeof saved === 'string') {
      setPublicName(saved);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setErrorMessage('');
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: { public_name: publicName.trim() },
    });

    setLoading(false);

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('success');
    }
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
          <User className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-semibold">Account</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Public name section */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Profile
            </h2>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="public-name"
                    className="block text-sm font-semibold text-white mb-1.5"
                  >
                    Public name
                  </label>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    This name is not shown anywhere yet, but you can set it now
                    for future features.
                  </p>
                  <input
                    id="public-name"
                    type="text"
                    value={publicName}
                    onChange={(e) => {
                      setPublicName(e.target.value);
                      if (status === 'success') setStatus('idle');
                    }}
                    placeholder="Enter your public name"
                    className="w-full h-11 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 text-sm"
                    maxLength={120}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>

                  {status === 'success' && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Saved
                    </span>
                  )}

                  {status === 'error' && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      {errorMessage || 'Could not save'}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* Login info (read-only) */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Login
            </h2>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-1.5">Email address</p>
              <p className="text-sm font-medium text-white break-all">
                {user?.email || '—'}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
