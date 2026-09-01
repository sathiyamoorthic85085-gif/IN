import { answerParticipantQuestion } from "../server/participantHelpService";

function messageFromBody(body: unknown): string {
  if (typeof body === "string") {
    try { return messageFromBody(JSON.parse(body)); } catch { return ""; }
  }
  if (!body || typeof body !== "object") return "";
  const message = (body as { message?: unknown }).message;
  return typeof message === "string" ? message.trim() : "";
}

export default async function handler(req: { method?: string; body?: unknown }, res: { status: (code: number) => { json: (value: unknown) => void }; setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const message = messageFromBody(req.body);
  if (message.length < 2 || message.length > 600) return res.status(400).json({ error: "Enter a participant-help question between 2 and 600 characters." });
  const result = await answerParticipantQuestion(message);
  return res.status(200).json(result);
}
