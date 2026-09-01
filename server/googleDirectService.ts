import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { GoogleSheetsRegistration } from "./googleSheetsMirror";

interface GoogleServiceConfig {
  clientEmail: string;
  privateKey: string;
  privateKeyId?: string;
  spreadsheetId: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function getGoogleServiceConfig(): GoogleServiceConfig | null {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    "1J3nZj977Gm2AvfMmg3hJDm6rAMdJFo-16lyxnTlaKZo";

  // 1. Try GOOGLE_SERVICE_ACCOUNT_JSON environment variable (full JSON string)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
          privateKeyId: parsed.private_key_id,
          spreadsheetId,
        };
      }
    } catch {
      // invalid JSON in env
    }
  }

  // 2. Try explicit environment variables
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const privateKeyId = process.env.GOOGLE_PRIVATE_KEY_ID;

  if (clientEmail && privateKey) {
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
    return {
      clientEmail,
      privateKey,
      privateKeyId,
      spreadsheetId,
    };
  }

  // 3. Try GOOGLE_APPLICATION_CREDENTIALS path if set
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const filePath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (parsed.client_email && parsed.private_key) {
          return {
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
            privateKeyId: parsed.private_key_id,
            spreadsheetId,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function isGoogleServiceAccountConfigured(): boolean {
  return Boolean(getGoogleServiceConfig());
}

/**
 * Mint Google OAuth2 access token using RS256 signed JWT
 */
export async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const config = getGoogleServiceConfig();
  if (!config) {
    throw new Error("Google Service Account is not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const header: Record<string, string> = { alg: "RS256", typ: "JWT" };
  if (config.privateKeyId) {
    header.kid = config.privateKeyId;
  }

  const payload = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(config.privateKey, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain Google access token: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Upload image buffer / base64 to Google Drive and return viewable URL
 */
export async function uploadPhotoToGoogleDrive(
  accessToken: string,
  photoBase64: string,
  photoName: string = "payment_screenshot.jpg",
  photoType: string = "image/jpeg"
): Promise<string | null> {
  try {
    const base64Data = photoBase64.includes(",") ? photoBase64.split(",")[1] : photoBase64;
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: `${Date.now()}-${photoName}`,
      mimeType: photoType,
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${photoType}\r\n` +
          "Content-Transfer-Encoding: base64\r\n\r\n"
      ),
      Buffer.from(base64Data),
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.warn("[GoogleDrive] Upload error:", uploadRes.status, err);
      return null;
    }

    const uploaded = (await uploadRes.json()) as { id: string; webViewLink?: string };

    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });
    } catch (e) {
      console.warn("[GoogleDrive] Permission set warning:", e);
    }

    return uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
  } catch (error) {
    console.warn("[GoogleDrive] Photo upload failed:", error);
    return null;
  }
}

/**
 * Format registration row for Google Sheets (Google Forms layout)
 */
function buildRowValues(registration: GoogleSheetsRegistration, photoUrl?: string | null): (string | number)[] {
  const photoCell = photoUrl
    ? `=HYPERLINK("${photoUrl}", "View Screenshot")`
    : registration.photoBase64
    ? "Photo Attached"
    : "No Photo";

  return [
    registration.submittedAt,
    registration.referenceCode,
    registration.teamName,
    registration.leadName,
    registration.email,
    registration.phone,
    registration.college,
    registration.memberCount,
    registration.memberOne,
    registration.memberTwo || "",
    registration.memberThree || "",
    registration.memberFour || "",
    registration.memberFive || "",
    registration.memberSix || "",
    registration.domain,
    registration.buildType,
    registration.transactionId,
    photoCell,
    registration.paymentStatus,
  ];
}

/**
 * Append row directly to Google Sheets via Sheets API v4
 */
export async function appendRegistrationToGoogleSheetsDirect(
  registration: GoogleSheetsRegistration
): Promise<{ status: "synced" | "pending"; photoUrl?: string }> {
  try {
    const config = getGoogleServiceConfig();
    if (!config) {
      return { status: "pending" };
    }

    const accessToken = await getGoogleAccessToken();
    let photoUrl: string | null = null;

    if (registration.photoBase64) {
      photoUrl = await uploadPhotoToGoogleDrive(
        accessToken,
        registration.photoBase64,
        registration.photoName || `${registration.referenceCode}.jpg`,
        registration.photoType || "image/jpeg"
      );
    }

    const row = buildRowValues(registration, photoUrl);
    const targetSheets = [
      "Form Responses 1",
      registration.buildType === "software" ? "Software" : "Hardware",
    ];

    for (const sheetName of targetSheets) {
      try {
        const range = encodeURIComponent(`'${sheetName}'!A:S`);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [row],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[GoogleSheetsDirect] Append to sheet "${sheetName}" warning:`, res.status, errText);
        }
      } catch (err) {
        console.warn(`[GoogleSheetsDirect] Failed to append to sheet "${sheetName}":`, err);
      }
    }

    return {
      status: "synced",
      photoUrl: photoUrl || undefined,
    };
  } catch (error) {
    console.error("[GoogleSheetsDirect] Error syncing registration:", error);
    return { status: "pending" };
  }
}
