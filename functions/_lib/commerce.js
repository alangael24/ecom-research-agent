import {
  fetchShopifySnapshot,
  getApiVersion,
  getConnectedStore,
  isValidShopDomain,
  listConnectedStores,
  normalizeShopifyDomain,
} from "./shopify.js";

const encoder = new TextEncoder();
const COMMERCE_PREFIX = "commerce:store:";
const COMMERCE_STATE_COOKIE = "commerce_oauth_state";
const MAX_PRODUCTS = 50;

export const COMMERCE_PLATFORMS = new Set(["shopify", "tiendanube", "woocommerce"]);

export function commerceCorsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "accept,authorization,content-type,x-app-password",
  };
}

export function commerceJson(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...commerceCorsHeaders(),
      ...extraHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function commerceOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: commerceCorsHeaders(),
  });
}

export function requireCommerceStoreKv(env) {
  if (!env.SHOPIFY_STORES) return "SHOPIFY_STORES KV binding is required.";
  return "";
}

export function normalizePlatform(value) {
  const platform = String(value || "").trim().toLowerCase();
  return COMMERCE_PLATFORMS.has(platform) ? platform : "";
}

export function platformLabel(platform) {
  if (platform === "tiendanube") return "Tiendanube";
  if (platform === "woocommerce") return "WooCommerce";
  return "Shopify";
}

export function commerceStoreKey(platform, id) {
  return `${COMMERCE_PREFIX}${platform}:${id}`;
}

export async function listCommerceStores(env) {
  const stores = [];

  try {
    const shopifyStores = await listConnectedStores(env);
    stores.push(
      ...shopifyStores.map((store) => ({
        platform: "shopify",
        platformLabel: platformLabel("shopify"),
        id: store.shop,
        domain: store.shop,
        label: store.shopInfo?.name ? `${store.shopInfo.name} (${store.shop})` : store.shop,
        connectedAt: store.installedAt || store.updatedAt || "",
        updatedAt: store.updatedAt || "",
        storeInfo: store.shopInfo || null,
        canPublishPages: true,
        canInstallThemeTools: true,
      })),
    );
  } catch {
    // Shopify can be unconfigured while other commerce adapters still work.
  }

  let cursor;
  do {
    const page = await env.SHOPIFY_STORES.list({
      prefix: COMMERCE_PREFIX,
      cursor,
      limit: 100,
    });
    cursor = page.cursor;
    for (const key of page.keys) {
      const record = await env.SHOPIFY_STORES.get(key.name, { type: "json" });
      if (record) stores.push(publicCommerceStore(record));
    }
  } while (cursor);

  return stores.sort((left, right) => `${left.platform}:${left.label}`.localeCompare(`${right.platform}:${right.label}`));
}

export async function getCommerceStore(env, platform, id) {
  if (platform === "shopify") {
    const shop = normalizeShopifyDomain(id);
    if (!isValidShopDomain(shop)) return null;
    const store = await getConnectedStore(env, shop);
    return store
      ? {
          platform: "shopify",
          id: shop,
          domain: shop,
          accessToken: store.accessToken,
          storeInfo: store.shopInfo || null,
          apiVersion: store.apiVersion || getApiVersion(env),
        }
      : null;
  }

  const record = await env.SHOPIFY_STORES.get(commerceStoreKey(platform, id), { type: "json" });
  if (!record) return null;
  return decryptCommerceRecord(env, record);
}

export async function saveCommerceStore(env, record) {
  const platform = normalizePlatform(record.platform);
  if (!platform || platform === "shopify") throw new Error("Unsupported commerce platform record.");
  const id = cleanStoreId(record.id || record.storeId || record.domain || record.siteUrl);
  if (!id) throw new Error("Missing commerce store id.");

  const encrypted = await encryptCommerceRecord(env, {
    ...record,
    platform,
    id,
    updatedAt: new Date().toISOString(),
  });
  await env.SHOPIFY_STORES.put(commerceStoreKey(platform, id), JSON.stringify(encrypted));
  return publicCommerceStore(encrypted);
}

export async function deleteCommerceStore(env, platform, id) {
  if (platform === "shopify") {
    throw new Error("Use /api/shopify to disconnect Shopify stores.");
  }
  await env.SHOPIFY_STORES.delete(commerceStoreKey(platform, id));
}

export async function fetchCommerceSnapshot(env, { platform, id }) {
  const normalizedPlatform = normalizePlatform(platform);
  if (!normalizedPlatform) throw new Error("Unsupported commerce platform.");
  const store = await getCommerceStore(env, normalizedPlatform, id);
  if (!store) {
    const error = new Error("Esta tienda no esta conectada.");
    error.status = 404;
    throw error;
  }

  if (normalizedPlatform === "shopify") {
    const snapshot = await fetchShopifySnapshot({
      shop: store.domain,
      accessToken: store.accessToken,
      apiVersion: store.apiVersion || getApiVersion(env),
    });
    return normalizeCommerceSnapshot("shopify", store.id, snapshot);
  }

  if (normalizedPlatform === "tiendanube") return fetchTiendanubeSnapshot(env, store);
  if (normalizedPlatform === "woocommerce") return fetchWooCommerceSnapshot(store);
  throw new Error("Unsupported commerce platform.");
}

export async function buildWooCommerceRecord(payload) {
  const siteUrl = normalizeSiteUrl(payload.siteUrl || payload.url || payload.domain);
  const consumerKey = String(payload.consumerKey || payload.key || "").trim();
  const consumerSecret = String(payload.consumerSecret || payload.secret || "").trim();
  if (!siteUrl || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce requiere URL, consumer key y consumer secret.");
  }
  if (!siteUrl.startsWith("https://")) {
    throw new Error("Por seguridad, WooCommerce debe conectarse con una URL HTTPS.");
  }

  const snapshot = await fetchWooCommerceSnapshot({
    platform: "woocommerce",
    id: cleanStoreId(siteUrl),
    siteUrl,
    consumerKey,
    consumerSecret,
  });

  return {
    platform: "woocommerce",
    id: cleanStoreId(siteUrl),
    siteUrl,
    domain: new URL(siteUrl).hostname,
    label: snapshot.store?.name || new URL(siteUrl).hostname,
    consumerKey,
    consumerSecret,
    connectedAt: new Date().toISOString(),
    storeInfo: snapshot.store,
  };
}

export function tiendanubeAuthConfig(env) {
  const clientId = env.TIENDANUBE_CLIENT_ID || env.NUVEMSHOP_CLIENT_ID || "";
  return {
    clientId,
    clientSecret: env.TIENDANUBE_CLIENT_SECRET || env.NUVEMSHOP_CLIENT_SECRET || "",
    authorizeUrl: env.TIENDANUBE_AUTHORIZE_URL || `https://www.tiendanube.com/apps/${encodeURIComponent(clientId)}/authorize`,
    tokenUrl: env.TIENDANUBE_TOKEN_URL || "https://www.tiendanube.com/apps/authorize/token",
    apiBaseUrl: env.TIENDANUBE_API_BASE_URL || "https://api.tiendanube.com",
    apiVersion: env.TIENDANUBE_API_VERSION || "2025-03",
    userAgent: env.TIENDANUBE_USER_AGENT || "Agent Genia (contacto@agentgenia.com)",
  };
}

export function requireTiendanubeConfig(env) {
  const config = tiendanubeAuthConfig(env);
  if (!config.clientId || !config.clientSecret) {
    return "TIENDANUBE_CLIENT_ID and TIENDANUBE_CLIENT_SECRET are required.";
  }
  return "";
}

export async function exchangeTiendanubeCode(env, code) {
  const config = tiendanubeAuthConfig(env);
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": config.userAgent,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token || !body.user_id) {
    const error = new Error(body.error_description || body.error || "Tiendanube no devolvio access_token/user_id.");
    error.status = response.status;
    throw error;
  }
  return {
    accessToken: body.access_token,
    scope: body.scope || "",
    tokenType: body.token_type || "bearer",
    storeId: String(body.user_id),
  };
}

export function tiendanubeStateCookie(value) {
  return `${COMMERCE_STATE_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

export function clearTiendanubeStateCookie() {
  return `${COMMERCE_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readTiendanubeStateCookie(request) {
  return parseCookies(request.headers.get("cookie"))[COMMERCE_STATE_COOKIE] || "";
}

export async function createCommerceState(env, nonce) {
  const issuedAt = Date.now().toString();
  const message = `${nonce}.${issuedAt}`;
  const signature = await hmacHex(authSecret(env), message);
  return `${message}.${signature}`;
}

export async function verifyCommerceState(env, value, expectedNonce) {
  const [nonce, issuedAt, signature] = String(value || "").split(".");
  if (!nonce || !issuedAt || !signature || nonce !== expectedNonce) return false;
  if (Date.now() - Number(issuedAt) > 10 * 60 * 1000) return false;
  const expected = await hmacHex(authSecret(env), `${nonce}.${issuedAt}`);
  return safeEqual(signature, expected);
}

export function randomNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function normalizeCommerceSnapshot(platform, id, snapshot) {
  if (platform === "shopify") {
    return {
      platform: "shopify",
      platformLabel: platformLabel(platform),
      storeId: id,
      shop: snapshot.shop,
      store: {
        name: snapshot.shop?.name || id,
        domain: snapshot.shop?.myshopifyDomain || id,
        primaryDomain: snapshot.shop?.primaryDomain || id,
        primaryUrl: snapshot.shop?.primaryUrl || `https://${id}`,
        currencyCode: snapshot.shop?.currencyCode || "",
      },
      products: snapshot.products || [],
      capabilities: {
        readCatalog: true,
        publishPages: true,
        installThemeTools: true,
      },
    };
  }
  return snapshot;
}

async function fetchTiendanubeSnapshot(env, store) {
  const config = tiendanubeAuthConfig(env);
  const baseUrl = `${config.apiBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(config.apiVersion)}/${encodeURIComponent(store.storeId || store.id)}`;
  const headers = {
    "content-type": "application/json",
    "user-agent": config.userAgent,
    authentication: `bearer ${store.accessToken}`,
  };
  const [storeBody, productsBody] = await Promise.all([
    fetchJson(`${baseUrl}/store`, { headers }).catch(() => null),
    fetchJson(`${baseUrl}/products?per_page=${MAX_PRODUCTS}&page=1`, { headers }),
  ]);
  const products = Array.isArray(productsBody) ? productsBody : [];
  const storeName = localizedValue(storeBody?.name) || store.label || `Tiendanube ${store.storeId || store.id}`;
  const domain = normalizeTiendanubeDomain(storeBody?.domains?.[0]) || store.domain || "";
  return {
    platform: "tiendanube",
    platformLabel: platformLabel("tiendanube"),
    storeId: String(store.storeId || store.id),
    store: {
      name: storeName,
      domain,
      primaryDomain: domain,
      primaryUrl: domain ? `https://${domain}` : "",
      currencyCode: storeBody?.currency || store.storeInfo?.currencyCode || "",
    },
    products: products.map(normalizeTiendanubeProduct),
    capabilities: {
      readCatalog: true,
      publishPages: false,
      installThemeTools: false,
    },
  };
}

async function fetchWooCommerceSnapshot(store) {
  const siteUrl = normalizeSiteUrl(store.siteUrl);
  const headers = {
    accept: "application/json",
    authorization: `Basic ${btoa(`${store.consumerKey}:${store.consumerSecret}`)}`,
  };
  const products = await fetchJson(`${siteUrl}/wp-json/wc/v3/products?per_page=${MAX_PRODUCTS}&status=any`, { headers });
  const status = await fetchJson(`${siteUrl}/wp-json/wc/v3/system_status`, { headers }).catch(() => null);
  const name = status?.environment?.site_title || store.label || new URL(siteUrl).hostname;
  return {
    platform: "woocommerce",
    platformLabel: platformLabel("woocommerce"),
    storeId: cleanStoreId(siteUrl),
    store: {
      name,
      domain: new URL(siteUrl).hostname,
      primaryDomain: new URL(siteUrl).hostname,
      primaryUrl: siteUrl,
      currencyCode: status?.settings?.currency || "",
    },
    products: (Array.isArray(products) ? products : []).map(normalizeWooProduct),
    capabilities: {
      readCatalog: true,
      publishPages: false,
      installThemeTools: false,
    },
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Commerce API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function normalizeTiendanubeProduct(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return {
    id: String(product.id || ""),
    title: localizedValue(product.name) || "Producto",
    handle: localizedValue(product.handle) || "",
    status: product.published ? "active" : "draft",
    vendor: product.brand || "",
    productType: product.categories?.[0]?.name ? localizedValue(product.categories[0].name) : "",
    totalInventory: variants.reduce((sum, variant) => sum + numeric(variant.stock), 0),
    onlineStoreUrl: product.canonical_url || "",
    updatedAt: product.updated_at || "",
    variantsCount: variants.length,
    priceRange: formatPriceRange(variants.map((variant) => variant.price)),
  };
}

function normalizeTiendanubeDomain(value) {
  if (!value) return "";
  if (typeof value === "string") return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (typeof value === "object") {
    return String(value.domain || value.url || value.name || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "";
}

function normalizeWooProduct(product) {
  return {
    id: String(product.id || ""),
    title: product.name || "Producto",
    handle: product.slug || "",
    status: product.status || "",
    vendor: "",
    productType: product.categories?.[0]?.name || "",
    totalInventory: Number.isFinite(Number(product.stock_quantity)) ? Number(product.stock_quantity) : 0,
    onlineStoreUrl: product.permalink || "",
    updatedAt: product.date_modified || "",
    variantsCount: 0,
    priceRange: product.price ? `$${Number(product.price).toFixed(2)}` : "",
  };
}

function localizedValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.es || value.pt || value.en || Object.values(value).find((item) => typeof item === "string") || "";
  }
  return "";
}

function formatPriceRange(values) {
  const prices = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!prices.length) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function publicCommerceStore(record) {
  return {
    platform: record.platform,
    platformLabel: platformLabel(record.platform),
    id: record.id,
    domain: record.domain || record.siteUrl || record.storeId || record.id,
    label: record.label || record.storeInfo?.name || `${platformLabel(record.platform)} ${record.id}`,
    connectedAt: record.connectedAt || "",
    updatedAt: record.updatedAt || "",
    storeInfo: record.storeInfo || null,
    canPublishPages: false,
    canInstallThemeTools: false,
  };
}

async function encryptCommerceRecord(env, record) {
  const next = { ...record };
  if (next.accessToken) next.accessToken = await encryptSecret(env, next.accessToken);
  if (next.consumerSecret) next.consumerSecret = await encryptSecret(env, next.consumerSecret);
  next.secretFormat = "aes-gcm";
  return next;
}

async function decryptCommerceRecord(env, record) {
  const next = { ...record };
  if (next.accessToken) next.accessToken = await decryptSecret(env, next.accessToken);
  if (next.consumerSecret) next.consumerSecret = await decryptSecret(env, next.consumerSecret);
  return next;
}

async function encryptSecret(env, value) {
  const key = await encryptionKey(env);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

async function decryptSecret(env, value) {
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
  const secret = authSecret(env);
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function authSecret(env) {
  return env.SHOPIFY_TOKEN_ENCRYPTION_SECRET || env.SHOPIFY_API_SECRET || env.AUTH_SECRET || env.APP_PASSWORD || "";
}

function cleanStoreId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9_.:-]+/g, "-")
    .slice(0, 160);
}

function normalizeSiteUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.hostname}`.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function parseCookies(header) {
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
