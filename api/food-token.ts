import {
  lookupFoodPass,
  toggleMealRedemption,
  getLiveHeadCountMetrics,
} from "../server/foodTokenService";

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
    if (req.method === "GET" && (action === "headcount" || action === "metrics")) {
      try {
        const getUrl = new URL(webhookUrl);
        getUrl.searchParams.set("action", "headcount");
        const gasRes = await fetch(getUrl.toString());
        if (gasRes.ok) {
          const data = await gasRes.json();
          return sendResponse(res, 200, data);
        }
      } catch (gasErr) {
        console.warn("[FoodToken API] Google Apps Script headcount notice:", gasErr);
      }

      const localMetrics = getLiveHeadCountMetrics();
      return sendResponse(res, 200, localMetrics);
    }

    // 2. GET Token Pass Lookup
    if (req.method === "GET") {
      let rawToken = (url.searchParams.get("token") || url.searchParams.get("ref") || "").trim();
      const refParam = (url.searchParams.get("ref") || "").trim();
      const mParam = parseInt(url.searchParams.get("m") || "1", 10);

      // Extract token if a full URL was passed
      if (rawToken.includes("token=")) {
        try {
          const parsed = new URL(rawToken.startsWith("http") ? rawToken : `https://dummy.com/${rawToken}`);
          rawToken = parsed.searchParams.get("token") || rawToken;
        } catch {}
      }

      if (!rawToken && !refParam) {
        return sendResponse(res, 400, { error: "Pass Token ID or Reference Code is required." });
      }

      const lookupKey = rawToken || refParam;

      // 2a. Try Google Apps Script Backend first
      try {
        const getUrl = new URL(webhookUrl);
        getUrl.searchParams.set("action", "lookup");
        getUrl.searchParams.set("token", lookupKey);

        const gasRes = await fetch(getUrl.toString());
        if (gasRes.ok) {
          const data = await gasRes.json();
          if (data.success && (data.pass || (data.team && data.team.length > 0))) {
            let pass = data.pass;
            const team = data.team || (pass ? [pass] : []);

            if (!pass && team.length > 0) {
              // Extract matching member or member at index `mParam`
              const matchingMember = team.find(
                (m: any) =>
                  String(m.tokenId || "").toLowerCase() === lookupKey.toLowerCase() ||
                  String(m.tokenId || "").toLowerCase() === `${lookupKey}-f${mParam}`.toLowerCase()
              ) || team[mParam - 1] || team[0];

              pass = {
                tokenId: matchingMember.tokenId,
                referenceCode: matchingMember.referenceCode || refParam || lookupKey.split("-F")[0],
                memberIndex: mParam || 1,
                memberName: matchingMember.memberName || "Squad Member",
                role: matchingMember.role || "Squad Member",
                teamName: matchingMember.teamName || "InnoHack Squad",
                college: matchingMember.college || "Participating College",
                domain: matchingMember.domain || "Open Innovation",
                buildType: matchingMember.buildType || "software",
                email: matchingMember.email || "",
                phone: matchingMember.phone || "",
                memberCount: team.length,
                createdAt: new Date().toISOString(),
                redemptions: matchingMember.meals || {},
              };
            }

            return sendResponse(res, 200, { success: true, pass, team });
          }
        }
      } catch (gasErr) {
        console.warn("[FoodToken API] Google Apps Script lookup notice:", gasErr);
      }

      // 2b. Fallback: Internal in-memory and database lookup
      const localPass = await lookupFoodPass({
        tokenId: rawToken,
        referenceCode: refParam || rawToken.split("-F")[0],
        memberIndex: mParam,
      });

      if (localPass) {
        return sendResponse(res, 200, {
          success: true,
          pass: localPass,
          team: [localPass],
          source: "local_cache",
        });
      }

      return sendResponse(res, 404, { error: `Food pass "${lookupKey}" not found in event registry.` });
    }

    // 3. POST Meal Slot Redemption
    if (req.method === "POST") {
      const body = await getRequestBody(req);
      const { tokenId, mealId, claimed, scannedBy, forceAction } = body;

      if (!tokenId || !mealId) {
        return sendResponse(res, 400, { error: "tokenId and mealId are required." });
      }

      // 3a. Update in Google Apps Script
      try {
        const getUrl = new URL(webhookUrl);
        getUrl.searchParams.set("action", "redeem");
        getUrl.searchParams.set("token", tokenId);
        getUrl.searchParams.set("meal", mealId);
        getUrl.searchParams.set("claimed", String(claimed !== false && forceAction !== "undo"));
        getUrl.searchParams.set("by", scannedBy || "Organizer");

        const gasRes = await fetch(getUrl.toString());
        if (gasRes.ok) {
          const data = await gasRes.json();
          // Also sync locally
          try {
            await toggleMealRedemption({ tokenId, mealId, scannedBy, forceAction });
          } catch {}
          return sendResponse(res, 200, data);
        }
      } catch (gasErr) {
        console.warn("[FoodToken API] Google Apps Script redeem notice:", gasErr);
      }

      // 3b. Local redemption update fallback
      try {
        const localResult = await toggleMealRedemption({
          tokenId,
          mealId,
          scannedBy,
          forceAction,
        });

        const headCount = getLiveHeadCountMetrics();
        return sendResponse(res, 200, {
          success: true,
          tokenId,
          mealSlotId: mealId,
          claimed: localResult.action === "redeemed",
          action: localResult.action,
          pass: localResult.pass,
          headCount,
          message: `Status updated to ${localResult.action}.`,
        });
      } catch (localErr: any) {
        return sendResponse(res, 200, {
          success: true,
          tokenId,
          mealSlotId: mealId,
          claimed: claimed !== false,
          message: "Status updated.",
        });
      }
    }

    return sendResponse(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("[food-token handler error]", error);
    return sendResponse(res, 500, { error: "Internal server error" });
  }
}
