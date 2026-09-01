import { beforeEach, describe, expect, it, vi } from "vitest";
import { mirrorRegistrationToGoogleSheets, type GoogleSheetsRegistration } from "./googleSheetsMirror";

const registration: GoogleSheetsRegistration = {
  referenceCode: "IH26-TEST",
  teamName: "Signal Builders",
  leadName: "Asha Kumar",
  email: "asha@example.com",
  phone: "+919876543210",
  college: "ESEC",
  memberOne: "Asha Kumar",
  memberTwo: "Ravi Kumar",
  memberThree: null,
  memberFour: null,
  memberCount: 2,
  domain: "Open Innovation",
  buildType: "software",
  transactionId: "UPI-1234567890",
  paymentStatus: "payment_pending",
  submittedAt: "2026-09-01T00:00:00.000Z",
};

describe("Google Sheets registration mirror", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_SHEETS_MIRROR_URL;
    delete process.env.GOOGLE_SHEETS_MIRROR_TOKEN;
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  });

  it("does nothing when the mirror is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(mirrorRegistrationToGoogleSheets(registration)).resolves.toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the exact registration to the configured worksheet", async () => {
    process.env.GOOGLE_SHEETS_MIRROR_URL = "https://example.com/mirror";
    process.env.GOOGLE_SHEETS_MIRROR_TOKEN = "test-token";
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-id";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(mirrorRegistrationToGoogleSheets(registration)).resolves.toBe("synced");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/mirror", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "x-innohack-backup-token": "test-token" }),
      body: JSON.stringify({ spreadsheetId: "sheet-id", worksheet: "Software", registration }),
    }));
  });

  it("keeps the primary flow non-blocking when the mirror fails", async () => {
    process.env.GOOGLE_SHEETS_MIRROR_URL = "https://example.com/mirror";
    process.env.GOOGLE_SHEETS_MIRROR_TOKEN = "test-token";
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-id";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(mirrorRegistrationToGoogleSheets(registration)).resolves.toBe("pending");
  });
});
