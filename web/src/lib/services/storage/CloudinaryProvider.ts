import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, StorageFileInfo } from './types';

// Initialize cloudinary once
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export class CloudinaryProvider implements StorageProvider {
  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileInfo> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'docautomation/uploads',
          public_id: `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          resource_type: mimeType.startsWith('image/') ? 'image' : 'raw',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
            return;
          }
          
          if (!result) {
            reject(new Error('Cloudinary returned empty result'));
            return;
          }

          resolve({
            provider: 'cloudinary',
            url: result.secure_url,
            identifier: result.public_id,
            originalName,
            mimeType,
            size: buffer.length,
            uploadedAt: new Date().toISOString()
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async uploadStaging(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileInfo> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'docautomation/staging',
          public_id: `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          resource_type: mimeType.startsWith('image/') ? 'image' : 'raw',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary staging upload error:', error);
            reject(error);
            return;
          }
          if (!result) {
            reject(new Error('Cloudinary returned empty result'));
            return;
          }
          resolve({
            provider: 'cloudinary',
            url: result.secure_url,
            identifier: result.public_id,
            originalName,
            mimeType,
            size: buffer.length,
            uploadedAt: new Date().toISOString()
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  async delete(identifier: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(identifier);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }
}
