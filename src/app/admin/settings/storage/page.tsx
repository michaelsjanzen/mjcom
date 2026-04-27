import type { Metadata } from "next";

export const metadata: Metadata = { title: "Storage" };

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getConfig } from "@/lib/config";
import { saveStorageSettings } from "@/lib/actions/storage";
import { PageShell, Field, SaveButton, ToggleField } from "../_components";

export default async function StorageSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const [config, sp] = await Promise.all([getConfig(), searchParams]);
  const storage = config.storage;
  const saved = sp.toast === "saved";
  const isS3 = storage?.provider === "s3";
  const isS3Configured = isS3 && !!storage?.bucket;
  const isVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const isPermanent = isS3Configured || isVercelBlob;

  return (
    <PageShell
      title="Storage"
      description="Where uploaded media files are stored. Switch to S3-compatible storage for permanent, portable file hosting."
      saved={saved}
    >
      {/* Active provider status */}
      {isVercelBlob && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          <strong>Vercel Blob storage is active.</strong> Files are stored permanently via Vercel Blob — no action needed.
        </div>
      )}

      {isS3Configured && !isVercelBlob && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          <strong>S3 storage is active</strong> — bucket: <strong>{storage.bucket}</strong>
          {storage.endpoint ? `, endpoint: ${storage.endpoint}` : ""}
        </div>
      )}

      {!isPermanent && (
        <>
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm text-zinc-700">
            <strong>Local storage is active.</strong> Files are saved to <code>/public/uploads</code> on the server.
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <strong>Ephemeral filesystem warning.</strong> On platforms like Vercel or Replit, the local filesystem
            is reset on every deployment or restart — uploaded files will be lost.
            Configure Vercel Blob or an S3-compatible provider below for permanent storage.
          </div>
        </>
      )}

      <form action={saveStorageSettings} className="space-y-8">

        {/* Provider */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-700">Provider</h3>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Storage provider</label>
            <select
              name="provider"
              defaultValue={storage?.provider ?? "local"}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="local">Local (server filesystem)</option>
              <option value="s3">S3-compatible (R2, AWS, DigitalOcean Spaces, MinIO)</option>
            </select>
            <p className="text-xs text-zinc-400 mt-1">
              Changing this does not migrate existing files — new uploads go to the new provider.
              {isVercelBlob && " Vercel Blob is auto-detected from BLOB_READ_WRITE_TOKEN and takes precedence over this setting."}
            </p>
          </div>
        </div>

        {/* S3 credentials */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-700">S3-compatible credentials</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Works with Cloudflare R2 (recommended — no egress fees, free 10 GB), AWS S3, DigitalOcean Spaces, or any MinIO-compatible store.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Bucket name"
              name="bucket"
              defaultValue={storage?.bucket}
              placeholder="my-media-bucket"
            />
            <Field
              label="Region"
              name="region"
              defaultValue={storage?.region || "auto"}
              placeholder="auto"
              hint='Use "auto" for Cloudflare R2, or your AWS region (e.g. us-east-1).'
            />
          </div>
          <Field
            label="Access key ID"
            name="accessKeyId"
            defaultValue={storage?.accessKeyId}
            placeholder="Access key ID"
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Secret access key</label>
            <input
              name="secretAccessKey"
              type="password"
              defaultValue={storage?.secretAccessKey ? "__REDACTED__" : ""}
              placeholder={storage?.secretAccessKey ? "Key saved — paste new key to change" : "Secret access key"}
              autoComplete="off"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <Field
            label="Endpoint URL"
            name="endpoint"
            defaultValue={storage?.endpoint}
            placeholder="https://<account-id>.r2.cloudflarestorage.com"
            hint="Required for R2, DigitalOcean Spaces, and MinIO. Leave blank for AWS S3."
          />
          <Field
            label="Public URL"
            name="publicUrl"
            defaultValue={storage?.publicUrl}
            placeholder="https://pub-xxxx.r2.dev  or  https://media.yourdomain.com"
            hint="Base URL for public file access. For R2 use the r2.dev subdomain or your custom domain. Leave blank to auto-derive from bucket + region."
          />
          <ToggleField
            label="Public ACL (AWS S3 only)"
            name="publicAcl"
            hint="Enable for AWS S3 public buckets. Disable for Cloudflare R2, DigitalOcean Spaces, or private buckets — those don't support ACL headers."
            defaultChecked={storage?.publicAcl ?? false}
          />
        </div>

        <SaveButton label="Save storage settings" />
      </form>
    </PageShell>
  );
}
