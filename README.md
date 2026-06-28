# Agent Genia Research

Static web app for Agent Genia ecommerce research. The user writes one natural-language request on the main page; the agent infers intent and calls internal tools such as Alibaba sourcing, Meta/Amazon/TikTok research, negotiation drafting, DDP checks, and quality checks without sending the user into a separate flow.

The app can run in two modes:

- Guided static mode: works in any static host and shows the same main-page cockpit with inferred tool routing.
- Codex harness mode: Cloudflare Pages calls `/api/research`, which proxies to a private harness server that runs `codex exec` with the local Codex authentication and the local `$alibaba-sourcing-agent` skill. This is the production mode where Agent Genia decides whether to call Alibaba sourcing as an internal tool and returns results to the main page.
- Supabase production mode: users sign in with Supabase Auth, uploads are stored in Supabase Storage, and each research run is persisted in Postgres before/after the Codex harness or internal tools execute.

The main page has two ecommerce paths without changing the cockpit structure:

- `Empezar desde cero`: for beginners who only know they want to sell online.
- `Tienda Shopify`: connects one or more Shopify stores with OAuth, stores encrypted offline tokens in Cloudflare KV, and lets Agent Genia audit the real catalog without asking merchants to paste tokens.

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

The frontend reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `/api/config`. `SUPABASE_ANON_KEY` is publishable. `SUPABASE_SERVICE_ROLE_KEY` must only exist as a Cloudflare/server secret, never in frontend code.

Initial access is invite/admin-only:

1. Create a user manually in Supabase Auth.
2. Insert or update `public.profiles` with `id = auth.users.id` and `is_active = true`.
3. The user signs in from the main page with email/password.

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

Generate two secrets:

```bash
export HARNESS_TOKEN="$(openssl rand -hex 32)"
export APP_PASSWORD="$(openssl rand -hex 12)"
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
pnpm dlx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name ecom-research-agent
pnpm dlx wrangler pages secret put AUTH_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put GOOGLE_CLIENT_ID --project-name ecom-research-agent
pnpm dlx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put APP_PASSWORD --project-name ecom-research-agent
pnpm dlx wrangler pages secret put ENVIA_TOKEN --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_API_KEY --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_API_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_TOKEN_ENCRYPTION_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_INSTALL_URL --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_SCOPES --project-name ecom-research-agent
```

Optional Mexico shipping config:

```bash
pnpm dlx wrangler pages secret put SHIP_FROM_ZIP --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHIP_FROM_CITY --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHIP_FROM_STATE --project-name ecom-research-agent
```

`ENVIA_TOKEN` enables live Mexico carrier quotes through Envia.com. Without it, the unit economics tool still estimates Mexican shipping from CP, weight, and package dimensions, but marks the result as an estimate.

The Envia integration is rate-only. The Cloudflare Function only calls the quote endpoint (`/ship/rate/`) to compare shipping prices; it does not create labels, buy shipping guides, schedule pickups, or charge shipments.

`AUTH_SECRET` signs legacy browser sessions. `APP_PASSWORD` is only a legacy/testing bypass for direct API calls and is not shown in the UI. Supabase email/password is the primary production auth gate for `/api/research`, `/api/runs`, and `/api/runs/:id`.

## Browser login

The main page uses a minimal Supabase email/password gate before the agent can run. The browser sends `Authorization: Bearer <supabase_access_token>` to `/api/research`, `/api/runs`, and `/api/runs/:id`.

Google/Shopify OAuth endpoints remain in the repo for connector/login experiments, but they are not the primary production auth path for the research agent.

Configure Google OAuth with:

- Authorized JavaScript origin: `https://YOUR_PAGES_DOMAIN`
- Authorized redirect URI: `https://YOUR_PAGES_DOMAIN/api/auth/google/callback`

Login endpoints:

- `GET /api/session`: returns the current signed session, without exposing secrets.
- `GET /api/logout`: clears the signed session cookie.
- `GET /api/auth/google/start`: starts Google OAuth.
- `GET /api/auth/google/callback`: validates Google OAuth and creates the session.
- `GET /api/shopify/login`: sends the user to Shopify's own login/store selection flow.
- `GET /api/shopify/callback`: connects the Shopify store and creates the Agent Genia session.
- `GET /api/auth/shopify/start?shop=store.myshopify.com`: optional direct-shop Shopify login.
- `GET /api/auth/shopify/callback`: validates direct-shop Shopify OAuth and creates the session.

## Shopify OAuth

Create a Shopify Partner app and configure:

- App URL: `https://YOUR_PAGES_DOMAIN/`
- Allowed redirection URLs:
  - `https://YOUR_PAGES_DOMAIN/api/shopify/callback`
  - `https://YOUR_PAGES_DOMAIN/api/auth/shopify/callback`
- Scopes: `read_products`
- API version: `2026-04`
- Distribution/install link: save the Shopify Partner install link as `SHOPIFY_INSTALL_URL`.

Cloudflare endpoints:

- `GET /api/auth/shopify/start?shop=store.myshopify.com`: signs in a user through Shopify.
- `GET /api/auth/shopify/callback`: completes Shopify login and creates an Agent Genia session.
- `GET /api/shopify`: lists connected stores without exposing tokens.
- `GET /api/shopify/login`: sends the merchant to Shopify login/store selection through `SHOPIFY_INSTALL_URL`.
- `GET /api/shopify/start`: receives Shopify's selected `shop`, validates HMAC when present, then starts OAuth.
- `GET /api/shopify/connect?shop=store.myshopify.com`: starts OAuth install.
- `GET /api/shopify/callback`: validates Shopify HMAC/state, exchanges code for an access token, encrypts it, stores the shop in KV, and signs in the user.
- `POST /api/shopify`: returns a sanitized catalog snapshot for a connected store.
- `DELETE /api/shopify`: disconnects a store by deleting its KV record.

The KV binding is declared in `wrangler.toml` as `SHOPIFY_STORES`.

Deploy:

```bash
rm -rf dist
mkdir -p dist
cp index.html app.js styles.css .nojekyll _headers _redirects _routes.json dist/
pnpm dlx wrangler pages deploy dist --project-name ecom-research-agent
```

Give the public Pages URL to the intended user. They should sign in with Google or Shopify from the browser flow instead of using `APP_PASSWORD`.
