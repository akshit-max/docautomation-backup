import { StorageProvider, StorageFileInfo } from './types';

export class LocalProvider implements StorageProvider {
  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileInfo> {
    return {
      provider: "local",
      url: null,
      identifier: null,
      originalName,
      mimeType,
      size: buffer.length,
      uploadedAt: new Date().toISOString()
    };
  }

  async uploadStaging(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileInfo> {
    throw new Error('Batch staging uploads are not supported with LocalProvider. Use CloudinaryProvider or another staging-capable storage provider.');
  }

  async delete(identifier: string): Promise<boolean> {
    // Local provider is temporary, deletion is a no-op since OCR deletes the temp file
    return true;
  }
}
