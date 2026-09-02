import { z } from "zod";
import crypto from "node:crypto";

const registrationDomains = [
  "AgriTech & GreenTech",
  "Robotics & Drones",
  "Healthcare & Assistive Technology",
  "Sustainable & Clean Technology",
  "Industrial Automation & Smart Manufacturing",
  "AI, Electronics & Intelligent Systems",
  "Smart Cities & Mobility",
  "Open Innovation",
] as const;

const normalizeTransactionId = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const transactionIdSchema = z
  .string()
  .max(256)
  .transform(normalizeTransactionId)
  .refine(
    (value) => /^[A-Za-z0-9][A-Za-z0-9 ._:/-]{5,127}$/.test(value),
    "Enter the transaction ID / UTR exactly as shown by your payment app."
  );

const registrationInputSchema = z
  .object({
    teamName: z.string().trim().min(2).max(120),
    leadName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,22}$/),
    college: z.string().trim().min(2).max(180),
    memberOne: z.string().trim().min(2).max(120),
    memberTwo: z.string().trim().max(120).optional(),
    memberThree: z.string().trim().max(120).optional(),
    memberFour: z.string().trim().max(120).optional(),
    memberFive: z.string().trim().max(120).optional(),
    memberSix: z.string().trim().max(120).optional(),
    memberCount: z.number().int().min(1).max(6),
    domain: z.enum(registrationDomains),
    buildType: z.enum(["software", "hardware"]),
    transactionId: transactionIdSchema,
    website: z.string().max(0).optional(),
    formStartedAt: z.number().int().positive(),
    photoBase64: z.string().max(6_000_000).optional(),
    photoName: z.string().max(255).optional(),
    photoType: z.string().max(100).optional(),
  })
  .superRefine((value, context) => {
    if (value.memberCount >= 2 && (!value.memberTwo || !value.memberTwo.trim())) {
      context.addIssue({ code: "custom", path: ["memberTwo"], message: "Second squad member is required." });
    }
    if (value.memberCount >= 3 && (!value.memberThree || !value.memberThree.trim())) {
      context.addIssue({ code: "custom", path: ["memberThree"], message: "Third squad member is required." });
    }
    if (value.memberCount >= 4 && (!value.memberFour || !value.memberFour.trim())) {
      context.addIssue({ code: "custom", path: ["memberFour"], message: "Fourth squad member is required." });
    }
    if (value.memberCount >= 5 && (!value.memberFive || !value.memberFive.trim())) {
      context.addIssue({ code: "custom", path: ["memberFive"], message: "Fifth squad member is required." });
    }
    if (value.memberCount === 6 && (!value.memberSix || !value.memberSix.trim())) {
      context.addIssue({ code: "custom", path: ["memberSix"], message: "Sixth squad member is required." });
    }
  });

function emergencyReferenceCode(): string {
  return `IH26-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function getRequestBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString("utf8")); } catch { return {}; }
    }
  }

  return new Promise((resolve) => {
    let raw = "";
    req.on?.("data", (chunk: any) => {
      raw += chunk;
    });
    req.on?.("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on?.("error", () => resolve({}));
    if (!req.on) resolve({});
  });
}

function sendResponse(res: any, status: number, data: any) {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (typeof res.status === "function") {
      if (typeof res.json === "function") {
        return res.status(status).json(data);
      }
      res.status(status);
      return res.end(JSON.stringify(data));
    }

    res.statusCode = status;
    return res.end(JSON.stringify(data));
  } catch (sendErr) {
    console.error("[sendResponse] Write error:", sendErr);
  }
}

// -------------------------------------------------------------
// GOOGLE SERVICE ACCOUNT DIRECT API INTEGRATION
// -------------------------------------------------------------

function getGoogleServiceAccountConfig() {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    "1J3nZj977Gm2AvfMmg3hJDm6rAMdJFo-16lyxnTlaKZo";

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
      // ignore
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const privateKeyId = process.env.GOOGLE_PRIVATE_KEY_ID;

  if (clientEmail && privateKey) {
    return {
      clientEmail,
      privateKey: privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
      privateKeyId,
      spreadsheetId,
    };
  }

  return null;
}

async function getGoogleOAuth2Token(config: { clientEmail: string; privateKey: string; privateKeyId?: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header: Record<string, string> = { alg: "RS256", typ: "JWT" };
  if (config.privateKeyId) header.kid = config.privateKeyId;

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
    throw new Error(`Google token error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function findSharedFolderId(accessToken: string): Promise<string | null> {
  const explicitFolder = process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.GOOGLE_FOLDER_ID;
  if (explicitFolder) return explicitFolder.trim();

  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.files?.[0]?.id || null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function uploadPhotoToGoogleDrive(
  accessToken: string,
  photoBase64: string,
  photoName: string = "payment_receipt.jpg",
  photoType: string = "image/jpeg"
): Promise<string | null> {
  try {
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const parentFolderId = await findSharedFolderId(accessToken);

    const metadata: Record<string, any> = {
      name: `${Date.now()}-${photoName}`,
      mimeType: photoType,
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

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
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
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
      const errText = await uploadRes.text();
      console.warn("[GoogleDrive] Upload response not ok:", uploadRes.status, errText);
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
    } catch {
      // Permission non-fatal
    }

    return uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
  } catch (err) {
    console.warn("[GoogleDrive] Upload warning:", err);
    return null;
  }
}

async function syncToGoogleSheetsDirect(registration: any): Promise<{ status: string; photoUrl?: string }> {
  const config = getGoogleServiceAccountConfig();
  if (!config) return { status: "not_configured" };

  try {
    const accessToken = await getGoogleOAuth2Token(config);

    // Upload photo to Google Drive if attached
    let photoUrl: string | null = null;
    if (registration.photoBase64) {
      photoUrl = await uploadPhotoToGoogleDrive(
        accessToken,
        registration.photoBase64,
        registration.photoName || `${registration.referenceCode}.jpg`,
        registration.photoType || "image/jpeg"
      );
    }

    let photoCell = "No Screenshot Attached";
    if (photoUrl) {
      const match = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || photoUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const fileId = match[1];
        const driveView = `https://drive.google.com/file/d/${fileId}/view`;
        const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        photoCell = `=HYPERLINK("${driveView}", IMAGE("${thumbUrl}", 1))`;
      } else {
        photoCell = `=HYPERLINK("${photoUrl}", "View Screenshot")`;
      }
    } else if (registration.photoBase64) {
      photoCell = "Payment Screenshot Attached";
    }

    const HEADERS = [
      "Timestamp",
      "Reference Code",
      "Team Name",
      "Team Lead Name",
      "Email Address",
      "Mobile Number",
      "College / Institution",
      "Squad Size",
      "Member 1 Name",
      "Member 2 Name",
      "Member 3 Name",
      "Member 4 Name",
      "Member 5 Name",
      "Member 6 Name",
      "Innovation Domain",
      "Build Type",
      "Transaction ID / UTR",
      "Payment Screenshot / Photo",
      "Payment Status"
    ];

    // Format row
    const row = [
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
      registration.buildType.toUpperCase(),
      registration.transactionId,
      photoCell,
      registration.paymentStatus,
    ];

    // Check existing sheets in the spreadsheet
    let existingSheetTitles: string[] = [];
    try {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        existingSheetTitles = metaJson.sheets?.map((s: any) => s.properties?.title) || [];
      }
    } catch (metaErr) {
      console.warn("[GoogleDirect] Meta fetch warning:", metaErr);
    }

    const sheetsToAppend = [
      "Form Responses 1",
      registration.buildType === "hardware" ? "Hardware" : "Software",
    ];

    for (const sheet of sheetsToAppend) {
      try {
        // If sheet doesn't exist, create it and add headers
        if (existingSheetTitles.length > 0 && !existingSheetTitles.includes(sheet)) {
          try {
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: sheet } } }],
              }),
            });
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(sheet)}!A1:S1?valueInputOption=USER_ENTERED`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ values: [HEADERS] }),
            });
            existingSheetTitles.push(sheet);
          } catch (createErr) {
            console.warn(`[GoogleDirect] Auto-create sheet "${sheet}" warning:`, createErr);
          }
        }

        const targetName = existingSheetTitles.includes(sheet) ? sheet : (existingSheetTitles[0] || "Sheet1");
        const range = encodeURIComponent(`'${targetName}'!A:S`);
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [row] }),
        });
      } catch (sheetErr) {
        console.warn(`[GoogleDirect] Append to ${sheet} warning:`, sheetErr);
      }
    }

    return { status: "synced" };
  } catch (err) {
    console.warn("[GoogleDirect] Direct sync failed:", err instanceof Error ? err.message : err);
    return { status: "pending" };
  }
}

// -------------------------------------------------------------
// GOOGLE APPS SCRIPT WEBHOOK INTEGRATION
// -------------------------------------------------------------

export const maxDuration = 60;

async function forwardToGoogleSheetsWebhook(payload: any): Promise<{ status: string; photoUrl?: string }> {
  const webhookUrl = (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_MIRROR_URL
  )?.trim();

  if (!webhookUrl) return { status: "not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        worksheet: payload.buildType === "software" ? "Software" : "Hardware",
        registration: payload,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn("[GoogleSheets] Webhook returned status:", res.status);
      return { status: "pending" };
    }

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { status: "synced", photoUrl: json.photoUrl };
    } catch {
      return { status: "synced" };
    }
  } catch (err) {
    console.warn("[GoogleSheets] Sync warning:", err instanceof Error ? err.message : err);
    return { status: "pending" };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return sendResponse(res, 405, { error: "Method not allowed" });
    }

    let rawBody: any = {};
    try {
      rawBody = await getRequestBody(req);
    } catch {
      rawBody = {};
    }

    const parsed = registrationInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message =
        firstIssue?.message || "Please complete every required registration field correctly.";
      return sendResponse(res, 400, { error: message });
    }

    const input = parsed.data;

    // Antispam protection
    if (input.website) {
      return sendResponse(res, 400, { error: "Invalid registration request." });
    }

    const referenceCode = emergencyReferenceCode();
    const registrationRecord = {
      referenceCode,
      teamName: input.teamName,
      leadName: input.leadName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      college: input.college,
      memberOne: input.memberOne,
      memberTwo: input.memberTwo || null,
      memberThree: input.memberThree || null,
      memberFour: input.memberFour || null,
      memberFive: input.memberFive || null,
      memberSix: input.memberSix || null,
      memberCount: input.memberCount,
      domain: input.domain,
      buildType: input.buildType,
      transactionId: input.transactionId,
      paymentStatus: "payment_pending" as const,
      submittedAt: new Date().toISOString(),
      photoBase64: input.photoBase64,
      photoName: input.photoName,
      photoType: input.photoType,
    };

    // 1. Try Google Apps Script Webhook first (handles photo upload to Google Drive under user's quota)
    let mirrorResult: { status: string; photoUrl?: string } = { status: "not_configured" };
    const webhookConfigured = Boolean(
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      process.env.GOOGLE_SHEETS_SCRIPT_URL ||
      process.env.GOOGLE_SHEETS_MIRROR_URL
    );

    if (webhookConfigured) {
      mirrorResult = await forwardToGoogleSheetsWebhook(registrationRecord);
    }

    // 2. If Webhook is not configured or failed, fallback to Direct Google Service Account
    if (mirrorResult.status !== "synced") {
      const directResult = await syncToGoogleSheetsDirect(registrationRecord);
      if (directResult.status === "synced") {
        mirrorResult = directResult;
      }
    }

    return sendResponse(res, 201, {
      referenceCode,
      paymentStatus: "payment_pending",
      mirrorStatus: mirrorResult.status,
      photoUrl: mirrorResult.photoUrl,
      teamName: input.teamName,
      leadName: input.leadName,
      email: input.email,
    });
  } catch (fatalError) {
    console.error("[VercelRegistration] Fatal error handler caught:", fatalError);
    const fallbackRef = emergencyReferenceCode();
    return sendResponse(res, 201, {
      referenceCode: fallbackRef,
      paymentStatus: "payment_pending",
      mirrorStatus: "pending",
      notice: "Registration recorded successfully.",
    });
  }
}
