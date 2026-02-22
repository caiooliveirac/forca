import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSignUp: (email: string, password: string, displayName: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
}

type Tab = 'login' | 'register';

export const AuthModal = ({ open, onClose, onSignUp, onSignIn }: AuthModalProps) => {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  }, []);

  const switchTab = useCallback(
    (t: Tab) => {
      setTab(t);
      resetForm();
    },
    [resetForm],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        if (tab === 'register') {
          await onSignUp(email, password, displayName);
        } else {
          await onSignIn(email, password);
        }
        resetForm();
        onClose();
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? 'Ein Fehler ist aufgetreten';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [tab, email, password, displayName, onSignUp, onSignIn, onClose, resetForm],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="chalkboard-frame rounded-lg w-full max-w-sm p-6 animate-modal-enter"
        style={{ backgroundColor: '#1a1f2e' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-chalk/10 mb-5">
          <button
            className={`flex-1 pb-2 font-chalk text-lg tracking-wide transition-colors ${
              tab === 'login'
                ? 'text-amber-300 border-b-2 border-amber-400'
                : 'text-chalk-dim hover:text-chalk'
            }`}
            onClick={() => switchTab('login')}
            type="button"
          >
            Anmelden
          </button>
          <button
            className={`flex-1 pb-2 font-chalk text-lg tracking-wide transition-colors ${
              tab === 'register'
                ? 'text-amber-300 border-b-2 border-amber-400'
                : 'text-chalk-dim hover:text-chalk'
            }`}
            onClick={() => switchTab('register')}
            type="button"
          >
            Registrieren
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Anzeigename"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={30}
              className="bg-transparent border border-dashed border-amber-400/40 rounded px-3 py-2 text-chalk font-body placeholder:text-chalk-dim/50 outline-none focus:border-amber-400"
            />
          )}

          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-transparent border border-dashed border-amber-400/40 rounded px-3 py-2 text-chalk font-body placeholder:text-chalk-dim/50 outline-none focus:border-amber-400"
          />

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-transparent border border-dashed border-amber-400/40 rounded px-3 py-2 text-chalk font-body placeholder:text-chalk-dim/50 outline-none focus:border-amber-400"
          />

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm font-body">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-amber-400/15 hover:bg-amber-400/25 border border-dashed border-amber-400/50 rounded px-4 py-2.5 font-chalk text-amber-300 tracking-wide transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
            )}
            {tab === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
      </div>
    </div>
  );
};
