import { describe, expect, it } from "vitest";

describe("Supabase server secrets", () => {
  const hasUrlAndKey = Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SECRET_KEY
  );
  const hasDb = Boolean(process.env.SUPABASE_DATABASE_URL);

  it.skipIf(!hasUrlAndKey)("validates the server key against Supabase Auth settings", async () => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(secretKey).toMatch(/^sb_secret_/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: secretKey!, Authorization: `Bearer ${secretKey}` },
    });
    expect(response.ok).toBe(true);
    expect(await response.json()).toHaveProperty("external");
  }, 20_000);

  it.skipIf(!hasDb)("validates the database URI with a read-only SSL query", async () => {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    expect(connectionString).toMatch(/^postgres(?:ql)?:\/\//);
    expect(connectionString).toMatch(/(?:\?|&)sslmode=require(?:&|$)/);

    const { default: postgres } = await import("postgres");
    const sql = postgres(connectionString!, { prepare: false, max: 1, connect_timeout: 10 });
    try {
      const result = await sql`select 1 as ok`;
      expect(Number(result[0]?.ok)).toBe(1);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }, 20_000);
});
