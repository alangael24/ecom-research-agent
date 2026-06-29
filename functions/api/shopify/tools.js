import { readSession } from "../../_auth.js";
import { requireActiveUser } from "../../_shared/supabase.js";
import {
  createShopifyPage,
  fetchMainThemeFiles,
  fetchShopifyPage,
  findShopifyPageByHandle,
  getApiVersion,
  getConnectedStore,
  isValidShopDomain,
  json,
  normalizeShopifyDomain,
  requireShopifyConfig,
  updateShopifyPage,
  upsertShopifyThemeFiles,
  waitForShopifyJob,
} from "../../_lib/shopify.js";

const MAX_PAYLOAD_LENGTH = 200000;
const MAX_TITLE_LENGTH = 255;
const MAX_HANDLE_LENGTH = 255;
const TOOL_PREFIX = "shopify:tool:";
const PAGE_BACKUP_PREFIX = "shopify:page-backup:";
const THEME_SECTION_FILENAME = "sections/agent-genia-tool.liquid";
const TOOL_STATUSES = new Set(["active", "paused", "archived"]);

const THEME_BLOCK_RUNTIME_CATEGORIES = new Set([
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
  const targetPage = normalizeTargetPage(payload.targetPage);

  if (targetPage) {
    try {
      const result = await installToolThemeTemplateBlock({
        env,
        shop,
        store,
        report,
        runtime,
        targetPage,
      });
      return json({
        ok: true,
        tool: publicToolRecord(result.toolRecord),
        installedThemeBlock: true,
        backupKey: result.backupKey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo instalar la herramienta en el theme.";
      const needsScope = /scope|permission|forbidden|access denied|unauthorized/i.test(message) || error.status === 401 || error.status === 403;
      return json(
        {
          ok: false,
          code: needsScope ? "shopify_scope_required" : error.code || "shopify_theme_tool_install_failed",
          message: needsScope
            ? "Shopify no permitio leer o escribir archivos del theme. Reinstala la app para aceptar read_themes/write_themes y confirma que write_themes este autorizado."
            : message,
        },
        needsScope ? 403 : error.status || 502,
      );
    }
  }

  if (runtime.runtime === "theme_template_block") {
    return json(
      {
        ok: false,
        code: "target_page_required",
        message: "Para instalar esta herramienta en el theme necesito la URL o handle de la LP existente. Ejemplo: /pages/mi-landing.",
      },
      400,
    );
  }

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

export async function onRequestPatch(context) {
  const { request, env } = context;
  const configError = requireShopifyConfig(env);
  if (configError) {
    return json({ ok: false, code: "shopify_not_configured", message: configError }, 503);
  }

  const authorized = await authorizeToolRequest(request, env);
  if (!authorized) {
    return json({ ok: false, code: "auth_required", message: "Inicia sesion para gestionar herramientas de Shopify." }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  const shop = normalizeShopifyDomain(payload.shop);
  if (!isValidShopDomain(shop)) {
    return json({ ok: false, code: "invalid_shop", message: "Use a valid connected Shopify shop." }, 400);
  }
  const id = cleanText(payload.id, "", 80);
  if (!id) {
    return json({ ok: false, code: "invalid_tool", message: "Missing tool id." }, 400);
  }
  const hasReportUpdate = payload.report && typeof payload.report === "object";
  const status = cleanText(payload.status || (hasReportUpdate ? "active" : ""), "", 30).toLowerCase();
  if (!hasReportUpdate && !TOOL_STATUSES.has(status)) {
    return json({ ok: false, code: "invalid_status", message: "Use active, paused, or archived." }, 400);
  }
  if (status && !TOOL_STATUSES.has(status)) {
    return json({ ok: false, code: "invalid_status", message: "Use active, paused, or archived." }, 400);
  }
  if (hasReportUpdate) {
    const validationError = validateToolReportPayload(payload.report);
    if (validationError) {
      return json({ ok: false, code: "invalid_payload", message: validationError }, 400);
    }
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

  const key = toolKey(shop, id);
  const record = await env.SHOPIFY_STORES.get(key, { type: "json" });
  if (!record) {
    return json({ ok: false, code: "tool_not_found", message: "No se encontro esta herramienta." }, 404);
  }

  if (hasReportUpdate) {
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

    const pageId = shopifyPageGid(record.shopifyPageId || record.id);
    if (!pageId) {
      return json({ ok: false, code: "missing_shopify_page", message: "Esta herramienta no tiene una pagina de Shopify actualizable." }, 409);
    }

    const pageDraft = buildToolPageDraft(report);
    if (record.handle) pageDraft.handle = normalizeHandle(record.handle);

    try {
      const page = await updateShopifyPage({
        shop,
        accessToken: store.accessToken,
        apiVersion: getApiVersion(env),
        id: pageId,
        page: pageDraft,
      });
      const publicUrl = buildPublicPageUrl(store, shop, page.handle);
      const adminId = numericShopifyId(page.id);
      const adminUrl = adminId ? `https://${shop}/admin/pages/${adminId}` : record.adminUrl || `https://${shop}/admin/pages`;
      const updatedRecord = buildUpdatedToolRecord({
        record,
        report,
        page,
        pageDraft,
        runtime,
        publicUrl,
        adminUrl,
        status: status || "active",
        statusReason: cleanText(payload.reason, "", 180),
      });
      await saveToolRecord(env, updatedRecord);
      return json({ ok: true, tool: publicToolRecord(updatedRecord), updatedPage: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la herramienta en Shopify.";
      const needsScope = /scope|permission|forbidden|access denied|unauthorized/i.test(message) || error.status === 401 || error.status === 403;
      return json(
        {
          ok: false,
          code: needsScope ? "shopify_scope_required" : "shopify_tool_update_failed",
          message: needsScope
            ? "Shopify no permitio actualizar la pagina. Reinstala la app para aceptar el permiso write_content."
            : message,
        },
        needsScope ? 403 : error.status || 502,
      );
    }
  }

  const updatedRecord = {
    ...record,
    status,
    statusReason: cleanText(payload.reason, "", 180),
    updatedAt: new Date().toISOString(),
  };
  await saveToolRecord(env, updatedRecord);
  return json({ ok: true, tool: publicToolRecord(updatedRecord) });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,PATCH,POST,OPTIONS",
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
    runtimeLabel: replacement.runtimeLabel || requested.runtimeLabel || "Pagina Shopify legacy",
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
    toolSpec: normalizeToolSpec(report.toolSpec),
    shopifyPageId: page.id,
    url: publicUrl,
    adminUrl,
    createdAt: now,
    updatedAt: now,
  };
}

function buildUpdatedToolRecord({ record, report, page, pageDraft, runtime, publicUrl, adminUrl, status, statusReason }) {
  const nextRecord = buildToolRecord({
    shop: record.shop,
    report,
    page,
    pageDraft,
    runtime,
    publicUrl,
    adminUrl,
  });
  const now = new Date().toISOString();
  return {
    ...record,
    ...nextRecord,
    id: record.id,
    shop: record.shop,
    status,
    statusReason,
    createdAt: record.createdAt || nextRecord.createdAt,
    updatedAt: now,
    lastSyncedAt: now,
  };
}

function publicToolRecord(record) {
  return {
    id: record.id,
    shop: record.shop,
    source: record.source || "agentgenia_tool_factory",
    status: record.status || "active",
    statusReason: record.statusReason || "",
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
    toolSpec: record.toolSpec || null,
    shopifyPageId: record.shopifyPageId || "",
    url: record.url || "",
    adminUrl: record.adminUrl || "",
    injection: record.injection || null,
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
  if (payload.targetPage && !normalizeTargetPage(payload.targetPage)) {
    return "Target page must include a Shopify Page id, /pages/ handle, or Shopify Page URL.";
  }
  return "";
}

function validateToolReportPayload(report) {
  let payloadLength = 0;
  try {
    payloadLength = JSON.stringify(report).length;
  } catch {
    return "Tool report is not serializable.";
  }
  if (payloadLength > MAX_PAYLOAD_LENGTH) return "Tool report is too large.";
  if (!report || typeof report !== "object") return "Missing tool report.";
  if (report.type !== "tool_factory") return "Only Tool Factory reports can update Shopify tools.";
  const requested = report.requestedTool || {};
  if (!textField(requested.name, 120) && !textField(requested.category, 120)) {
    return "Missing tool name or category.";
  }
  return "";
}

function toolRuntimeSupport(report) {
  const category = cleanText(report?.requestedTool?.category, "herramienta ecommerce personalizada", 120).toLowerCase();
  const publishMode = cleanText(report?.appReplacement?.publishMode || report?.requestedTool?.publishMode, "", 80);
  const runtimeLabel = cleanText(report?.appReplacement?.runtimeLabel || report?.requestedTool?.runtimeLabel, "runtime de theme", 120);
  if (publishMode && publishMode !== "theme_template_block" && publishMode !== "shopify_page_mvp") {
    return {
      supported: false,
      nextRuntime: publishMode,
      message: `Esta herramienta necesita ${runtimeLabel}. Agent Genia puede planearla, pero no debe fingir ejecucion sin ese runtime.`,
    };
  }

  if (publishMode === "shopify_page_mvp") {
    return {
      supported: true,
      runtime: "safe_shopify_page",
      limitations: [
        "Runtime legacy para herramientas que nacen como pagina nueva de Shopify.",
        "No se usa para modificar LPs existentes cuando el usuario pide instalar una seccion o bloque.",
      ],
    };
  }

  if (THEME_BLOCK_RUNTIME_CATEGORIES.has(category) || publishMode === "theme_template_block") {
    return {
      supported: true,
      runtime: "theme_template_block",
      limitations: [
        "Crea o actualiza un template JSON del theme principal.",
        "Instala una seccion nativa Agent Genia y asigna la Page objetivo a ese template.",
      ],
    };
  }

  if (DEEP_RUNTIME_CATEGORIES.has(category)) {
    return {
      supported: false,
      nextRuntime: "shopify_extension_required",
      message:
        "Esta herramienta requiere una capa mas profunda de Shopify (pixel, function, extension o proveedor de mensajes). Agent Genia puede planearla, pero no debe fingir ejecucion sin ese runtime.",
    };
  }

  return {
    supported: true,
    runtime: "theme_template_block",
    limitations: [
      "Instala una seccion nativa en un template de Page existente.",
      "No modifica checkout, pixels, descuentos ni datos sensibles.",
    ],
  };
}

function buildToolPageDraft(report) {
  const requested = report.requestedTool || {};
  const brief = report.executiveBrief || {};
  const strategy = report.buildStrategy || {};
  const mvp = report.mvp || {};
  const toolSpec = normalizeToolSpec(report.toolSpec);
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
    renderCategoryTool({ category, toolName, requested, mvp, strategy, toolSpec }),
    renderToolSpecSummary(toolSpec),
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

async function installToolThemeTemplateBlock({ env, shop, store, report, runtime, targetPage }) {
  const apiVersion = getApiVersion(env);
  const existingPage = await resolveTargetShopifyPage({
    shop,
    accessToken: store.accessToken,
    apiVersion,
    targetPage,
  });
  if (!existingPage) {
    const error = new Error("No encontre esa Shopify Page. Usa una URL tipo /pages/tu-landing o el handle exacto.");
    error.status = 404;
    error.code = "target_page_not_found";
    throw error;
  }

  const currentTemplateFilename = pageTemplateFilename(existingPage.templateSuffix);
  const templateSuffix = agentGeniaTemplateSuffix(existingPage);
  const templateFilename = pageTemplateFilename(templateSuffix);
  const sectionDraft = buildThemeToolSection(report, existingPage, targetPage);
  const theme = await fetchMainThemeFiles({
    shop,
    accessToken: store.accessToken,
    apiVersion,
    filenames: [...new Set([currentTemplateFilename, templateFilename, THEME_SECTION_FILENAME])],
  });
  const files = themeFileMap(theme);
  const templateSource = files.get(templateFilename) || files.get(currentTemplateFilename) || "";
  const templateJson = installSectionInTemplate(
    parsePageTemplateJson(templateSource, templateSource ? templateFilename : currentTemplateFilename),
    sectionDraft,
  );

  const backupKey = await saveThemeTemplateBackup(env, {
    shop,
    page: existingPage,
    targetPage,
    report,
    theme,
    previousTemplateFilename: currentTemplateFilename,
    nextTemplateFilename: templateFilename,
    previousTemplateContent: files.get(templateFilename) || "",
    baseTemplateContent: files.get(currentTemplateFilename) || "",
    previousSectionContent: files.get(THEME_SECTION_FILENAME) || "",
  });

  const themeUpsert = await upsertShopifyThemeFiles({
    shop,
    accessToken: store.accessToken,
    apiVersion,
    themeId: theme.id,
    files: [
      { filename: THEME_SECTION_FILENAME, content: buildAgentGeniaThemeSectionLiquid() },
      { filename: templateFilename, content: `${JSON.stringify(templateJson, null, 2)}\n` },
    ],
  });
  if (themeUpsert.jobId) {
    await waitForShopifyJob({
      shop,
      accessToken: store.accessToken,
      apiVersion,
      jobId: themeUpsert.jobId,
      attempts: 8,
      delayMs: 500,
    });
  }

  const page = await updateShopifyPage({
    shop,
    accessToken: store.accessToken,
    apiVersion,
    id: existingPage.id,
    page: {
      title: existingPage.title,
      handle: existingPage.handle,
      bodyHtml: existingPage.bodyHtml,
      published: existingPage.isPublished,
      templateSuffix,
    },
  });
  const publicUrl = buildPublicPageUrl(store, shop, page.handle);
  const adminId = numericShopifyId(page.id);
  const adminUrl = adminId ? `https://${shop}/admin/pages/${adminId}` : `https://${shop}/admin/pages`;
  const now = new Date().toISOString();
  const id = `theme-${numericShopifyId(page.id) || normalizeHandle(page.handle)}-${sectionDraft.categorySlug}`;
  const requested = report.requestedTool || {};
  const replacement = report.appReplacement || {};
  const toolRecord = {
    id,
    shop,
    source: "agentgenia_tool_factory",
    status: "active",
    title: `${sectionDraft.toolName} en ${page.title}`,
    handle: page.handle,
    category: sectionDraft.category,
    mode: "theme_template_block",
    runtime: runtime.runtime,
    publishMode: "theme_template_block",
    runtimeLabel: "Bloque nativo en template del theme",
    replaceabilityLevel: replacement.replaceabilityLevel || "crear ahora",
    limitations: runtime.limitations || [],
    requestedTool: {
      name: requested.name || sectionDraft.toolName,
      category: requested.category || sectionDraft.category,
      jobToBeDone: requested.jobToBeDone || "",
      desiredOutcome: requested.desiredOutcome || "",
    },
    appReplacement: {
      buildOrBuyDecision: replacement.buildOrBuyDecision || "",
      firstVersion: replacement.firstVersion || "",
      upgradePath: replacement.upgradePath || "",
    },
    toolSpec: normalizeToolSpec(report.toolSpec),
    shopifyPageId: page.id,
    url: publicUrl,
    adminUrl,
    injection: {
      runtime: "theme_template_block",
      themeId: theme.id,
      themeName: theme.name,
      targetPageId: page.id,
      targetPageHandle: page.handle,
      targetPageTitle: page.title,
      previousTemplateSuffix: existingPage.templateSuffix || "",
      templateSuffix,
      templateFilename,
      sectionFilename: THEME_SECTION_FILENAME,
      sectionKey: sectionDraft.sectionKey,
      placement: sectionDraft.placement,
      backupKey,
      installedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: now,
  };
  await saveToolRecord(env, toolRecord);
  return { toolRecord, backupKey };
}

async function resolveTargetShopifyPage({ shop, accessToken, apiVersion, targetPage }) {
  if (targetPage.id) {
    return fetchShopifyPage({ shop, accessToken, apiVersion, id: shopifyPageGid(targetPage.id) });
  }
  if (targetPage.handle) {
    return findShopifyPageByHandle({ shop, accessToken, apiVersion, handle: targetPage.handle });
  }
  return null;
}

async function saveThemeTemplateBackup(env, { shop, page, targetPage, report, theme, previousTemplateFilename, nextTemplateFilename, previousTemplateContent, baseTemplateContent, previousSectionContent }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = numericShopifyId(page.id) || normalizeHandle(page.handle);
  const key = `${PAGE_BACKUP_PREFIX}${shop}:${id}:${timestamp}`;
  await env.SHOPIFY_STORES.put(
    key,
    JSON.stringify({
      shop,
      pageId: page.id,
      title: page.title,
      handle: page.handle,
      templateSuffix: page.templateSuffix || "",
      bodyHtml: page.bodyHtml,
      theme: {
        id: theme.id,
        name: theme.name,
        role: theme.role,
      },
      previousTemplateFilename,
      nextTemplateFilename,
      previousTemplateContent,
      baseTemplateContent,
      previousSectionContent,
      targetPage,
      requestedTool: report.requestedTool || null,
      createdAt: new Date().toISOString(),
    }),
  );
  return key;
}

function buildThemeToolSection(report, targetPage, targetRequest = {}) {
  const requested = report.requestedTool || {};
  const mvp = report.mvp || {};
  const toolSpec = normalizeToolSpec(report.toolSpec);
  const category = cleanText(requested.category, "herramienta ecommerce personalizada", 120).toLowerCase();
  const categorySlug = normalizeHandle(category).slice(0, 80);
  const sectionSlug = categorySlug.replace(/-/g, "_") || "tool";
  const toolName = cleanText(requested.name || mvp.name, "Herramienta Agent Genia", 90);
  const placement = normalizePlacement(targetRequest.placement || "end");
  const fields = cleanToolSpecFields(toolSpec);
  const defaults = defaultThemeFieldLabels(category);
  return {
    sectionKey: `agent_genia_${sectionSlug}`,
    categorySlug,
    category,
    toolName,
    placement,
    settings: {
      tool_name: toolName,
      category,
      eyebrow: "Seccion Agent Genia",
      value_thesis: cleanText(report.executiveBrief?.valueThesis, "Herramienta nativa creada para resolver una necesidad concreta sin instalar otra app.", 360),
      job_to_be_done: cleanText(requested.jobToBeDone, `Ayudar al visitante de ${targetPage.title || targetPage.handle || "esta pagina"}.`, 360),
      desired_outcome: cleanText(requested.desiredOutcome, "reducir friccion y mejorar conversion", 180),
      primary_action: cleanText(toolSpec?.primaryAction?.label, primaryActionLabel(category), 100),
      success_metric: cleanText(toolSpec?.successMetric, "uso repetido y valor claro para la tienda", 180),
      field_1_label: cleanText(fields[0]?.label, defaults[0] || "Email", 90),
      field_2_label: cleanText(fields[1]?.label, defaults[1] || "Solicitud", 90),
      field_3_label: cleanText(fields[2]?.label, defaults[2] || "", 90),
    },
  };
}

function themeFileMap(theme) {
  return new Map((theme.files || []).filter((file) => file.filename).map((file) => [file.filename, file.content || ""]));
}

function pageTemplateFilename(templateSuffix) {
  const suffix = normalizeTemplateSuffix(templateSuffix);
  return suffix ? `templates/page.${suffix}.json` : "templates/page.json";
}

function normalizeTemplateSuffix(value) {
  return String(value || "")
    .trim()
    .replace(/^page\./i, "")
    .replace(/\.json$/i, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function agentGeniaTemplateSuffix(page) {
  const base = normalizeHandle(page.handle || numericShopifyId(page.id) || "page").slice(0, 70);
  return normalizeTemplateSuffix(`agent-genia-${base}`);
}

function parsePageTemplateJson(content, filename) {
  if (!String(content || "").trim()) {
    return {
      sections: {
        main: {
          type: "main-page",
          settings: {},
        },
      },
      order: ["main"],
    };
  }
  try {
    return ensurePageTemplateShape(JSON.parse(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON invalido";
    const parseError = new Error(`No pude leer ${filename} como template JSON valido: ${message}`);
    parseError.status = 422;
    parseError.code = "invalid_theme_template_json";
    throw parseError;
  }
}

function ensurePageTemplateShape(template) {
  const next = template && typeof template === "object" && !Array.isArray(template) ? { ...template } : {};
  next.sections = next.sections && typeof next.sections === "object" && !Array.isArray(next.sections) ? { ...next.sections } : {};
  if (!Object.keys(next.sections).length) {
    next.sections.main = {
      type: "main-page",
      settings: {},
    };
  }
  next.order = Array.isArray(next.order) && next.order.length ? next.order.filter((key) => typeof key === "string") : Object.keys(next.sections);
  return next;
}

function installSectionInTemplate(template, sectionDraft) {
  const next = ensurePageTemplateShape(template);
  next.sections[sectionDraft.sectionKey] = {
    type: "agent-genia-tool",
    settings: sectionDraft.settings,
  };
  const existingOrder = Array.isArray(next.order) ? next.order.filter((key) => key !== sectionDraft.sectionKey) : Object.keys(next.sections).filter((key) => key !== sectionDraft.sectionKey);
  next.order = sectionDraft.placement === "top"
    ? [sectionDraft.sectionKey, ...existingOrder]
    : [...existingOrder, sectionDraft.sectionKey];
  return next;
}

function defaultThemeFieldLabels(category) {
  if (category === "prueba social y reviews") return ["Email", "Review", "Nombre visible"];
  if (category === "quiz y recomendacion") return ["Problema principal", "Resultado esperado", "Email"];
  if (category === "captura de leads y popups") return ["Email", "Nombre", "Que estas buscando?"];
  if (category === "devoluciones y postcompra") return ["Email de compra", "Numero de orden", "Solicitud"];
  if (category === "soporte y confianza") return ["Email", "Pregunta", ""];
  return ["Email", "Solicitud", ""];
}

function primaryActionLabel(category) {
  if (category === "constructor de paginas y secciones") return "Ver productos";
  if (category === "soporte y confianza") return "Contactar a la tienda";
  if (category === "prueba social y reviews") return "Enviar review";
  if (category === "quiz y recomendacion") return "Recibir recomendacion";
  if (category === "devoluciones y postcompra") return "Enviar solicitud";
  return "Enviar solicitud";
}

function buildAgentGeniaThemeSectionLiquid() {
  return `{% liquid
  assign tool_name = section.settings.tool_name | default: 'Herramienta Agent Genia'
  assign category = section.settings.category | default: 'ecommerce'
  assign primary_action = section.settings.primary_action | default: 'Enviar solicitud'
%}

<section class="agent-genia-tool-section" data-agent-genia-tool="{{ section.id }}">
  <style>
    .agent-genia-tool-section {
      max-width: 1120px;
      margin: 36px auto;
      padding: 0 20px;
      color: rgb(var(--color-foreground, 20 32 27));
    }
    .agent-genia-tool-section__inner {
      border: 1px solid rgba(var(--color-foreground, 20 32 27), 0.14);
      background: rgba(var(--color-background, 255 255 255), 0.96);
      padding: clamp(22px, 4vw, 42px);
    }
    .agent-genia-tool-section__eyebrow {
      margin: 0 0 10px;
      color: #0f7b68;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .agent-genia-tool-section h2 {
      margin: 0 0 12px;
      font-size: clamp(28px, 5vw, 48px);
      line-height: 1.05;
    }
    .agent-genia-tool-section p {
      color: rgba(var(--color-foreground, 20 32 27), 0.74);
      line-height: 1.55;
    }
    .agent-genia-tool-section__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin: 22px 0;
    }
    .agent-genia-tool-section__card {
      border: 1px solid rgba(var(--color-foreground, 20 32 27), 0.12);
      padding: 16px;
      background: rgba(var(--color-foreground, 20 32 27), 0.035);
    }
    .agent-genia-tool-section form {
      display: grid;
      gap: 12px;
      margin-top: 20px;
    }
    .agent-genia-tool-section label {
      display: grid;
      gap: 7px;
      font-weight: 700;
    }
    .agent-genia-tool-section input,
    .agent-genia-tool-section textarea {
      min-height: 46px;
      border: 1px solid rgba(var(--color-foreground, 20 32 27), 0.22);
      background: rgb(var(--color-background, 255 255 255));
      color: rgb(var(--color-foreground, 20 32 27));
      padding: 11px 12px;
      font: inherit;
    }
    .agent-genia-tool-section button {
      min-height: 48px;
      border: 0;
      background: rgb(var(--color-foreground, 20 32 27));
      color: rgb(var(--color-background, 255 255 255));
      padding: 0 18px;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
  </style>

  <div class="agent-genia-tool-section__inner">
    <p class="agent-genia-tool-section__eyebrow">{{ section.settings.eyebrow | escape }}</p>
    <h2>{{ tool_name | escape }}</h2>
    <p>{{ section.settings.value_thesis | escape }}</p>
    <div class="agent-genia-tool-section__grid">
      <div class="agent-genia-tool-section__card">
        <strong>Para que sirve</strong>
        <p>{{ section.settings.job_to_be_done | escape }}</p>
      </div>
      <div class="agent-genia-tool-section__card">
        <strong>Resultado</strong>
        <p>{{ section.settings.desired_outcome | escape }}</p>
      </div>
      <div class="agent-genia-tool-section__card">
        <strong>Como se mide</strong>
        <p>{{ section.settings.success_metric | escape }}</p>
      </div>
    </div>

    {% form 'contact' %}
      <input type="hidden" name="contact[agent_genia_tool]" value="{{ tool_name | escape }}">
      <input type="hidden" name="contact[agent_genia_category]" value="{{ category | escape }}">
      {% if section.settings.field_1_label != blank %}
        <label>
          {{ section.settings.field_1_label | escape }}
          <input name="contact[agent_genia_field_1]" type="text" autocomplete="email">
        </label>
      {% endif %}
      {% if section.settings.field_2_label != blank %}
        <label>
          {{ section.settings.field_2_label | escape }}
          <textarea name="contact[agent_genia_field_2]" rows="4"></textarea>
        </label>
      {% endif %}
      {% if section.settings.field_3_label != blank %}
        <label>
          {{ section.settings.field_3_label | escape }}
          <input name="contact[agent_genia_field_3]" type="text">
        </label>
      {% endif %}
      <button type="submit">{{ primary_action | escape }}</button>
    {% endform %}
  </div>
</section>

{% schema %}
{
  "name": "Agent Genia tool",
  "settings": [
    { "type": "text", "id": "tool_name", "label": "Tool name", "default": "Herramienta Agent Genia" },
    { "type": "text", "id": "category", "label": "Category", "default": "ecommerce" },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Seccion Agent Genia" },
    { "type": "textarea", "id": "value_thesis", "label": "Value thesis", "default": "Herramienta nativa creada para resolver una necesidad concreta sin instalar otra app." },
    { "type": "textarea", "id": "job_to_be_done", "label": "Job to be done", "default": "Ayudar al visitante a tomar una mejor decision." },
    { "type": "text", "id": "desired_outcome", "label": "Desired outcome", "default": "reducir friccion y mejorar conversion" },
    { "type": "text", "id": "primary_action", "label": "Primary action", "default": "Enviar solicitud" },
    { "type": "text", "id": "success_metric", "label": "Success metric", "default": "uso repetido y valor claro para la tienda" },
    { "type": "text", "id": "field_1_label", "label": "Field 1 label", "default": "Email" },
    { "type": "text", "id": "field_2_label", "label": "Field 2 label", "default": "Solicitud" },
    { "type": "text", "id": "field_3_label", "label": "Field 3 label" }
  ],
  "presets": [
    { "name": "Agent Genia tool" }
  ]
}
{% endschema %}
`;
}

function normalizeTargetPage(value) {
  if (!value || typeof value !== "object") return null;
  const id = cleanText(value.id, "", 120);
  const rawHandle = cleanText(value.handle, "", MAX_HANDLE_LENGTH);
  const url = cleanText(value.url || value.href, "", 500);
  const handle = normalizePageHandle(rawHandle || handleFromPageUrl(url));
  if (!id && !handle) return null;
  return {
    id,
    handle,
    url,
    placement: normalizePlacement(value.placement),
  };
}

function handleFromPageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const path = raw.startsWith("/") ? raw : safeUrlPath(raw);
  const match = path.match(/\/pages\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function safeUrlPath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
}

function normalizePageHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^\/?pages\//i, "")
    .split(/[/?#]/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HANDLE_LENGTH);
}

function normalizePlacement(value) {
  const normalized = cleanText(value, "end", 30).toLowerCase();
  if (/arriba|top|inicio|before/.test(normalized)) return "top";
  return "end";
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

function renderCategoryTool({ category, toolName, requested, mvp, strategy, toolSpec }) {
  if (category === "quiz y recomendacion") return renderQuizTool(toolName, requested);
  if (category === "soporte y confianza") return renderTrustTool(requested);
  if (category === "constructor de paginas y secciones") return renderPageBuilderTool(requested, mvp);
  if (category === "prueba social y reviews") return renderReviewTool(requested);
  if (category === "captura de leads y popups") return renderLeadCaptureTool(toolName, requested);
  if (category === "devoluciones y postcompra") return renderPostPurchaseTool(toolName, requested);
  return renderGenericTool(requested, mvp, strategy, toolName, toolSpec);
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

function renderGenericTool(requested, mvp, strategy, toolName, toolSpec) {
  const actions = cleanList(strategy.adminActions, cleanList(mvp.acceptanceCriteria, ["Probar herramienta", "Medir resultado", "Decidir si mantener"]));
  const fields = cleanToolSpecFields(toolSpec);
  if (fields.length && toolSpec?.canRenderAsPage !== false) {
    return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
      <h2 style="font-size:28px;margin:0 0 8px;">Herramienta operativa</h2>
      <p style="color:#5d6f68;line-height:1.55;margin:0 0 16px;">${escapeHtml(cleanText(requested.jobToBeDone, "Resolver una necesidad repetida de la tienda.", 220))}</p>
      ${renderToolSpecForm(toolName, fields)}
    </section>`;
  }
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:22px;">
    <h2 style="font-size:28px;margin:0 0 8px;">Herramienta operativa</h2>
    <p style="color:#5d6f68;line-height:1.55;margin:0 0 16px;">${escapeHtml(cleanText(requested.jobToBeDone, "Resolver una necesidad repetida de la tienda.", 220))}</p>
    ${renderOrderedList(actions)}
    <a href="/pages/contact" style="display:inline-flex;margin-top:16px;background:#14201b;color:white;text-decoration:none;font-weight:900;padding:14px 18px;">Solicitar ayuda</a>
  </section>`;
}

function renderToolSpecSummary(toolSpec) {
  if (!toolSpec?.version) return "";
  const fields = cleanToolSpecFields(toolSpec);
  const blocks = Array.isArray(toolSpec.blocks) ? toolSpec.blocks.slice(0, 6) : [];
  return `<section style="margin-top:18px;border:1px solid #dbe5df;padding:18px;background:#f8fbf9;">
    <h2 style="font-size:22px;margin:0 0 12px;">Spec ejecutable Agent Genia</h2>
    <dl style="display:grid;gap:10px;margin:0;">
      <div><dt style="font-weight:900;">Runtime</dt><dd style="margin:0;color:#5d6f68;">${escapeHtml(toolSpec.runtime || toolSpec.surface || "shopify_page")}</dd></div>
      <div><dt style="font-weight:900;">Accion principal</dt><dd style="margin:0;color:#5d6f68;">${escapeHtml(toolSpec.primaryAction?.label || "Enviar solicitud")}</dd></div>
      <div><dt style="font-weight:900;">Metrica de exito</dt><dd style="margin:0;color:#5d6f68;">${escapeHtml(toolSpec.successMetric || "uso repetido")}</dd></div>
    </dl>
    ${fields.length ? `<h3 style="font-size:16px;margin:16px 0 8px;">Campos</h3>${renderList(fields.map((field) => `${field.label}${field.required ? " (requerido)" : ""}`))}` : ""}
    ${blocks.length ? `<h3 style="font-size:16px;margin:16px 0 8px;">Bloques</h3>${renderList(blocks.map((block) => `${block.type}: ${block.purpose}`))}` : ""}
  </section>`;
}

function renderToolSpecForm(toolName, fields) {
  return `<form method="post" action="/contact#contact_form" style="display:grid;gap:12px;">
    <input type="hidden" name="form_type" value="contact">
    <input type="hidden" name="utf8" value="&#10003;">
    <input type="hidden" name="contact[subject]" value="${escapeHtml(toolName)}">
    ${fields.map(renderToolSpecInput).join("")}
    <button type="submit" style="min-height:48px;background:#14201b;color:white;border:0;font-weight:900;padding:0 18px;">Enviar solicitud</button>
  </form>`;
}

function renderToolSpecInput(field) {
  if (field.type === "checkbox") {
    return `<label style="display:flex;gap:8px;align-items:flex-start;font-weight:800;">
      <input name="contact[${escapeHtml(field.id)}]" type="checkbox" ${field.required ? "required" : ""}>
      ${escapeHtml(field.label)}
    </label>`;
  }
  if (field.type === "textarea") {
    return `<label style="display:grid;gap:8px;font-weight:800;">
      ${escapeHtml(field.label)}
      <textarea name="contact[${escapeHtml(field.id)}]" rows="4" ${field.required ? "required" : ""} style="border:1px solid #cbd8d1;padding:10px;" placeholder="${escapeHtml(field.placeholder || "")}"></textarea>
    </label>`;
  }
  const inputType = field.type === "email" ? "email" : "text";
  return `<label style="display:grid;gap:8px;font-weight:800;">
    ${escapeHtml(field.label)}
    <input name="contact[${escapeHtml(field.id)}]" type="${inputType}" ${field.required ? "required" : ""} style="min-height:44px;border:1px solid #cbd8d1;padding:10px;" placeholder="${escapeHtml(field.placeholder || "")}">
  </label>`;
}

function cleanToolSpecFields(toolSpec) {
  return Array.isArray(toolSpec?.fields)
    ? toolSpec.fields
        .map((field) => ({
          id: cleanText(field?.id, "", 60).replace(/[^a-z0-9_]/gi, "_") || "field",
          label: cleanText(field?.label, "Campo", 120),
          type: cleanText(field?.type, "text", 30).toLowerCase(),
          required: Boolean(field?.required),
          placeholder: cleanText(field?.placeholder, "", 160),
        }))
        .slice(0, 12)
    : [];
}

function normalizeToolSpec(toolSpec) {
  if (!toolSpec || typeof toolSpec !== "object") return null;
  return {
    version: cleanText(toolSpec.version, "tool-spec-v1", 40),
    name: cleanText(toolSpec.name, "", 120),
    category: cleanText(toolSpec.category, "", 120),
    surface: cleanText(toolSpec.surface, "", 80),
    runtime: cleanText(toolSpec.runtime, "", 80),
    canRenderAsPage: toolSpec.canRenderAsPage !== false,
    primaryAction: toolSpec.primaryAction && typeof toolSpec.primaryAction === "object" ? {
      label: cleanText(toolSpec.primaryAction.label, "", 120),
      type: cleanText(toolSpec.primaryAction.type, "", 80),
      target: cleanText(toolSpec.primaryAction.target, "", 160),
    } : null,
    successMetric: cleanText(toolSpec.successMetric, "", 180),
    dataDestination: cleanText(toolSpec.dataDestination, "", 160),
    fields: cleanToolSpecFields(toolSpec),
    blocks: Array.isArray(toolSpec.blocks)
      ? toolSpec.blocks.map((block) => ({
          id: cleanText(block?.id, "", 80),
          type: cleanText(block?.type, "", 80),
          purpose: cleanText(block?.purpose, "", 220),
        })).slice(0, 12)
      : [],
    automationRules: cleanList(toolSpec.automationRules, []),
    safetyChecks: cleanList(toolSpec.safetyChecks, []),
    upgradePath: cleanText(toolSpec.upgradePath, "", 220),
  };
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

function shopifyPageGid(value) {
  const raw = String(value || "");
  if (raw.startsWith("gid://shopify/Page/")) return raw;
  const id = numericShopifyId(raw);
  return id ? `gid://shopify/Page/${id}` : "";
}
