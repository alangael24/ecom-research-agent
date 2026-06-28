const SESSION_COOKIE = "agent_genia_session";
const GOOGLE_STATE_COOKIE = "agent_genia_google_state";
const SHOPIFY_STATE_COOKIE = "agent_genia_shopify_state";
const SHOPIFY_SHOP_COOKIE = "agent_genia_shopify_shop";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const STATE_TTL_SECONDS = 60 * 10;

export { GOOGLE_STATE_COOKIE, SESSION_COOKIE, SHOPIFY_SHOP_COOKIE, SHOPIFY_STATE_COOKIE };

export async function readSession(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;

  const expected = await signValue(payloadPart, env);
  if (!timingSafeEqual(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(decodeBase64UrlToString(payloadPart));
  } catch {
    return null;
  }

  if (!payload?.email || !payload?.provider || !payload?.exp) return null;
  if (Date.now() > Number(payload.exp) * 1000) return null;
  return payload;
}

export async function createSessionCookie(user, env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    provider: user.provider,
    email: user.email,
    name: user.name || user.email,
    avatar: user.avatar || "",
    shop: user.shop || "",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const signature = await signValue(payloadPart, env);
  return cookie(SESSION_COOKIE, `${payloadPart}.${signature}`, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    sameSite: "Lax",
    secure: true,
  });
}

export function clearSessionCookie() {
  return cookie(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    sameSite: "Lax",
    secure: true,
  });
}

export function createStateCookie(name, value) {
  return cookie(name, value, {
    httpOnly: true,
    maxAge: STATE_TTL_SECONDS,
    path: "/api/auth",
    sameSite: "Lax",
    secure: true,
  });
}

export function clearStateCookie(name) {
  return cookie(name, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth",
    sameSite: "Lax",
    secure: true,
  });
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .map((item) => item.split("="))
    .find(([key]) => key === name)?.[1] || "";
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function redirect(location, headers = []) {
  const responseHeaders = new Headers({ location });
  for (const header of headers) {
    responseHeaders.append("set-cookie", header);
  }
  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
}

export function getOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function sanitizeRelativePath(value, fallback = "/") {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

export function authSecret(env) {
  return env.AUTH_SECRET || env.SHOPIFY_TOKEN_ENCRYPTION_SECRET || env.HARNESS_TOKEN || env.APP_PASSWORD || "";
}

export function normalizeShopDomain(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!cleaned) return "";
  const shop = cleaned.includes(".") ? cleaned : `${cleaned}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return "";
  return shop;
}

export async function verifyShopifyHmac(searchParams, secret) {
  const hmac = searchParams.get("hmac") || "";
  if (!hmac || !secret) return false;
  const pairs = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const digest = await hmacHex(secret, pairs.join("&"));
  return timingSafeEqual(hmac, digest);
}

async function signValue(value, env) {
  const secret = authSecret(env);
  if (!secret) throw new Error("AUTH_SECRET or SHOPIFY_TOKEN_ENCRYPTION_SECRET is required.");
  const bytes = await hmacSha256(secret, value);
  return encodeBytesBase64Url(new Uint8Array(bytes));
}

async function hmacHex(secret, value) {
  const bytes = new Uint8Array(await hmacSha256(secret, value));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${value}`, `Path=${options.path || "/"}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function encodeBase64Url(value) {
  return encodeBytesBase64Url(new TextEncoder().encode(value));
}

function encodeBytesBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64UrlToString(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
