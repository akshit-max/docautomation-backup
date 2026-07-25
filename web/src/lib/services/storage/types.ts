export interface StorageFileInfo {
  provider: string;
  url: string | null;
  identifier: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface StorageProvider {
  /**
   * Uploads a file buffer to the storage provider.
   */
  upload(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileInfo>;
  
  /**
   * Uploads a file buffer to a temporary staging area for background processing.
   */
  uploadStaging(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileInfo>;
  
  /**
   * Deletes a file by its identifier (useful for Phase 8 / hard deletion later).
   */
  delete(identifier: string): Promise<boolean>;
}
