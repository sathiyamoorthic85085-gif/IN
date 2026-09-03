function sendResponse(res: any, status: number, data: any) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== "GET") {
    return sendResponse(res, 405, { ok: false, error: "Method not allowed" });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec";

  return sendResponse(res, 200, {
    ok: true,
    service: "InnoHack-26 Event API",
    status: "healthy",
    googleSheetsMirror: Boolean(webhookUrl),
    timestamp: new Date().toISOString()
  });
}
