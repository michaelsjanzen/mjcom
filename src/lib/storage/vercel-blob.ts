import { put, del } from "@vercel/blob";
import type { StorageProvider, UploadResult } from "./types";

/**
 * VercelBlobStorageProvider
 *
 * Uploads files to Vercel Blob storage.
 * https://vercel.com/docs/storage/vercel-blob
 *
 * Required env var:
 *   BLOB_READ_WRITE_TOKEN  — generated automatically when you add the
 *                            Vercel Blob integration to your project.
 *
 * To enable: set STORAGE_PROVIDER=vercel-blob in your Vercel environment
 * variables. No other configuration needed.
 */
export class VercelBlobStorageProvider implements StorageProvider {
  constructor() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "VercelBlobStorageProvider requires BLOB_READ_WRITE_TOKEN. " +
        "Add the Vercel Blob integration to your project to generate one."
      );
    }
  }

  async upload(buffer: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
    const blob = await put(`uploads/${fileName}`, buffer, {
      access: "public",
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      storageKey: blob.url, // Vercel Blob uses the full URL as the deletion key
    };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await del(storageKey, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch {
      // Already deleted or never existed — treat as success
    }
  }
}
