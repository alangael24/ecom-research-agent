# Agent Genia Research

Static web app for Agent Genia ecommerce research. The user writes one natural-language request on the main page; the agent infers intent and calls internal tools such as Alibaba sourcing, Meta/Amazon/TikTok research, negotiation drafting, DDP checks, and quality checks without sending the user into a separate flow.

The app can run in two modes:

- Guided static mode: works in any static host and shows the same main-page cockpit with inferred tool routing.
- Codex harness mode: Cloudflare Pages calls `/api/research`, which proxies to a private harness server that runs `codex exec` with the local Codex authentication and the local `$alibaba-sourcing-agent` skill. This is the production mode where Agent Genia decides whether to call Alibaba sourcing as an internal tool and returns results to the main page.
- Supabase production mode: users sign in with Supabase Auth, uploads are stored in Supabase Storage, and each research run is persisted in Postgres before/after the Codex harness or internal tools execute.
- Retail-to-online mode: if the prompt describes a physical store/local business trying to sell online, Agent Genia routes to an internal plan for product understanding, unit economics, TikTok organic vs paid ads, competitor/content research, and the first web build. Users can upload a digital database from the same `+` button, including CSV, Excel, JSON, SQL, SQLite/DB, inventory, sales, customer, or product files.
- Problem discovery agent: when the prompt asks to find a real problem, validate an opportunity, identify an avatar, find an underused angle, or choose a product from a pain point, the harness can return `problemDiscovery` using the `$ecom-problem-research` flow across Meta Ads, Amazon reviews, and TikTok pain-point research. If live collection is not available, it marks those sources as pending and keeps evidence separate from hypotheses.
- Brand strategy helper: when the prompt asks for a brand name, colors, palette, identity, website, landing page, or a new brand from a validated problem/niche, the harness can return `brandPlan` and `websitePlan` with name options, selected colors, hero copy, page sections, visual direction, and availability/build checks.
- Avatar research module: when the natural-language request asks for avatar research, VOC, real phrases, objections, desires, moments of use, beliefs, pains, or why-now triggers, the harness can return `avatarResearch` with evidence-labeled customer language and hypotheses. This is backend/harness-only and does not require a separate UI flow.
- Tool Factory mode: when a merchant asks for an app, widget, plugin, or paid-tool replacement, Agent Genia returns a platform-aware MVP blueprint. Shopify can publish supported theme/Page tools today; Tiendanube and WooCommerce currently contribute connected catalog context and require their own runtime before native publishing.
- Product customization helper: when the prompt asks for a custom/private-label product, packaging, logo, variants, materials, inserts, or unboxing, the harness can return `customizationPlan` with product variants, packaging options, MOQ/cost/shipping tradeoffs, supplier questions, sample steps, and an English Alibaba supplier brief.

The main page has two ecommerce paths without changing the cockpit structure:

- `Empezar desde cero`: for beginners who only know they want to sell online.
- `Tienda conectada`: connects Shopify, Tiendanube, or WooCommerce stores and lets Agent Genia audit real catalog, prices, inventory/status, and product mix without asking merchants to paste catalog data into the prompt.
- `Analizar marca`: uses existing brand context and optional connected catalog data. When the prompt asks for positioning, differentiation, competitors, or an "espacio libre", the backend returns a `brand_whitespace` report with whitespace hypotheses, evidence coverage, angle/whitespace verdicts, risks, and a validation plan.

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
pnpm dlx wrangler pages secret put TIENDANUBE_CLIENT_ID --project-name ecom-research-agent
pnpm dlx wrangler pages secret put TIENDANUBE_CLIENT_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put TIENDANUBE_USER_AGENT --project-name ecom-research-agent
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

- `agentgenia_tool_factory`: platform-aware mini-tool planner. Shopify supports selected theme template block installs on existing landing pages; Tiendanube/WooCommerce are catalog-aware planning adapters until native publishing runtime is added.
- `brand_whitespace_tool`: existing-brand whitespace hypotheses from declared brand context, attachments, and connected catalog data, including the internal Angle/Whitespace Validator.
- `shopify_page_builder`: creates an approved Shopify Page draft and lets the user publish it through `/api/shopify/pages`.
- `retail-to-online-agent`: converts a physical/local retail prompt into product understanding, unit economics, channel choice, first content sprint, first web plan, and database/inventory signals.
- `shipping_rate_quote`: rate-only Envia shipping quotes when a shipping-only intent is detected.
- `unit_economics_filter`: beginner-friendly profitability filter for non-brand-stage ideas.

Harness-routed tools include `problem-discovery-agent`, `product-customization-agent`, `brand strategy helper`, `websitePlan`, and `$alibaba-sourcing-agent`. These stay inside the main page and return structured sections such as `problemDiscovery`, `customizationPlan`, `brandPlan`, `websitePlan`, supplier shortlists, negotiation drafts, DDP checks, quality plans, and next steps.

For harness responses, the frontend must not fill missing agent sections with local guided/demo data. If the harness omits `problemDiscovery`, `customizationPlan`, `supplierShortlist`, `negotiationPlan`, `ddpPlan`, or `qualityPlan`, the UI shows that the section was not returned instead of simulating a complete result.

`agentgenia_tool_factory` identifies the smallest native Shopify MVP that can replace the merchant's actual job-to-be-done, plus the cases where a third-party app is still safer because of deliverability, compliance, fraud, payments, carrier labels, or enterprise support. It treats paid apps as jobs-to-be-done, not as brands to clone.

For supported low-risk categories, `POST /api/shopify/tools` installs a native Agent Genia section into the store's main theme by writing `sections/agent-genia-tool.liquid`, creating/updating a Page JSON template, and assigning the target Shopify Page to that template. Current theme-template categories include simple quiz/recommendation tools, support/trust hubs, landing/section-builder outputs, lightweight social-proof blocks, lead-capture blocks, returns/post-purchase forms, and generic ecommerce helper blocks. Installed Tool Factory mini-tools are registered in the Shopify KV namespace so Agent Genia can list what already exists for a store. Deep categories such as email/SMS retention, pixels/analytics, checkout, discounts, bundles, loyalty, subscriptions, and advanced search remain blueprint-only until Agent Genia has the right Shopify extension/function/provider runtime for them.

Each Tool Factory report now includes an `appReplacement` decision with:

- `publishMode`: `theme_template_block`, `theme_app_extension`, `shopify_function`, `web_pixel_extension`, `provider_integration`, or `provider_required`.
- `canCreateNow`: whether the current theme-template runtime can install the tool on a target LP today.
- `buildOrBuyDecision`: when Agent Genia should build, integrate, validate first, or keep a third-party app.
- `firstVersion` and `upgradePath`: the smallest useful version and the runtime path if it proves valuable.

Tool Factory reports also include a `toolSpec` contract. This is the executable shape of the mini-tool: target surface/runtime, primary action, success metric, data destination, fields, blocks, automation rules, safety checks, and upgrade path. The theme-template runtime renders this spec into the Agent Genia section settings, and the registry stores it with the installed mini-tool.

When Shopify is connected, the browser includes the store's registered Agent Genia mini-tools in the `/api/research` payload. Tool Factory uses that registry context to avoid duplicating work: if a matching active/paused mini-tool already exists, the agent recommends iterating, reactivating, pausing, or archiving the existing tool before creating another one. The user can stay in natural language: prompts such as "actualiza esta herramienta existente", "pausa esta herramienta", "archivala", "publicala en mi Shopify", or "agrega una seccion de reviews a /pages/mi-landing" let `/api/research` call the internal Shopify tool endpoint. `PATCH /api/shopify/tools` can update lifecycle status only, or accept a fresh Tool Factory report for registered tools. `POST /api/shopify/tools` installs the section into the target Page template when a `targetPage` id, handle, or `/pages/...` URL is provided; it stores the previous theme/template state in KV before calling `themeFilesUpsert` and `pageUpdate`. For Tiendanube and WooCommerce, Tool Factory can use catalog context and produce a build plan, but it must not claim native publishing until a platform-specific writer exists.

`brand_whitespace_tool` labels output as hypotheses. Its Angle/Whitespace Validator classifies each angle as `explotado`, `debil`, `libre_necesita_test`, or `no_recomendado`, then recommends the next landing/PDP/creative test and the decision rule. It does not perform live Meta Ads, Amazon review, or TikTok collection by itself; use the deeper competitive research harness/skills to confirm demand, saturation, and customer language.

The Codex harness can also return `angleWhitespaceValidator` inside the normal brand audit schema when the user asks for angles, saturation, positioning, whitespace, or competitor comparison. This stays as an internal agent tool; the frontend renders it inside the existing natural-language report instead of sending the user to a separate page.

Internal tool smoke test:

```bash
node test/internal-tools.mjs
```

The test calls `/api/research` module handlers directly with `x-app-password`, verifies direct tools (`unit_economics_filter`, `shipping_rate_quote`, `retail-to-online-agent`, `brand_whitespace_tool`, `agentgenia_tool_factory`, `shopify_page_builder`), starts a fake harness to verify harness-routed tools (`problem-discovery-agent`, `product-customization-agent`, `alibaba-sourcing-agent`, `brand-audit-agent`, `shopify-store-audit`), and checks that the frontend does not use local simulated fallbacks for real harness responses.

## MVP login mode

By default the app can show the main page without forcing Supabase email/password login. It no longer treats the local guided report as a successful agent run. Submitting a prompt requires either a Supabase session or a signed legacy OAuth cookie from Google/Shopify/Tiendanube; otherwise the browser sends the user to `/login`.

Set `AUTH_REQUIRED=true` when you want production private mode with Supabase users, saved runs, uploads, and history. In that mode the browser sends `Authorization: Bearer <supabase_access_token>` to `/api/research`, `/api/runs`, and `/api/runs/:id`.

When `AUTH_REQUIRED` is not `true`, Google/Shopify/Tiendanube OAuth can still create a signed `agent_genia_session` cookie. `/api/research` accepts that cookie and runs in stateless mode: it can execute internal tools or call the Codex harness, but it does not persist history, attachments, suppliers, or runs to Supabase.

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

Commerce connector endpoints:

- `GET /api/commerce`: lists connected Shopify, Tiendanube, and WooCommerce stores without exposing tokens/secrets.
- `POST /api/commerce`: returns a normalized catalog snapshot for a connected store. Body: `{ "platform": "shopify|tiendanube|woocommerce", "id": "..." }`.
- `DELETE /api/commerce`: disconnects a store. Shopify delegates to the legacy Shopify KV delete path.
- `GET /api/commerce/tiendanube/start`: starts Tiendanube OAuth.
- `GET /api/commerce/tiendanube/callback`: exchanges the OAuth code, stores the encrypted access token, and returns to the main cockpit.
- `POST /api/commerce/woocommerce`: connects WooCommerce from site URL plus REST API consumer key/secret, validates `/wp-json/wc/v3/products`, then stores the encrypted consumer secret.

Tiendanube/Nuvemshop connector setup:

- Create a Tiendanube/Nuvemshop app and configure the redirect URL: `https://YOUR_PAGES_DOMAIN/api/commerce/tiendanube/callback`.
- Secrets: `TIENDANUBE_CLIENT_ID`, `TIENDANUBE_CLIENT_SECRET`, and `TIENDANUBE_USER_AGENT`.
- Optional overrides: `TIENDANUBE_AUTHORIZE_URL`, `TIENDANUBE_TOKEN_URL`, `TIENDANUBE_API_BASE_URL`, `TIENDANUBE_API_VERSION`.

WooCommerce connector setup:

- In WordPress/WooCommerce, create REST API keys with product read permission.
- The frontend asks for store URL, consumer key, and consumer secret. The Worker validates over HTTPS against `/wp-json/wc/v3/products`.

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

The KV binding is declared in `wrangler.toml` as `SHOPIFY_STORES`. Shopify keeps the legacy `shopify:store:*` records; Tiendanube and WooCommerce use `commerce:store:*` records in the same namespace with encrypted access tokens/secrets.

Deploy:

```bash
rm -rf dist
mkdir -p dist
cp index.html app.js styles.css .nojekyll _headers _redirects _routes.json dist/
pnpm dlx wrangler pages deploy dist --project-name ecom-research-agent
```

Give the public Pages URL to the intended user. They should sign in with Google or Shopify from the browser flow instead of using `APP_PASSWORD`.
