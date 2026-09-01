import { z } from "zod";
import { createSecureRegistration, getSecureRegistrationsByBuildType, transactionAlreadyUsed } from "./db";
import { isGoogleSheetsBackendConfigured, mirrorRegistrationToGoogleSheets } from "./googleSheetsMirror";

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

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export class RegistrationServiceError extends Error {
  constructor(public status: 400 | 409 | 429 | 500, message: string) {
    super(message);
  }
}

const submissionWindows = new Map<string, { startedAt: number; count: number }>();

export function requestClientKey(headers: Record<string, string | string[] | undefined>) {
  const forwarded = headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return firstForwarded?.trim() || headers["x-real-ip"]?.toString() || "unknown";
}

function assertRegistrationRateLimit(key: string) {
  const now = Date.now();
  const existing = submissionWindows.get(key);
  if (!existing || now - existing.startedAt > 10 * 60_000) {
    submissionWindows.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (existing.count >= 15) {
    throw new RegistrationServiceError(429, "Please wait a few minutes before submitting another registration.");
  }
  existing.count += 1;
}

function registrationReference() {
  return `IH26-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function submitSecureRegistration(input: RegistrationInput, clientKey: string) {
  if (input.website) throw new RegistrationServiceError(400, "Invalid registration request.");
  if (Date.now() - input.formStartedAt < 900) {
    throw new RegistrationServiceError(400, "Please review your details before submitting.");
  }
  assertRegistrationRateLimit(clientKey);

  // Check duplicate UTR if DB is connected
  try {
    if (await transactionAlreadyUsed(input.transactionId)) {
      throw new RegistrationServiceError(409, "This transaction ID / UTR has already been submitted.");
    }
  } catch (error) {
    if (error instanceof RegistrationServiceError) throw error;
    // If DB is not reachable, we log and proceed to Google Sheets
  }

  const referenceCode = registrationReference();
  let dbSaved = false;

  try {
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
    dbSaved = true;
  } catch (error) {
    console.warn("[Registration] Database insert skipped or unavailable:", error instanceof Error ? error.message : error);
  }

  const mirrorResult = await mirrorRegistrationToGoogleSheets({
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
    paymentStatus: "payment_pending",
    submittedAt: new Date().toISOString(),
    photoBase64: input.photoBase64,
    photoName: input.photoName,
    photoType: input.photoType,
  });

  if (!dbSaved && mirrorResult.status === "not_configured" && !isGoogleSheetsBackendConfigured()) {
    // If neither DB nor Google Sheets is configured, log warning but return reference in dev
    console.warn("[Registration] Neither database nor Google Sheets is currently connected.");
  }

  return {
    referenceCode,
    paymentStatus: "payment_pending" as const,
    mirrorStatus: mirrorResult.status,
    photoUrl: mirrorResult.photoUrl,
  };
}

export { getSecureRegistrationsByBuildType };
