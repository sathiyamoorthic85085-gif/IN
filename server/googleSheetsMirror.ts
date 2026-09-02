import {
  appendRegistrationToGoogleSheetsDirect,
  isGoogleServiceAccountConfigured,
} from "./googleDirectService";

export type GoogleSheetsMirrorStatus = "not_configured" | "synced" | "pending";

export type GoogleSheetsRegistration = {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberOne: string;
  memberTwo?: string | null;
  memberThree?: string | null;
  memberFour?: string | null;
  memberFive?: string | null;
  memberSix?: string | null;
  memberCount: number;
  domain: string;
  buildType: "software" | "hardware";
  transactionId: string;
  paymentStatus: "payment_pending" | "verified" | "rejected";
  submittedAt: string;
  photoBase64?: string;
  photoName?: string;
  photoType?: string;
  photoUrl?: string;
};

function webhookConfig() {
  const url = (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_MIRROR_URL
  )?.trim();
  const token = process.env.GOOGLE_SHEETS_MIRROR_TOKEN?.trim();
  const spreadsheetId = (
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID
  )?.trim();

  return url ? { url, token, spreadsheetId } : null;
}

export function isGoogleSheetsBackendConfigured(): boolean {
  return Boolean(webhookConfig()) || isGoogleServiceAccountConfigured();
}

export async function mirrorRegistrationToGoogleSheets(
  registration: GoogleSheetsRegistration
): Promise<{ status: GoogleSheetsMirrorStatus; photoUrl?: string }> {
  const config = webhookConfig();

  // 1. Prioritize Google Apps Script Webhook (essential for storing images in Google Drive under user's quota)
  if (config) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (config.token) {
        headers["x-innohack-backup-token"] = config.token;
      }

      const payload = {
        spreadsheetId: config.spreadsheetId,
        worksheet: registration.buildType === "software" ? "Software" : "Hardware",
        registration,
      };

      const response = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.ok) {
        const responseText = await response.text();
        let photoUrl: string | undefined;
        try {
          const json = JSON.parse(responseText);
          if (json.photoUrl) {
            photoUrl = json.photoUrl;
          }
          if (json.success !== false) {
            return { status: "synced", photoUrl };
          }
        } catch {
          // Non-JSON ok response
          return { status: "synced", photoUrl };
        }
      } else {
        console.warn(`[GoogleSheetsBackend] HTTP ${response.status} from Google Apps Script webhook`);
      }
    } catch (error) {
      console.warn(
        "[GoogleSheetsBackend] Google Apps Script webhook error, trying direct fallback:",
        error instanceof Error ? error.message : "unknown"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Direct Google Service Account (fallback or when webhook is not configured)
  if (isGoogleServiceAccountConfigured()) {
    try {
      const directResult = await appendRegistrationToGoogleSheetsDirect(registration);
      if (directResult.status === "synced") {
        return directResult;
      }
    } catch (err) {
      console.warn("[GoogleSheets] Direct service account sync error:", err);
    }
  }

  if (!config && !isGoogleServiceAccountConfigured()) {
    return { status: "not_configured" };
  }

  return { status: "pending" };
}
