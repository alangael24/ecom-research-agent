# Agent Genia Research

Static web app for Agent Genia ecommerce research. The user writes one natural-language request on the main page; the agent infers intent and calls internal tools such as Alibaba sourcing, Meta/Amazon/TikTok research, negotiation drafting, DDP checks, and quality checks without sending the user into a separate flow.

The app can run in two modes:

- Guided static mode: works in any static host and shows the same main-page cockpit with inferred tool routing.
- Codex harness mode: Cloudflare Pages calls `/api/research`, which proxies to a private harness server that runs `codex exec` with the local Codex authentication and the local `$alibaba-sourcing-agent` skill. This is the production mode where Agent Genia decides whether to call Alibaba sourcing as an internal tool and returns results to the main page.
- Supabase production mode: users sign in with Supabase Auth, uploads are stored in Supabase Storage, and each research run is persisted in Postgres before/after the Codex harness or internal tools execute.
- Retail-to-online mode: if the prompt describes a physical store/local business trying to sell online, Agent Genia routes to an internal plan for product understanding, unit economics, TikTok organic vs paid ads, competitor/content research, and the first web build. Users can upload a digital database from the same `+` button, including CSV, Excel, JSON, SQL, SQLite/DB, inventory, sales, customer, or product files.
- Problem discovery agent: when the prompt asks to find a real problem, validate an opportunity, identify an avatar, find an underused angle, or choose a product from a pain point, the harness can return `problemDiscovery` using the `$ecom-problem-research` flow across Meta Ads, Amazon reviews, and TikTok pain-point research. If live collection is not available, it marks those sources as pending and keeps evidence separate from hypotheses.
- Brand strategy helper: when the prompt asks for a brand name, colors, palette, identity, website, landing page, or a new brand from a validated problem/niche, the harness can return `brandPlan` and `websitePlan` with name options, selected colors, hero copy, page sections, visual direction, and availability/build checks.
- Tool Factory mode: when a merchant asks for an app, widget, plugin, or paid-tool replacement, Agent Genia returns a native Shopify MVP blueprint using app extensions, theme blocks, pixels, functions, metafields/metaobjects, and Agent Genia configuration before recommending another subscription.
- Product customization helper: when the prompt asks for a custom/private-label product, packaging, logo, variants, materials, inserts, or unboxing, the harness can return `customizationPlan` with product variants, packaging options, MOQ/cost/shipping tradeoffs, supplier questions, sample steps, and an English Alibaba supplier brief.

The main page has two ecommerce paths without changing the cockpit structure:

- `Empezar desde cero`: for beginners who only know they want to sell online.
- `Tienda Shopify`: connects one or more Shopify stores with OAuth, stores encrypted offline tokens in Cloudflare KV, and lets Agent Genia audit the real catalog without asking merchants to paste tokens.
- `Analizar marca`: uses existing brand context and optional Shopify catalog data. When the prompt asks for positioning, differentiation, competitors, or an "espacio libre", the backend returns a `brand_whitespace` report with whitespace hypotheses, evidence coverage, risks, and a validation plan.

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

Internal tools currently handled directly by `/api/research`:

- `agentgenia_tool_factory`: native Shopify mini-tool planner that can install selected mini-tools as theme template blocks on existing Shopify landing pages.
- `brand_whitespace_tool`: existing-brand whitespace hypotheses from declared brand context, attachments, and connected Shopify catalog data.
- `shopify_page_builder`: creates an approved Shopify Page draft and lets the user publish it through `/api/shopify/pages`.
- `shipping_rate_quote`: rate-only Envia shipping quotes when a shipping-only intent is detected.
- `unit_economics_filter`: beginner-friendly profitability filter for non-brand-stage ideas.

Harness-routed tools include `problem-discovery-agent`, `product-customization-agent`, `brand strategy helper`, `websitePlan`, and `$alibaba-sourcing-agent`. These stay inside the main page and return structured sections such as `problemDiscovery`, `customizationPlan`, `brandPlan`, `websitePlan`, supplier shortlists, negotiation drafts, DDP checks, quality plans, and next steps.

`agentgenia_tool_factory` identifies the smallest native Shopify MVP that can replace the merchant's actual job-to-be-done, plus the cases where a third-party app is still safer because of deliverability, compliance, fraud, payments, carrier labels, or enterprise support. It treats paid apps as jobs-to-be-done, not as brands to clone.

For supported low-risk categories, `POST /api/shopify/tools` installs a native Agent Genia section into the store's main theme by writing `sections/agent-genia-tool.liquid`, creating/updating a Page JSON template, and assigning the target Shopify Page to that template. Current theme-template categories include simple quiz/recommendation tools, support/trust hubs, landing/section-builder outputs, lightweight social-proof blocks, lead-capture blocks, returns/post-purchase forms, and generic ecommerce helper blocks. Installed Tool Factory mini-tools are registered in the Shopify KV namespace so Agent Genia can list what already exists for a store. Deep categories such as email/SMS retention, pixels/analytics, checkout, discounts, bundles, loyalty, subscriptions, and advanced search remain blueprint-only until Agent Genia has the right Shopify extension/function/provider runtime for them.

Each Tool Factory report now includes an `appReplacement` decision with:

- `publishMode`: `theme_template_block`, `theme_app_extension`, `shopify_function`, `web_pixel_extension`, `provider_integration`, or `provider_required`.
- `canCreateNow`: whether the current theme-template runtime can install the tool on a target LP today.
- `buildOrBuyDecision`: when Agent Genia should build, integrate, validate first, or keep a third-party app.
- `firstVersion` and `upgradePath`: the smallest useful version and the runtime path if it proves valuable.

Tool Factory reports also include a `toolSpec` contract. This is the executable shape of the mini-tool: target surface/runtime, primary action, success metric, data destination, fields, blocks, automation rules, safety checks, and upgrade path. The theme-template runtime renders this spec into the Agent Genia section settings, and the registry stores it with the installed mini-tool.

When Shopify is connected, the browser includes the store's registered Agent Genia mini-tools in the `/api/research` payload. Tool Factory uses that registry context to avoid duplicating work: if a matching active/paused mini-tool already exists, the agent recommends iterating, reactivating, pausing, or archiving the existing tool before creating another one. The user can stay in natural language: prompts such as "actualiza esta herramienta existente", "pausa esta herramienta", "archivala", "publicala en mi Shopify", or "agrega una seccion de reviews a /pages/mi-landing" let `/api/research` call the internal Shopify tool endpoint. `PATCH /api/shopify/tools` can update lifecycle status only, or accept a fresh Tool Factory report for registered tools. `POST /api/shopify/tools` installs the section into the target Page template when a `targetPage` id, handle, or `/pages/...` URL is provided; it stores the previous theme/template state in KV before calling `themeFilesUpsert` and `pageUpdate`.

`brand_whitespace_tool` labels output as hypotheses. It does not perform live Meta Ads, Amazon review, or TikTok collection by itself; use the deeper competitive research harness/skills to confirm demand, saturation, and customer language.

## MVP login mode

By default the app runs as an MVP without forcing email/password login. If Supabase is not configured, or if `AUTH_REQUIRED` is not set to `true`, the main page opens directly and uses the local guided agent/report flow.

Set `AUTH_REQUIRED=true` when you want production private mode with Supabase users, saved runs, uploads, and history. In that mode the browser sends `Authorization: Bearer <supabase_access_token>` to `/api/research`, `/api/runs`, and `/api/runs/:id`.

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
- `POST /api/shopify/pages`: creates a real Shopify Online Store page after the user approves the preview.
- `GET /api/shopify/tools?shop=store.myshopify.com`: lists Agent Genia mini-tools registered for a connected Shopify store.
- `POST /api/shopify/tools`: installs a Tool Factory mini-tool as a native theme template block on a target Shopify Page and records it as an installed mini-tool.
- `PATCH /api/shopify/tools`: changes an installed mini-tool status to `active`, `paused`, or `archived`.
- `GET /api/auth/shopify/start?shop=store.myshopify.com`: optional direct-shop Shopify login.
- `GET /api/auth/shopify/callback`: validates direct-shop Shopify OAuth and creates the session.

## Shopify OAuth

Create a Shopify Partner app and configure:

- App URL: `https://YOUR_PAGES_DOMAIN/`
- Allowed redirection URLs:
  - `https://YOUR_PAGES_DOMAIN/api/shopify/callback`
  - `https://YOUR_PAGES_DOMAIN/api/auth/shopify/callback`
- Scopes: `read_products,read_content,write_content,read_themes,write_themes`
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
- `POST /api/shopify/pages`: publishes an approved Agent Genia page draft to Shopify Pages.
- `GET /api/shopify/tools?shop=store.myshopify.com`: lists registered Agent Genia mini-tools for the store.
- `POST /api/shopify/tools`: installs an approved Tool Factory mini-tool as a theme template block on the target Shopify Page, then persists a public mini-tool record in KV.
- `PATCH /api/shopify/tools`: updates mini-tool lifecycle status in KV without deleting Shopify content.
- `DELETE /api/shopify`: disconnects a store by deleting its KV record.

If `read_themes`/`write_themes` are added after a store was already connected, the merchant must reconnect/reinstall the Shopify app so Shopify grants a token with the new scopes. Shopify also requires `write_themes` authorization for apps that modify theme files.

The KV binding is declared in `wrangler.toml` as `SHOPIFY_STORES`.

Deploy:

```bash
rm -rf dist
mkdir -p dist
cp index.html app.js styles.css .nojekyll _headers _redirects _routes.json dist/
pnpm dlx wrangler pages deploy dist --project-name ecom-research-agent
```

Give the public Pages URL to the intended user. They should sign in with Google or Shopify from the browser flow instead of using `APP_PASSWORD`.
