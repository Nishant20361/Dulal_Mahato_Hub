import { Readable } from 'stream';

export interface FileStreamResult {
  stream: Readable;
  totalSize: number;
  contentLength: number;
  contentRange?: string;
  isPartial: boolean;
}

export interface SaveFileResult {
  size: number;
  checksum: string;
  storageKey: string;
}

export interface IStorageService {
  /**
   * Save a file to physical storage
   */
  saveFile(
    userId: string,
    fileId: string,
    source: string | Buffer
  ): Promise<SaveFileResult>;

  /**
   * Get a readable stream for file content, with optional HTTP range support
   */
  getFileStream(
    userId: string,
    fileId: string,
    rangeHeader?: string
  ): Promise<FileStreamResult>;

  /**
   * Delete a file from physical storage
   */
  deleteFile(userId: string, fileId: string): Promise<void>;

  /**
   * Check if a file physically exists
   */
  fileExists(userId: string, fileId: string): Promise<boolean>;

  /**
   * Get physical storage health status
   */
  getHealth(): Promise<{ provider: string; status: 'available' | 'error'; message?: string }>;
}
