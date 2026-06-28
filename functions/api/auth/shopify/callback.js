import {
  clearStateCookie,
  createSessionCookie,
  normalizeShopDomain,
  readCookie,
  redirect,
  SHOPIFY_SHOP_COOKIE,
  SHOPIFY_STATE_COOKIE,
  verifyShopifyHmac,
} from "../../../_auth.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const shop = normalizeShopDomain(url.searchParams.get("shop"));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, SHOPIFY_STATE_COOKIE);
  const expectedShop = readCookie(request, SHOPIFY_SHOP_COOKIE);
  const clearCookies = [clearStateCookie(SHOPIFY_STATE_COOKIE), clearStateCookie(SHOPIFY_SHOP_COOKIE)];

  if (!shop || !code || !state || state !== expectedState || shop !== expectedShop) {
    return redirect("/login?error=shopify_state", clearCookies);
  }

  const validHmac = await verifyShopifyHmac(url.searchParams, env.SHOPIFY_API_SECRET);
  if (!validHmac) return redirect("/login?error=shopify_hmac", clearCookies);

  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: env.SHOPIFY_API_KEY,
        client_secret: env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) return redirect("/login?error=shopify_token", clearCookies);
    const tokenData = await tokenResponse.json();
    const version = env.SHOPIFY_API_VERSION || "2026-01";
    const shopResponse = await fetch(`https://${shop}/admin/api/${version}/shop.json`, {
      headers: { "X-Shopify-Access-Token": tokenData.access_token },
    });
    const shopData = shopResponse.ok ? await shopResponse.json() : {};
    const shopInfo = shopData.shop || {};
    const email = shopInfo.email || shopInfo.customer_email || `${shop}@shopify.local`;
    const name = shopInfo.name || shop;

    const sessionCookie = await createSessionCookie(
      {
        provider: "shopify",
        email,
        name,
        shop,
      },
      env,
    );

    return redirect("/?auth=success", [...clearCookies, sessionCookie]);
  } catch {
    return redirect("/login?error=shopify_unknown", clearCookies);
  }
}
