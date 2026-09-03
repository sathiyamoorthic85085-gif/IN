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
    process.env.GOOGLE_SHEETS_MIRROR_URL ||
    "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec"
  )?.trim();
  const token = process.env.GOOGLE_SHEETS_MIRROR_TOKEN?.trim();
  const spreadsheetId = (
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    "1J3nZj977Gm2AvfMmg3hJDm6rAMdJFo-16lyxnTlaKZo"
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

  // 1. Google Apps Script Webhook
  if (config) {
    // 1a. Try POST
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const headers: Record<string, string> = { "content-type": "application/json" };
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
      clearTimeout(timeout);

      if (response.ok) {
        const responseText = await response.text();
        let photoUrl: string | undefined;
        try {
          const json = JSON.parse(responseText);
          if (json.photoUrl) photoUrl = json.photoUrl;
          if (json.success !== false) {
            return { status: "synced", photoUrl };
          }
        } catch {
          // Google Drive redirect -> continue to GET fallback
        }
      }
    } catch (postErr) {
      console.warn("[GoogleSheetsBackend] POST attempt warning, falling back to GET:", postErr instanceof Error ? postErr.message : postErr);
    }

    // 1b. Reliable GET fallback
    try {
      const getUrl = new URL(config.url);
      getUrl.searchParams.set("referenceCode", registration.referenceCode);
      getUrl.searchParams.set("teamName", registration.teamName);
      getUrl.searchParams.set("leadName", registration.leadName);
      getUrl.searchParams.set("email", registration.email);
      getUrl.searchParams.set("phone", registration.phone);
      getUrl.searchParams.set("college", registration.college);
      getUrl.searchParams.set("memberCount", String(registration.memberCount));
      getUrl.searchParams.set("memberOne", registration.memberOne);
      if (registration.memberTwo) getUrl.searchParams.set("memberTwo", registration.memberTwo);
      if (registration.memberThree) getUrl.searchParams.set("memberThree", registration.memberThree);
      if (registration.memberFour) getUrl.searchParams.set("memberFour", registration.memberFour);
      if (registration.memberFive) getUrl.searchParams.set("memberFive", registration.memberFive);
      if (registration.memberSix) getUrl.searchParams.set("memberSix", registration.memberSix);
      getUrl.searchParams.set("domain", registration.domain);
      getUrl.searchParams.set("buildType", registration.buildType);
      getUrl.searchParams.set("transactionId", registration.transactionId);
      if (registration.submittedAt) getUrl.searchParams.set("submittedAt", registration.submittedAt);
      if (registration.photoUrl) getUrl.searchParams.set("photoUrl", registration.photoUrl);

      const getRes = await fetch(getUrl.toString());
      if (getRes.ok) {
        const getText = await getRes.text();
        try {
          const json = JSON.parse(getText);
          if (json.success !== false) {
            return { status: "synced", photoUrl: json.photoUrl };
          }
        } catch {}
        return { status: "synced" };
      }
    } catch (getErr) {
      console.warn("[GoogleSheetsBackend] GET sync fallback notice:", getErr instanceof Error ? getErr.message : getErr);
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
