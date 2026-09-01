import { describe, expect, it } from "vitest";
import handler from "./registration";

function responseRecorder() {
  let statusCode = 0;
  let body: unknown;
  const res = {
    setHeader: () => undefined,
    status: (code: number) => {
      statusCode = code;
      return { json: (value: unknown) => { body = value; } };
    },
  };
  return { res, read: () => ({ statusCode, body }) };
}

describe("Vercel registration endpoint", () => {
  it("returns JSON for an unsupported method", async () => {
    const recorded = responseRecorder();
    await handler({ method: "GET" }, recorded.res);
    expect(recorded.read()).toEqual({ statusCode: 405, body: { error: "Method not allowed" } });
  });

  it("returns JSON for malformed input instead of throwing a parse error", async () => {
    const recorded = responseRecorder();
    await handler({ method: "POST", body: "not-json" }, recorded.res);
    expect(recorded.read()).toEqual({ statusCode: 400, body: { error: "Please complete every required registration field correctly." } });
  });
});
