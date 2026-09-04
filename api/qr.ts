import QRCode from "qrcode";

function sendResponse(res: any, status: number, data: any, contentType: string = "application/json; charset=utf-8") {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("Content-Type", contentType);

    if (typeof res.status === "function") {
      if (contentType.includes("json")) {
        if (typeof res.json === "function") {
          return res.status(status).json(data);
        }
        res.status(status);
        return res.end(JSON.stringify(data));
      }
      res.status(status);
      return res.end(data);
    }

    res.statusCode = status;
    if (contentType.includes("json")) {
      return res.end(JSON.stringify(data));
    }
    return res.end(data);
  } catch (sendErr) {
    console.error("[qr sendResponse error]", sendErr);
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
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers?.host || "localhost"}`);
    let body: any = {};
    if (req.method === "POST") {
      body = await getRequestBody(req);
    }

    const host = req.headers?.host || "innohack26.vercel.app";
    const protocol = req.headers?.["x-forwarded-proto"] || "https";
    const siteUrl = `${protocol}://${host}`;

    // Extract parameters from query or body
    const token = (url.searchParams.get("token") || body.token || "").trim();
    const ref = (url.searchParams.get("ref") || body.ref || token.split("-F")[0] || "").trim();
    const m = url.searchParams.get("m") || body.m || "1";
    const name = url.searchParams.get("name") || body.name || "";
    const team = url.searchParams.get("team") || body.team || "";
    const format = (url.searchParams.get("format") || body.format || "svg").toLowerCase(); // svg, png, json, redirect
    const size = Math.min(1000, Math.max(100, parseInt(url.searchParams.get("size") || body.size || "300", 10)));
    const darkColor = url.searchParams.get("color") || body.color || "#07111d";
    const lightColor = url.searchParams.get("bgcolor") || body.bgcolor || "#ffffff";

    // Build the payload string to encode
    let dataToEncode = (url.searchParams.get("data") || url.searchParams.get("text") || body.data || body.text || "").trim();
    
    if (!dataToEncode) {
      if (token) {
        dataToEncode = `${siteUrl}/food-token?token=${encodeURIComponent(token)}&ref=${encodeURIComponent(ref)}&m=${encodeURIComponent(m)}`;
      } else if (ref) {
        dataToEncode = `${siteUrl}/food-token?token=${encodeURIComponent(ref)}&ref=${encodeURIComponent(ref)}&team=true`;
      } else {
        dataToEncode = `${siteUrl}`;
      }
    }

    const qrOptions = {
      errorCorrectionLevel: "H" as const,
      margin: 1,
      width: size,
      color: {
        dark: darkColor.startsWith("#") ? darkColor : `#${darkColor}`,
        light: lightColor.startsWith("#") ? lightColor : `#${lightColor}`,
      },
    };

    if (format === "png") {
      const pngBuffer = await QRCode.toBuffer(dataToEncode, {
        ...qrOptions,
        type: "png",
      });
      return sendResponse(res, 200, pngBuffer, "image/png");
    }

    if (format === "json") {
      const dataUrl = await QRCode.toDataURL(dataToEncode, qrOptions);
      const svgString = await QRCode.toString(dataToEncode, { ...qrOptions, type: "svg" });
      return sendResponse(res, 200, {
        success: true,
        dataToEncode,
        qrDataUrl: dataUrl,
        qrSvg: svgString,
        attendee: {
          tokenId: token || (ref ? `${ref}-F${m}` : undefined),
          referenceCode: ref,
          memberIndex: m,
          memberName: name,
          teamName: team,
          passUrl: dataToEncode,
        },
      });
    }

    // Default: SVG format
    const svgString = await QRCode.toString(dataToEncode, {
      ...qrOptions,
      type: "svg",
    });
    return sendResponse(res, 200, svgString, "image/svg+xml");
  } catch (error: any) {
    console.error("[QR Webhook Error]", error);
    return sendResponse(res, 500, { error: "Failed to generate QR code", details: error.message });
  }
}
