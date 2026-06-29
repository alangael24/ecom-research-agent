import { readSession } from "../../_auth.js";
import { requireActiveUser } from "../../_shared/supabase.js";
import {
  createShopifyPage,
  getApiVersion,
  getConnectedStore,
  isValidShopDomain,
  json,
  normalizeShopifyDomain,
  requireShopifyConfig,
} from "../../_lib/shopify.js";

const MAX_PAYLOAD_LENGTH = 200000;
const MAX_TITLE_LENGTH = 255;
const MAX_HANDLE_LENGTH = 255;
const TOOL_PREFIX = "shopify:tool:";

const PAGE_RUNTIME_CATEGORIES = new Set([
  "constructor de paginas y secciones",
  "quiz y recomendacion",
  "soporte y confianza",
  "prueba social y reviews",
  "captura de leads y popups",
  "devoluciones y postcompra",
  "herramienta ecommerce personalizada",
]);

const DEEP_RUNTIME_CATEGORIES = new Set([
  "busqueda, filtros y merchandising",
  "retencion y mensajes",
  "tracking y analytics",
  "ofertas, bundles y carrito",
  "lealtad y referidos",
  "suscripciones y membresias",
]);

export async function onRequestPost(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const authorized = await authorizeToolRequest(request, env);
  if (!authorized) {
    return json({ ok: false, code: "auth_required", message: "Inicia sesion para crear herramientas en Shopify." }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const validationError = validateToolPayload(payload);
  if (validationError) {
    return json({ ok: false, code: "invalid_payload", message: validationError }, 400);
  }

  const report = payload.report;
  const runtime = toolRuntimeSupport(report);
  if (!runtime.supported) {
    return json(
      {
        ok: false,
        code: "tool_runtime_not_supported",
        message: runtime.message,
        nextRuntime: runtime.nextRuntime,
      },
      422,
    );
  }

  const shop = normalizeShopifyDomain(payload.shop);
  const store = await getConnectedStore(env, shop);
  if (!store) {
    return json(
      {
        ok: false,
        code: "shop_not_connected",
        message: "Esta tienda no esta conectada. Vuelve a iniciar sesion con Shopify.",
      },
      404,
    );
  }

  const pageDraft = buildToolPageDraft(report);

  try {
    const page = await createShopifyPage({
      shop,
      accessToken: store.accessToken,
      apiVersion: getApiVersion(env),
      page: pageDraft,
    });
    const publicUrl = buildPublicPageUrl(store, shop, page.handle);
    const adminId = numericShopifyId(page.id);
    const adminUrl = adminId ? `https://${shop}/admin/pages/${adminId}` : `https://${shop}/admin/pages`;
    const toolRecord = buildToolRecord({
      shop,
      report,
      page,
      pageDraft,
      runtime,
      publicUrl,
      adminUrl,
    });
    let registryWarning = "";
    try {
      await saveToolRecord(env, toolRecord);
    } catch (registryError) {
      registryWarning = registryError instanceof Error ? registryError.message : "No se pudo guardar el registro de herramienta.";
    }

    return json({
      ok: true,
      tool: publicToolRecord(toolRecord),
      registryWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la herramienta en Shopify.";
    const needsScope = /scope|permission|forbidden|access denied|unauthorized/i.test(message) || error.status === 401 || error.status === 403;
    return json(
      {
        ok: false,
        code: needsScope ? "shopify_scope_required" : "shopify_tool_publish_failed",
        message: needsScope
          ? "Shopify no permitio crear la pagina. Reinstala la app para aceptar el permiso write_content."
          : message,
      },
      needsScope ? 403 : error.status || 502,
    );
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const authorized = await authorizeToolRequest(request, env);
  if (!authorized) {
    return json({ ok: false, code: "auth_required", message: "Inicia sesion para ver herramientas de Shopify." }, 401);
  }

  const url = new URL(request.url);
  const shop = normalizeShopifyDomain(url.searchParams.get("shop"));
  if (!isValidShopDomain(shop)) {
    return json({ ok: false, code: "invalid_shop", message: "Use a valid connected Shopify shop." }, 400);
  }

  const store = await getConnectedStore(env, shop);
  if (!store) {
    return json(
      {
        ok: false,
        code: "shop_not_connected",
        message: "Esta tienda no esta conectada. Vuelve a iniciar sesion con Shopify.",
      },
      404,
    );
  }

  const tools = await listToolRecords(env, shop);
  return json({
    ok: true,
    shop,
    tools: tools.map(publicToolRecord),
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "accept,authorization,content-type,x-app-password",
    },
  });
}

async function authorizeToolRequest(request, env) {
  if (env.APP_PASSWORD && request.headers.get("x-app-password") === env.APP_PASSWORD) return true;
  const session = await readSession(request, env).catch(() => null);
  if (session) return true;
  if (request.headers.get("authorization")) {
    try {
      await requireActiveUser(request, env);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function saveToolRecord(env, record) {
  await env.SHOPIFY_STORES.put(toolKey(record.shop, record.id), JSON.stringify(record));
}

async function listToolRecords(env, shop) {
  const records = [];
  let cursor;
  do {
    const page = await env.SHOPIFY_STORES.list({
      prefix: toolPrefix(shop),
      cursor,
      limit: 100,
    });
    cursor = page.cursor;
    for (const key of page.keys) {
      const record = await env.SHOPIFY_STORES.get(key.name, { type: "json" });
      if (record) records.push(record);
    }
  } while (cursor);

  return records.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

function buildToolRecord({ shop, report, page, pageDraft, runtime, publicUrl, adminUrl }) {
  const requested = report.requestedTool || {};
  const replacement = report.appReplacement || {};
  const now = new Date().toISOString();
  const id = numericShopifyId(page.id) || crypto.randomUUID();
  return {
    id,
    shop,
    source: "agentgenia_tool_factory",
    status: "active",
    title: page.title,
    handle: page.handle,
    category: pageDraft.category,
    mode: "shopify_page_mvp",
    runtime: runtime.runtime,
    publishMode: replacement.publishMode || "shopify_page_mvp",
    runtimeLabel: replacement.runtimeLabel || requested.runtimeLabel || "Page MVP publicable hoy",
    replaceabilityLevel: replacement.replaceabilityLevel || "crear ahora",
    limitations: runtime.limitations || [],
    requestedTool: {
      name: requested.name || page.title,
      category: requested.category || pageDraft.category,
      jobToBeDone: requested.jobToBeDone || "",
      desiredOutcome: requested.desiredOutcome || "",
    },
    appReplacement: {
      buildOrBuyDecision: replacement.buildOrBuyDecision || "",
      firstVersion: replacement.firstVersion || "",
      upgradePath: replacement.upgradePath || "",
    },
    shopifyPageId: page.id,
    url: publicUrl,
    adminUrl,
    createdAt: now,
    updatedAt: now,
  };
}

function publicToolRecord(record) {
  return {
    id: record.id,
    shop: record.shop,
    source: record.source || "agentgenia_tool_factory",
    status: record.status || "active",
    title: record.title || "",
    handle: record.handle || "",
    category: record.category || "",
    mode: record.mode || "",
    runtime: record.runtime || "",
    publishMode: record.publishMode || "",
    runtimeLabel: record.runtimeLabel || "",
    replaceabilityLevel: record.replaceabilityLevel || "",
    limitations: record.limitations || [],
    requestedTool: record.requestedTool || null,
    appReplacement: record.appReplacement || null,
    shopifyPageId: record.shopifyPageId || "",
    url: record.url || "",
    adminUrl: record.adminUrl || "",
    createdAt: record.createdAt || "",
    updatedAt: record.updatedAt || "",
  };
}

function toolPrefix(shop) {
  return `${TOOL_PREFIX}${shop}:`;
}

function toolKey(shop, id) {
  return `${toolPrefix(shop)}${id}`;
}

function validateToolPayload(payload) {
  if (!payload || typeof payload !== "object") return "Missing payload.";
  let payloadLength = 0;
  try {
    payloadLength = JSON.stringify(payload).length;
  } catch {
    return "Payload is not serializable.";
  }
  if (payloadLength > MAX_PAYLOAD_LENGTH) return "Payload is too large.";

  const shop = normalizeShopifyDomain(payload.shop);
  if (!isValidShopDomain(shop)) return "Use a valid connected Shopify shop.";

  const report = payload.report;
  if (!report || typeof report !== "object") return "Missing tool report.";
  if (report.type !== "tool_factory") return "Only Tool Factory reports can create Shopify tools.";

  const requested = report.requestedTool || {};
  if (!textField(requested.name, 120) && !textField(requested.category, 120)) {
    return "Missing tool name or category.";
  }
  return "";
}

function toolRuntimeSupport(report) {
  const category = cleanText(report?.requestedTool?.category, "herramienta ecommerce personalizada", 120).toLowerCase();
  const publishMode = cleanText(report?.appReplacement?.publishMode || report?.requestedTool?.publishMode, "", 80);
  const runtimeLabel = cleanText(report?.appReplacement?.runtimeLabel || report?.requestedTool?.runtimeLabel, "runtime avanzado", 120);
  if (publishMode && publishMode !== "shopify_page_mvp") {
    return {
      supported: false,
      nextRuntime: publishMode,
      message: `Esta herramienta necesita ${runtimeLabel}. Agent Genia ya puede planearla, pero no debe publicarla como Page simple.`,
    };
  }

  if (PAGE_RUNTIME_CATEGORIES.has(category)) {
    return {
      supported: true,
      runtime: "safe_shopify_page",
      limitations: [
        "Se publica como Page segura de Shopify, sin JavaScript custom ni edicion directa del theme.",
        "Sirve para validar la herramienta antes de convertirla en extension profunda.",
      ],
    };
  }

  if (DEEP_RUNTIME_CATEGORIES.has(category)) {
    return {
      supported: false,
      nextRuntime: "shopify_extension_required",
      message:
        "Esta herramienta requiere una capa mas profunda de Shopify (pixel, function, extension o proveedor de mensajes). Agent Genia ya puede planearla, pero no debe publicarla como Page simple.",
    };
  }

  return {
    supported: true,
    runtime: "safe_shopify_page",
    limitations: [
      "MVP de Page para validar demanda y copy antes de crear una app mas profunda.",
      "No modifica checkout, pixels, descuentos ni datos sensibles.",
    ],
  };
}

function buildToolPageDraft(report) {
  const requested = report.requestedTool || {};
  const brief = report.executiveBrief || {};
  const strategy = report.buildStrategy || {};
  const mvp = report.mvp || {};
  const category = cleanText(requested.category, "herramienta ecommerce personalizada", 120).toLowerCase();
  const toolName = cleanText(requested.name || mvp.name, "Herramienta Agent Genia", 90);
  const title = `${toolName} - Agent Genia`;
  const handle = normalizeHandle(`agent-genia-${toolName}-${Date.now().toString(36)}`);
  const included = cleanList(mvp.included, [
    "Configuracion guiada",
    "Preview antes de publicar",
    "Medicion simple para decidir si se mantiene",
  ]);
  const steps = cleanList(mvp.buildSteps, [
    "Lee esta pagina.",
    "Responde las preguntas o usa el CTA.",
    "Mide si ayuda a vender, capturar leads o reducir dudas.",
  ]);
  const html = [
    `<div class="agent-genia-tool" style="max-width:1100px;margin:0 auto;padding:32px 18px;font-family:inherit;color:#14201b;">`,
    renderHero({ toolName, requested, brief }),
    renderIncluded({ included, steps }),
    renderCategoryTool({ category, toolName, requested, mvp, strategy }),
    renderValidationBlock(report),
    `<p style="margin-top:30px;color:#5d6f68;font-size:13px;">Creado con Agent Genia Tool Factory. MVP reversible: si no aporta valor, se puede apagar sin romper la tienda.</p>`,
    `</div>`,
  ].join("");

  return {
    title: title.slice(0, MAX_TITLE_LENGTH),
    handle,
    bodyHtml: html,
    published: true,
    category,
  };
}

function renderHero({ toolName, requested, brief }) {
  const outcome = cleanText(requested.desiredOutcome, "ayudar al comprador y ahorrar una app innecesaria", 180);
  const thesis = cleanText(
    brief.valueThesis,
    "Esta herramienta resuelve una necesidad concreta de la tienda con una primera version pequena, medible y facil de apagar.",
    260,
  );
  return `<section style="border:1px solid #dbe5df;padding:28px;background:#f8fbf9;">
    <p style="margin:0 0 10px;color:#0f7b68;font-size:12px;font-weight:800;text-transform:uppercase;">Herramienta nativa MVP</p>
    <h1 style="font-size:clamp(32px,6vw,58px);line-height:1.02;margin:0 0 14px;">${escapeHtml(toolName)}</h1>
    <p style="font-size:19px;line-height:1.45;margin:0 0 18px;color:#32443d;">${escapeHtml(thesis)}</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">
      <span style="border:1px solid #dbe5df;padding:8px 10px;background:white;font-weight:700;">${escapeHtml(outcome)}</span>
      <span style="border:1px solid #dbe5df;padding:8px 10px;background:white;font-weight:700;">${escapeHtml(requested.category || "ecommerce")}</span>
    </div>
  </section>`;
}

function renderIncluded({ included, steps }) {
  return `<section style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:18px;">
    <article style="border:1px solid #dbe5df;padding:18px;">
      <h2 style="font-size:22px;margin:0 0 12px;">Que incluye</h2>
      ${renderList(included)}
    </article>
    <article style="border:1px solid #dbe5df;padding:18px;">
      <h2 style="font-size:22px;margin:0 0 12px;">Como se usa</h2>
      ${renderOrderedList(steps)}
    </article>
  </section>`;
}

function renderCategoryTool({ category, toolName, requested, mvp, strategy }) {
  if (category === "quiz y recomendacion") return renderQuizTool(toolName, requested);
  if (category === "soporte y confianza") return renderTrustTool(requested);
  if (category === "constructor de paginas y secciones") return renderPageBuilderTool(requested, mvp);
  if (category === "prueba social y reviews") return renderReviewTool(requested);
  if (category === "captura de leads y popups") return renderLeadCaptureTool(toolName, requested);
  if (category === "devoluciones y postcompra") return renderPostPurchaseTool(toolName, requested);
  return renderGenericTool(requested, mvp, strategy);
}

function renderQuizTool(toolName, requested) {
  const job = cleanText(requested.jobToBeDone, "recomendar la mejor opcion para cada comprador", 220);
  const questions = [
    "Que problema quieres resolver hoy?",
    "Que resultado esperas primero: rapido, profundo o simple?",
    "Que te detiene antes de comprar?",
  ];
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 8px;">Quiz recomendador</h2>
    <p style="color:#5d6f68;line-height:1.55;margin:0 0 18px;">${escapeHtml(job)}</p>
    <form method="post" action="/contact#contact_form" style="display:grid;gap:16px;">
      <input type="hidden" name="form_type" value="contact">
      <input type="hidden" name="utf8" value="&#10003;">
      <input type="hidden" name="contact[subject]" value="${escapeHtml(toolName)}">
      ${questions
        .map(
          (question, index) => `<label style="display:grid;gap:8px;font-weight:800;">
            ${escapeHtml(question)}
            <input name="contact[quiz_${index + 1}]" type="text" style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="Escribe tu respuesta">
          </label>`,
        )
        .join("")}
      <label style="display:grid;gap:8px;font-weight:800;">
        Email para enviarte recomendacion
        <input name="contact[email]" type="email" required style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="tu@email.com">
      </label>
      <button type="submit" style="min-height:48px;background:#14201b;color:white;border:0;font-weight:900;padding:0 18px;">Recibir recomendacion</button>
    </form>
  </section>`;
}

function renderTrustTool(requested) {
  const faqs = [
    ["Como se si esto es para mi?", cleanText(requested.jobToBeDone, "Si tienes esta duda, esta pagina resume la opcion mas segura para empezar.", 180)],
    ["Cuanto tarda?", "El primer paso es simple: revisar la informacion, elegir una opcion y contactar a la tienda si necesitas ayuda."],
    ["Que pasa si no me funciona?", "La tienda debe dejar clara la politica de cambios, soporte y garantia antes de que compres."],
  ];
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 14px;">Centro de confianza</h2>
    ${faqs
      .map(
        ([question, answer]) => `<details style="border-top:1px solid #dbe5df;padding:14px 0;">
          <summary style="cursor:pointer;font-weight:900;">${escapeHtml(question)}</summary>
          <p style="color:#5d6f68;line-height:1.55;">${escapeHtml(answer)}</p>
        </details>`,
      )
      .join("")}
    <a href="/pages/contact" style="display:inline-flex;margin-top:16px;background:#14201b;color:white;text-decoration:none;font-weight:900;padding:14px 18px;">Contactar a la tienda</a>
  </section>`;
}

function renderPageBuilderTool(requested, mvp) {
  const benefits = cleanList(mvp.included, [
    "Mensaje claro arriba del fold.",
    "Beneficios faciles de escanear.",
    "Objeciones resueltas antes del CTA.",
  ]).slice(0, 4);
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:34px;line-height:1.08;margin:0 0 12px;">${escapeHtml(cleanText(requested.desiredOutcome, "Pagina de conversion simple", 140))}</h2>
    <p style="font-size:18px;color:#5d6f68;line-height:1.55;">${escapeHtml(cleanText(requested.jobToBeDone, "Publicar una pagina clara sin pagar un page builder pesado.", 220))}</p>
    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-top:18px;">
      ${benefits
        .map(
          (benefit) => `<article style="border:1px solid #dbe5df;padding:14px;background:#f8fbf9;">
            <strong>${escapeHtml(benefit)}</strong>
          </article>`,
        )
        .join("")}
    </div>
    <a href="/collections/all" style="display:inline-flex;margin-top:18px;background:#14201b;color:white;text-decoration:none;font-weight:900;padding:14px 18px;">Ver productos</a>
  </section>`;
}

function renderReviewTool(requested) {
  const job = cleanText(requested.jobToBeDone, "capturar prueba social basica y mostrarla de forma clara", 220);
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 8px;">Reviews ligeras</h2>
    <p style="color:#5d6f68;line-height:1.55;margin:0 0 18px;">${escapeHtml(job)}</p>
    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:18px;">
      ${["Me dio confianza para comprar.", "La explicacion fue clara.", "El soporte respondio rapido."]
        .map(
          (quote) => `<blockquote style="border:1px solid #dbe5df;margin:0;padding:14px;background:#f8fbf9;">
            <p style="margin:0 0 8px;color:#32443d;">${escapeHtml(quote)}</p>
            <strong>Cliente verificado</strong>
          </blockquote>`,
        )
        .join("")}
    </div>
    <form method="post" action="/contact#contact_form" style="display:grid;gap:12px;">
      <input type="hidden" name="form_type" value="contact">
      <input type="hidden" name="utf8" value="&#10003;">
      <input type="hidden" name="contact[subject]" value="Nueva review">
      <input name="contact[email]" type="email" required style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="Email">
      <textarea name="contact[review]" rows="4" style="border:1px solid #cbd8d1;padding:10px;" placeholder="Cuenta tu experiencia"></textarea>
      <button type="submit" style="min-height:48px;background:#14201b;color:white;border:0;font-weight:900;padding:0 18px;">Enviar review</button>
    </form>
  </section>`;
}

function renderLeadCaptureTool(toolName, requested) {
  const outcome = cleanText(requested.desiredOutcome, "recibir una recomendacion, descuento o seguimiento", 180);
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 8px;">Captura de leads</h2>
    <p style="color:#5d6f68;line-height:1.55;margin:0 0 18px;">Deja tus datos para ${escapeHtml(outcome)}.</p>
    <form method="post" action="/contact#contact_form" style="display:grid;gap:12px;">
      <input type="hidden" name="form_type" value="contact">
      <input type="hidden" name="utf8" value="&#10003;">
      <input type="hidden" name="contact[subject]" value="${escapeHtml(toolName)}">
      <input name="contact[email]" type="email" required style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="Email">
      <input name="contact[name]" type="text" style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="Nombre">
      <textarea name="contact[body]" rows="3" style="border:1px solid #cbd8d1;padding:10px;" placeholder="Que estas buscando?"></textarea>
      <p style="font-size:13px;color:#5d6f68;margin:0;">Al enviar, aceptas que la tienda te contacte sobre esta solicitud.</p>
      <button type="submit" style="min-height:48px;background:#14201b;color:white;border:0;font-weight:900;padding:0 18px;">Enviar solicitud</button>
    </form>
  </section>`;
}

function renderPostPurchaseTool(toolName, requested) {
  const job = cleanText(requested.jobToBeDone, "recibir solicitudes postcompra claras sin friccion", 220);
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 8px;">Portal postcompra</h2>
    <p style="color:#5d6f68;line-height:1.55;margin:0 0 18px;">${escapeHtml(job)}</p>
    <form method="post" action="/contact#contact_form" style="display:grid;gap:12px;">
      <input type="hidden" name="form_type" value="contact">
      <input type="hidden" name="utf8" value="&#10003;">
      <input type="hidden" name="contact[subject]" value="${escapeHtml(toolName)}">
      <input name="contact[email]" type="email" required style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="Email de compra">
      <input name="contact[order]" type="text" style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="Numero de orden">
      <textarea name="contact[request]" rows="4" style="border:1px solid #cbd8d1;padding:10px;" placeholder="Describe cambio, devolucion o duda"></textarea>
      <button type="submit" style="min-height:48px;background:#14201b;color:white;border:0;font-weight:900;padding:0 18px;">Enviar solicitud</button>
    </form>
  </section>`;
}

function renderGenericTool(requested, mvp, strategy) {
  const actions = cleanList(strategy.adminActions, cleanList(mvp.acceptanceCriteria, ["Probar herramienta", "Medir resultado", "Decidir si mantener"]));
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 8px;">Herramienta operativa</h2>
    <p style="color:#5d6f68;line-height:1.55;margin:0 0 16px;">${escapeHtml(cleanText(requested.jobToBeDone, "Resolver una necesidad repetida de la tienda.", 220))}</p>
    ${renderOrderedList(actions)}
    <a href="/pages/contact" style="display:inline-flex;margin-top:16px;background:#14201b;color:white;text-decoration:none;font-weight:900;padding:14px 18px;">Solicitar ayuda</a>
  </section>`;
}

function renderValidationBlock(report) {
  const validation = cleanList(report.validationPlan, ["Medir visitas, clicks y respuestas durante 7 dias.", "Apagar o iterar si no genera valor claro."]);
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:18px;background:#fff8ed;">
    <h2 style="font-size:22px;margin:0 0 12px;">Como decidir si vale la pena</h2>
    ${renderOrderedList(validation)}
  </section>`;
}

function renderList(items) {
  return `<ul style="margin:0;padding-left:20px;color:#5d6f68;line-height:1.65;">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderOrderedList(items) {
  return `<ol style="margin:0;padding-left:20px;color:#5d6f68;line-height:1.65;">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function cleanList(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => cleanText(item, "", 220)).filter(Boolean).slice(0, 8);
}

function cleanText(value, fallback = "", maxLength = 500) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return text || fallback;
}

function textField(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function normalizeHandle(value) {
  const base = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HANDLE_LENGTH);
  return base || `agent-genia-tool-${Date.now().toString(36)}`;
}

function buildPublicPageUrl(store, shop, handle) {
  const base = store.shopInfo?.primaryUrl || `https://${store.shopInfo?.primaryDomain || shop}`;
  return `${String(base).replace(/\/$/, "")}/pages/${handle}`;
}

function numericShopifyId(value) {
  const id = String(value || "").split("/").pop();
  return /^\d+$/.test(id) ? id : "";
}
