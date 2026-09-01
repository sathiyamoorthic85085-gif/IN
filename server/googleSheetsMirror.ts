export type GoogleSheetsMirrorStatus = "not_configured" | "synced" | "pending";

export type GoogleSheetsRegistration = {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberOne: string;
  memberTwo: string;
  memberThree: string | null;
  memberFour: string | null;
  memberCount: number;
  domain: string;
  buildType: "software" | "hardware";
  transactionId: string;
  paymentStatus: "payment_pending" | "verified" | "rejected";
  submittedAt: string;
};

function mirrorConfig() {
  const url = process.env.GOOGLE_SHEETS_MIRROR_URL?.trim();
  const token = process.env.GOOGLE_SHEETS_MIRROR_TOKEN?.trim();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  return url && token && spreadsheetId ? { url, token, spreadsheetId } : null;
}

export async function mirrorRegistrationToGoogleSheets(registration: GoogleSheetsRegistration): Promise<GoogleSheetsMirrorStatus> {
  const config = mirrorConfig();
  if (!config) return "not_configured";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-innohack-backup-token": config.token,
      },
      body: JSON.stringify({
        spreadsheetId: config.spreadsheetId,
        worksheet: registration.buildType === "software" ? "Software" : "Hardware",
        registration,
      }),
      signal: controller.signal,
    });
    return response.ok ? "synced" : "pending";
  } catch (error) {
    console.warn("[GoogleSheetsMirror] Registration mirror unavailable", error instanceof Error ? error.name : "unknown");
    return "pending";
  } finally {
    clearTimeout(timeout);
  }
}
