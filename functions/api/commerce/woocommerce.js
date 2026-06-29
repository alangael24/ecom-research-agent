import {
  buildWooCommerceRecord,
  commerceJson,
  commerceOptionsResponse,
  requireCommerceStoreKv,
  saveCommerceStore,
} from "../../_lib/commerce.js";

export async function onRequestPost({ request, env }) {
  const configError = requireCommerceStoreKv(env);
  if (configError) return commerceJson({ ok: false, code: "commerce_not_configured", message: configError }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return commerceJson({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  try {
    const record = await buildWooCommerceRecord(payload);
    const store = await saveCommerceStore(env, record);
    return commerceJson({ ok: true, store });
  } catch (error) {
    return commerceJson(
      {
        ok: false,
        code: "woocommerce_connect_failed",
        message: error instanceof Error ? error.message : "No se pudo conectar WooCommerce.",
      },
      error.status || 400,
    );
  }
}

export async function onRequestOptions() {
  return commerceOptionsResponse();
}
