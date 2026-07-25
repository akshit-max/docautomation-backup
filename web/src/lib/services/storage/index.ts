import { StorageProvider } from './types';
import { LocalProvider } from './LocalProvider';
import { CloudinaryProvider } from './CloudinaryProvider';

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const providerName = process.env.STORAGE_PROVIDER?.toLowerCase();

  if (providerName === 'cloudinary') {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('STORAGE_PROVIDER=cloudinary is set, but missing CLOUDINARY credentials. Falling back to local storage.');
      storageInstance = new LocalProvider();
    } else {
      storageInstance = new CloudinaryProvider();
    }
  } else {
    // Default to local mock provider for offline development
    storageInstance = new LocalProvider();
  }

  return storageInstance;
}

export * from './types';
