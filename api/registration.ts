import {
  RegistrationServiceError,
  registrationInputSchema,
  requestClientKey,
  submitSecureRegistration,
} from "../server/registrationService";

function parseBody(body: unknown): unknown {
  if (!body) return {};
  if (typeof body === "object" && !Buffer.isBuffer(body)) return body;
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8"));
    } catch {
      return {};
    }
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (value: unknown) => void };
    setHeader: (name: string, value: string) => void;
  }
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = parseBody(req.body);
  const parsed = registrationInputSchema.safeParse(rawBody);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message =
      firstIssue?.message || "Please complete every required registration field correctly.";
    return res.status(400).json({ error: message });
  }

  try {
    const clientKey = requestClientKey(req.headers ?? {});
    const result = await submitSecureRegistration(parsed.data, clientKey);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof RegistrationServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("[VercelRegistration] Unexpected registration error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Registration could not be saved. Please try again.",
    });
  }
}
