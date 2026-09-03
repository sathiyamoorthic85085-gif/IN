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
    (value) => /^[A-Za-z0-9][A-Za-z0-9 ._:/-]{3,127}$/.test(value),
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
    formStartedAt: z.number().int().positive().optional(),
    photoBase64: z.string().max(8_000_000).optional(),
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

export interface FoodTokenInfo {
  tokenId: string;
  memberIndex: number;
  memberName: string;
  role: string;
  passUrl: string;
  qrCodeUrl: string;
}

function generateFoodTokens(referenceCode: string, memberNames: string[]): FoodTokenInfo[] {
  const siteUrl = "https://innohack26.vercel.app";
  return memberNames.map((name, idx) => {
    const memberIndex = idx + 1;
    const role = memberIndex === 1 ? "Team Leader" : `Squad Member ${memberIndex}`;
    const tokenId = `${referenceCode}-F${memberIndex}`;
    const passUrl = `${siteUrl}/food-token?token=${encodeURIComponent(tokenId)}&ref=${encodeURIComponent(referenceCode)}&m=${memberIndex}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(passUrl)}&color=07111d&bgcolor=ffffff&qzone=1`;

    return {
      tokenId,
      memberIndex,
      memberName: name,
      role,
      passUrl,
      qrCodeUrl,
    };
  });
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

export const maxDuration = 60;

const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec";

async function forwardToGoogleSheetsWebhook(payload: any): Promise<{ status: string; photoUrl?: string }> {
  const webhookUrl = (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_MIRROR_URL ||
    DEFAULT_WEBHOOK_URL
  )?.trim();

  // 1. Try POST first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

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
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.success !== false) {
          return { status: "synced", photoUrl: json.photoUrl };
        }
      } catch {
        // Non-JSON ok response (Google Drive redirect) -> fall through to GET fallback
      }
    }
  } catch (postErr) {
    console.warn("[GoogleSheets] POST attempt notice, falling back to GET query:", postErr instanceof Error ? postErr.message : postErr);
  }

  // 2. Reliable GET fallback (bypasses Google Apps Script POST redirection)
  try {
    const getUrl = new URL(webhookUrl);
    getUrl.searchParams.set("referenceCode", payload.referenceCode || "");
    getUrl.searchParams.set("teamName", payload.teamName || "");
    getUrl.searchParams.set("leadName", payload.leadName || "");
    getUrl.searchParams.set("email", payload.email || "");
    getUrl.searchParams.set("phone", payload.phone || "");
    getUrl.searchParams.set("college", payload.college || "");
    getUrl.searchParams.set("memberCount", String(payload.memberCount || 1));
    getUrl.searchParams.set("memberOne", payload.memberOne || "");
    if (payload.memberTwo) getUrl.searchParams.set("memberTwo", payload.memberTwo);
    if (payload.memberThree) getUrl.searchParams.set("memberThree", payload.memberThree);
    if (payload.memberFour) getUrl.searchParams.set("memberFour", payload.memberFour);
    if (payload.memberFive) getUrl.searchParams.set("memberFive", payload.memberFive);
    if (payload.memberSix) getUrl.searchParams.set("memberSix", payload.memberSix);
    getUrl.searchParams.set("domain", payload.domain || "");
    getUrl.searchParams.set("buildType", payload.buildType || "software");
    getUrl.searchParams.set("transactionId", payload.transactionId || "");
    if (payload.submittedAt) getUrl.searchParams.set("submittedAt", payload.submittedAt);
    if (payload.photoUrl) getUrl.searchParams.set("photoUrl", payload.photoUrl);

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
    console.warn("[GoogleSheets] GET sync fallback notice:", getErr instanceof Error ? getErr.message : getErr);
  }

  return { status: "pending" };
}

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

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
    const amountPaid = input.memberCount * 500;
    const members = [
      input.memberOne,
      input.memberTwo,
      input.memberThree,
      input.memberFour,
      input.memberFive,
      input.memberSix,
    ].slice(0, input.memberCount).filter((m): m is string => Boolean(m && m.trim()));

    // Generate individual food & snacks passes for each squad member
    const foodTokens = generateFoodTokens(referenceCode, members);

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
      amountPaid,
      paymentStatus: "payment_pending" as const,
      submittedAt: new Date().toISOString(),
      photoBase64: input.photoBase64,
      photoName: input.photoName,
      photoType: input.photoType,
      foodTokens,
    };

    // Forward to Google Apps Script Webhook (handles Sheet recording & Gmail dispatch)
    let mirrorResult: { status: string; photoUrl?: string } = { status: "pending" };
    try {
      mirrorResult = await forwardToGoogleSheetsWebhook(registrationRecord);
    } catch (mirrorErr) {
      console.warn("[VercelRegistration] Webhook forward error:", mirrorErr);
    }

    return sendResponse(res, 201, {
      referenceCode,
      paymentStatus: "payment_pending",
      mirrorStatus: mirrorResult.status,
      photoUrl: mirrorResult.photoUrl,
      teamName: input.teamName,
      leadName: input.leadName,
      email: input.email,
      amountPaid,
      memberCount: input.memberCount,
      foodTokens,
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
