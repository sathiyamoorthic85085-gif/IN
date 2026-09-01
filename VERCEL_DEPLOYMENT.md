# Vercel Deployment Guide

InnoHack-26 is configured for deployment on **Vercel** with native Serverless Functions and local static assets.

## Deploy from GitHub

Import the repository into Vercel and keep the project root at the repository root. Vercel will detect `vercel.json` automatically.

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm vercel-build` |
| Output directory | `dist/public` |
| Node.js Version | 20.x or 22.x |

## Environment Variables

Configure the following environment variables in your Vercel Project Settings:

### Database & Security (Server-side)
```env
DATABASE_URL=mysql://<username>:<password>@<host>:<port>/<database>
REGISTRATION_ENCRYPTION_SECRET=your-32-char-random-secret
COOKIE_SECRET=your-session-cookie-secret
```

### AI Participant Help (Optional)
```env
MOONSHOT_API_KEY=your-kimi-moonshot-api-key
KIMI_MODEL=kimi-k2.6
# Or use OpenAI:
# OPENAI_API_KEY=your-openai-api-key
# OPENAI_MODEL=gpt-4o-mini
```

### Google Sheets Mirror (Optional)
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id
```

## Deploy with the Vercel CLI

```bash
pnpm install
pnpm vercel-build
vercel --prod
```

## Asset Self-Containment

All images, logos, PDF guidelines, brochure, and payment QR codes are bundled locally in `client/public/media/` and served as fast, edge-cached static assets by Vercel.
