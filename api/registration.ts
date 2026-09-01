import { z } from "zod";

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

export const normalizeTransactionId = (value: string) =>
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

export const registrationInputSchema = z
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

  // Fallback for streaming bodies in Node
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
    // If not a stream and no body, resolve empty object
    if (!req.on) resolve({});
  });
}

function sendResponse(res: any, status: number, data: any) {
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
}

// Mirror to Google Sheets Apps Script Webhook
async function forwardToGoogleSheetsWebhook(payload: any): Promise<{ status: string; photoUrl?: string }> {
  const webhookUrl = (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_MIRROR_URL
  )?.trim();

  if (!webhookUrl) return { status: "not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

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
  if (req.method !== "POST") {
    return sendResponse(res, 405, { error: "Method not allowed" });
  }

  const rawBody = await getRequestBody(req);
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

  // Sync to Google Sheets
  let mirrorResult = { status: "not_configured", photoUrl: undefined as string | undefined };
  try {
    mirrorResult = await forwardToGoogleSheetsWebhook(registrationRecord);
  } catch (syncErr) {
    console.warn("[VercelRegistration] Google sheets forward skipped:", syncErr);
  }

  // Database optional sync
  if (process.env.DATABASE_URL) {
    try {
      const { createSecureRegistration } = await import("../server/db");
      await createSecureRegistration({
        referenceCode,
        teamName: input.teamName,
        leadName: input.leadName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        college: input.college,
        memberOne: input.memberOne,
        memberTwo: input.memberTwo || undefined,
        memberThree: input.memberThree || undefined,
        memberFour: input.memberFour || undefined,
        memberFive: input.memberFive || undefined,
        memberSix: input.memberSix || undefined,
        memberCount: input.memberCount,
        domain: input.domain,
        buildType: input.buildType,
        transactionId: input.transactionId,
      });
    } catch (dbErr) {
      console.warn("[VercelRegistration] DB backup skipped:", dbErr);
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
}
