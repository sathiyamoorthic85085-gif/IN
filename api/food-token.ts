import {
  getLiveHeadCountMetrics,
  lookupFoodPass,
  toggleMealRedemption,
} from "../server/foodTokenService";

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

export default async function handler(req: any, res: any) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers?.host || "localhost"}`);
    const action = url.searchParams.get("action");

    // 1. GET /api/food-token?action=headcount (Organiser Live Head Count metrics)
    if (req.method === "GET" && action === "headcount") {
      const metrics = getLiveHeadCountMetrics();
      return sendResponse(res, 200, metrics);
    }

    // 2. GET /api/food-token?token=... or ?ref=...&m=... (Lookup token pass)
    if (req.method === "GET") {
      const tokenId = url.searchParams.get("token") || undefined;
      const ref = url.searchParams.get("ref") || undefined;
      const mStr = url.searchParams.get("m");
      const memberIndex = mStr ? parseInt(mStr, 10) : undefined;

      if (!tokenId && !ref) {
        return sendResponse(res, 400, { error: "Pass Token ID or Reference Code is required." });
      }

      const pass = await lookupFoodPass({ tokenId, referenceCode: ref, memberIndex });
      if (!pass) {
        return sendResponse(res, 404, { error: "Food pass not found for the requested reference." });
      }

      return sendResponse(res, 200, { pass });
    }

    // 3. POST /api/food-token (Toggle meal redemption by Organiser)
    if (req.method === "POST") {
      const body = await getRequestBody(req);
      const { tokenId, mealId, scannedBy, forceAction } = body;

      if (!tokenId || !mealId) {
        return sendResponse(res, 400, { error: "tokenId and mealId are required." });
      }

      const result = await toggleMealRedemption({
        tokenId,
        mealId,
        scannedBy: scannedBy || "Catering Desk Organiser",
        forceAction,
      });

      const metrics = getLiveHeadCountMetrics();

      return sendResponse(res, 200, {
        success: true,
        pass: result.pass,
        action: result.action,
        headCount: metrics,
      });
    }

    return sendResponse(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("[api/food-token] Fatal error:", error);
    return sendResponse(res, 500, {
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}
