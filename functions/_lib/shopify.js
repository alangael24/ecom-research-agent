export const DEFAULT_API_VERSION = "2026-04";
export const DEFAULT_SCOPES = "read_products,write_content";
export const MAX_PRODUCTS = 50;
export const STORE_PREFIX = "shopify:store:";
export const STATE_COOKIE = "shopify_oauth_state";

const encoder = new TextEncoder();

export const SHOPIFY_SNAPSHOT_QUERY = `#graphql
  query StoreSnapshot($first: Int!) {
    shop {
      name
      myshopifyDomain
      currencyCode
      primaryDomain {
        host
        url
      }
    }
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        totalInventory
        onlineStoreUrl
        updatedAt
        variants(first: 10) {
          nodes {
            title
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`;

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      ...extraHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function redirect(location, headers = {}) {
  const responseHeaders = new Headers({
    location,
    "cache-control": "no-store",
  });
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => responseHeaders.append(key, item));
    } else {
      responseHeaders.append(key, value);
    }
  }
  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,PATCH,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export function normalizeShopifyDomain(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

export function isValidShopDomain(shop) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

export function getApiVersion(env) {
  return env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
}

export function getScopes(env) {
  return env.SHOPIFY_SCOPES || DEFAULT_SCOPES;
}

export function requireShopifyConfig(env) {
  if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) {
    return "SHOPIFY_API_KEY and SHOPIFY_API_SECRET are required.";
  }
  if (!env.SHOPIFY_STORES) {
    return "SHOPIFY_STORES KV binding is required.";
  }
  return "";
}

export function storeKey(shop) {
  return `${STORE_PREFIX}${shop}`;
}

export async function listConnectedStores(env) {
  const stores = [];
  let cursor;

  do {
    const page = await env.SHOPIFY_STORES.list({
      prefix: STORE_PREFIX,
      cursor,
      limit: 100,
    });
    cursor = page.cursor;

    for (const key of page.keys) {
      const record = await env.SHOPIFY_STORES.get(key.name, { type: "json" });
      if (record) stores.push(publicStoreRecord(record));
    }
  } while (cursor);

  return stores.sort((left, right) => left.shop.localeCompare(right.shop));
}

export async function getConnectedStore(env, shop) {
  const record = await env.SHOPIFY_STORES.get(storeKey(shop), { type: "json" });
  if (!record) return null;
  return {
    ...record,
    accessToken: await decryptToken(env, record.accessToken),
  };
}

export async function saveConnectedStore(env, record) {
  const encryptedToken = await encryptToken(env, record.accessToken);
  await env.SHOPIFY_STORES.put(
    storeKey(record.shop),
    JSON.stringify({
      ...record,
      accessToken: encryptedToken,
      tokenFormat: "aes-gcm",
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function deleteConnectedStore(env, shop) {
  await env.SHOPIFY_STORES.delete(storeKey(shop));
}

export function publicStoreRecord(record) {
  return {
    shop: record.shop,
    scope: record.scope || "",
    installedAt: record.installedAt || "",
    updatedAt: record.updatedAt || "",
    apiVersion: record.apiVersion || DEFAULT_API_VERSION,
    shopInfo: record.shopInfo || null,
  };
}

export async function exchangeCodeForToken(env, shop, code) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "Shopify did not return an access token.");
  }

  return {
    accessToken: body.access_token,
    scope: body.scope || "",
  };
}

export async function fetchShopifySnapshot({ shop, accessToken, apiVersion }) {
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": accessToken,
    },
    body: JSON.stringify({
      query: SHOPIFY_SNAPSHOT_QUERY,
      variables: { first: MAX_PRODUCTS },
    }),
  });

  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    const message = summarizeShopifyError(body.errors) || "Shopify rechazo la solicitud.";
    const error = new Error(message);
    error.status = response.ok ? 502 : response.status;
    throw error;
  }

  return normalizeShopifySnapshot(body.data, shop, apiVersion);
}

export async function createShopifyPage({ shop, accessToken, apiVersion, page }) {
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": accessToken,
    },
    body: JSON.stringify({
      query: `#graphql
        mutation CreatePage($page: PageCreateInput!) {
          pageCreate(page: $page) {
            page {
              id
              title
              handle
            }
            userErrors {
              code
              field
              message
            }
          }
        }
      `,
      variables: {
        page: {
          title: page.title,
          handle: page.handle,
          body: page.bodyHtml,
          isPublished: page.published !== false,
        },
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  const userErrors = body?.data?.pageCreate?.userErrors || [];
  const pageData = body?.data?.pageCreate?.page || null;
  if (!response.ok || body.errors?.length || userErrors.length || !pageData) {
    const message =
      summarizeGraphqlErrors(body.errors) ||
      userErrors.map((error) => error.message).filter(Boolean).join(" ") ||
      "Shopify rechazo la creacion de la pagina.";
    const error = new Error(message);
    error.status = response.ok ? 422 : response.status;
    throw error;
  }

  return {
    id: pageData.id,
    title: pageData.title,
    handle: pageData.handle,
  };
}

export function normalizeShopifySnapshot(data, fallbackDomain, apiVersion) {
  const shop = data?.shop || {};
  const products = data?.products?.nodes || [];
  return {
    apiVersion,
    shop: {
      name: shop.name || fallbackDomain,
      myshopifyDomain: shop.myshopifyDomain || fallbackDomain,
      primaryDomain: shop.primaryDomain?.host || fallbackDomain,
      primaryUrl: shop.primaryDomain?.url || `https://${fallbackDomain}`,
      currencyCode: shop.currencyCode || "",
    },
    products: products.map(normalizeProduct),
  };
}

export function summarizeShopifyError(errors) {
  if (!Array.isArray(errors) || !errors.length) return "";
  return errors
    .map((error) => error?.message)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

export function summarizeShopifyRestError(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.error === "string") return body.error;
  if (typeof body.errors === "string") return body.errors;
  if (Array.isArray(body.errors)) return body.errors.join(" ");
  if (body.errors && typeof body.errors === "object") {
    return Object.entries(body.errors)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join(" ");
  }
  return "";
}

function summarizeGraphqlErrors(errors) {
  if (!Array.isArray(errors) || !errors.length) return "";
  return errors
    .map((error) => error?.message)
    .filter(Boolean)
    .join(" ");
}

export function parseCookies(header) {
  const cookies = {};
  String(header || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const index = item.indexOf("=");
      if (index === -1) return;
      cookies[item.slice(0, index)] = decodeURIComponent(item.slice(index + 1));
    });
  return cookies;
}

export async function createSignedState(env, nonce) {
  const issuedAt = Date.now().toString();
  const message = `${nonce}.${issuedAt}`;
  const signature = await hmacHex(env.SHOPIFY_API_SECRET, message);
  return `${message}.${signature}`;
}

export async function verifySignedState(env, value, expectedNonce) {
  const [nonce, issuedAt, signature] = String(value || "").split(".");
  if (!nonce || !issuedAt || !signature || nonce !== expectedNonce) return false;
  if (Date.now() - Number(issuedAt) > 10 * 60 * 1000) return false;
  const expected = await hmacHex(env.SHOPIFY_API_SECRET, `${nonce}.${issuedAt}`);
  return safeEqual(signature, expected);
}

export function oauthCookie(value) {
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

export function clearOauthCookie() {
  return `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function verifyShopifyHmac(env, url) {
  const params = new URL(url).searchParams;
  const hmac = params.get("hmac") || "";
  if (!hmac) return false;

  const message = [...params.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const expected = await hmacHex(env.SHOPIFY_API_SECRET, message);
  return safeEqual(hmac, expected);
}

export function randomNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function normalizeProduct(product) {
  const variants = product.variants?.nodes || [];
  return {
    id: product.id,
    title: product.title || "Untitled product",
    handle: product.handle || "",
    status: product.status || "",
    vendor: product.vendor || "",
    productType: product.productType || "",
    totalInventory: Number.isFinite(product.totalInventory)
      ? product.totalInventory
      : sumInventory(variants),
    onlineStoreUrl: product.onlineStoreUrl || "",
    updatedAt: product.updatedAt || "",
    variantsCount: variants.length,
    priceRange: formatPriceRange(variants),
  };
}

function sumInventory(variants) {
  return variants.reduce((total, variant) => {
    return total + (Number.isFinite(variant.inventoryQuantity) ? variant.inventoryQuantity : 0);
  }, 0);
}

function formatPriceRange(variants) {
  const prices = variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(new Uint8Array(signature));
}

async function encryptToken(env, token) {
  const key = await encryptionKey(env);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(token));
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

async function decryptToken(env, value) {
  if (!String(value || "").startsWith("v1.")) return value;
  const [, ivText, cipherText] = value.split(".");
  const key = await encryptionKey(env);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivText) },
    key,
    fromBase64Url(cipherText),
  );
  return new TextDecoder().decode(plain);
}

async function encryptionKey(env) {
  const secret = env.SHOPIFY_TOKEN_ENCRYPTION_SECRET || env.SHOPIFY_API_SECRET;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes) {
  let value = "";
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
