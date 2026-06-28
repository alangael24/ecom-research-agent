import {
  createStateCookie,
  getOrigin,
  normalizeShopDomain,
  redirect,
  SHOPIFY_SHOP_COOKIE,
  SHOPIFY_STATE_COOKIE,
} from "../../../_auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) {
    return redirect("/login?error=shopify_config");
  }

  const url = new URL(request.url);
  const shop = normalizeShopDomain(url.searchParams.get("shop"));
  if (!shop) return redirect("/login?error=shopify_shop");

  const state = crypto.randomUUID();
  const redirectUri = `${getOrigin(request)}/api/auth/shopify/callback`;
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", env.SHOPIFY_API_KEY);
  authUrl.searchParams.set("scope", env.SHOPIFY_SCOPES || "read_products,write_content");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return redirect(authUrl.toString(), [
    createStateCookie(SHOPIFY_STATE_COOKIE, state),
    createStateCookie(SHOPIFY_SHOP_COOKIE, shop),
  ]);
}
