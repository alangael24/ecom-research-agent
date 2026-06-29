import {
  commerceJson,
  commerceOptionsResponse,
  deleteCommerceStore,
  fetchCommerceSnapshot,
  listCommerceStores,
  normalizePlatform,
  requireCommerceStoreKv,
} from "../../_lib/commerce.js";
import { deleteConnectedStore, isValidShopDomain, normalizeShopifyDomain } from "../../_lib/shopify.js";

export async function onRequestGet({ env }) {
  const configError = requireCommerceStoreKv(env);
  if (configError) return commerceJson({ ok: false, code: "commerce_not_configured", message: configError }, 503);
  const stores = await listCommerceStores(env);
  return commerceJson({ ok: true, stores });
}

export async function onRequestPost({ request, env }) {
  const configError = requireCommerceStoreKv(env);
  if (configError) return commerceJson({ ok: false, code: "commerce_not_configured", message: configError }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return commerceJson({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const platform = normalizePlatform(payload.platform || (payload.shop ? "shopify" : ""));
  const id = payload.id || payload.storeId || payload.shop || payload.domain || "";
  if (!platform || !id) {
    return commerceJson({ ok: false, code: "invalid_store", message: "Missing platform or store id." }, 400);
  }

  try {
    const commerce = await fetchCommerceSnapshot(env, { platform, id });
    return commerceJson({ ok: true, commerce });
  } catch (error) {
    return commerceJson(
      {
        ok: false,
        code: error.code || "commerce_snapshot_failed",
        message: error instanceof Error ? error.message : "No se pudo leer la tienda.",
      },
      error.status || 502,
    );
  }
}

export async function onRequestDelete({ request, env }) {
  const configError = requireCommerceStoreKv(env);
  if (configError) return commerceJson({ ok: false, code: "commerce_not_configured", message: configError }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return commerceJson({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const platform = normalizePlatform(payload.platform);
  const id = payload.id || payload.storeId || payload.shop || "";
  if (!platform || !id) {
    return commerceJson({ ok: false, code: "invalid_store", message: "Missing platform or store id." }, 400);
  }

  try {
    if (platform === "shopify") {
      const shop = normalizeShopifyDomain(id);
      if (!isValidShopDomain(shop)) {
        return commerceJson({ ok: false, code: "invalid_shop", message: "Use a valid .myshopify.com domain." }, 400);
      }
      await deleteConnectedStore(env, shop);
    } else {
      await deleteCommerceStore(env, platform, id);
    }
    return commerceJson({ ok: true, platform, id });
  } catch (error) {
    return commerceJson(
      {
        ok: false,
        code: "commerce_disconnect_failed",
        message: error instanceof Error ? error.message : "No se pudo desconectar la tienda.",
      },
      error.status || 500,
    );
  }
}

export async function onRequestOptions() {
  return commerceOptionsResponse();
}
