# Agent Genia Research

Static web app for Agent Genia ecommerce research. The user writes one natural-language request on the main page; the agent infers intent and calls internal tools such as Alibaba sourcing, Meta/Amazon/TikTok research, negotiation drafting, DDP checks, and quality checks without sending the user into a separate flow.

The app can run in two modes:

- Guided static mode: works in any static host and shows the same main-page cockpit with inferred tool routing.
- Codex harness mode: Cloudflare Pages calls `/api/research`, which proxies to a private harness server that runs `codex exec` with the local Codex authentication and the local `$alibaba-sourcing-agent` skill. This is the production mode where Agent Genia decides whether to call Alibaba sourcing as an internal tool and returns results to the main page.
- Supabase production mode: users sign in with Supabase Auth, uploads are stored in Supabase Storage, and each research run is persisted in Postgres before/after the Codex harness executes.

## Supabase

Production Supabase project:

```text
agent-genia-prod
Project ref: jzwdskeqqfptazvrwgpm
Region: us-east-1
URL: https://jzwdskeqqfptazvrwgpm.supabase.co
```

Schema and RLS live in:

```bash
supabase/migrations/20260628125100_agent_genia_core.sql
```

The app expects these Cloudflare variables/secrets:

```bash
SUPABASE_URL=https://jzwdskeqqfptazvrwgpm.supabase.co
SUPABASE_ANON_KEY=sb_publishable_SZmpi6Vup0D4kFPdcldpag_YzNUzxxh
SUPABASE_SERVICE_ROLE_KEY=... # optional for admin/server maintenance, never frontend
```

`SUPABASE_ANON_KEY` is a publishable key and is safe for frontend config. The app writes research data with the user's Supabase access token, so RLS owns access control. If you add `SUPABASE_SERVICE_ROLE_KEY` for admin jobs, configure it only in Cloudflare/harness server environments and never expose it in frontend code.

Initial access is invite/admin-only:

1. Create a user manually in Supabase Auth.
2. Insert or update `public.profiles` with `id = auth.users.id` and `is_active = true`.
3. The user can then sign in from the main page with email/password.

Activation SQL:

```sql
insert into public.profiles (id, email, is_active)
values ('<auth-user-id>', '<email>', true)
on conflict (id) do update set
  email = excluded.email,
  is_active = true,
  updated_at = now();
```

## Local skill

This machine has the production sourcing skill installed at:

```bash
~/.codex/skills/alibaba-sourcing-agent
```

The harness prompt invokes `$alibaba-sourcing-agent`. If the harness runs on another machine, install or copy that skill there first.

## Local harness

Generate the harness token:

```bash
export HARNESS_TOKEN="$(openssl rand -hex 32)"
```

Run the harness on the trusted machine where `codex` is logged in:

```bash
HARNESS_TOKEN="$HARNESS_TOKEN" node server/harness-server.mjs
```

Expose it through Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8788
```

Use the generated `https://*.trycloudflare.com` URL as `HARNESS_URL`.

## Cloudflare Pages

Set Cloudflare Pages secrets:

```bash
pnpm dlx wrangler pages secret put HARNESS_URL --project-name ecom-research-agent
pnpm dlx wrangler pages secret put HARNESS_TOKEN --project-name ecom-research-agent
```

Deploy:

```bash
rm -rf dist
mkdir -p dist
cp index.html app.js styles.css .nojekyll dist/
pnpm dlx wrangler pages deploy dist --project-name ecom-research-agent
```

Give the public Pages URL to invited users after their Supabase Auth account is active.
