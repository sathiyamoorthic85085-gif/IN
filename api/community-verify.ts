import { lookupRegisteredParticipant } from "../server/registrationService";

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === "object" && !Buffer.isBuffer(body)) return body as Record<string, unknown>;
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8"));
    } catch {
      return {};
    }
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return {};
}

const WHATSAPP_MAIN_URL =
  process.env.WHATSAPP_COMMUNITY_URL ||
  process.env.VITE_WHATSAPP_COMMUNITY_URL ||
  "https://chat.whatsapp.com/J3tG21eInnoHack26CommunityOfficial";

const WHATSAPP_SOFTWARE_URL =
  process.env.WHATSAPP_SOFTWARE_URL ||
  "https://chat.whatsapp.com/InnoHack26SoftwareTrackOfficial";

const WHATSAPP_HARDWARE_URL =
  process.env.WHATSAPP_HARDWARE_URL ||
  "https://chat.whatsapp.com/InnoHack26HardwareTrackOfficial";

const WHATSAPP_MENTOR_URL =
  process.env.WHATSAPP_MENTOR_URL ||
  "https://chat.whatsapp.com/InnoHack26MentorSupportOfficial";

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (value: unknown) => void };
    setHeader: (name: string, value: string) => void;
  }
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req.body);
  const emailOrRef = (
    typeof body.email === "string" ? body.email : typeof body.query === "string" ? body.query : ""
  ).trim();

  if (!emailOrRef) {
    return res.status(400).json({ error: "Please enter your registered Gmail or reference code." });
  }

  try {
    const squad = await lookupRegisteredParticipant(emailOrRef);
    if (!squad) {
      return res.status(404).json({
        error: "No registered squad was found with this email. Please ensure you registered at /register first.",
      });
    }

    return res.status(200).json({
      verified: true,
      squad: {
        referenceCode: squad.referenceCode,
        teamName: squad.teamName,
        leadName: squad.leadName,
        email: squad.email,
        college: squad.college,
        memberCount: squad.memberCount,
        domain: squad.domain,
        buildType: squad.buildType,
        submittedAt: squad.submittedAt,
      },
      whatsappLinks: {
        mainCommunity: WHATSAPP_MAIN_URL,
        softwareTrack: WHATSAPP_SOFTWARE_URL,
        hardwareTrack: WHATSAPP_HARDWARE_URL,
        mentorHelpdesk: WHATSAPP_MENTOR_URL,
      },
    });
  } catch (error) {
    console.error("[CommunityVerify] Error verifying participant:", error);
    return res.status(500).json({ error: "Unable to verify community access. Please try again." });
  }
}
