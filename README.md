# Ecom Research Agent

Static web app for guided ecommerce opportunity research. It helps a non-technical user turn a competitor URL, brand idea, customer problem, or Shopify store into a structured ecommerce brief across Meta Ads, Amazon Reviews, TikTok organic signals, and Shopify catalog data.

The experience is split into two paths:

- Starter path: for people who want to sell online but do not yet know what to sell, who the customer is, or what steps to take first.
- Shopify path: for people who already have a store, are opening one, or want the research tied directly to Shopify catalog and product-page actions.

The app can run in two modes:

- Guided static mode: works in any static host and creates a structured research brief in the browser.
- Codex harness mode: Cloudflare Pages calls `/api/research`, which proxies to a private harness server that runs `codex exec` with the local Codex authentication on a trusted machine.
- Shopify OAuth mode: merchants install the Shopify app through OAuth, Cloudflare stores one encrypted offline token per shop in KV, and `/api/shopify` reads sanitized catalog snapshots for selected connected stores.

## Shopify OAuth connection

Shopify supports connecting many stores to one app through the OAuth authorization code grant. Each store installs the app once, then the backend stores a shop-specific access token and uses it for future catalog reads.

Create a Shopify app in the Shopify Partner dashboard or for a single merchant. Configure:

- App URL: `https://YOUR_PAGES_DOMAIN/`
- Allowed redirection URL: `https://YOUR_PAGES_DOMAIN/api/shopify/callback`
- Admin API scopes: start with `read_products`

Create a Cloudflare KV namespace and bind it to the Pages project as `SHOPIFY_STORES`. The app stores encrypted tokens in this KV namespace; the browser never sees Shopify access tokens.

Set Cloudflare Pages secrets/vars:

```bash
pnpm dlx wrangler pages secret put SHOPIFY_API_KEY --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_API_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_TOKEN_ENCRYPTION_SECRET --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_SCOPES --project-name ecom-research-agent
pnpm dlx wrangler pages secret put SHOPIFY_API_VERSION --project-name ecom-research-agent
```

Recommended values:

- `SHOPIFY_SCOPES=read_products`
- `SHOPIFY_API_VERSION=2026-04`

OAuth endpoints:

- `GET /api/shopify/connect?shop=store.myshopify.com`: redirects the merchant to Shopify install/authorization.
- `GET /api/shopify/callback`: validates Shopify HMAC/state, exchanges the code for an access token, stores the shop, then returns to the app.
- `GET /api/shopify`: lists connected shops without exposing tokens.
- `POST /api/shopify`: reads a catalog snapshot for a connected shop.
- `DELETE /api/shopify`: disconnects a shop by deleting its stored token.

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
pnpm dlx wrangler pages secret put APP_PASSWORD --project-name ecom-research-agent
```

Deploy:

```bash
rm -rf dist
mkdir -p dist
cp index.html app.js styles.css .nojekyll dist/
pnpm dlx wrangler pages deploy dist --project-name ecom-research-agent
```

Give the public Pages URL and `APP_PASSWORD` to the intended user.
