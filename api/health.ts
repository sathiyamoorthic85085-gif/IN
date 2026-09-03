type Request = { method?: string };
type Response = {
  status: (code: number) => Response;
  setHeader: (name: string, value: string) => void;
  json: (value: unknown) => void;
};

export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbzhhyU-nkNr0tDTjK-OUeUbRGSDejmhx9kPgzJ7ecz8Hut2lmPlAVzal-IdfxuzXqf8dA/exec";

  return res.status(200).json({
    ok: true,
    service: "InnoHack-26 Event API",
    status: "healthy",
    googleSheetsMirror: Boolean(webhookUrl),
    timestamp: new Date().toISOString()
  });
}
