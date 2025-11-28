import { useState } from 'react';
import type { FormEvent } from 'react';
import { uploadFileRequest } from '../api/files';
import { useAuthContext } from '../contexts/AuthContext';

interface FileUploadProps {
  onUploaded: () => void;
}

export function FileUpload({ onUploaded }: FileUploadProps) {
  const { token } = useAuthContext();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !token) return;
    setLoading(true);
    setStatus(null);
    try {
      await uploadFileRequest(token, file);
      setStatus('File uploaded and encrypted successfully.');
      setFile(null);
      onUploaded();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Upload new file</h3>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      {status && <p className="status">{status}</p>}
      <button type="submit" disabled={!file || loading}>
        {loading ? 'Encrypting…' : 'Upload & Encrypt'}
      </button>
    </form>
  );
}


