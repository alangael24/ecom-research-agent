import {
  isValidShopDomain,
  json,
  normalizeShopifyDomain,
  redirect,
  requireShopifyConfig,
  verifyShopifyHmac,
} from "../../_lib/shopify.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const url = new URL(request.url);
  const shop = normalizeShopifyDomain(url.searchParams.get("shop"));
  if (!isValidShopDomain(shop)) {
    return json({ ok: false, code: "invalid_shop", message: "Shopify did not provide a valid shop." }, 400);
  }

  const hasShopifySignature = url.searchParams.has("hmac") || url.searchParams.has("timestamp");
  if (hasShopifySignature && !(await verifyShopifyHmac(env, request.url))) {
    return json({ ok: false, code: "invalid_shopify_signature", message: "Shopify install signature failed." }, 400);
  }

  const connectUrl = new URL("/api/shopify/connect", url.origin);
  connectUrl.searchParams.set("shop", shop);
  return redirect(connectUrl.toString());
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
