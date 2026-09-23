'use strict';
/**
 * Cloudinary Image Upload Service (SCRUM-110)
 * Integrates with Cloudinary for image hosting
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class CloudinaryService {
  constructor() {
    this.cloudinaryUrl = process.env.CLOUDINARY_URL;
    this.cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
    this.cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;
  }

  validateImageSize(fileSize) {
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`Image size exceeds 5MB limit (${Math.round(fileSize / 1024 / 1024)}MB)`);
    }
  }

  validateImageType(mimeType) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(mimeType)) {
      throw new Error(`Invalid image type. Allowed: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Upload image to Cloudinary
   * In production, would use cloudinary SDK
   * For now, returns mock response
   */
  async uploadImage(file) {
    // Validation
    this.validateImageSize(file.size);
    this.validateImageType(file.mimetype);

    // Mock response - in production would call actual Cloudinary API
    if (!this.cloudinaryUrl) {
      console.warn('⚠️ CLOUDINARY_URL not configured - using mock upload');

      return {
        url: `https://res.cloudinary.com/mock/image/upload/v${Date.now()}/mock-${file.originalname}`,
        public_id: `mock-${Date.now()}`,
        secure_url: `https://res.cloudinary.com/mock/image/upload/v${Date.now()}/mock-${file.originalname}`,
        size: file.size,
        format: file.originalname.split('.').pop(),
      };
    }

    // Production: Use actual Cloudinary API
    // This would require: npm install cloudinary
    // const cloudinary = require('cloudinary').v2;
    // return await cloudinary.uploader.upload(file.path, {
    //   resource_type: 'auto',
    //   folder: 'sanbong/avatars',
    //   transformation: [{ width: 300, height: 300, crop: 'fill' }]
    // });
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId) {
    if (!this.cloudinaryUrl) {
      console.warn('⚠️ CLOUDINARY_URL not configured - skipping delete');
      return { result: 'ok' };
    }

    // Production implementation
    // const cloudinary = require('cloudinary').v2;
    // return await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(publicId) {
    if (!this.cloudinaryUrl) {
      return { size: 0, format: 'png' };
    }

    // Production implementation
    // const cloudinary = require('cloudinary').v2;
    // return await cloudinary.api.resource(publicId);
  }
}

module.exports = new CloudinaryService();
