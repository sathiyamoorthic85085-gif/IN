import { describe, expect, it } from "vitest";
import { retrieveEventKnowledge } from "./participantKnowledge";
import { isKimiConfigured } from "./participantHelpService";

describe("participant-help retrieval and Kimi configuration", () => {
  it("retrieves the official payment guidance for a UTR question", () => {
    const results = retrieveEventKnowledge("How does UTR payment verification work?");
    expect(results.map((result) => result.id)).toContain("payment");
  });

  it("recognises only a configured Moonshot key as a Kimi provider credential", () => {
    expect(isKimiConfigured({})).toBe(false);
    expect(isKimiConfigured({ MOONSHOT_API_KEY: "test-key" })).toBe(true);
  });
});
