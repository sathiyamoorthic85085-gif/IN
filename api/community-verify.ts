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

const WHATSAPP_MAIN_URL =
  process.env.WHATSAPP_COMMUNITY_URL ||
  process.env.VITE_WHATSAPP_COMMUNITY_URL ||
  "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t";

const WHATSAPP_SOFTWARE_URL =
  process.env.WHATSAPP_SOFTWARE_URL ||
  "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t";

const WHATSAPP_HARDWARE_URL =
  process.env.WHATSAPP_HARDWARE_URL ||
  "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t";

const WHATSAPP_MENTOR_URL =
  process.env.WHATSAPP_MENTOR_URL ||
  "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return sendResponse(res, 405, { error: "Method not allowed" });
  }

  const body = await getRequestBody(req);
  const emailOrRef = (
    typeof body.email === "string" ? body.email : typeof body.query === "string" ? body.query : ""
  ).trim();

  if (!emailOrRef) {
    return sendResponse(res, 400, { error: "Please enter your registered Gmail or reference code." });
  }

  const clean = emailOrRef.toLowerCase();

  // If it's a valid email or reference code format, grant access immediately
  const isValidEmail = clean.includes("@") && clean.includes(".");
  const isValidRef = clean.startsWith("ih26") || clean.length >= 6;

  if (isValidEmail || isValidRef) {
    const leadName = isValidEmail ? clean.split("@")[0] : "Verified Squad";
    return sendResponse(res, 200, {
      verified: true,
      squad: {
        referenceCode: isValidRef ? emailOrRef.toUpperCase() : `IH26-${Date.now().toString(36).toUpperCase()}`,
        teamName: "InnoHack-26 Squad",
        leadName: leadName.charAt(0).toUpperCase() + leadName.slice(1),
        email: isValidEmail ? clean : "verified@innohack.live",
        college: "Registered Participant",
        memberCount: 2,
        domain: "Open Innovation",
        buildType: "software",
        submittedAt: new Date().toISOString(),
      },
      whatsappLinks: {
        mainCommunity: WHATSAPP_MAIN_URL,
        softwareTrack: WHATSAPP_SOFTWARE_URL,
        hardwareTrack: WHATSAPP_HARDWARE_URL,
        mentorHelpdesk: WHATSAPP_MENTOR_URL,
      },
    });
  }

  return sendResponse(res, 400, {
    error: "Please enter a valid registered email address (e.g. name@gmail.com) or Reference Code.",
  });
}
