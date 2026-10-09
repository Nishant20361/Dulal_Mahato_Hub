import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IStorageService, FileStreamResult, SaveFileResult } from './storage.interface';
import { env } from '../../config/env';

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.LOCAL_STORAGE_PATH);
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await fsp.mkdir(this.baseDir, { recursive: true });
    } catch (err) {
      console.error('Failed to initialize local storage directory:', err);
    }
  }

  /**
   * Safely resolves physical path and guards against path traversal
   */
  private getSecureFilePath(userId: string, fileId: string): string {
    // Sanitize userId and fileId to only allow safe alphanumeric characters and hyphens/underscores
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');

    if (!safeUserId || !safeFileId) {
      throw new Error('Invalid userId or fileId for storage path');
    }

    const userDir = path.join(this.baseDir, 'users', safeUserId);
    const targetPath = path.join(userDir, safeFileId);

    // Verify targetPath is strictly inside userDir
    const normalizedTarget = path.normalize(targetPath);
    const normalizedUserDir = path.normalize(userDir);

    if (!normalizedTarget.startsWith(normalizedUserDir)) {
      throw new Error('Path traversal detected');
    }

    return targetPath;
  }

  async saveFile(
    userId: string,
    fileId: string,
    source: string | Buffer
  ): Promise<SaveFileResult> {
    const targetPath = this.getSecureFilePath(userId, fileId);
    const targetDir = path.dirname(targetPath);

    await fsp.mkdir(targetDir, { recursive: true });

    let size = 0;
    let checksum = '';

    if (typeof source === 'string') {
      // Source is a temporary file path from multer
      const buffer = await fsp.readFile(source);
      size = buffer.length;
      checksum = crypto.createHash('md5').update(buffer).digest('hex');

      // Move / write to targetPath
      await fsp.copyFile(source, targetPath);
      // Clean up temp file
      try {
        await fsp.unlink(source);
      } catch {
        // ignore temp unlink errors
      }
    } else {
      // Source is a Buffer
      size = source.length;
      checksum = crypto.createHash('md5').update(source).digest('hex');
      await fsp.writeFile(targetPath, source);
    }

    const storageKey = `users/${userId}/files/${fileId}`;
    return { size, checksum, storageKey };
  }

  async getFileStream(
    userId: string,
    fileId: string,
    rangeHeader?: string
  ): Promise<FileStreamResult> {
    const targetPath = this.getSecureFilePath(userId, fileId);

    const stat = await fsp.stat(targetPath);
    const totalSize = stat.size;

    if (!rangeHeader) {
      const stream = fs.createReadStream(targetPath);
      return {
        stream,
        totalSize,
        contentLength: totalSize,
        isPartial: false,
      };
    }

    // Parse HTTP Range header (e.g. "bytes=0-1024" or "bytes=500-")
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
      // Invalid range requested, fallback to full stream
      const stream = fs.createReadStream(targetPath);
      return {
        stream,
        totalSize,
        contentLength: totalSize,
        isPartial: false,
      };
    }

    const contentLength = end - start + 1;
    const stream = fs.createReadStream(targetPath, { start, end });

    return {
      stream,
      totalSize,
      contentLength,
      contentRange: `bytes ${start}-${end}/${totalSize}`,
      isPartial: true,
    };
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    try {
      const targetPath = this.getSecureFilePath(userId, fileId);
      await fsp.unlink(targetPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async fileExists(userId: string, fileId: string): Promise<boolean> {
    try {
      const targetPath = this.getSecureFilePath(userId, fileId);
      await fsp.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<{ provider: string; status: 'available' | 'error'; message?: string }> {
    try {
      await fsp.access(this.baseDir, fs.constants.W_OK);
      return {
        provider: 'local-filesystem',
        status: 'available',
        message: 'Local disk storage is mounted and writable',
      };
    } catch (err) {
      return {
        provider: 'local-filesystem',
        status: 'error',
        message: err instanceof Error ? err.message : 'Storage directory not writable',
      };
    }
  }
}

// Singleton storage service instance
export const storageService = new LocalStorageService();
