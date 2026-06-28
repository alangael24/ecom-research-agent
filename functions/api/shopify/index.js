import {
  deleteConnectedStore,
  fetchShopifySnapshot,
  getApiVersion,
  getConnectedStore,
  isValidShopDomain,
  json,
  listConnectedStores,
  normalizeShopifyDomain,
  requireShopifyConfig,
} from "../../_lib/shopify.js";

export async function onRequestGet(context) {
  const { env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const stores = await listConnectedStores(env);
  return json({ ok: true, stores });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const shop = normalizeShopifyDomain(payload.shop || payload.domain);
  if (!isValidShopDomain(shop)) {
    return json({ ok: false, code: "invalid_shop", message: "Use a valid .myshopify.com domain." }, 400);
  }

  const store = await getConnectedStore(env, shop);
  if (!store) {
    return json(
      {
        ok: false,
        code: "shop_not_connected",
        message: "Esta tienda no esta conectada. Instala la app de Shopify primero.",
      },
      404,
    );
  }

  try {
    const shopify = await fetchShopifySnapshot({
      shop,
      accessToken: store.accessToken,
      apiVersion: getApiVersion(env),
    });
    return json({ ok: true, shopify });
  } catch (error) {
    return json(
      {
        ok: false,
        code: "shopify_error",
        message: error instanceof Error ? error.message : "No se pudo leer Shopify.",
      },
      error.status || 502,
    );
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const shop = normalizeShopifyDomain(payload.shop);
  if (!isValidShopDomain(shop)) {
    return json({ ok: false, code: "invalid_shop", message: "Use a valid .myshopify.com domain." }, 400);
  }

  await deleteConnectedStore(env, shop);
  return json({ ok: true, shop });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
