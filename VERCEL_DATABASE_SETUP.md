# Vercel Database Setup

The registration API handler at `api/registration.ts` uses `server/registrationService.ts` and `server/db.ts` with `DATABASE_URL`.

## Required Environment Variables

In your Vercel project settings, add the following environment variables:

```env
DATABASE_URL=mysql://<username>:<password>@<host>:<port>/<database>
REGISTRATION_ENCRYPTION_SECRET=<random-32-char-string>
COOKIE_SECRET=<random-secret-for-session-cookies>
```

### Encryption Key
`REGISTRATION_ENCRYPTION_SECRET` is used for AES-256-GCM encryption of sensitive participant information before storing it in the database.

## Health Check
The `/api/health` serverless endpoint verifies the database connection status.
