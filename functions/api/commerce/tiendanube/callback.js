import {
  clearTiendanubeStateCookie,
  commerceJson,
  commerceOptionsResponse,
  exchangeTiendanubeCode,
  fetchCommerceSnapshot,
  readTiendanubeStateCookie,
  requireCommerceStoreKv,
  requireTiendanubeConfig,
  saveCommerceStore,
  verifyCommerceState,
} from "../../../_lib/commerce.js";
import { createSessionCookie, redirect } from "../../../_auth.js";

export async function onRequestGet({ request, env }) {
  const kvError = requireCommerceStoreKv(env);
  if (kvError) return commerceJson({ ok: false, code: "commerce_not_configured", message: kvError }, 503);
  const configError = requireTiendanubeConfig(env);
  if (configError) {
    return commerceJson({ ok: false, code: "tiendanube_not_configured", message: configError }, 503, {
      "set-cookie": clearTiendanubeStateCookie(),
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const nonce = url.searchParams.get("state") || "";
  const validState = await verifyCommerceState(env, readTiendanubeStateCookie(request), nonce);
  if (!code || !validState) {
    return redirect("/login?error=tiendanube_state", [clearTiendanubeStateCookie()]);
  }

  try {
    const token = await exchangeTiendanubeCode(env, code);
    const baseRecord = {
      platform: "tiendanube",
      id: token.storeId,
      storeId: token.storeId,
      accessToken: token.accessToken,
      scope: token.scope,
      connectedAt: new Date().toISOString(),
    };
    const snapshot = await fetchCommerceSnapshotWithToken(env, baseRecord);
    const store = await saveCommerceStore(env, {
      ...baseRecord,
      label: snapshot.store?.name || `Tiendanube ${token.storeId}`,
      domain: snapshot.store?.domain || "",
      storeInfo: snapshot.store,
    });
    const sessionCookie = await createSessionCookie(
      {
        provider: "tiendanube",
        email: `${token.storeId}@tiendanube.local`,
        name: snapshot.store?.name || `Tiendanube ${token.storeId}`,
        shop: token.storeId,
      },
      env,
    );

    const appUrl = new URL("/", url.origin);
    appUrl.searchParams.set("commerce_connected", `tiendanube:${store.id}`);
    appUrl.searchParams.set("stage", "shopify");
    appUrl.searchParams.set("auth", "success");
    return redirect(appUrl.toString(), [clearTiendanubeStateCookie(), sessionCookie]);
  } catch (error) {
    const target = new URL("/login", url.origin);
    target.searchParams.set("error", "tiendanube_token");
    target.searchParams.set("message", error instanceof Error ? error.message : "No se pudo conectar Tiendanube.");
    return redirect(target.toString(), [clearTiendanubeStateCookie()]);
  }
}

export async function onRequestOptions() {
  return commerceOptionsResponse();
}

async function fetchCommerceSnapshotWithToken(env, record) {
  await saveCommerceStore(env, {
    ...record,
    label: `Tiendanube ${record.storeId}`,
  });
  return fetchCommerceSnapshot(env, { platform: "tiendanube", id: record.storeId });
}
