# Ecom Research Agent

Static web app for guided ecommerce opportunity research. It helps a non-technical user turn a competitor URL, brand idea, or customer problem into a structured research brief across Meta Ads, Amazon Reviews, and TikTok organic signals.

The app can run in two modes:

- Guided static mode: works in any static host and creates a structured research brief in the browser.
- Codex harness mode: Cloudflare Pages calls `/api/research`, which proxies to a private harness server that runs `codex exec` with the local Codex authentication on a trusted machine.

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
