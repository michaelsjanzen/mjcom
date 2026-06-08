import { getConfig } from "../../../src/lib/config";
import type { PostFooterSlotProps } from "../../../src/lib/plugin-registry";
import { issueFormToken } from "../../../src/lib/form-protection";
import { turnstileSiteKey } from "../../../src/lib/turnstile";
import ContactFormUI from "./ContactFormUI";

/**
 * Renders the contact form at the bottom of the designated page.
 * Only active on the page whose slug matches the `pageSlug` setting (default: "contact").
 * Site owners create a standard page with that slug — no special setup required.
 */
export default async function ContactFormSection({ postSlug }: PostFooterSlotProps) {
  const config = await getConfig();

  if (!config.modules.activePlugins.includes("contact-form")) return null;

  const settings = config.modules.pluginSettings?.["contact-form"] ?? {};
  const pageSlug = (settings.pageSlug as string) || "contact";

  // Only render on the designated contact page
  if (postSlug !== pageSlug) return null;

  const showPhone = settings.showPhone !== false;
  const requirePhone = settings.requirePhone === true;
  const showSocialUrl = settings.showSocialUrl !== false;
  const requireSocialUrl = settings.requireSocialUrl === true;

  return (
    <section
      className="mt-8 space-y-6 border-t pt-8"
      style={{ borderColor: "var(--color-border)" }}
    >
      <ContactFormUI
        showPhone={showPhone}
        requirePhone={requirePhone}
        showSocialUrl={showSocialUrl}
        requireSocialUrl={requireSocialUrl}
        token={issueFormToken("contact-form")}
        turnstileSiteKey={turnstileSiteKey() ?? ""}
      />
    </section>
  );
}
