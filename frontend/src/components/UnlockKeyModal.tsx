import { useState } from 'react';
import type { FormEvent } from 'react';

interface UnlockKeyModalProps {
  visible: boolean;
  onUnlock: (password: string) => Promise<void>;
  unlocking: boolean;
  error?: string | null;
}

export function UnlockKeyModal({ visible, onUnlock, unlocking, error }: UnlockKeyModalProps) {
  const [password, setPassword] = useState('');

  if (!visible) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUnlock(password);
    setPassword('');
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h3>Unlock Private Key</h3>
        <p>Enter your password to decrypt your private key locally.</p>
        {error && <p className="error">{error}</p>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <button type="submit" disabled={unlocking}>
          {unlocking ? 'Decrypting…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}


