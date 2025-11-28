import type { FileRecord } from '../types/api';

interface FileListProps {
  files: FileRecord[];
  onDownload: (file: FileRecord) => void;
  onShare: (file: FileRecord) => void;
  downloadingId?: string | null;
}

export function FileList({ files, onDownload, onShare, downloadingId }: FileListProps) {
  if (!files.length) {
    return <p>No encrypted files yet.</p>;
  }

  return (
    <table className="file-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>MIME</th>
          <th>Size</th>
          <th>Owner?</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id}>
            <td>{file.filename}</td>
            <td>{file.mimeType}</td>
            <td>{(file.size / 1024).toFixed(1)} KB</td>
            <td>{file.isOwner ? 'Yes' : 'Shared'}</td>
            <td className="actions">
              <button onClick={() => onDownload(file)} disabled={downloadingId === file.id}>
                {downloadingId === file.id ? 'Decrypting…' : 'Download'}
              </button>
              {file.isOwner && (
                <button onClick={() => onShare(file)} className="secondary">
                  Share
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


