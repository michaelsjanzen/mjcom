import { describe, it, expect } from "vitest";
import { detectSiteUrl, detectSetupUrl, isDevUrl } from "../src/lib/detect-site-url";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  const keys = [
    "NEXTAUTH_URL", "REPLIT_DEV_DOMAIN",
    "RAILWAY_PUBLIC_DOMAIN", "RENDER_EXTERNAL_URL", "PRODUCTION_URL",
  ];
  for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { fn(); } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

describe("detectSiteUrl", () => {
  it("returns null when no vars set", () => {
    withEnv({}, () => expect(detectSiteUrl()).toBeNull());
  });
  it("prefers NEXTAUTH_URL over everything", () => {
    withEnv({ NEXTAUTH_URL: "https://explicit.com", REPLIT_DEV_DOMAIN: "abc.replit.dev" }, () =>
      expect(detectSiteUrl()).toBe("https://explicit.com")
    );
  });
  it("falls back to REPLIT_DEV_DOMAIN", () => {
    withEnv({ REPLIT_DEV_DOMAIN: "myapp.replit.dev" }, () =>
      expect(detectSiteUrl()).toBe("https://myapp.replit.dev")
    );
  });
  it("falls back to RAILWAY_PUBLIC_DOMAIN (adds https://)", () => {
    withEnv({ RAILWAY_PUBLIC_DOMAIN: "myapp.up.railway.app" }, () =>
      expect(detectSiteUrl()).toBe("https://myapp.up.railway.app")
    );
  });
  it("falls back to RENDER_EXTERNAL_URL (already has https://)", () => {
    withEnv({ RENDER_EXTERNAL_URL: "https://myapp.onrender.com" }, () =>
      expect(detectSiteUrl()).toBe("https://myapp.onrender.com")
    );
  });
});

describe("detectSetupUrl", () => {
  it("skips NEXTAUTH_URL when it is a dev URL", () => {
    withEnv({ NEXTAUTH_URL: "https://abc.replit.dev", PRODUCTION_URL: "https://myprod.com" }, () =>
      expect(detectSetupUrl()).toBe("https://myprod.com")
    );
  });
  it("uses NEXTAUTH_URL when it is a production URL", () => {
    withEnv({ NEXTAUTH_URL: "https://myprod.com", PRODUCTION_URL: "https://other.com" }, () =>
      expect(detectSetupUrl()).toBe("https://myprod.com")
    );
  });
  it("adds https:// to PRODUCTION_URL if missing", () => {
    withEnv({ PRODUCTION_URL: "myprod.replit.app" }, () =>
      expect(detectSetupUrl()).toBe("https://myprod.replit.app")
    );
  });
  it("falls back to REPLIT_DEV_DOMAIN when no production vars set", () => {
    withEnv({ REPLIT_DEV_DOMAIN: "abc.replit.dev" }, () =>
      expect(detectSetupUrl()).toBe("https://abc.replit.dev")
    );
  });
});

describe("isDevUrl", () => {
  it("identifies localhost as dev", () => expect(isDevUrl("http://localhost:3000")).toBe(true));
  it("identifies 127.0.0.1 as dev", () => expect(isDevUrl("http://127.0.0.1:3000")).toBe(true));
  it("identifies .replit.dev as dev", () => expect(isDevUrl("https://abc123.replit.dev")).toBe(true));
  it("identifies .repl.co as dev", () => expect(isDevUrl("https://myapp.username.repl.co")).toBe(true));
  it("production domains are not dev", () => {
    expect(isDevUrl("https://myprod.com")).toBe(false);
    expect(isDevUrl("https://myapp.replit.app")).toBe(false);
  });
});
