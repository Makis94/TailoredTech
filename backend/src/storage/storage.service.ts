import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;
// S3's DeleteObjects API caps a single batch at 1000 keys.
const DELETE_BATCH_SIZE = 1000;

/**
 * Thin wrapper around the S3 SDK so the rest of the app never talks to AWS
 * types directly. Works against any S3-compatible endpoint (AWS S3, MinIO,
 * Cloudflare R2, ...) via S3_ENDPOINT / S3_FORCE_PATH_STYLE.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: this.config.get<string>('S3_ENDPOINT') || undefined,
      forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  // Best-effort convenience for local dev against MinIO, where the bucket
  // doesn't exist yet. Silently ignored in production where the bucket is
  // expected to pre-exist and this identity may not have CreateBucket rights.
  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created storage bucket "${this.bucket}"`);
      } catch (err) {
        this.logger.warn(
          `Could not verify or create bucket "${this.bucket}". Assuming it already exists. (${(err as Error).message})`,
        );
      }
    }
  }

  async upload(
    key: string,
    body: Readable | Buffer,
    contentType: string,
    contentLength: number,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: contentLength,
      }),
    );
  }

  /** A time-limited URL the browser can GET/download the file from directly. */
  async getDownloadUrl(key: string, fileName: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const batches = chunk(keys, DELETE_BATCH_SIZE);
    for (const batch of batches) {
      try {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })) },
          }),
        );
      } catch (err) {
        // Storage cleanup failing shouldn't roll back a DB delete the user
        // already sees as complete; we log for a background reconciliation job.
        this.logger.error(
          `Failed to delete ${batch.length} object(s) from storage`,
          err as Error,
        );
      }
    }
  }

  buildObjectKey(
    dataRoomId: string,
    fileId: string,
    versionNumber: number,
    originalName: string,
  ): string {
    return `data-rooms/${dataRoomId}/files/${fileId}/v${versionNumber}-${originalName}`;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
