import type { Metadata } from "next";
import "./globals.css";
import { validateEnv } from "@/lib/validate-env";
import { getConfig } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const siteName = config.site?.name?.trim() || "Pugmill";
  const favicon  = config.site?.favicon?.trim();
  return {
    title: {
      template: `%s - ${siteName}`,
      default: siteName,
    },
    description: config.site?.description || "A rebuildable CMS",
    robots: { index: true, follow: true },
    // Wire the favicon set in Admin > Settings into the rendered <head>.
    // Browsers display this in the URL/tab. Falls through to no icon when
    // the admin hasn't uploaded one, which keeps the build deterministic.
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Run env validation at request time, not build time.
  // This prevents misconfigured secrets from crashing the build pipeline.
  validateEnv();

  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
