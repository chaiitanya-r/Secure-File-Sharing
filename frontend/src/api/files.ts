import { apiFetch, apiFetchBinary } from './client';
import type { FileMetadata, FileRecord } from '../types/api';

export function fetchFiles(token: string) {
  return apiFetch<FileRecord[]>('/api/files', { method: 'GET' }, token);
}

export function uploadFileRequest(token: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<{ id: string }>('/api/files/upload', { method: 'POST', body: formData }, token);
}

export function fetchFileMetadata(token: string, fileId: string) {
  return apiFetch<FileMetadata>(`/api/files/${fileId}`, { method: 'GET' }, token);
}

export function shareFileRequest(token: string, fileId: string, targetUserEmail: string) {
  return apiFetch<{ message: string }>(
    `/api/files/${fileId}/share`,
    { method: 'POST', body: JSON.stringify({ targetUserEmail }) },
    token
  );
}

export function downloadEncryptedFile(token: string, fileId: string) {
  return apiFetchBinary(`/api/files/${fileId}/download`, token);
}


