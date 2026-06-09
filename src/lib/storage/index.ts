import type { StorageProvider } from "./types";

export type { StorageProvider, UploadResult } from "./types";

/**
 * getStorage()
 *
 * Returns the active StorageProvider.
 *
 * Selection order:
 *   1. STORAGE_PROVIDER env var, if set: "local" | "s3" | "vercel-blob"
 *   2. Auto-detect: if BLOB_READ_WRITE_TOKEN is set → "vercel-blob"  (janzenworks overlay)
 *   3. Fallback: "local" (saves to /public/uploads)
 *
 * Recommended providers:
 *   - vercel-blob — one env var (BLOB_READ_WRITE_TOKEN), zero infra setup.
 *                   Public Pugmill does not include this branch; the
 *                   janzenworks deployment overlay restores it on every
 *                   upstream merge.
 *   - local       — zero config; persistent on Replit and self-hosted
 *                   filesystems. Not suitable for ephemeral containers.
 *   - s3          — any S3-compatible store (AWS, R2, Supabase, DO Spaces,
 *                   MinIO). Requires correct endpoint, region, path-style,
 *                   and public URL.
 *
 * The provider instance is cached per process after first call.
 */
let _provider: StorageProvider | null = null;

function detectProvider(): string {
  const explicit = process.env.STORAGE_PROVIDER?.toLowerCase().trim();
  if (explicit) return explicit;
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

export function getStorage(): StorageProvider {
  if (_provider) return _provider;

  const providerName = detectProvider();

  if (providerName === "s3") {
    const { S3StorageProvider } = require("./s3") as typeof import("./s3");
    _provider = new S3StorageProvider();
    console.info("[Pugmill] Storage: S3 provider active (bucket:", process.env.S3_BUCKET, ")");
  } else if (providerName === "vercel-blob") {
    const { VercelBlobStorageProvider } = require("./vercel-blob") as typeof import("./vercel-blob");
    _provider = new VercelBlobStorageProvider();
    console.info("[Pugmill] Storage: Vercel Blob provider active.");
  } else {
    if (providerName !== "local") {
      console.warn(`[Pugmill] Unknown STORAGE_PROVIDER="${providerName}", falling back to local.`);
    }
    const { LocalStorageProvider } = require("./local") as typeof import("./local");
    _provider = new LocalStorageProvider();
  }

  return _provider!;
}

/** Clears the cached provider. Useful in tests or after env changes. */
export function resetStorageProvider(): void {
  _provider = null;
}
