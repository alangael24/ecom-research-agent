import {
  clearOauthCookie,
  exchangeCodeForToken,
  fetchShopifySnapshot,
  getApiVersion,
  isValidShopDomain,
  json,
  normalizeShopifyDomain,
  parseCookies,
  redirect,
  requireShopifyConfig,
  saveConnectedStore,
  STATE_COOKIE,
  verifyShopifyHmac,
  verifySignedState,
} from "../../_lib/shopify.js";
import { createSessionCookie } from "../../_auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const url = new URL(request.url);
  const shop = normalizeShopifyDomain(url.searchParams.get("shop"));
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const host = url.searchParams.get("host") || "";

  if (!isValidShopDomain(shop) || !code || !state) {
    return json({ ok: false, code: "invalid_oauth_callback", message: "Missing OAuth callback data." }, 400);
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const validState = await verifySignedState(env, cookies[STATE_COOKIE], state);
  const validHmac = await verifyShopifyHmac(env, request.url);
  if (!validState || !validHmac) {
    return json({ ok: false, code: "invalid_oauth_signature", message: "Shopify OAuth validation failed." }, 400, {
      "set-cookie": clearOauthCookie(),
    });
  }

  try {
    const apiVersion = getApiVersion(env);
    const token = await exchangeCodeForToken(env, shop, code);
    const snapshot = await fetchShopifySnapshot({
      shop,
      accessToken: token.accessToken,
      apiVersion,
    });

    await saveConnectedStore(env, {
      shop,
      accessToken: token.accessToken,
      scope: token.scope,
      apiVersion,
      installedAt: new Date().toISOString(),
      shopifyHost: host,
      shopInfo: snapshot.shop,
    });

    const sessionCookie = await createSessionCookie(
      {
        provider: "shopify",
        email: `${shop}@shopify.local`,
        name: snapshot.shop?.name || shop,
        shop,
      },
      env,
    );

    const appUrl = new URL("/", url.origin);
    appUrl.searchParams.set("shopify_connected", shop);
    appUrl.searchParams.set("stage", "shopify");
    appUrl.searchParams.set("auth", "success");
    return redirect(appUrl.toString(), {
      "set-cookie": [clearOauthCookie(), sessionCookie],
    });
  } catch (error) {
    return json(
      {
        ok: false,
        code: "shopify_install_failed",
        message: error instanceof Error ? error.message : "No se pudo completar la instalacion Shopify.",
      },
      502,
      { "set-cookie": clearOauthCookie() },
    );
  }
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
