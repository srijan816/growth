import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from './postgres';

export type StorageProvider = 'local' | 'aws_s3' | 'google_cloud' | 'azure';

export interface StorageConfig {
  provider: StorageProvider;
  local?: {
    uploadPath: string;
    baseUrl: string;
  };
  aws?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  googleCloud?: {
    bucket: string;
    projectId: string;
    keyFilename: string;
  };
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
}

export interface StoredFile {
  id: string;
  recordingId: string;
  storageType: StorageProvider;
  filePath: string;
  bucketName?: string;
  region?: string;
  originalFilename: string;
  storedFilename: string;
  fileSizeBytes: number;
  contentHash: string;
  isPublic: boolean;
  signedUrlExpiresAt?: Date;
}

export interface UploadResult {
  success: boolean;
  file?: StoredFile;
  error?: string;
  url?: string;
}

export class StorageService {
  private config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      provider: 'local',
      local: {
        uploadPath: process.env.AUDIO_UPLOAD_PATH || './uploads/audio',
        baseUrl: process.env.AUDIO_BASE_URL || '/api/audio/files',
      },
      aws: {
        bucket: process.env.AWS_S3_BUCKET || '',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      googleCloud: {
        bucket: process.env.GOOGLE_CLOUD_BUCKET || '',
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILENAME || '',
      },
      azure: {
        accountName: process.env.AZURE_ACCOUNT_NAME || '',
        accountKey: process.env.AZURE_ACCOUNT_KEY || '',
        containerName: process.env.AZURE_CONTAINER_NAME || '',
      },
      ...config,
    };
  }

  /**
   * Upload an audio file to the configured storage provider
   */
  async uploadAudioFile(
    recordingId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string = 'audio/wav'
  ): Promise<UploadResult> {
    try {
      // Generate unique filename and content hash
      const fileExtension = path.extname(originalFilename);
      const storedFilename = `${uuidv4()}${fileExtension}`;
      const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      let uploadResult: UploadResult;

      switch (this.config.provider) {
        case 'local':
          uploadResult = await this.uploadToLocal(
            recordingId,
            fileBuffer,
            originalFilename,
            storedFilename,
            contentHash
          );
          break;
        case 'aws_s3':
          uploadResult = await this.uploadToS3(
            recordingId,
            fileBuffer,
            originalFilename,
            storedFilename,
            contentHash,
            mimeType
          );
          break;
        case 'google_cloud':
          uploadResult = await this.uploadToGoogleCloud(
            recordingId,
            fileBuffer,
            originalFilename,
            storedFilename,
            contentHash,
            mimeType
          );
          break;
        case 'azure':
          uploadResult = await this.uploadToAzure(
            recordingId,
            fileBuffer,
            originalFilename,
            storedFilename,
            contentHash,
            mimeType
          );
          break;
        default:
          throw new Error(`Unsupported storage provider: ${this.config.provider}`);
      }

      // Store file metadata in database
      if (uploadResult.success && uploadResult.file) {
        await this.storeFileMetadata(uploadResult.file);
      }

      return uploadResult;
    } catch (error) {
      console.error('Error uploading audio file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get file URL for playback or download
   */
  async getFileUrl(recordingId: string, expireInMinutes: number = 60): Promise<string | null> {
    try {
      const file = await this.getFileMetadata(recordingId);
      if (!file) return null;

      switch (file.storageType) {
        case 'local':
          return `${this.config.local!.baseUrl}/${file.storedFilename}`;
        case 'aws_s3':
          return await this.getS3SignedUrl(file, expireInMinutes);
        case 'google_cloud':
          return await this.getGoogleCloudSignedUrl(file, expireInMinutes);
        case 'azure':
          return await this.getAzureSignedUrl(file, expireInMinutes);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(recordingId: string): Promise<boolean> {
    try {
      const file = await this.getFileMetadata(recordingId);
      if (!file) return false;

      let deleted = false;

      switch (file.storageType) {
        case 'local':
          deleted = await this.deleteFromLocal(file);
          break;
        case 'aws_s3':
          deleted = await this.deleteFromS3(file);
          break;
        case 'google_cloud':
          deleted = await this.deleteFromGoogleCloud(file);
          break;
        case 'azure':
          deleted = await this.deleteFromAzure(file);
          break;
      }

      if (deleted) {
        // Remove from database
        await executeQuery(
          'DELETE FROM audio_file_storage WHERE recording_id = $1',
          [recordingId]
        );
      }

      return deleted;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Migrate files between storage providers
   */
  async migrateToProvider(
    newProvider: StorageProvider,
    newConfig?: Partial<StorageConfig>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Update config if provided
      if (newConfig) {
        this.config = { ...this.config, ...newConfig };
      }
      this.config.provider = newProvider;

      // Get all files from current storage
      const files = await executeQuery(
        'SELECT * FROM audio_file_storage ORDER BY created_at'
      );

      for (const fileRecord of files.rows) {
        try {
          // Download from current storage
          const fileBuffer = await this.downloadFile(fileRecord);
          if (!fileBuffer) {
            result.failed++;
            result.errors.push(`Failed to download file: ${fileRecord.stored_filename}`);
            continue;
          }

          // Upload to new storage
          const uploadResult = await this.uploadAudioFile(
            fileRecord.recording_id,
            fileBuffer,
            fileRecord.original_filename
          );

          if (uploadResult.success) {
            // Delete from old storage
            await this.deleteFromStorage(fileRecord);
            result.success++;
          } else {
            result.failed++;
            result.errors.push(`Failed to upload to new storage: ${uploadResult.error}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Migration error for ${fileRecord.stored_filename}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      return result;
    }
  }

  // Private methods for each storage provider

  private async uploadToLocal(
    recordingId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    storedFilename: string,
    contentHash: string
  ): Promise<UploadResult> {
    const uploadPath = this.config.local!.uploadPath;
    
    // Ensure upload directory exists
    await fs.mkdir(uploadPath, { recursive: true });
    
    const filePath = path.join(uploadPath, storedFilename);
    await fs.writeFile(filePath, fileBuffer);

    const file: StoredFile = {
      id: uuidv4(),
      recordingId,
      storageType: 'local',
      filePath,
      originalFilename,
      storedFilename,
      fileSizeBytes: fileBuffer.length,
      contentHash,
      isPublic: false,
    };

    return {
      success: true,
      file,
      url: `${this.config.local!.baseUrl}/${storedFilename}`,
    };
  }

  private async uploadToS3(
    recordingId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    storedFilename: string,
    contentHash: string,
    mimeType: string
  ): Promise<UploadResult> {
    // This would require AWS SDK - placeholder for future implementation
    throw new Error('S3 upload not yet implemented. Install @aws-sdk/client-s3 and implement.');
  }

  private async uploadToGoogleCloud(
    recordingId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    storedFilename: string,
    contentHash: string,
    mimeType: string
  ): Promise<UploadResult> {
    // This would require Google Cloud Storage SDK - placeholder for future implementation
    throw new Error('Google Cloud upload not yet implemented. Install @google-cloud/storage and implement.');
  }

  private async uploadToAzure(
    recordingId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    storedFilename: string,
    contentHash: string,
    mimeType: string
  ): Promise<UploadResult> {
    // This would require Azure Storage SDK - placeholder for future implementation
    throw new Error('Azure upload not yet implemented. Install @azure/storage-blob and implement.');
  }

  private async getS3SignedUrl(file: StoredFile, expireInMinutes: number): Promise<string> {
    throw new Error('S3 signed URL not yet implemented.');
  }

  private async getGoogleCloudSignedUrl(file: StoredFile, expireInMinutes: number): Promise<string> {
    throw new Error('Google Cloud signed URL not yet implemented.');
  }

  private async getAzureSignedUrl(file: StoredFile, expireInMinutes: number): Promise<string> {
    throw new Error('Azure signed URL not yet implemented.');
  }

  private async deleteFromLocal(file: StoredFile): Promise<boolean> {
    try {
      await fs.unlink(file.filePath);
      return true;
    } catch (error) {
      console.error('Error deleting local file:', error);
      return false;
    }
  }

  private async deleteFromS3(file: StoredFile): Promise<boolean> {
    throw new Error('S3 delete not yet implemented.');
  }

  private async deleteFromGoogleCloud(file: StoredFile): Promise<boolean> {
    throw new Error('Google Cloud delete not yet implemented.');
  }

  private async deleteFromAzure(file: StoredFile): Promise<boolean> {
    throw new Error('Azure delete not yet implemented.');
  }

  private async downloadFile(fileRecord: any): Promise<Buffer | null> {
    try {
      switch (fileRecord.storage_type) {
        case 'local':
          return await fs.readFile(fileRecord.file_path);
        default:
          throw new Error(`Download from ${fileRecord.storage_type} not implemented`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  private async deleteFromStorage(fileRecord: any): Promise<void> {
    switch (fileRecord.storage_type) {
      case 'local':
        try {
          await fs.unlink(fileRecord.file_path);
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
        break;
      default:
        console.warn(`Delete from ${fileRecord.storage_type} not implemented`);
    }
  }

  private async storeFileMetadata(file: StoredFile): Promise<void> {
    await executeQuery(
      `INSERT INTO audio_file_storage (
        id, recording_id, storage_type, file_path, bucket_name, region,
        original_filename, stored_filename, file_size_bytes, content_hash,
        is_public, signed_url_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        file.id,
        file.recordingId,
        file.storageType,
        file.filePath,
        file.bucketName || null,
        file.region || null,
        file.originalFilename,
        file.storedFilename,
        file.fileSizeBytes,
        file.contentHash,
        file.isPublic,
        file.signedUrlExpiresAt || null,
      ]
    );
  }

  private async getFileMetadata(recordingId: string): Promise<StoredFile | null> {
    const result = await executeQuery(
      'SELECT * FROM audio_file_storage WHERE recording_id = $1 LIMIT 1',
      [recordingId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      recordingId: row.recording_id,
      storageType: row.storage_type,
      filePath: row.file_path,
      bucketName: row.bucket_name,
      region: row.region,
      originalFilename: row.original_filename,
      storedFilename: row.stored_filename,
      fileSizeBytes: row.file_size_bytes,
      contentHash: row.content_hash,
      isPublic: row.is_public,
      signedUrlExpiresAt: row.signed_url_expires_at,
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Helper function to get storage stats
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  storageBreakdown: Record<StorageProvider, { files: number; sizeBytes: number }>;
}> {
  const result = await executeQuery(`
    SELECT 
      storage_type,
      COUNT(*) as file_count,
      SUM(file_size_bytes) as total_size
    FROM audio_file_storage 
    GROUP BY storage_type
  `);

  const stats = {
    totalFiles: 0,
    totalSizeBytes: 0,
    storageBreakdown: {} as Record<StorageProvider, { files: number; sizeBytes: number }>,
  };

  for (const row of result.rows) {
    const files = parseInt(row.file_count);
    const sizeBytes = parseInt(row.total_size || '0');
    
    stats.totalFiles += files;
    stats.totalSizeBytes += sizeBytes;
    stats.storageBreakdown[row.storage_type as StorageProvider] = {
      files,
      sizeBytes,
    };
  }

  return stats;
}