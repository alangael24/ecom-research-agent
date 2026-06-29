import {
  clearTiendanubeStateCookie,
  commerceJson,
  commerceOptionsResponse,
  createCommerceState,
  randomNonce,
  requireCommerceStoreKv,
  requireTiendanubeConfig,
  tiendanubeAuthConfig,
  tiendanubeStateCookie,
} from "../../../_lib/commerce.js";
import { redirect } from "../../../_auth.js";

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
  const config = tiendanubeAuthConfig(env);
  const nonce = randomNonce();
  const state = await createCommerceState(env, nonce);
  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", `${url.origin}/api/commerce/tiendanube/callback`);
  authUrl.searchParams.set("state", nonce);

  return redirect(authUrl.toString(), [tiendanubeStateCookie(state)]);
}

export async function onRequestOptions() {
  return commerceOptionsResponse();
}
