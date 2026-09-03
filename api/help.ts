import { answerParticipantQuestion } from "../server/participantHelpService";

function messageFromBody(body: unknown): string {
  if (typeof body === "string") {
    try { return messageFromBody(JSON.parse(body)); } catch { return ""; }
  }
  if (!body || typeof body !== "object") return "";
  const message = (body as { message?: unknown }).message;
  return typeof message === "string" ? message.trim() : "";
}

function sendResponse(res: any, status: number, data: any) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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
    console.error("[help sendResponse] Write error:", sendErr);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendResponse(res, 405, { error: "Method not allowed" });
  }

  const message = messageFromBody(req.body);
  if (message.length < 2 || message.length > 600) {
    return sendResponse(res, 400, { error: "Enter a participant-help question between 2 and 600 characters." });
  }

  try {
    const result = await answerParticipantQuestion(message);
    return sendResponse(res, 200, result);
  } catch (err) {
    return sendResponse(res, 200, {
      answer: "For immediate registration and event queries, please reach out via our official WhatsApp community or email innohack26@gmail.com.",
      provider: "fallback"
    });
  }
}
