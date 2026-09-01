import { participantHelpSystemPrompt, retrieveEventKnowledge } from "./participantKnowledge";

type ProviderAnswer = { answer: string; provider: "kimi" | "openai" | "fallback" };

export function extractParticipantHelpText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const candidate = part as { text?: unknown; content?: unknown };
      if (typeof candidate.text === "string") return candidate.text;
      if (typeof candidate.content === "string") return candidate.content;
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function retrievalFallback(question: string) {
  const guidance = retrieveEventKnowledge(question)
    .slice(0, 2)
    .map((chunk) => chunk.text)
    .join("\n\n");
  return `${guidance}\n\nFor final organiser confirmation, please use the verified coordinator call action or email innohack26@gmail.com.`;
}

export function isKimiConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.MOONSHOT_API_KEY);
}

export function isOpenAIConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

async function askKimi(system: string, question: string): Promise<string> {
  const key = process.env.MOONSHOT_API_KEY;
  if (!key) return "";
  const baseUrl = (process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.KIMI_MODEL || "kimi-k2.6",
      max_tokens: 350,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Kimi provider failed: ${response.status}`);
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  return extractParticipantHelpText(body.choices?.[0]?.message?.content);
}

async function askOpenAI(system: string, question: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "";
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 350,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI provider failed: ${response.status}`);
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  return extractParticipantHelpText(body.choices?.[0]?.message?.content);
}

export async function answerParticipantQuestion(question: string): Promise<ProviderAnswer> {
  const retrieved = retrieveEventKnowledge(question);
  const system = participantHelpSystemPrompt(retrieved);

  try {
    if (isKimiConfigured()) {
      const answer = await askKimi(system, question);
      if (answer) return { answer, provider: "kimi" };
    }
    if (isOpenAIConfigured()) {
      const answer = await askOpenAI(system, question);
      if (answer) return { answer, provider: "openai" };
    }
  } catch (error) {
    console.error("[ParticipantHelp] Provider request failed", error);
  }
  return { answer: retrievalFallback(question), provider: "fallback" };
}
