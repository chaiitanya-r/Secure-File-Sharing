import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { LoginForm } from './components/LoginForm';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { ShareModal } from './components/ShareModal';
import { UnlockKeyModal } from './components/UnlockKeyModal';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { usePrivateKey } from './hooks/usePrivateKey';
import {
  downloadEncryptedFile,
  fetchFileMetadata,
  fetchFiles,
  shareFileRequest
} from './api/files';
import type { FileRecord } from './types/api';
import { decryptFileAesKey, decryptFileContents } from './lib/crypto';
import { saveFile } from './lib/download';

function Dashboard() {
  const { token, user, logout } = useAuthContext();
  const { unlockedPrivateKey, unlock, lock, unlocking, unlockError, hasEncryptedKey } =
    usePrivateKey();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<FileRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchFiles(token);
      setFiles(data);
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function handleDownload(file: FileRecord) {
    if (!token) return;
    if (!unlockedPrivateKey) {
      setStatus('Unlock your private key to decrypt files.');
      return;
    }
    setDownloadingId(file.id);
    setStatus(null);
    try {
      const metadata = await fetchFileMetadata(token, file.id);
      const encryptedBuffer = await downloadEncryptedFile(token, file.id);
      const aesKey = await decryptFileAesKey(metadata.encryptedAesKey, unlockedPrivateKey);
      const plaintext = await decryptFileContents(
        encryptedBuffer,
        aesKey,
        metadata.aesIv,
        metadata.aesAuthTag
      );
      saveFile(plaintext, metadata.filename, metadata.mimeType);
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleShare(email: string) {
    if (!token || !shareTarget) return;
    await shareFileRequest(token, shareTarget.id, email);
  }

  if (!token || !user) {
    return <p>Missing authentication token.</p>;
  }

  return (
    <div className="dashboard">
      <header>
      <div>
          <h1>Secure File Vault</h1>
          <p>
            Signed in as <strong>{user.email}</strong> ({user.role})
        </p>
      </div>
        <div className="header-actions">
          {unlockedPrivateKey ? (
            <button onClick={lock} className="secondary">
              Lock private key
            </button>
          ) : (
            <span className="warning">Private key locked</span>
          )}
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {status && <p className="status">{status}</p>}

      <FileUpload onUploaded={loadFiles} />

      <section className="card">
        <div className="section-header">
          <h3>Encrypted files</h3>
          <button onClick={loadFiles} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <FileList
            files={files}
            onDownload={handleDownload}
            onShare={setShareTarget}
            downloadingId={downloadingId}
          />
        )}
      </section>

      <ShareModal
        visible={Boolean(shareTarget)}
        fileName={shareTarget?.filename || ''}
        onClose={() => setShareTarget(null)}
        onShare={(email) => handleShare(email)}
      />

      <UnlockKeyModal
        visible={Boolean(hasEncryptedKey && !unlockedPrivateKey)}
        onUnlock={unlock}
        unlocking={unlocking}
        error={unlockError}
      />
    </div>
  );
}

function LoginGate() {
  const { login, register } = useAuthContext();

  return (
    <div className="auth-wrapper">
      <h1>Secure File Sharing</h1>
      <LoginForm
        onLogin={async (email, password) => login(email, password)}
        onRegister={async (email, password) => register(email, password)}
      />
      <p className="hint">
        Private keys are never sent to the server decrypted. They only leave your browser
        encrypted with AES-256-GCM.
      </p>
    </div>
  );
}

function App() {
  const { token } = useAuthContext();

  return <main className="app">{token ? <Dashboard /> : <LoginGate />}</main>;
}

export default function AppWithProviders() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
