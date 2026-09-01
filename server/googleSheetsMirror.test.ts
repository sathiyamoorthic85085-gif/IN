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
  memberThree: "Meera Devi",
  memberFour: "Surya Raj",
  memberFive: "Kavi Priya",
  memberSix: "Dinesh Raj",
  memberCount: 6,
  domain: "Open Innovation",
  buildType: "software",
  transactionId: "UPI-1234567890",
  paymentStatus: "payment_pending",
  submittedAt: "2026-09-01T00:00:00.000Z",
  photoBase64: "data:image/jpeg;base64,dGVzdA==",
  photoName: "payment_proof.jpg",
  photoType: "image/jpeg",
};

describe("Google Sheets registration backend", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    delete process.env.GOOGLE_SHEETS_SCRIPT_URL;
    delete process.env.GOOGLE_SHEETS_MIRROR_URL;
    delete process.env.GOOGLE_SHEETS_MIRROR_TOKEN;
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  });

  it("does nothing when the webhook is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await mirrorRegistrationToGoogleSheets(registration);
    expect(result.status).toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the registration with photo to the configured webhook", async () => {
    process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/test/exec";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true, photoUrl: "https://drive.google.com/file/d/123" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorRegistrationToGoogleSheets(registration);
    expect(result.status).toBe("synced");
    expect(result.photoUrl).toBe("https://drive.google.com/file/d/123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://script.google.com/macros/s/test/exec",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("IH26-TEST"),
      })
    );
  });

  it("keeps the primary flow non-blocking when Google Apps Script is unreachable", async () => {
    process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/test/exec";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network timeout")));
    const result = await mirrorRegistrationToGoogleSheets(registration);
    expect(result.status).toBe("pending");
  });
});
