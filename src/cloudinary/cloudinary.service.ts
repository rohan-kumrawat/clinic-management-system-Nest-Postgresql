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
  
  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<{ url: string; public_id: string; filename: string; file_type: string }[]> {
  try {
    const uploadPromises = files.map(async (file) => {
      // Validate file type - ADD PDF support
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Unsupported file type: ${file.originalname}. Only images and PDF are allowed.`);
      }

      // Check file size (PDFs can be larger)
      const maxSize = file.mimetype === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException(`File too large: ${file.originalname}. Maximum ${maxSize / 1024 / 1024}MB allowed.`);
      }

      let optimizedBuffer: Buffer;
      let resourceType: 'image' | 'raw' = 'image';
      let fileType: string;

      if (file.mimetype.startsWith('image/')) {
        // Optimize images
        optimizedBuffer = await this.optimizeImage(file.buffer);
        resourceType = 'image';
        fileType = 'image';
      } else {
        // PDF - use as is
        optimizedBuffer = file.buffer;
        resourceType = 'raw';
        fileType = 'pdf';
      }

      // Convert buffer to base64 for Cloudinary
      const base64File = optimizedBuffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64File}`;

      return new Promise<{ url: string; public_id: string; filename: string; file_type: string }>((resolve, reject) => {
        cloudinary.uploader.upload(
          dataURI,
          {
            folder: 'clinic/patients/reports',
            resource_type: resourceType,
            quality: 'auto',
            fetch_format: 'auto',
            ...(file.mimetype.startsWith('image/') && {
              width: 1200,
              height: 1200,
              crop: 'limit',
            }),
          },
          (error, result) => {
            if (error) {
              reject(new BadRequestException(`Upload failed for ${file.originalname}: ${error.message}`));
            } else if (result) {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
                filename: file.originalname,
                file_type: fileType // ✅ Set file type
              });
            } else {
              reject(new BadRequestException(`Upload failed for ${file.originalname}: No result from Cloudinary`));
            }
          },
        );
      });
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new BadRequestException(`Multiple file upload failed: ${error.message}`);
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

  // ADD this method for file deletion
async deleteFile(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
    }
  } catch (error) {
    console.error('Failed to delete file from Cloudinary:', error);
  }
}

}