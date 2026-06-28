import {
  createSignedState,
  getScopes,
  isValidShopDomain,
  json,
  normalizeShopifyDomain,
  oauthCookie,
  randomNonce,
  redirect,
  requireShopifyConfig,
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
    return json({ ok: false, code: "invalid_shop", message: "Use a valid .myshopify.com domain." }, 400);
  }

  const state = randomNonce();
  const signedState = await createSignedState(env, state);
  const redirectUri = `${url.origin}/api/shopify/callback`;
  const installUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  installUrl.searchParams.set("client_id", env.SHOPIFY_API_KEY);
  installUrl.searchParams.set("scope", getScopes(env));
  installUrl.searchParams.set("redirect_uri", redirectUri);
  installUrl.searchParams.set("state", state);

  return redirect(installUrl.toString(), {
    "set-cookie": oauthCookie(signedState),
  });
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
