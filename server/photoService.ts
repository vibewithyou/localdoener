import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mime from 'mime-types';
import { storage } from './storage';
import type { InsertPhoto } from '@shared/schema';

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

[uploadsDir, photosDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 300;

// Multer configuration
const multerStorage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

export const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Max 10 files per upload
  },
  fileFilter
});

// Photo processing service
export class PhotoService {
  private generateFilename(originalName: string, ext: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const sanitizedName = path.parse(originalName).name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 20);
    return `${timestamp}-${randomString}-${sanitizedName}${ext}`;
  }

  private async processImage(buffer: Buffer, filename: string): Promise<{
    fullPath: string;
    thumbnailPath: string;
    dimensions: { width: number; height: number };
  }> {
    const fullPath = path.join(photosDir, filename);
    const thumbnailPath = path.join(thumbnailsDir, filename);

    // Process and save full image (optimized)
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    await image
      .jpeg({ quality: 85, progressive: true })
      .resize(2048, 2048, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .toFile(fullPath);

    // Generate thumbnail
    await sharp(buffer)
      .jpeg({ quality: 80 })
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { 
        fit: 'cover',
        position: 'center' 
      })
      .toFile(thumbnailPath);

    return {
      fullPath,
      thumbnailPath,
      dimensions: {
        width: metadata.width || 0,
        height: metadata.height || 0
      }
    };
  }

  async uploadPhoto(
    shopId: string,
    file: Express.Multer.File,
    metadata: {
      category?: string;
      altText?: string;
      description?: string;
      tags?: string[];
      uploadedBy?: string;
    } = {}
  ): Promise<any> {
    try {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = this.generateFilename(file.originalname, ext);
      
      const { dimensions } = await this.processImage(file.buffer, filename);

      // Generate URLs
      const url = `/uploads/photos/${filename}`;
      const thumbnailUrl = `/uploads/thumbnails/${filename}`;

      // Create photo record
      const photoData: InsertPhoto = {
        shopId,
        url,
        thumbnailUrl,
        source: 'manual',
        category: metadata.category as any || 'other',
        status: 'completed',
        filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        width: dimensions.width,
        height: dimensions.height,
        altText: metadata.altText,
        description: metadata.description,
        tags: metadata.tags || [],
        uploadedBy: metadata.uploadedBy,
        isPrimary: false,
        sortOrder: 0
      };

      const photo = await storage.createPhoto(photoData);
      return photo;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw new Error(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadMultiplePhotos(
    shopId: string,
    files: Express.Multer.File[],
    metadata: {
      category?: string;
      altText?: string;
      description?: string;
      tags?: string[];
      uploadedBy?: string;
    } = {}
  ): Promise<any[]> {
    const uploadPromises = files.map(file => this.uploadPhoto(shopId, file, metadata));
    return Promise.all(uploadPromises);
  }

  async deletePhoto(photoId: string): Promise<void> {
    try {
      const photo = await storage.getPhotoById(photoId);
      if (!photo) {
        throw new Error('Photo not found');
      }

      // Delete files from filesystem
      const fullPath = path.join(photosDir, photo.filename || '');
      const thumbnailPath = path.join(thumbnailsDir, photo.filename || '');

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      // Delete from database
      await storage.deletePhoto(photoId);
    } catch (error) {
      console.error('Photo deletion error:', error);
      throw new Error(`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setPrimaryPhoto(shopId: string, photoId: string): Promise<void> {
    try {
      // Remove primary flag from all photos for this shop
      await storage.updateShopPhotos(shopId, { isPrimary: false });
      
      // Set the selected photo as primary
      await storage.updatePhoto(photoId, { isPrimary: true });
    } catch (error) {
      console.error('Set primary photo error:', error);
      throw new Error(`Failed to set primary photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reorderPhotos(shopId: string, photoIds: string[]): Promise<void> {
    try {
      const updatePromises = photoIds.map((photoId, index) => 
        storage.updatePhoto(photoId, { sortOrder: index })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Reorder photos error:', error);
      throw new Error(`Failed to reorder photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getPhotoUrl(filename: string): string {
    return `/uploads/photos/${filename}`;
  }

  getThumbnailUrl(filename: string): string {
    return `/uploads/thumbnails/${filename}`;
  }
}

export const photoService = new PhotoService();