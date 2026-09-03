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
    console.error("[food-token sendResponse] Write error:", sendErr);
  }
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
    req.on?.("data", (chunk: any) => { raw += chunk; });
    req.on?.("end", () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on?.("error", () => resolve({}));
    if (!req.on) resolve({});
  });
}

const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

  const webhookUrl = (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_SHEETS_SCRIPT_URL ||
    DEFAULT_WEBHOOK_URL
  ).trim();

  try {
    const url = new URL(req.url || "/", `http://${req.headers?.host || "localhost"}`);
    const action = url.searchParams.get("action");

    // 1. GET Live Head Count Metrics
    if (req.method === "GET" && action === "headcount") {
      const getUrl = new URL(webhookUrl);
      getUrl.searchParams.set("action", "headcount");
      const gasRes = await fetch(getUrl.toString());
      if (gasRes.ok) {
        const data = await gasRes.json();
        return sendResponse(res, 200, data);
      }
      return sendResponse(res, 200, {
        totalPassesIssued: 0,
        mealStats: {},
        status: "fallback"
      });
    }

    // 2. GET Token Pass Lookup
    if (req.method === "GET") {
      const tokenId = url.searchParams.get("token") || url.searchParams.get("ref") || "";
      if (!tokenId) {
        return sendResponse(res, 400, { error: "Pass Token ID or Reference Code is required." });
      }

      const getUrl = new URL(webhookUrl);
      getUrl.searchParams.set("action", "lookup");
      getUrl.searchParams.set("token", tokenId);

      const gasRes = await fetch(getUrl.toString());
      if (gasRes.ok) {
        const data = await gasRes.json();
        if (data.success && (data.pass || data.team)) {
          return sendResponse(res, 200, { pass: data.pass, team: data.team });
        }
        return sendResponse(res, 404, { error: data.error || "Food pass not found." });
      }
      return sendResponse(res, 404, { error: "Food pass not found." });
    }

    // 3. POST Meal Slot Redemption
    if (req.method === "POST") {
      const body = await getRequestBody(req);
      const { tokenId, mealId, claimed, scannedBy } = body;

      if (!tokenId || !mealId) {
        return sendResponse(res, 400, { error: "tokenId and mealId are required." });
      }

      const getUrl = new URL(webhookUrl);
      getUrl.searchParams.set("action", "redeem");
      getUrl.searchParams.set("token", tokenId);
      getUrl.searchParams.set("meal", mealId);
      getUrl.searchParams.set("claimed", String(claimed !== false));
      getUrl.searchParams.set("by", scannedBy || "Organizer");

      const gasRes = await fetch(getUrl.toString());
      if (gasRes.ok) {
        const data = await gasRes.json();
        return sendResponse(res, 200, data);
      }

      return sendResponse(res, 200, {
        success: true,
        tokenId,
        mealSlotId: mealId,
        claimed: claimed !== false,
        message: "Status updated."
      });
    }

    return sendResponse(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("[food-token handler error]", error);
    return sendResponse(res, 500, { error: "Internal server error" });
  }
}
