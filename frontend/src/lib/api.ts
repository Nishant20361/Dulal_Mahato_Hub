import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:5001/api/v1');

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Intercept 401s if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Folder {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  isTrashed: boolean;
  trashedAt?: string | null;
  _count?: {
    files: number;
    children: number;
  };
}

export interface DriveFile {
  id: string;
  userId: string;
  folderId: string | null;
  name: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  size: number | string;
  checksum?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string | null;
  isTrashed: boolean;
  trashedAt?: string | null;
  folder?: {
    id: string;
    name: string;
  } | null;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  isTrashed: boolean;
  trashedAt?: string | null;
}

export interface StorageUsage {
  usedBytes: number;
  formattedUsed: string;
  totalFiles: number;
  totalFolders: number;
  totalNotes: number;
  provider: string;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  service: string;
  app: string;
  version: string;
  environment: string;
  localDevMode?: boolean;
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
    startedAt: string;
  };
  database?: {
    status: 'connected' | 'disconnected' | 'not_configured';
    configured: boolean;
    provider: string;
    latencyMs?: number;
    message?: string;
  };
  storage?: {
    provider: string;
    status: 'available' | 'error';
    message?: string;
  };
  system: {
    platform: string;
    nodeVersion: string;
    memoryUsageMB: {
      rss: string;
      heapUsed: string;
    };
  };
}

// API Functions
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/health');
  return response.data;
}

// Auth API
export async function apiSignup(data: {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const res = await api.post('/auth/signup', data);
  return res.data;
}

export async function apiLogin(data: {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}) {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function apiLogout() {
  const res = await api.post('/auth/logout');
  return res.data;
}

export async function apiGetMe(): Promise<{ success: boolean; user: User }> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function apiForgotPassword(email: string) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function apiVerifyOtp(email: string, otp: string) {
  const res = await api.post('/auth/verify-otp', { email, otp });
  return res.data;
}

export async function apiResetPassword(data: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const res = await api.post('/auth/reset-password', data);
  return res.data;
}

// Folders API
export async function apiListFolders(parentId?: string | null, all?: boolean): Promise<{ success: boolean; folders: Folder[] }> {
  const params: any = {};
  if (parentId !== undefined) params.parentId = parentId;
  if (all) params.all = 'true';
  const res = await api.get('/folders', { params });
  return res.data;
}

export async function apiCreateFolder(name: string, parentId?: string | null): Promise<{ success: boolean; folder: Folder }> {
  const res = await api.post('/folders', { name, parentId });
  return res.data;
}

export async function apiGetFolder(id: string): Promise<{ success: boolean; folder: Folder; breadcrumbs: Array<{ id: string | null; name: string }> }> {
  const res = await api.get(`/folders/${id}`);
  return res.data;
}

export async function apiRenameFolder(id: string, name: string) {
  const res = await api.patch(`/folders/${id}`, { name });
  return res.data;
}

export async function apiMoveFolder(id: string, targetParentId: string | null) {
  const res = await api.post(`/folders/${id}/move`, { targetParentId });
  return res.data;
}

export async function apiTrashFolder(id: string) {
  const res = await api.delete(`/folders/${id}`);
  return res.data;
}

// Files API
export async function apiListFiles(folderId?: string | null): Promise<{ success: boolean; files: DriveFile[] }> {
  const params: any = {};
  if (folderId !== undefined) params.folderId = folderId;
  const res = await api.get('/files', { params });
  return res.data;
}

export async function apiUploadFile(
  formData: FormData,
  onUploadProgress?: (progressEvent: any) => void
): Promise<{ success: boolean; files: DriveFile[] }> {
  const res = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return res.data;
}

export function getFileContentUrl(fileId: string): string {
  if (typeof window !== 'undefined') {
    return `/api/v1/files/${fileId}/content`;
  }
  return `${API_BASE_URL}/files/${fileId}/content`;
}

export function getFileDownloadUrl(fileId: string): string {
  if (typeof window !== 'undefined') {
    return `/api/v1/files/${fileId}/download`;
  }
  return `${API_BASE_URL}/files/${fileId}/download`;
}

export async function apiRenameFile(id: string, name: string) {
  const res = await api.patch(`/files/${id}`, { name });
  return res.data;
}

export async function apiMoveFile(id: string, targetFolderId: string | null) {
  const res = await api.post(`/files/${id}/move`, { targetFolderId });
  return res.data;
}

export async function apiTrashFile(id: string) {
  const res = await api.delete(`/files/${id}`);
  return res.data;
}

// Notes API
export async function apiListNotes(search?: string): Promise<{ success: boolean; notes: Note[] }> {
  const params: any = {};
  if (search) params.search = search;
  const res = await api.get('/notes', { params });
  return res.data;
}

export async function apiCreateNote(data: { title: string; content: string; isPinned?: boolean }): Promise<{ success: boolean; note: Note }> {
  const res = await api.post('/notes', data);
  return res.data;
}

export async function apiGetNote(id: string): Promise<{ success: boolean; note: Note }> {
  const res = await api.get(`/notes/${id}`);
  return res.data;
}

export async function apiUpdateNote(id: string, data: { title?: string; content?: string; isPinned?: boolean }) {
  const res = await api.put(`/notes/${id}`, data);
  return res.data;
}

export async function apiTogglePinNote(id: string) {
  const res = await api.patch(`/notes/${id}/pin`);
  return res.data;
}

export async function apiTrashNote(id: string) {
  const res = await api.delete(`/notes/${id}`);
  return res.data;
}

// Trash API
export async function apiListTrash(): Promise<{
  success: boolean;
  trash: { folders: Folder[]; files: DriveFile[]; notes: Note[] };
}> {
  const res = await api.get('/trash');
  return res.data;
}

export async function apiRestoreItem(type: 'file' | 'folder' | 'note', id: string) {
  const res = await api.post('/trash/restore', { type, id });
  return res.data;
}

export async function apiDeletePermanently(type: 'file' | 'folder' | 'note', id: string) {
  const res = await api.delete(`/trash/${type}/${id}`);
  return res.data;
}

export async function apiEmptyTrash() {
  const res = await api.delete('/trash/empty');
  return res.data;
}

// Search API
export async function apiGlobalSearch(query: string): Promise<{
  success: boolean;
  query: string;
  results: { files: DriveFile[]; folders: Folder[]; notes: Note[] };
  total: number;
}> {
  const res = await api.get('/search', { params: { q: query } });
  return res.data;
}

// Recent API
export async function apiGetRecent(): Promise<{
  success: boolean;
  recent: { files: DriveFile[]; notes: Note[] };
}> {
  const res = await api.get('/recent');
  return res.data;
}

// Users API
export async function apiUpdateProfile(data: { name: string; username: string; email: string }) {
  const res = await api.patch('/users/profile', data);
  return res.data;
}

export async function apiChangePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  revokeOtherSessions?: boolean;
}) {
  const res = await api.post('/users/change-password', data);
  return res.data;
}

export async function apiGetStorageUsage(): Promise<{ success: boolean; storage: StorageUsage }> {
  const res = await api.get('/users/storage');
  return res.data;
}
