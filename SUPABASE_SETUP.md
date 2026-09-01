# Supabase setup

The project now includes `@supabase/supabase-js` and an optional browser client at `client/src/lib/supabase.ts`.

The client reads these Vite variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

They are configured for development and Vercel through the project environment settings. The publishable key is safe for browser use; never expose a Supabase service-role key in frontend code or a `VITE_` variable.

The current production source of truth is unchanged: MySQL/TiDB with Drizzle stores registrations, the registration service encrypts sensitive values with AES-256-GCM, and the Vercel endpoints handle registration submission and health checks.

The Supabase library block command was not applied because the supplied block targets React Router while this application uses Wouter. No Supabase auth, realtime subscription, storage bucket, or database migration was requested, so adding those blocks would introduce unused routing and backend changes. When a specific Supabase feature is selected, it should be added behind the existing access and data-protection boundaries.
