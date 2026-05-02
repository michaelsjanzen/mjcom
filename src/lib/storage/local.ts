import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import type { StorageProvider, UploadResult } from "./types";

/**
 * LocalStorageProvider
 *
 * Saves files to /public/uploads on the local filesystem.
 * Suitable for local development and single-server deployments with
 * persistent storage (e.g. a VPS, Replit, or any host with a volume).
 *
 * NOT suitable for stateless / ephemeral containers.
 * Set STORAGE_PROVIDER=s3 to switch to S3-compatible storage.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  async upload(buffer: Buffer, fileName: string, _mimeType: string): Promise<UploadResult> {
    await mkdir(this.uploadDir, { recursive: true });

    const dest = path.resolve(this.uploadDir, fileName);

    // Path traversal guard: ensure resolved path stays inside uploadDir
    if (!dest.startsWith(path.resolve(this.uploadDir))) {
      throw new Error("Invalid file path: path traversal detected");
    }

    await writeFile(dest, buffer);

    const storageKey = `uploads/${fileName}`;
    const url = `/${storageKey}`;

    return { url, storageKey };
  }

  async delete(storageKey: string): Promise<void> {
    // storageKey is "uploads/filename.jpg"
    const filePath = path.resolve(process.cwd(), "public", storageKey);

    // Path traversal guard
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    if (!filePath.startsWith(uploadsDir)) {
      throw new Error("Invalid storage key: path traversal detected");
    }

    try {
      await unlink(filePath);
    } catch (err: unknown) {
      // File already gone — not an error worth surfacing
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
