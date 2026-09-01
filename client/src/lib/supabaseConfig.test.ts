import { describe, expect, it } from "vitest";
import { isSupabaseConfigured, supabase } from "./supabase";

describe("Supabase browser configuration", () => {
  const hasConfig = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  it("reports configuration state accurately", () => {
    if (hasConfig) {
      expect(isSupabaseConfigured).toBe(true);
      expect(supabase).not.toBeNull();
    } else {
      expect(isSupabaseConfigured).toBe(false);
      expect(supabase).toBeNull();
    }
  });

  it.skipIf(!hasConfig)("authenticates the publishable client configuration against Supabase Auth settings", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(publishableKey).toMatch(/^sb_publishable_/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey!, Authorization: `Bearer ${publishableKey}` },
    });
    expect(response.ok).toBe(true);
    const body = (await response.json()) as { external?: Record<string, unknown> };
    expect(body).toHaveProperty("external");
  }, 20_000);
});
