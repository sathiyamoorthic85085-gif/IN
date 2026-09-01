import { afterEach, describe, expect, it, vi } from "vitest";
import { answerParticipantQuestion, extractParticipantHelpText } from "./participantHelpService";

const originalFetch = globalThis.fetch;
const originalMoonshotKey = process.env.MOONSHOT_API_KEY;
const originalOpenAIKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalMoonshotKey === undefined) delete process.env.MOONSHOT_API_KEY;
  else process.env.MOONSHOT_API_KEY = originalMoonshotKey;
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
});

describe("participant help assistant", () => {
  it("answers a bounded participant question using configured Kimi LLM", async () => {
    process.env.MOONSHOT_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Registration is ₹500 per candidate." } }],
      }),
    });

    const result = await answerParticipantQuestion("What is the registration fee?");
    expect(result.provider).toBe("kimi");
    expect(result.answer).toBe("Registration is ₹500 per candidate.");
  });

  it("extracts text from structured model content", () => {
    const text = extractParticipantHelpText([{ type: "text", text: "A squad can contain two to four members." }]);
    expect(text).toBe("A squad can contain two to four members.");
  });

  it("falls back to offline knowledge base when provider fails", async () => {
    process.env.MOONSHOT_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await answerParticipantQuestion("Where can I find travel instructions?");
    expect(result.provider).toBe("fallback");
    expect(result.answer).toMatch(/Erode Sengunthar Engineering College|Thudupathi|Perundurai/i);
    expect(result.answer).toMatch(/verified coordinator call action/);
  });
});
