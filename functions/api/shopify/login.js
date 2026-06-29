import { isValidShopDomain, json, normalizeShopifyDomain, redirect, requireShopifyConfig } from "../../_lib/shopify.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const url = new URL(request.url);
  const shop = normalizeShopifyDomain(url.searchParams.get("shop"));
  if (isValidShopDomain(shop)) {
    const startUrl = new URL("/api/shopify/start", url.origin);
    startUrl.searchParams.set("shop", shop);
    return wantsJson(request) ? json({ ok: true, redirectUrl: startUrl.toString() }) : redirect(startUrl.toString());
  }

  const pickerUrl = new URL("/", url.origin);
  pickerUrl.searchParams.set("connect_shopify", "1");

  return wantsJson(request)
    ? json(
        {
          ok: false,
          code: "shopify_shop_required",
          message: "Selecciona o escribe una tienda Shopify para continuar.",
          redirectUrl: pickerUrl.toString(),
        },
        400,
      )
    : redirect(pickerUrl.toString());
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type,accept",
    },
  });
}

function wantsJson(request) {
  return String(request.headers.get("accept") || "").includes("application/json");
}
