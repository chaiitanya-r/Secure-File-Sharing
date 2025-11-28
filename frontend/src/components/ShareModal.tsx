import { useState } from 'react';
import type { FormEvent } from 'react';

interface ShareModalProps {
  visible: boolean;
  fileName: string;
  onClose: () => void;
  onShare: (email: string) => Promise<void>;
}

export function ShareModal({ visible, fileName, onClose, onShare }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await onShare(email);
      setStatus(`Access granted to ${email}`);
      setEmail('');
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={handleSubmit}>
        <h3>Share {fileName}</h3>
        <p>Only users you share with can decrypt the AES key.</p>
        <input
          type="email"
          placeholder="Recipient email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {status && <p className="status">{status}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </form>
    </div>
  );
}


