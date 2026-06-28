import { readSession } from "../../_auth.js";
import {
  createShopifyPage,
  getApiVersion,
  getConnectedStore,
  isValidShopDomain,
  json,
  normalizeShopifyDomain,
  requireShopifyConfig,
} from "../../_lib/shopify.js";

const MAX_TITLE_LENGTH = 255;
const MAX_HANDLE_LENGTH = 255;
const MAX_BODY_LENGTH = 200000;

export async function onRequestPost(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const passwordOk = env.APP_PASSWORD && request.headers.get("x-app-password") === env.APP_PASSWORD;
  const session = passwordOk ? null : await readSession(request, env);
  if (!passwordOk && !session) {
    return json({ ok: false, code: "auth_required", message: "Inicia sesión para publicar en Shopify." }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const validationError = validatePagePayload(payload);
  if (validationError) {
    return json({ ok: false, code: "invalid_payload", message: validationError }, 400);
  }

  const shop = normalizeShopifyDomain(payload.shop);
  const store = await getConnectedStore(env, shop);
  if (!store) {
    return json(
      {
        ok: false,
        code: "shop_not_connected",
        message: "Esta tienda no esta conectada. Vuelve a iniciar sesión con Shopify.",
      },
      404,
    );
  }

  try {
    const page = await createShopifyPage({
      shop,
      accessToken: store.accessToken,
      apiVersion: getApiVersion(env),
      page: {
        title: payload.title.trim(),
        handle: normalizeHandle(payload.handle || payload.title),
        bodyHtml: payload.bodyHtml.trim(),
        published: payload.published !== false,
      },
    });
    const publicUrl = buildPublicPageUrl(store, shop, page.handle);
    const adminId = numericShopifyId(page.id);

    return json({
      ok: true,
      page: {
        id: page.id,
        title: page.title,
        handle: page.handle,
        author: page.author || "",
        publishedAt: page.published_at || "",
        createdAt: page.created_at || "",
        updatedAt: page.updated_at || "",
        url: publicUrl,
        adminUrl: adminId ? `https://${shop}/admin/pages/${adminId}` : `https://${shop}/admin/pages`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo publicar la página en Shopify.";
    const needsScope = /scope|permission|forbidden|access denied|unauthorized/i.test(message) || error.status === 401 || error.status === 403;
    return json(
      {
        ok: false,
        code: needsScope ? "shopify_scope_required" : "shopify_page_publish_failed",
        message: needsScope
          ? "Shopify no permitió crear la página. Reinstala la app para aceptar el permiso write_content."
          : message,
      },
      needsScope ? 403 : error.status || 502,
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-app-password",
    },
  });
}

function validatePagePayload(payload) {
  if (!payload || typeof payload !== "object") return "Missing payload.";
  const shop = normalizeShopifyDomain(payload.shop);
  if (!isValidShopDomain(shop)) return "Use a valid connected Shopify shop.";
  if (!textField(payload.title, MAX_TITLE_LENGTH)) return "Missing or invalid page title.";
  if (payload.handle && !textField(payload.handle, MAX_HANDLE_LENGTH)) return "Invalid page handle.";
  if (!textField(payload.bodyHtml, MAX_BODY_LENGTH)) return "Missing or invalid page HTML.";
  if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(payload.bodyHtml)) {
    return "Page HTML cannot include scripts or inline JavaScript handlers.";
  }
  return "";
}

function textField(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function normalizeHandle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HANDLE_LENGTH) || `page-${Date.now()}`;
}

function buildPublicPageUrl(store, shop, handle) {
  const base = store.shopInfo?.primaryUrl || `https://${store.shopInfo?.primaryDomain || shop}`;
  return `${String(base).replace(/\/$/, "")}/pages/${handle}`;
}

function numericShopifyId(value) {
  const id = String(value || "").split("/").pop();
  return /^\d+$/.test(id) ? id : "";
}
