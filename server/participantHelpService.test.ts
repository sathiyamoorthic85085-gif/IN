import { afterEach, describe, expect, it, vi } from "vitest";
import { answerParticipantQuestion } from "./participantHelpService";

const originalFetch = globalThis.fetch;
const originalVercel = process.env.VERCEL;
const originalMoonshotKey = process.env.MOONSHOT_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalMoonshotKey === undefined) delete process.env.MOONSHOT_API_KEY;
  else process.env.MOONSHOT_API_KEY = originalMoonshotKey;
});

describe("portable participant-help provider", () => {
  it("returns retrieved event guidance when Kimi is rate limited on Vercel", async () => {
    process.env.VERCEL = "1";
    process.env.MOONSHOT_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    const result = await answerParticipantQuestion("What is the registration fee?");
    expect(result.provider).toBe("fallback");
    expect(result.answer).toMatch(/₹500/);
    expect(result.answer).toMatch(/verified coordinator call action/);
  });
});
