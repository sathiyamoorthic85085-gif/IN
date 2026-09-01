import { describe, expect, it } from "vitest";

describe("Supabase primary database configuration", () => {
  const hasDb = Boolean(process.env.SUPABASE_DATABASE_URL);

  it.skipIf(!hasDb)("opens an SSL connection and completes a read-only health query", async () => {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    expect(connectionString).toMatch(/^postgres(?:ql)?:\/\/[^\s]+/);
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
