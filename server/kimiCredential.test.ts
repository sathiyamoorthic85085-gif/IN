import { describe, expect, it } from "vitest";

describe("Kimi credential", () => {
  const hasKey = Boolean(process.env.MOONSHOT_API_KEY);

  it.skipIf(!hasKey)("authenticates to the Moonshot model catalogue", async () => {
    const key = process.env.MOONSHOT_API_KEY;
    expect(key).toBeTruthy();
    const response = await fetch("https://api.moonshot.ai/v1/models", {
      headers: { authorization: `Bearer ${key}` },
    });
    expect(response.ok).toBe(true);
  }, 30_000);
});
