import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadPatientImage(file: Express.Multer.File): Promise<{ url: string; public_id: string }> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Check file size
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('File size too large. Maximum 5MB allowed.');
      }

      // Check file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Unsupported file type. Only JPG, JPEG, PNG, WEBP are allowed.');
      }

      // Optimize image
      const optimizedBuffer = await this.optimizeImage(file.buffer);

      // Convert to base64 for Cloudinary
      const base64Image = optimizedBuffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64Image}`;

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          dataURI,
          {
            folder: 'clinic/patients',
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
            width: 800,
            height: 800,
            crop: 'limit',
          },
          (error, result) => {
            if (error) {
              reject(new BadRequestException(`Upload failed: ${error.message}`));
            } else if (result) { // Check if result exists
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
              });
            }else {
              reject(new BadRequestException('Upload failed: No result from Cloudinary'));
            }
          },
        );
      });
    } catch (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      let width = metadata.width;
      let height = metadata.height;

      // Resize if larger than 800px
      if (width > 800 || height > 800) {
        if (width > height) {
          height = Math.round((height * 800) / width);
          width = 800;
        } else {
          width = Math.round((width * 800) / height);
          height = 800;
        }
      }

      let sharpInstance = sharp(buffer).resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Format specific optimization
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        sharpInstance = sharpInstance.jpeg({ 
          quality: 80,
          progressive: true,
          mozjpeg: true
        });
      } else if (metadata.format === 'png') {
        sharpInstance = sharpInstance.png({
          quality: 80,
          progressive: true,
          compressionLevel: 9
        });
      } else {
        sharpInstance = sharpInstance.jpeg({ 
          quality: 80,
          progressive: true 
        });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      // Return original buffer if optimization fails
      return buffer;
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
    }
  }
}