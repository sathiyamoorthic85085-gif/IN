import { RegistrationServiceError, registrationInputSchema, requestClientKey, submitSecureRegistration } from "../server/registrationService";

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try { return JSON.parse(body); } catch { return null; }
}

export default async function handler(req: { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (value: unknown) => void }; setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const parsed = registrationInputSchema.safeParse(parseBody(req.body));
  if (!parsed.success) return res.status(400).json({ error: "Please complete every required registration field correctly." });
  try {
    const result = await submitSecureRegistration(parsed.data, requestClientKey(req.headers ?? {}));
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof RegistrationServiceError) return res.status(error.status).json({ error: error.message });
    console.error("[VercelRegistration] Unexpected registration error", error);
    return res.status(500).json({ error: "Registration could not be saved. Please try again." });
  }
}
