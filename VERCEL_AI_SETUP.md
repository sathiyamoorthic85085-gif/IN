# AI Participant Help Setup on Vercel

The public **ASK AI** control posts to the Vercel serverless route `/api/participant-help` (served by `api/help.ts`) with retrieval-grounded InnoHack-26 knowledge.

## Environment Variables

In **Vercel Project Settings → Environment Variables**, configure your preferred LLM provider:

### Option 1: Moonshot Kimi (Default)
| Variable | Value | Purpose |
|---|---|---|
| `MOONSHOT_API_KEY` | Your Moonshot API key | Server-only credential used by the Vercel function. |
| `KIMI_MODEL` | `kimi-k2.6` | Optional model override (defaults to `kimi-k2.6`). |
| `KIMI_BASE_URL` | `https://api.moonshot.ai/v1` | Optional API endpoint. |

### Option 2: OpenAI
| Variable | Value | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key | Server-only credential used by the Vercel function. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Optional model override (defaults to `gpt-4o-mini`). |

Do **not** place these values in `VITE_*` variables or client code. The browser only calls the serverless endpoint `/api/participant-help`.

## Offline Fallback
The system includes an offline knowledge base with official InnoHack-26 registration, fees, domains, schedule, transport, and coordinator contacts. If no API key is provided or the provider is rate-limited, the endpoint automatically returns verified event facts from the local knowledge base.
