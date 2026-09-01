import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.fn();
vi.mock("../server/db", () => ({ getDb }));

import handler from "./health";

function createResponse() {
  const response = {
    status: vi.fn(),
    setHeader: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("Vercel database health endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("returns JSON when the database is not configured", async () => {
    const response = createResponse();
    await handler({ method: "GET" }, response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      ok: false,
      database: "not_configured",
      error: "Database is not configured.",
    });
  });

  it("returns healthy JSON after a read-only database probe", async () => {
    process.env.DATABASE_URL = "mysql://test";
    getDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue([]) });
    const response = createResponse();
    await handler({ method: "GET" }, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ok: true, database: "mysql_tidb" });
  });

  it("returns safe JSON when the database probe fails", async () => {
    process.env.DATABASE_URL = "mysql://test";
    getDb.mockRejectedValue(new Error("connection failed"));
    const response = createResponse();
    await handler({ method: "GET" }, response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      ok: false,
      database: "unavailable",
      error: "Database connection failed.",
    });
  });
});
