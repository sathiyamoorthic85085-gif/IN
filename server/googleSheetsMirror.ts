export interface GoogleSheetsRegistration {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberOne?: string;
  memberTwo?: string;
  memberThree?: string;
  memberFour?: string;
  memberFive?: string;
  memberSix?: string;
  memberCount: number;
  domain: string;
  buildType: string;
  transactionId?: string;
  paymentStatus?: string;
  submittedAt?: string;
  photoBase64?: string;
  photoName?: string;
  photoType?: string;
  photoUrl?: string;
  feeCalculation?: string;
  amountPaid?: number;
}

export type GoogleSheetsMirrorStatus = "synced" | "pending" | "not_configured" | "failed";

export interface MirrorResult {
  status: GoogleSheetsMirrorStatus;
  photoUrl?: string;
  fileId?: string;
  message?: string;
  error?: string;
}

export function getGoogleSheetsWebhookUrl(): string | null {
  return (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_MIRROR_URL ||
    null
  );
}

export function isGoogleSheetsBackendConfigured(): boolean {
  return Boolean(getGoogleSheetsWebhookUrl());
}

export async function mirrorRegistrationToGoogleSheets(
  registration: GoogleSheetsRegistration
): Promise<MirrorResult> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  if (!webhookUrl) {
    return { status: "not_configured" };
  }

  try {
    const payload = {
      action: "register",
      registration: {
        ...registration,
        memberCount: registration.memberCount || 1,
        amountPaid: registration.amountPaid ?? (registration.memberCount || 1) * 500,
        feeCalculation:
          registration.feeCalculation ||
          `${registration.memberCount || 1} x ₹500 = ₹${(registration.memberCount || 1) * 500}`,
      },
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        status: "pending",
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (data && data.success === false) {
      return {
        status: "pending",
        error: data.error || "Google Apps Script reported an error",
      };
    }

    return {
      status: "synced",
      photoUrl: data.photoUrl || undefined,
      fileId: data.fileId || undefined,
      message: data.message || "Synced with Google Apps Script",
    };
  } catch (error: any) {
    return {
      status: "pending",
      error: error?.message || String(error),
    };
  }
}
