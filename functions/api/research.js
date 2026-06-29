import {
  handleError,
  httpError,
  json,
  optionsResponse,
  requireActiveUser,
  safeFileName,
  supabaseRest,
} from "../_shared/supabase.js";

const DEFAULT_TIMEOUT_MS = 900000;
const ATTACHMENT_BUCKET = "research-attachments";

const TOOL_FACTORY_CAPABILITIES = [
  {
    category: "constructor de paginas y secciones",
    matcher: /page|landing|constructor|p[aá]gina|secci[oó]n|bloque|pagefly|gempages|shogun|web|sitio/,
    defaultName: "constructor de paginas nativo",
    job: "crear paginas y bloques de conversion sin instalar un page builder pesado",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "alta: publicable hoy como Shopify Page MVP",
    primitives: ["Shopify Pages", "Admin API", "Agent Genia backend", "configuracion JSON por seccion"],
    dataModel: ["page_handle", "section_order", "section_copy", "cta", "published_url"],
    events: ["page_published", "cta_clicked", "section_viewed"],
    firstVersion: "Page de conversion con hero, beneficios, objeciones, CTA y medicion basica.",
    upgradePath: "Theme App Extension con bloques editables si el merchant la usa repetidamente.",
    savings: "$20-$100/mes si evita page builders ligeros",
    notIncluded: ["edicion visual drag-and-drop completa", "plantillas enterprise", "A/B testing avanzado"],
  },
  {
    category: "quiz y recomendacion",
    matcher: /quiz|recomendador|rutina|diagn[oó]stico|selector|finder|product finder|routine finder/,
    defaultName: "quiz recomendador",
    job: "guiar al comprador hacia producto/rutina correcta y guardar la senal para seguimiento",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "alta: publicable hoy como Shopify Page MVP",
    primitives: ["Shopify Pages", "contact form", "Admin API", "customer tags si aplica"],
    dataModel: ["question", "answer", "result_rule", "recommended_product", "customer_signal"],
    events: ["quiz_started", "answer_submitted", "recommendation_requested"],
    firstVersion: "Quiz guiado con formulario de contacto y CTA de recomendacion.",
    upgradePath: "Theme App Extension con logica dinamica, productos conectados y tags de cliente.",
    savings: "$20-$100/mes si evita quiz builders simples",
    notIncluded: ["logica condicional avanzada", "personalizacion en tiempo real", "sincronizacion profunda con CRM"],
  },
  {
    category: "soporte y confianza",
    matcher: /faq|preguntas|soporte|chat|help|garant[ií]a|confianza|trust|dudas|contact/,
    defaultName: "centro de confianza",
    job: "resolver dudas repetidas antes de compra y reducir friccion",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "alta: publicable hoy como Shopify Page MVP",
    primitives: ["Shopify Pages", "contact form", "Admin API", "copy guiado por agente"],
    dataModel: ["faq_question", "faq_answer", "policy_link", "support_cta"],
    events: ["faq_viewed", "support_clicked", "contact_submitted"],
    firstVersion: "FAQ/garantia/politicas con preguntas desplegables y CTA de contacto.",
    upgradePath: "Help center dinamico o chat conectado si el volumen de tickets lo justifica.",
    savings: "$10-$60/mes si evita apps simples de FAQ/help center",
    notIncluded: ["chatbot 24/7", "ticketing multiagente", "SLA de soporte"],
  },
  {
    category: "prueba social y reviews",
    matcher: /review|reviews|reseñ|testimonio|estrellas|rating|ugc|social proof|loox|judgeme|judge\.me|yotpo/,
    defaultName: "reviews ligeras nativas",
    job: "capturar, mostrar y reutilizar prueba social sin pagar una app separada desde el dia uno",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "media-alta: publicable hoy para prueba social basica",
    primitives: ["Shopify Pages", "contact form", "Admin API", "moderacion en Agent Genia"],
    dataModel: ["review_author", "rating", "review_body", "product_id", "moderation_status"],
    events: ["review_submitted", "review_viewed", "trust_cta_clicked"],
    firstVersion: "Pagina de prueba social con quotes moderadas y formulario para nuevas reviews.",
    upgradePath: "Metaobjects + Theme App Extension para reviews por producto y schema markup.",
    savings: "$15-$80/mes si cubre reviews basicas",
    notIncluded: ["syndication externa", "fraud detection avanzada", "imports complejos de todas las plataformas"],
  },
  {
    category: "captura de leads y popups",
    matcher: /popup|pop-up|lead|newsletter|email capture|spin|ruleta|descuento de bienvenida|bienvenida|privy|wisepops/,
    defaultName: "captura de leads ligera",
    job: "capturar emails o solicitudes sin pagar una app de popups antes de validar el incentivo",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "media-alta: page MVP hoy; popup real requiere theme extension",
    primitives: ["Shopify Pages", "contact form", "customer tags", "Admin API"],
    dataModel: ["lead_email", "lead_source", "incentive", "consent_text", "followup_status"],
    events: ["lead_page_viewed", "lead_submitted", "incentive_requested"],
    firstVersion: "Pagina de captura con incentivo, consentimiento y CTA.",
    upgradePath: "Theme App Extension para popup/embedded block con reglas de frecuencia.",
    savings: "$10-$70/mes si evita popups simples",
    notIncluded: ["trigger por comportamiento", "frequency capping avanzado", "ruletas/promos complejas"],
  },
  {
    category: "devoluciones y postcompra",
    matcher: /return|returns|devoluci[oó]n|cambio|postcompra|post-compra|aftership|loop returns|seguimiento/,
    defaultName: "portal postcompra ligero",
    job: "recibir solicitudes postcompra claras sin pagar una app antes de tener volumen alto",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "media-alta: publicable hoy como formulario/politica",
    primitives: ["Shopify Pages", "contact form", "order lookup manual", "Admin API"],
    dataModel: ["order_number", "customer_email", "request_type", "reason", "status"],
    events: ["return_request_started", "return_request_submitted", "policy_viewed"],
    firstVersion: "Pagina de cambios/devoluciones con politica clara y formulario de solicitud.",
    upgradePath: "Workflow con webhooks/order API cuando el volumen haga dolorosa la revision manual.",
    savings: "$20-$100/mes si evita returns apps tempranas",
    notIncluded: ["labels automaticas", "portal con tracking por orden", "reglas logisticas avanzadas"],
  },
  {
    category: "busqueda, filtros y merchandising",
    matcher: /search|busqueda|b[uú]squeda|filter|filtro|filtros|merchandising|collection sort|boost|doofinder|algolia/,
    defaultName: "merchandising guiado",
    job: "ayudar a encontrar productos y ordenar colecciones sin instalar search enterprise",
    publishMode: "theme_app_extension",
    runtimeLabel: "requiere Theme App Extension",
    feasibility: "media: requiere extension para tocar storefront de forma nativa",
    primitives: ["Theme App Extension", "Search & Discovery config", "metafields", "collection rules"],
    dataModel: ["filter_rule", "boost_rule", "collection_handle", "synonym", "no_result_query"],
    events: ["search_performed", "filter_applied", "product_clicked"],
    firstVersion: "Auditoria y configuracion de filtros/colecciones antes de construir UI custom.",
    upgradePath: "Bloque de busqueda/filtros propio si hay suficientes queries repetidas.",
    savings: "$20-$200/mes si evita search apps simples",
    notIncluded: ["ranking ML avanzado", "synonyms enterprise", "analytics de busqueda profundo"],
  },
  {
    category: "retencion y mensajes",
    matcher: /email|sms|flow|flujo|newsletter|klaviyo|retenci[oó]n|winback|abandono|omnisend|postscript|attentive/,
    defaultName: "flows basicos de retencion",
    job: "activar flows simples sin depender de una suite cara desde el dia uno",
    publishMode: "provider_integration",
    runtimeLabel: "requiere proveedor o email runtime",
    feasibility: "media: contenido y segmentos si; entregabilidad avanzada requiere proveedor",
    primitives: ["Customer tags", "segments basicos", "email templates", "webhooks/order events", "proveedor email si se necesita deliverability"],
    dataModel: ["customer_segment", "message_template", "trigger_event", "consent_status", "send_status"],
    events: ["customer_created", "order_paid", "cart_abandoned", "repeat_purchase"],
    firstVersion: "Generador de segmentos, copy y calendario; envio real con proveedor autorizado.",
    upgradePath: "Integracion con ESP o email app cuando haya volumen y consentimiento.",
    savings: "$20-$150/mes en etapa temprana; no reemplaza suites avanzadas aun",
    notIncluded: ["deliverability avanzada", "SMS compliance completo", "IP/domain warming", "reporting enterprise"],
  },
  {
    category: "tracking y analytics",
    matcher: /pixel|tracking|evento|meta pixel|tiktok pixel|analytics|medici[oó]n|capi|server-side|attribution/,
    defaultName: "pixel y eventos propios",
    job: "medir eventos clave sin duplicar pixels ni perder trazabilidad",
    publishMode: "web_pixel_extension",
    runtimeLabel: "requiere Web Pixel Extension",
    feasibility: "alta para MVP nativo, pero no como Page",
    primitives: ["Web Pixel Extension", "Customer Events", "consent mode", "server logs basicos", "Agent Genia backend"],
    dataModel: ["event_name", "destination", "consent_required", "dedupe_key", "last_seen_at"],
    events: ["page_viewed", "product_viewed", "add_to_cart", "checkout_started", "purchase_completed"],
    firstVersion: "Mapa de eventos, QA y especificacion; publicar solo con Web Pixel Extension.",
    upgradePath: "CAPI/server-side si se valida que el problema es atribucion y no configuracion.",
    savings: "$0-$50/mes; el valor principal es calidad de medicion",
    notIncluded: ["server-side CAPI completo", "attribution multi-touch avanzada", "garantia contra bloqueadores"],
  },
  {
    category: "ofertas, bundles y carrito",
    matcher: /bundle|paquete|descuento|promo|upsell|cross.?sell|carrito|checkout|discount|rebuy|zipify|bold/,
    defaultName: "motor de bundles/ofertas",
    job: "subir AOV con reglas simples de oferta, bundle o descuento controlado",
    publishMode: "shopify_function",
    runtimeLabel: "requiere Shopify Function/extension",
    feasibility: "media-alta si el alcance inicial es simple",
    primitives: ["Shopify Functions", "Discount API", "cart attributes", "Theme App Extension", "metafields"],
    dataModel: ["trigger", "discount_value", "bundle_items", "eligibility_rule", "margin_guardrail"],
    events: ["offer_viewed", "bundle_added", "discount_applied", "cart_updated"],
    firstVersion: "Especificacion de regla y guardrail de margen antes de activar descuento real.",
    upgradePath: "Shopify Function con limites de margen y preview antes de publicar.",
    savings: "$10-$80/mes si cubre bundles/descuentos simples",
    notIncluded: ["reglas complejas incompatibles con Shopify Functions", "checkout custom fuera de permisos Shopify"],
  },
  {
    category: "lealtad y referidos",
    matcher: /loyalty|lealtad|puntos|referidos|referral|reward|rewards|smile|loyaltylion/,
    defaultName: "programa de lealtad ligero",
    job: "probar recompra o referidos antes de pagar una plataforma de loyalty",
    publishMode: "theme_app_extension",
    runtimeLabel: "requiere customer/account runtime",
    feasibility: "media: se puede validar manualmente; automatizacion requiere runtime de clientes",
    primitives: ["customer tags", "metafields", "account extensions", "discount codes", "Agent Genia backend"],
    dataModel: ["customer_id", "points_balance", "referral_code", "reward_rule", "redemption_status"],
    events: ["referral_submitted", "reward_earned", "reward_redeemed"],
    firstVersion: "Programa manual con reglas claras, codigos y tracking simple por customer tag.",
    upgradePath: "Account extension y reglas automatizadas si hay uso real.",
    savings: "$20-$200/mes si evita loyalty apps tempranas",
    notIncluded: ["puntos en tiempo real", "fraud controls avanzados", "programas omnicanal"],
  },
  {
    category: "suscripciones y membresias",
    matcher: /subscription|suscripci[oó]n|membres[ií]a|membership|recurring|recharge|skio|bold subscriptions/,
    defaultName: "suscripciones/membresias",
    job: "validar venta recurrente sin tocar cobros recurrentes de forma insegura",
    publishMode: "provider_required",
    runtimeLabel: "requiere proveedor de billing/subscriptions",
    feasibility: "baja-media: pagos recurrentes reales requieren infraestructura autorizada",
    primitives: ["Shopify Subscriptions API", "provider billing", "customer portal", "webhooks"],
    dataModel: ["subscription_plan", "billing_status", "renewal_date", "customer_consent"],
    events: ["subscription_requested", "subscription_started", "renewal_paid", "subscription_cancelled"],
    firstVersion: "Landing/waitlist para validar interes antes de implementar cobro recurrente.",
    upgradePath: "Proveedor de subscriptions o app autorizada si el modelo se valida.",
    savings: "$0-$50/mes al validar antes de pagar; no reemplaza billing real todavia",
    notIncluded: ["cobro recurrente real", "dunning", "portal de cancelacion", "compliance de billing"],
  },
];

export async function onRequestPost(context) {
  const { request, env } = context;
  let runContext = null;

  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      throw httpError(400, "invalid_json", "Request body must be JSON.");
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      throw httpError(400, "invalid_payload", validationError);
    }

    const auth = await requireActiveUser(request, env);
    runContext = await createResearchRun(auth.config, auth.accessToken, auth.user, payload);
    await insertAgentEvent(auth.config, auth.accessToken, auth.user.id, runContext.id, {
      step: "request_received",
      tool_name: payload.selectedInternalTool || "agent-genia",
      status: "running",
      payload_json: {
        naturalRequest: payload.naturalRequest,
        attachments: (payload.attachments || []).map(attachmentMetadata),
      },
    });

    const storedAttachments = await persistAttachments(auth.config, auth.accessToken, auth.user.id, runContext.id, payload.attachments || []);
    const agentPayload = {
      ...payload,
      userId: auth.user.id,
      researchRunId: runContext.id,
      attachments: (payload.attachments || []).map((attachment, index) => ({
        ...attachment,
        storageBucket: storedAttachments[index]?.storage_bucket || ATTACHMENT_BUCKET,
        storagePath: storedAttachments[index]?.storage_path || "",
      })),
    };

    if (shouldUseBrandWhitespaceTool(agentPayload)) {
      const report = runBrandWhitespaceTool(agentPayload);
      const diagnostics = {
        tool: "brand_whitespace_tool",
        mode: "internal_tool",
        evidenceMode: "declared_context_and_connected_catalog",
      };
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, report);
      return json({ ok: true, report, diagnostics, runId: runContext.id });
    }

    if (shouldUseToolFactory(agentPayload)) {
      const report = runToolFactory(agentPayload);
      const diagnostics = {
        tool: "agentgenia_tool_factory",
        mode: "internal_tool",
        buildMode: "blueprint_first",
      };
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, report);
      return json({ ok: true, report, diagnostics, runId: runContext.id });
    }

    if (shouldUseShopifyPageBuilder(agentPayload)) {
      const report = runShopifyPageBuilderTool(agentPayload);
      const diagnostics = {
        tool: "shopify_page_builder",
        mode: "internal_tool",
        publishesDirectly: false,
      };
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, report);
      return json({ ok: true, report, diagnostics, runId: runContext.id });
    }

    if (shouldUseRetailToOnlineTool(agentPayload)) {
      const report = await runRetailToOnlineTool(agentPayload, env);
      const diagnostics = {
        tool: "retail_to_online_agent",
        mode: "internal_tool",
      };
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, report);
      return json({ ok: true, report, diagnostics, runId: runContext.id });
    }

    if (shouldUseShippingRateTool(agentPayload)) {
      const report = await runShippingRateTool(agentPayload, env);
      const diagnostics = {
        tool: "shipping_rate_quote",
        mode: "internal_tool",
        provider: "envia_rate_only",
      };
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, report);
      return json({ ok: true, report, diagnostics, runId: runContext.id });
    }

    if (agentPayload.businessStage !== "brand" && shouldUseProfitabilityTool(agentPayload)) {
      const report = await runProfitabilityTool(agentPayload, env);
      const diagnostics = {
        tool: "unit_economics_filter",
        mode: "internal_tool",
      };
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, report);
      return json({ ok: true, report, diagnostics, runId: runContext.id });
    }

    if (!env.HARNESS_URL || !env.HARNESS_TOKEN) {
      throw httpError(
        503,
        "harness_not_configured",
        "Cloudflare backend is live, but HARNESS_URL/HARNESS_TOKEN are not configured.",
      );
    }

    const upstream = await requestHarness(env, agentPayload);

    if (upstream.body?.ok && upstream.body.report) {
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, agentPayload, upstream.body.report);
      return json({ ...upstream.body, runId: runContext.id }, upstream.status);
    }

    const message = upstream.body?.message || "El harness no devolvio un reporte valido.";
    await markRunError(auth.config, auth.accessToken, runContext.id, message);
    return json({ ...upstream.body, runId: runContext.id }, upstream.status);
  } catch (error) {
    if (runContext?.config && runContext?.id) {
      await markRunError(runContext.config, runContext.accessToken, runContext.id, error.message).catch(() => null);
    }
    return handleError(error);
  }
}

export async function onRequestGet() {
  return json({ ok: true, service: "agent-genia-supabase-research" });
}

export async function onRequestOptions() {
  return optionsResponse();
}

async function createResearchRun(config, accessToken, user, payload) {
  const rows = await supabaseRest(config, "research_runs?select=*", {
    method: "POST",
    prefer: "return=representation",
    accessToken,
    body: {
      user_id: user.id,
      natural_request: payload.naturalRequest,
      status: "running",
      selected_tool: payload.selectedInternalTool || "",
      product: payload.product || "",
      product_details: payload.productDetails || "",
      market: payload.market || "",
      destination: payload.destination || "",
      input_json: scrubPayloadForDb(payload),
    },
  });

  return { ...rows[0], accessToken, config };
}

async function persistAttachments(config, accessToken, userId, runId, attachments) {
  const stored = [];
  for (const attachment of attachments) {
    const fileId = crypto.randomUUID();
    const fileName = safeFileName(attachment.name || "attachment");
    const storagePath = `${userId}/${runId}/${fileId}-${fileName}`;
    const upload = await uploadAttachment(config, accessToken, storagePath, attachment);
    const rows = await supabaseRest(config, "research_attachments?select=*", {
      method: "POST",
      prefer: "return=representation",
      accessToken,
      body: {
        id: fileId,
        research_run_id: runId,
        user_id: userId,
        file_name: attachment.name || fileName,
        file_type: upload.contentType,
        file_size: attachment.size || upload.byteLength || 0,
        storage_bucket: ATTACHMENT_BUCKET,
        storage_path: storagePath,
        content_mode: attachment.contentMode || "metadata-only",
        extracted_text: attachment.contentMode === "text" ? attachment.content || "" : "",
        metadata: attachmentMetadata(attachment),
      },
    });
    stored.push(rows[0]);
  }
  return stored;
}

async function uploadAttachment(config, accessToken, storagePath, attachment) {
  const body = attachmentBytes(attachment);
  const contentType = attachment.type || (attachment.content ? "text/plain;charset=utf-8" : "application/json");
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/${ATTACHMENT_BUCKET}/${encodeStoragePath(storagePath)}`,
    {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${accessToken}`,
        "content-type": contentType,
        "x-upsert": "false",
      },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw httpError(response.status, "storage_upload_failed", text || "No se pudo subir el adjunto a Supabase Storage.");
  }

  return { contentType, byteLength: body.byteLength || body.size || 0 };
}

function attachmentBytes(attachment) {
  if (attachment.dataUrl) return dataUrlBytes(attachment.dataUrl);
  if (attachment.content) return new TextEncoder().encode(attachment.content);
  return new TextEncoder().encode(JSON.stringify(attachmentMetadata(attachment), null, 2));
}

function dataUrlBytes(value) {
  const match = String(value).match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/);
  if (!match) {
    throw httpError(400, "invalid_attachment_data", "Uno de los adjuntos tiene data URL invalida.");
  }
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requestHarness(env, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(env.HARNESS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(new URL("/research", env.HARNESS_URL).toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.HARNESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await upstream.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { ok: false, code: "invalid_harness_response", raw: text.slice(0, 1000) };
    }

    return { status: upstream.status, body };
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    throw httpError(
      timedOut ? 504 : 502,
      timedOut ? "harness_timeout" : "harness_unreachable",
      timedOut ? "The research harness took too long." : "Could not reach the private research harness.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function persistReport(config, accessToken, userId, runId, payload, report) {
  await supabaseRest(config, `research_runs?id=eq.${encodeURIComponent(runId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    accessToken,
    body: {
      status: "done",
      result_json: report,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
  });

  const events = Array.isArray(report.agentWorkLog) ? report.agentWorkLog : [];
  for (const event of events) {
    await insertAgentEvent(config, accessToken, userId, runId, {
      step: event.title || event.step || event.key || "agent_step",
      tool_name: event.toolName || event.tool_name || payload.selectedInternalTool || "agent-genia",
      status: event.status || "done",
      payload_json: event,
    });
  }

  const suppliers = await persistSuppliers(config, accessToken, userId, runId, report.supplierShortlist || []);
  await persistNegotiationMessages(config, accessToken, userId, runId, suppliers, report.supplierOutreachQueue || []);
}

async function persistSuppliers(config, accessToken, userId, runId, suppliers) {
  const persisted = [];
  for (const supplier of suppliers) {
    const rows = await supabaseRest(config, "suppliers?select=*", {
      method: "POST",
      prefer: "return=representation",
      accessToken,
      body: {
        research_run_id: runId,
        user_id: userId,
        name: supplier.supplierName || supplier.supplier_name || "Proveedor",
        alibaba_url: supplier.alibabaUrl || supplier.alibaba_url || "",
        moq: supplier.moq || "",
        unit_price: supplier.unitPrice || supplier.unit_price || "",
        ddp_status: supplier.ddpStatus || supplier.ddp_status || "",
        quality_score: Number.isFinite(Number(supplier.score)) ? Number(supplier.score) : null,
        notes: supplier.nextAsk || supplier.next_ask || supplier.productMatch || "",
        raw_json: supplier,
      },
    });
    persisted.push(rows[0]);
  }
  return persisted;
}

async function persistNegotiationMessages(config, accessToken, userId, runId, suppliers, messages) {
  for (const message of messages) {
    const supplierName = message.supplierName || message.supplier_name || "";
    const supplier = suppliers.find((item) => item.name.toLowerCase() === supplierName.toLowerCase());
    await supabaseRest(config, "negotiation_messages?select=id", {
      method: "POST",
      prefer: "return=minimal",
      accessToken,
      body: {
        supplier_id: supplier?.id || null,
        research_run_id: runId,
        user_id: userId,
        message_type: message.messageType || message.message_type || "Mensaje",
        body: message.message || message.body || message.waitingFor || message.waiting_for || "Mensaje pendiente.",
        status: normalizeMessageStatus(message.status),
        waiting_for: message.waitingFor || message.waiting_for || "",
        needs_user_approval: message.needsUserApproval ?? message.needs_user_approval ?? true,
        raw_json: message,
      },
    });
  }
}

async function insertAgentEvent(config, accessToken, userId, runId, event) {
  await supabaseRest(config, "agent_events?select=id", {
    method: "POST",
    prefer: "return=minimal",
    accessToken,
    body: {
      research_run_id: runId,
      user_id: userId,
      step: event.step || "",
      tool_name: event.tool_name || event.toolName || "",
      status: event.status || "",
      payload_json: event.payload_json || event,
    },
  });
}

async function markRunError(config, accessToken, runId, message) {
  await supabaseRest(config, `research_runs?id=eq.${encodeURIComponent(runId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    accessToken,
    body: {
      status: "error",
      error_message: message,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
  });
}

function scrubPayloadForDb(payload) {
  return {
    ...payload,
    accessKey: undefined,
    attachments: (payload.attachments || []).map(attachmentMetadata),
  };
}

function attachmentMetadata(attachment) {
  return {
    id: attachment.id || "",
    name: attachment.name || "",
    type: attachment.type || "",
    size: attachment.size || 0,
    sizeLabel: attachment.sizeLabel || "",
    kind: attachment.kind || "",
    contentMode: attachment.contentMode || "",
    truncated: Boolean(attachment.truncated),
  };
}

function normalizeMessageStatus(value) {
  const status = String(value || "draft").toLowerCase();
  if (["draft", "approved", "sent", "replied", "archived"].includes(status)) return status;
  if (status.includes("enviado") || status.includes("sent")) return "sent";
  if (status.includes("aprob")) return "approved";
  if (status.includes("respond")) return "replied";
  return "draft";
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Missing payload.";
  if (!stringField(payload.naturalRequest, 3000)) return "Missing or invalid request.";
  if (payload.product && !stringField(payload.product, 500)) return "Invalid product.";
  if (payload.productDetails && !stringField(payload.productDetails, 2000)) return "Invalid product details.";
  if (payload.goals && !Array.isArray(payload.goals)) return "Invalid goals.";
  if (payload.destination && typeof payload.destination !== "string") return "Invalid destination.";
  if (payload.businessStage && !["starter", "brand", "shopify"].includes(payload.businessStage)) return "Invalid business stage.";
  if (payload.brand && typeof payload.brand !== "object") return "Invalid brand payload.";
  if (payload.shopify && typeof payload.shopify !== "object") return "Invalid Shopify payload.";
  if (payload.attachments && !validAttachments(payload.attachments)) return "Invalid attachments.";
  if (payload.shopify?.shop && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(payload.shopify.shop)) {
    return "Invalid Shopify shop domain.";
  }
  return "";
}

function stringField(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validAttachments(value) {
  return (
    Array.isArray(value) &&
    value.length <= 6 &&
    value.every(
      (attachment) =>
        attachment &&
        typeof attachment === "object" &&
        optionalString(attachment.id, 120) &&
        optionalString(attachment.name, 240) &&
        optionalString(attachment.type, 160) &&
        optionalString(attachment.kind, 40) &&
        optionalString(attachment.contentMode, 60) &&
        (attachment.content === undefined || optionalString(attachment.content, 65000)) &&
        (attachment.dataUrl === undefined || optionalString(attachment.dataUrl, 6500000)) &&
        (attachment.size === undefined || Number(attachment.size) <= 4 * 1024 * 1024),
    )
  );
}

function optionalString(value, maxLength) {
  return value === undefined || value === null || (typeof value === "string" && value.length <= maxLength);
}

function payloadText(payload) {
  const brand = payload.brand || {};
  return `${payload.naturalRequest || ""} ${payload.reference || ""} ${payload.problem || ""} ${payload.product || ""} ${payload.productDetails || ""} ${brand.name || ""} ${brand.url || ""} ${brand.channels || ""} ${brand.goal || ""}`;
}

function shouldUseRetailToOnlineTool(payload) {
  if (payload.selectedInternalTool === "retail-to-online-agent") return true;
  const text = payloadText(payload).toLowerCase();
  const physicalStoreIntent =
    /tienda f[ií]sica|negocio f[ií]sico|negocio local|local comercial|mostrador|sucursal|boutique|tienda de barrio|retail/.test(text);
  const onlineIntent =
    /vender (en|por) internet|vender online|e-?commerce|tienda online|p[aá]gina web|crear web/.test(text);
  const channelPlanningIntent = /tiktok org[aá]nico|paid ads|anuncios pagados|competencia|contenido|ads/.test(text);
  return physicalStoreIntent || (onlineIntent && channelPlanningIntent) || (onlineIntent && /tienda|local|negocio|producto|productos/.test(text));
}

function shouldUseProfitabilityTool(payload) {
  const text = payloadText(payload).toLowerCase();
  const intentPattern =
    /rentab|margen|ganancia|utilidad|dejar dinero|deja dinero|unit economics|economics|break ?even|roas|cac|costo|costos|precio|env[ií]o|shipping|devoluciones|returns|recompra|pagar por cliente|conseguir cliente/;
  return intentPattern.test(text);
}

function shouldUseShippingRateTool(payload) {
  const text = payloadText(payload).toLowerCase();
  const shippingIntent =
    /cotiz|tarifa|paqueter[ií]a|env[ií]o|enviar|paquete|ship|shipping|cp origen|cp destino|c[oó]digo postal|codigo postal/.test(text);
  const economicsIntent =
    /rentab|margen|ganancia|utilidad|dejar dinero|deja dinero|unit economics|break ?even|roas|cac|costo del producto|costo producto|devoluciones|returns|recompra|precio de venta|venta promedio/.test(text);
  return shippingIntent && !economicsIntent;
}

function shouldUseShopifyPageBuilder(payload) {
  const text = payloadText(payload).toLowerCase();
  return /shopify/.test(text) && /crear|hacer|generar|construir|publicar|subir|lanzar|landing|pagina|página|page|web|sitio/.test(text);
}

function shouldUseBrandWhitespaceTool(payload) {
  if (payload.businessStage !== "brand") return false;
  const text = payloadText(payload).toLowerCase();
  const intentPattern =
    /white ?space|espacio libre|hueco|oportunidad|posicion|posicionamiento|diferenci|competencia|competidor|competidores|saturad|nicho|angulo|ángulo|territorio|mercado libre|producto nuevo|lanzar|expansion|expansión/;
  return intentPattern.test(text);
}

function shouldUseToolFactory(payload) {
  const text = payloadText(payload).toLowerCase();
  const knownPaidAppNeed =
    /klaviyo|omnisend|postscript|attentive|loox|judgeme|judge\.me|yotpo|pagefly|gempages|shogun|privy|wisepops|rebuy|zipify|bold|recharge|skio|smile|loyaltylion|aftership|algolia|doofinder/.test(
      text,
    );
  const appNeed =
    knownPaidAppNeed ||
    /app(s)?|plugin|plug-?in|extensi[oó]n|herramienta|tool|widget|feature|funci[oó]n|automatizaci[oó]n|bloque|secci[oó]n/.test(text);
  const replacementIntent =
    /paga|pagada|mensualidad|subscription|suscripci[oó]n|gratis|sin pagar|ahorrar|reemplaz|sustituir|alternativa|evitar pagar|third[- ]party|terceros|otra app/.test(text);
  const buildIntent =
    /crear|hacer|construir|generar|instalar|configurar|necesito|quiero|puede hacer|que haga/.test(text);
  const shopifyContext =
    payload.businessStage === "shopify" ||
    payload.businessStage === "brand" ||
    /shopify|tienda|ecommerce|e-?commerce|merchant|store/.test(text);
  return shopifyContext && appNeed && (replacementIntent || buildIntent);
}

function runToolFactory(payload) {
  const text = payloadText(payload);
  const profile = inferToolFactoryProfile(text, payload);
  const primitives = inferShopifyPrimitives(profile);
  const mvp = buildToolFactoryMvp(profile, primitives);
  const limitations = buildToolFactoryLimitations(profile);
  const risks = buildToolFactoryRisks(profile);
  const appReplacement = buildAppReplacementPlan(profile, limitations);
  const toolSpec = buildToolFactorySpec(profile, appReplacement);

  return {
    type: "tool_factory",
    toolUsed: "agentgenia_tool_factory",
    selectedInternalTool: "agentgenia_tool_factory",
    naturalRequest: payload.naturalRequest || "",
    market: payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    shopify: {
      shop: payload.shopify?.shop || "",
      focus: payload.shopify?.focus || "",
    },
    requestedTool: profile,
    executiveBrief: {
      decision: `${profile.name} si puede avanzar como herramienta nativa de Agent Genia. Ruta actual: ${profile.runtimeLabel}.`,
      valueThesis: "La meta no es copiar apps de pago; es construir la parte exacta que el merchant necesita para evitar subscriptions innecesarias.",
      feasibility: profile.feasibility,
      guardrail: "Si la necesidad requiere infraestructura regulada, entregabilidad, pagos, fraude, SMS compliance o marketplace externo, Agent Genia debe integrarse con un proveedor o limitar el alcance.",
    },
    buildStrategy: {
      appShell: "Agent Genia Shopify app como contenedor unico.",
      primitives,
      dataModel: buildToolFactoryDataModel(profile),
      events: buildToolFactoryEvents(profile),
      adminActions: buildToolFactoryAdminActions(profile),
    },
    appReplacement,
    toolSpec,
    mvp,
    savings: {
      replacementCategory: profile.category,
      costAvoidedRange: estimateToolFactorySavings(profile),
      whenThirdPartyStillBetter: limitations.thirdPartyStillBetter,
    },
    risks,
    validationPlan: buildToolFactoryValidationPlan(profile, mvp),
    nextSteps: [
      "Confirmar el job-to-be-done exacto: que debe hacer la herramienta y que no debe hacer.",
      "Construir el MVP con bloques/configuracion existentes antes de crear codigo nuevo.",
      "Medir uso, conversion, ahorro de subscription y errores operativos por 7-14 dias.",
      "Solo convertirlo en extension/app mas profunda si el merchant lo usa repetidamente.",
    ],
  };
}

function inferToolFactoryProfile(text, payload) {
  const lower = text.toLowerCase();
  const brandName = cleanSentence(payload.brand?.name) || inferBrandFromUrl(payload.brand?.url) || "la tienda";
  const capability = inferToolFactoryCapability(lower);
  const category = capability.category;
  return {
    name: inferToolFactoryName(lower, category),
    category,
    capabilityId: slugify(category),
    publishMode: capability.publishMode,
    runtimeLabel: capability.runtimeLabel,
    canPublishNow: capability.publishMode === "shopify_page_mvp",
    jobToBeDone: inferToolFactoryJob(lower, category, brandName),
    merchantUser: inferToolFactoryUser(lower),
    feasibility: inferToolFactoryFeasibility(category),
    desiredOutcome: inferToolFactoryOutcome(lower, category),
  };
}

function inferToolFactoryCategory(text) {
  return inferToolFactoryCapability(text).category;
}

function inferToolFactoryCapability(text) {
  return TOOL_FACTORY_CAPABILITIES.find((capability) => capability.matcher.test(text)) || fallbackToolFactoryCapability();
}

function toolCapabilityByCategory(category) {
  return TOOL_FACTORY_CAPABILITIES.find((capability) => capability.category === category) || fallbackToolFactoryCapability();
}

function fallbackToolFactoryCapability() {
  return {
    category: "herramienta ecommerce personalizada",
    defaultName: "mini-app Agent Genia",
    job: "convertir una necesidad repetida de la tienda en herramienta configurable dentro de Agent Genia",
    publishMode: "shopify_page_mvp",
    runtimeLabel: "Page MVP publicable hoy",
    feasibility: "media: necesita definicion del job-to-be-done",
    primitives: ["Shopify Pages", "Admin API", "metafields/metaobjects", "Agent Genia backend"],
    dataModel: ["tool_config", "tool_status", "merchant_visible_copy", "last_updated_by_agent"],
    events: ["tool_viewed", "tool_completed", "conversion_event"],
    firstVersion: "Pagina/herramienta MVP para validar la necesidad antes de construir app profunda.",
    upgradePath: "Theme App Extension o runtime especializado solo si el merchant la usa repetidamente.",
    savings: "$10-$100/mes segun la herramienta reemplazada",
    notIncluded: ["edge cases enterprise", "soporte de todas las plataformas externas", "automatizacion sin aprobacion del merchant"],
  };
}

function inferToolFactoryName(text, category) {
  const explicit = text.match(/(?:app|herramienta|tool|widget|funci[oó]n)\s+(?:de|para)\s+([a-z0-9 áéíóúñ-]{3,48})/i);
  if (explicit?.[1]) return cleanSentence(explicit[1]);
  return toolCapabilityByCategory(category).defaultName;
}

function inferToolFactoryJob(text, category, brandName) {
  const job = toolCapabilityByCategory(category).job;
  if (category === "prueba social y reviews") return `capturar, mostrar y reutilizar prueba social de ${brandName} sin pagar una app separada desde el dia uno`;
  if (category === "retencion y mensajes") return `activar flows simples para que ${brandName} no dependa de una suite cara desde el dia uno`;
  return job;
}

function inferToolFactoryUser(text) {
  if (/mama|mamá|principiante|no sabe|facil|f[aá]cil/.test(text)) return "merchant principiante que necesita botones claros y cero configuracion tecnica";
  if (/equipo|operador|agency|agencia/.test(text)) return "operador ecommerce que necesita configurar rapido y repetirlo en varias tiendas";
  return "merchant ecommerce que quiere ahorrar subscriptions sin perder funcionalidad basica";
}

function inferToolFactoryFeasibility(category) {
  return toolCapabilityByCategory(category).feasibility;
}

function inferToolFactoryOutcome(text, category) {
  if (/ahorr|gratis|sin pagar/.test(text)) return "evitar una subscription mensual innecesaria";
  if (/conversion|vender|ventas|roas|cac/.test(text)) return "mejorar conversion o eficiencia de adquisicion";
  if (/tiempo|rapido|r[aá]pido|operaci[oó]n/.test(text)) return "reducir trabajo operativo repetitivo";
  return {
    "retencion y mensajes": "retener clientes con flows minimos",
    "tracking y analytics": "tener medicion confiable",
    "constructor de paginas y secciones": "publicar paginas de conversion rapido",
  }[category] || "resolver una necesidad concreta de la tienda";
}

function inferShopifyPrimitives(profile) {
  return toolCapabilityByCategory(profile.category).primitives;
}

function buildToolFactoryDataModel(profile) {
  const common = ["tool_config", "tool_status", "merchant_visible_copy", "last_updated_by_agent"];
  return [...new Set([...common, ...toolCapabilityByCategory(profile.category).dataModel])];
}

function buildToolFactoryEvents(profile) {
  return toolCapabilityByCategory(profile.category).events;
}

function buildToolFactoryAdminActions(profile) {
  const capability = toolCapabilityByCategory(profile.category);
  return [
    `Crear/configurar ${profile.name}`,
    "Previsualizar antes de publicar",
    capability.publishMode === "shopify_page_mvp" ? "Publicar en la tienda conectada" : `Preparar runtime requerido: ${capability.runtimeLabel}`,
    "Editar copy/reglas desde Agent Genia",
    "Ver resultados y decidir si mantener, iterar o apagar",
  ];
}

function buildToolFactoryMvp(profile, primitives) {
  const capability = toolCapabilityByCategory(profile.category);
  const publishable = capability.publishMode === "shopify_page_mvp";
  return {
    name: `${profile.name} MVP`,
    included: [
      "Configuracion guiada desde el agente",
      "Preview antes de publicar",
      publishable ? "Publicacion como Shopify Page segura" : `Especificacion lista para ${capability.runtimeLabel}`,
      capability.firstVersion,
      "Datos guardados en metafields/metaobjects o configuracion propia",
      "Metricas minimas para decidir si vale la pena",
    ],
    notIncluded: buildToolFactoryNotIncluded(profile),
    buildSteps: [
      "Definir campos configurables y copy inicial.",
      publishable
        ? `Crear la primera version usando ${primitives.slice(0, 3).join(", ")}.`
        : `Crear primero la especificacion y guardrails usando ${primitives.slice(0, 3).join(", ")}.`,
      publishable ? "Publicar en una pagina/producto de prueba." : `No publicar hasta tener ${capability.runtimeLabel}.`,
      "Medir uso y friccion durante 7 dias.",
      "Convertirlo en herramienta reutilizable si se usa mas de una vez.",
    ],
    acceptanceCriteria: [
      "Un merchant no tecnico puede activarlo sin tocar codigo.",
      "La herramienta puede apagarse sin romper el theme.",
      "No duplica eventos ni datos criticos.",
      "Tiene un criterio claro de exito: ahorro, conversion, leads, AOV o tiempo ahorrado.",
    ],
  };
}

function buildToolFactoryNotIncluded(profile) {
  return toolCapabilityByCategory(profile.category).notIncluded;
}

function buildToolFactoryLimitations(profile) {
  const capability = toolCapabilityByCategory(profile.category);
  return {
    thirdPartyStillBetter: [
      "Cuando la app de pago resuelve una infraestructura especializada que Agent Genia no debe operar aun.",
      "Cuando hay compliance legal/regulatorio fuerte.",
      "Cuando el merchant necesita soporte enterprise, integraciones profundas o SLA.",
      ...capability.notIncluded.map((item) => `Cuando necesitas ${item}.`),
      `${profile.name} debe empezar como MVP nativo antes de prometer paridad total.`,
    ],
  };
}

function buildToolFactoryRisks(profile) {
  const capability = toolCapabilityByCategory(profile.category);
  const risks = [
    "Prometer reemplazo total de una app madura antes de validar el 20% de funcionalidad que realmente usa el merchant.",
    "Crear demasiadas herramientas custom sin sistema de apagado, versionado y soporte.",
    "Romper confianza si la herramienta toca datos sensibles sin permisos claros.",
  ];
  if (capability.publishMode !== "shopify_page_mvp") {
    risks.push(`Publicar esto como Page simple seria falso; requiere ${capability.runtimeLabel}.`);
  }
  if (profile.category === "retencion y mensajes") risks.push("Entregabilidad y consentimiento pueden convertir una herramienta simple en infraestructura seria.");
  if (profile.category === "tracking y analytics") risks.push("Pixels duplicados o eventos mal deduplicados pueden empeorar decisiones de ads.");
  if (profile.category === "ofertas, bundles y carrito") risks.push("Descuentos mal configurados pueden destruir margen.");
  return risks;
}

function estimateToolFactorySavings(profile) {
  return toolCapabilityByCategory(profile.category).savings;
}

function buildToolFactoryValidationPlan(profile, mvp) {
  const capability = toolCapabilityByCategory(profile.category);
  return [
    `Construir solo ${mvp.name}, no una plataforma completa.`,
    capability.publishMode === "shopify_page_mvp"
      ? `Instalarlo en una pagina/producto de bajo riesgo para validar ${profile.desiredOutcome}.`
      : `Validar el flujo manualmente o con especificacion antes de invertir en ${capability.runtimeLabel}.`,
    "Comparar contra el costo de la app que se queria pagar.",
    "Medir adopcion del merchant: si no lo usa dos veces, no merece convertirse en producto permanente.",
    "Medir impacto de cliente: conversion, leads, AOV, tickets reducidos o eventos limpios.",
    `Si se valida, evolucionar por esta ruta: ${capability.upgradePath}`,
  ];
}

function buildAppReplacementPlan(profile, limitations) {
  const capability = toolCapabilityByCategory(profile.category);
  const replaceabilityLevel = replacementLevelForMode(capability.publishMode);
  return {
    principle:
      "Agent Genia no debe clonar una app pagada completa. Debe extraer el trabajo que el merchant necesita, construir la version minima nativa, medir valor y solo escalar si se usa.",
    replaceabilityLevel,
    publishMode: capability.publishMode,
    runtimeLabel: capability.runtimeLabel,
    canCreateNow: capability.publishMode === "shopify_page_mvp",
    firstVersion: capability.firstVersion,
    upgradePath: capability.upgradePath,
    buildOrBuyDecision: buildOrBuyDecision(capability),
    nativeAdvantages: [
      "Menos subscriptions antes de validar valor real.",
      "Menos ruido: solo se construye la funcion exacta que el merchant pidio.",
      "Menos riesgo operacional: cada herramienta debe poder apagarse sin romper la tienda.",
    ],
    keepThirdPartyWhen: limitations.thirdPartyStillBetter,
  };
}

function buildToolFactorySpec(profile, appReplacement) {
  const capability = toolCapabilityByCategory(profile.category);
  return {
    version: "tool-spec-v1",
    name: profile.name,
    category: profile.category,
    surface: capability.publishMode === "shopify_page_mvp" ? "shopify_page" : capability.publishMode,
    runtime: capability.publishMode,
    canRenderAsPage: capability.publishMode === "shopify_page_mvp",
    primaryAction: buildToolSpecPrimaryAction(profile, capability),
    successMetric: buildToolSpecSuccessMetric(profile),
    dataDestination: buildToolSpecDestination(profile, capability),
    fields: buildToolSpecFields(profile),
    blocks: buildToolSpecBlocks(profile, capability),
    automationRules: buildToolSpecAutomationRules(profile, capability),
    safetyChecks: [
      "No publicar si requiere permisos o infraestructura que el runtime actual no tiene.",
      "Debe poder apagarse sin romper theme, checkout, pagos, emails, pixels ni datos criticos.",
      "Debe tener una metrica simple para decidir si ahorra dinero o mejora conversion.",
    ],
    upgradePath: appReplacement.upgradePath,
  };
}

function buildToolSpecPrimaryAction(profile, capability) {
  if (capability.publishMode !== "shopify_page_mvp") {
    return {
      label: `Preparar ${capability.runtimeLabel}`,
      type: "runtime_required",
      target: capability.publishMode,
    };
  }
  if (profile.category === "constructor de paginas y secciones") return { label: "Ver productos", type: "link", target: "/collections/all" };
  if (profile.category === "soporte y confianza") return { label: "Contactar a la tienda", type: "link", target: "/pages/contact" };
  return { label: "Enviar solicitud", type: "shopify_contact_form", target: "/contact#contact_form" };
}

function buildToolSpecDestination(profile, capability) {
  if (capability.publishMode === "shopify_page_mvp") return "Shopify contact form / Page MVP";
  if (capability.publishMode === "provider_integration") return "Proveedor autorizado + Agent Genia QA";
  if (capability.publishMode === "provider_required") return "Waitlist/validacion antes de proveedor";
  return capability.runtimeLabel;
}

function buildToolSpecFields(profile) {
  const baseEmail = field("email", "Email", "email", true, "tu@email.com");
  if (profile.category === "quiz y recomendacion") {
    return [
      field("main_problem", "Que problema quieres resolver?", "text", true, "Ej. piel seca, elegir talla, encontrar rutina"),
      field("desired_result", "Que resultado esperas?", "text", true, "Rapido, profundo o simple"),
      field("purchase_blocker", "Que te detiene antes de comprar?", "text", false, "Precio, confianza, talla, ingredientes"),
      baseEmail,
    ];
  }
  if (profile.category === "captura de leads y popups") {
    return [
      baseEmail,
      field("name", "Nombre", "text", false, "Tu nombre"),
      field("intent", "Que estas buscando?", "textarea", false, "Cuéntanos qué necesitas"),
      field("consent", "Acepto que la tienda me contacte sobre esta solicitud", "checkbox", true, ""),
    ];
  }
  if (profile.category === "devoluciones y postcompra") {
    return [
      baseEmail,
      field("order_number", "Numero de orden", "text", true, "#1001"),
      field("request_type", "Tipo de solicitud", "select", true, "Cambio, devolucion o duda"),
      field("request_detail", "Describe la solicitud", "textarea", true, "Explica qué pasó"),
    ];
  }
  if (profile.category === "prueba social y reviews") {
    return [
      baseEmail,
      field("rating", "Calificacion", "select", true, "1-5"),
      field("review_body", "Review", "textarea", true, "Cuenta tu experiencia"),
      field("display_name", "Nombre visible", "text", false, "Como quieres aparecer"),
    ];
  }
  if (profile.category === "soporte y confianza") {
    return [baseEmail, field("question", "Pregunta", "textarea", true, "Que duda tienes?")];
  }
  if (profile.category === "constructor de paginas y secciones") {
    return [
      field("headline", "Headline", "text", true, "Promesa principal"),
      field("cta", "CTA", "text", true, "Ver productos"),
      field("objection", "Objecion principal", "textarea", false, "Que duda hay que resolver?"),
    ];
  }
  return [baseEmail, field("request", "Solicitud", "textarea", true, "Describe qué necesitas")];
}

function buildToolSpecBlocks(profile, capability) {
  const blocks = [
    { id: "hero", type: "hero", purpose: "Explicar el job-to-be-done y la promesa de la herramienta." },
    { id: "how_it_works", type: "steps", purpose: "Mostrar como usar la herramienta sin entrenamiento tecnico." },
  ];
  if (capability.publishMode === "shopify_page_mvp") {
    blocks.push({ id: "form_or_cta", type: "form", purpose: "Capturar la señal del cliente o llevarlo al siguiente paso." });
  } else {
    blocks.push({ id: "runtime_plan", type: "spec", purpose: `Preparar runtime requerido: ${capability.runtimeLabel}.` });
  }
  blocks.push({ id: "validation", type: "metric", purpose: `Medir ${buildToolSpecSuccessMetric(profile)}.` });
  return blocks;
}

function buildToolSpecAutomationRules(profile, capability) {
  if (capability.publishMode !== "shopify_page_mvp") {
    return [`No ejecutar automatizacion real hasta tener ${capability.runtimeLabel}.`];
  }
  if (profile.category === "devoluciones y postcompra") return ["Enviar solicitud al equipo y clasificar por tipo de caso."];
  if (profile.category === "prueba social y reviews") return ["Guardar review como pendiente de moderacion antes de mostrarla."];
  if (profile.category === "quiz y recomendacion") return ["Usar respuestas para recomendar manualmente o etiquetar señal de interes."];
  if (profile.category === "captura de leads y popups") return ["Guardar lead y medir origen de captura."];
  return ["Registrar envio y revisar si la herramienta se uso mas de una vez."];
}

function buildToolSpecSuccessMetric(profile) {
  if (profile.category === "devoluciones y postcompra") return "solicitudes completas con menos ida y vuelta";
  if (profile.category === "prueba social y reviews") return "reviews utiles capturadas y aprobadas";
  if (profile.category === "quiz y recomendacion") return "recomendaciones solicitadas y clicks a producto";
  if (profile.category === "captura de leads y popups") return "leads capturados con consentimiento";
  if (profile.category === "constructor de paginas y secciones") return "clicks al CTA y conversion de la pagina";
  if (profile.category === "tracking y analytics") return "eventos correctos sin duplicacion";
  if (profile.category === "ofertas, bundles y carrito") return "AOV incremental sin destruir margen";
  return "uso repetido y ahorro de subscription";
}

function field(id, label, type, required, placeholder) {
  return { id, label, type, required, placeholder };
}

function replacementLevelForMode(mode) {
  if (mode === "shopify_page_mvp") return "crear ahora";
  if (mode === "theme_app_extension" || mode === "shopify_function" || mode === "web_pixel_extension") return "crear con runtime propio";
  if (mode === "provider_integration") return "integrar proveedor";
  if (mode === "provider_required") return "validar antes de pagar proveedor";
  return "definir alcance";
}

function buildOrBuyDecision(capability) {
  if (capability.publishMode === "shopify_page_mvp") {
    return "Construir con Agent Genia ahora como MVP seguro. Pagar app solo si el merchant necesita automatizacion o profundidad que el MVP no cubre.";
  }
  if (capability.publishMode === "provider_required") {
    return "No intentar reemplazo completo gratis todavia. Validar demanda con Agent Genia y comprar/integrar proveedor solo cuando el caso de uso pague el costo.";
  }
  if (capability.publishMode === "provider_integration") {
    return "Agent Genia puede crear estrategia, segmentos, copy y QA; la ejecucion sensible debe pasar por proveedor autorizado.";
  }
  return `Agent Genia debe construir el runtime ${capability.runtimeLabel} antes de prometer reemplazo real.`;
}

function runBrandWhitespaceTool(payload) {
  const brand = normalizeBrandForWhitespace(payload);
  const products = payload.shopify?.snapshot?.products || [];
  const declaredSignals = extractDeclaredSignals(payload);
  const catalogSignals = extractCatalogSignals(products);
  const competitorSignals = extractCompetitorSignals(payloadText(payload), brand);
  const candidates = buildWhitespaceCandidates({ payload, brand, products, declaredSignals, catalogSignals, competitorSignals });
  const primary = candidates[0];

  return {
    type: "brand_whitespace",
    toolUsed: "brand_whitespace_tool",
    naturalRequest: payload.naturalRequest || "",
    selectedInternalTool: "brand_whitespace_tool",
    market: payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    brand,
    shopify: {
      shop: payload.shopify?.shop || "",
      focus: payload.shopify?.focus || "",
    },
    sourceCoverage: buildWhitespaceCoverage(payload, products, declaredSignals, competitorSignals),
    executiveBrief: {
      decision: primary
        ? `El espacio mas defendible para ${brand.name} parece ser: ${primary.title}. Validalo antes de cambiar catalogo o invertir fuerte.`
        : `Todavia no hay suficiente contexto para elegir un whitespace confiable para ${brand.name}.`,
      primaryWhitespace: primary?.title || "pendiente",
      confidence: primary?.confidence || "baja",
      guardrail: "Esto es una hipotesis de posicionamiento basada en contexto declarado y catalogo conectado; no reemplaza research live de Meta, Amazon o TikTok.",
    },
    candidates,
    evidence: buildWhitespaceEvidence({ declaredSignals, catalogSignals, competitorSignals, products }),
    risks: buildWhitespaceRisks(payload, products),
    validationPlan: buildWhitespaceValidationPlan(primary, brand),
    nextSteps: [
      "Escoger un solo whitespace para probar durante 7-14 dias.",
      "Crear una landing o PDP con ese angulo y medir conversion, add-to-cart y preguntas repetidas.",
      "Comparar hooks contra 3 competidores directos antes de producir mas creativos.",
      "Si el test gana, conectar la decision con margen, inventario y canal principal.",
    ],
  };
}

function normalizeBrandForWhitespace(payload) {
  const brand = payload.brand || {};
  const name =
    cleanSentence(brand.name) ||
    inferBrandFromUrl(brand.url) ||
    cleanSentence(payload.product).split(/\s+/).slice(0, 4).join(" ") ||
    "Marca";
  return {
    name,
    url: brand.url || "",
    channels: cleanSentence(brand.channels) || "canales no definidos",
    goal: cleanSentence(brand.goal || payload.shopify?.focus) || "encontrar un posicionamiento mas claro",
    stage: payload.shopify?.shop ? "marca con Shopify conectado" : brand.url ? "marca con presencia digital" : "marca con contexto declarado",
  };
}

function extractDeclaredSignals(payload) {
  const text = payloadText(payload);
  const attachmentText = (payload.attachments || [])
    .map((attachment) => attachment.content || "")
    .filter(Boolean)
    .join(" ");
  const combined = `${text} ${attachmentText}`.toLowerCase();
  const signals = [];
  const rules = [
    [/precio|barato|caro|premium|lujo/, "precio y percepcion de valor"],
    [/confianza|reviews?|reseñas|garantia|garant[ií]a|prueba social/, "confianza y prueba social"],
    [/env[ií]o|shipping|entrega|devoluciones|returns/, "friccion de envio o devoluciones"],
    [/rutina|uso|como usar|educaci[oó]n|guia|guía/, "educacion de uso"],
    [/comunidad|identidad|lifestyle|estilo de vida/, "identidad y comunidad"],
    [/ingrediente|material|calidad|certific|seguridad/, "calidad, ingredientes o materiales"],
    [/rapidez|facil|f[aá]cil|conveniencia|simple/, "conveniencia y rapidez"],
    [/suscrip|recompra|retenci[oó]n|refill|repuesto/, "recompra o retencion"],
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(combined)) signals.push(label);
  }
  if (!signals.length) signals.push("posicionamiento general aun poco especifico");
  return [...new Set(signals)].slice(0, 8);
}

function extractCatalogSignals(products) {
  if (!products.length) return ["catalogo no conectado o sin productos leidos"];
  const activeProducts = products.filter((product) => String(product.status || "").toLowerCase() === "active");
  const types = [...new Set(products.map((product) => product.productType || "").filter(Boolean))];
  const vendors = [...new Set(products.map((product) => product.vendor || "").filter(Boolean))];
  const lowInventory = products.filter((product) => Number(product.totalInventory) <= 5).length;
  const signals = [
    `${products.length} productos leidos desde Shopify`,
    `${activeProducts.length || products.length} productos activos o vendibles`,
  ];
  if (types.length) signals.push(`${types.slice(0, 4).join(", ")} como categorias visibles`);
  if (vendors.length > 1) signals.push("catalogo con multiples vendors o lineas; posible dispersion de posicionamiento");
  if (lowInventory) signals.push(`${lowInventory} productos con inventario bajo; validar antes de empujar demanda`);
  return signals;
}

function extractCompetitorSignals(text, brand) {
  const urls = [...String(text).matchAll(/https?:\/\/[^\s)]+|(?:[a-z0-9-]+\.)+[a-z]{2,}/gi)]
    .map((match) => match[0].replace(/[.,;]+$/, ""))
    .filter((url) => !brand.url || !url.includes(brand.url.replace(/^https?:\/\//, "").replace(/^www\./, "")));
  const named = [];
  const competitorPattern = /(?:competidor(?:es)?|contra|como|similar a|vs\.?)\s+([a-z0-9][a-z0-9 .&-]{2,40})/gi;
  let match = competitorPattern.exec(text);
  while (match) {
    named.push(cleanSentence(match[1]).replace(/[.,;]+$/, ""));
    match = competitorPattern.exec(text);
  }
  return [...new Set([...urls, ...named].filter(Boolean))].slice(0, 8);
}

function buildWhitespaceCandidates({ payload, brand, products, declaredSignals, catalogSignals, competitorSignals }) {
  const text = payloadText(payload).toLowerCase();
  const category = inferWhitespaceCategory(text, products);
  const hasCatalog = products.length > 0;
  const candidates = [];

  candidates.push({
    title: `${category}: posicionarse por problema especifico, no por producto generico`,
    targetCustomer: inferWhitespaceCustomer(text, category),
    underservedProblem: inferUnderservedProblem(text, declaredSignals, category),
    positioningAngle: inferPositioningAngle(text, declaredSignals, category),
    whyItMayBeOpen: [
      competitorSignals.length
        ? "El usuario ya esta comparando contra competidores; hay oportunidad de ocupar un angulo mas estrecho."
        : "No se declararon competidores concretos; el primer espacio abierto suele estar en definir mejor para quien es la marca.",
      hasCatalog
        ? "El catalogo conectado permite convertir el angulo en una prueba concreta sin inventar una nueva linea desde cero."
        : "Sin catalogo conectado, conviene validarlo con una pagina o creativo antes de comprar inventario.",
    ],
    supportingSignals: [...declaredSignals.slice(0, 3), ...catalogSignals.slice(0, 2)],
    risks: [
      "Puede ser demasiado amplio si no se aterriza a un avatar y una objecion.",
      "Puede no defender margen si termina compitiendo por precio.",
    ],
    validationTest: `Crear una landing para ${brand.name} con este angulo y comparar conversion contra la pagina actual durante 7 dias.`,
    firstOffer: inferFirstOffer(text, category),
    channel: inferWhitespaceChannel(text, brand.channels),
    confidence: confidenceFromSignals(declaredSignals.length + (hasCatalog ? 2 : 0), competitorSignals.length),
  });

  if (/premium|calidad|ingrediente|material|seguridad|certific/.test(text) || declaredSignals.includes("calidad, ingredientes o materiales")) {
    candidates.push({
      title: "Territorio de confianza: calidad verificable y compra sin duda",
      targetCustomer: "comprador que quiere evitar una mala compra, no solo encontrar el precio mas bajo",
      underservedProblem: "miedo a que el producto no sea igual a la promesa o no tenga respaldo suficiente",
      positioningAngle: "mostrar prueba, materiales, uso, limites y garantia con mas claridad que el competidor",
      whyItMayBeOpen: ["Muchas marcas comunican beneficios, pero pocas explican evidencia, uso correcto y riesgo de mala expectativa."],
      supportingSignals: declaredSignals.filter((item) => /confianza|calidad|material|ingrediente/.test(item)).concat(catalogSignals.slice(0, 2)),
      risks: ["Requiere substanciacion real; no conviene usar claims fuertes sin evidencia."],
      validationTest: "Agregar bloque de prueba/garantia/FAQ en PDP y medir reduccion de preguntas precompra.",
      firstOffer: "bundle de entrada con garantia clara y explicacion de uso",
      channel: "Meta retargeting o email a trafico tibio",
      confidence: confidenceFromSignals(3 + (hasCatalog ? 1 : 0), competitorSignals.length),
    });
  }

  if (/recompra|retenci[oó]n|suscrip|refill|email|ltv/.test(text) || declaredSignals.includes("recompra o retencion")) {
    candidates.push({
      title: "Whitespace de recompra: convertir el producto en rutina",
      targetCustomer: "cliente que ya compro o que necesita reposicion recurrente",
      underservedProblem: "la compra se queda como transaccion unica porque no hay siguiente paso claro",
      positioningAngle: "rutina, replenishment, bundle secuencial o suscripcion ligera",
      whyItMayBeOpen: ["Competir por adquisicion se vuelve caro; una marca existente puede abrir espacio en retencion antes que en nuevos SKUs."],
      supportingSignals: declaredSignals.filter((item) => /recompra|retencion/.test(item)).concat(catalogSignals.slice(0, 2)),
      risks: ["Si el producto no tiene consumo recurrente real, forzar suscripcion puede bajar confianza."],
      validationTest: "Enviar flujo post-compra con siguiente producto recomendado y medir segunda compra a 30 dias.",
      firstOffer: "bundle de rutina o refill con incentivo moderado",
      channel: "email/SMS y audiencia de compradores",
      confidence: confidenceFromSignals(3 + (hasCatalog ? 2 : 0), competitorSignals.length),
    });
  }

  if (/tiktok|organico|orgánico|creador|influencer|ugc/.test(text)) {
    candidates.push({
      title: "Whitespace de contenido: educar el problema mejor que vender el producto",
      targetCustomer: "persona que todavia no sabe que categoria comprar",
      underservedProblem: "la audiencia entiende el dolor, pero no entiende el criterio de decision",
      positioningAngle: "contenido comparativo, demostraciones y errores comunes antes/despues de comprar",
      whyItMayBeOpen: ["En TikTok/UGC el espacio libre suele estar en explicar el problema con lenguaje real, no en repetir features."],
      supportingSignals: declaredSignals.slice(0, 3),
      risks: ["Puede traer trafico curioso sin intencion si el CTA no filtra bien."],
      validationTest: "Publicar 5 piezas educativas con el mismo angulo y medir saves, comentarios con intencion y clicks.",
      firstOffer: "lead magnet, quiz o starter kit",
      channel: "TikTok organico o creadores",
      confidence: confidenceFromSignals(2 + (hasCatalog ? 1 : 0), competitorSignals.length),
    });
  }

  return candidates.slice(0, 4);
}

function inferWhitespaceCategory(text, products) {
  if (/skin|skincare|piel|beauty|belleza|serum|acne|acné/.test(text)) return "skincare";
  if (/suplement|prote[ií]na|vitamin|creatina|col[aá]geno|magnesio/.test(text)) return "suplementos";
  if (/ropa|moda|fashion|apparel/.test(text)) return "moda";
  const productType = products.find((product) => product.productType)?.productType;
  return productType || "marca ecommerce";
}

function inferWhitespaceCustomer(text, category) {
  if (/mama|mamá|madres/.test(text)) return "personas ocupadas que quieren resolver el problema sin investigar demasiado";
  if (category === "skincare") return "personas que quieren una rutina clara y menos confusion al elegir productos";
  if (category === "suplementos") return "personas que quieren mejorar su rutina sin promesas exageradas";
  if (category === "moda") return "compradores que quieren identidad, ajuste y confianza antes de comprar";
  return "cliente que compara opciones y necesita una razon concreta para elegir esta marca";
}

function inferUnderservedProblem(text, signals, category) {
  if (signals.includes("educacion de uso")) return "el cliente no entiende como elegir, usar o comparar la solucion";
  if (signals.includes("confianza y prueba social")) return "falta confianza suficiente antes de comprar";
  if (signals.includes("friccion de envio o devoluciones")) return "la friccion logistica impide que la oferta se sienta segura";
  if (category === "skincare") return "demasiadas promesas similares y poca claridad sobre rutina, expectativas y uso";
  return "la categoria se percibe generica y obliga a competir por precio o estetica";
}

function inferPositioningAngle(text, signals, category) {
  if (signals.includes("conveniencia y rapidez")) return "solucion simple, rapida y facil de incorporar";
  if (signals.includes("calidad, ingredientes o materiales")) return "calidad verificable sin claims exagerados";
  if (signals.includes("identidad y comunidad")) return "marca con identidad clara para un grupo especifico";
  if (category === "skincare") return "rutina simple con expectativas claras y objeciones resueltas";
  return "especialista en un problema concreto para un comprador concreto";
}

function inferFirstOffer(text, category) {
  if (/bundle|kit|set/.test(text)) return "bundle curado con una promesa especifica";
  if (/premium|calidad/.test(text)) return "starter kit premium con prueba o garantia";
  if (category === "skincare") return "rutina de entrada de 2-3 pasos con guia de uso";
  return "oferta de entrada que pruebe el angulo sin ampliar catalogo";
}

function inferWhitespaceChannel(text, channels) {
  const combined = `${text} ${channels || ""}`.toLowerCase();
  if (/tiktok/.test(combined)) return "TikTok organico/creadores";
  if (/email|sms|retenci/.test(combined)) return "email/SMS";
  if (/google|search|seo/.test(combined)) return "Google/search";
  if (/meta|facebook|instagram|ads|anuncios/.test(combined)) return "Meta Ads";
  return "un canal principal a elegir antes del test";
}

function confidenceFromSignals(signalCount, competitorCount) {
  if (signalCount >= 5 && competitorCount >= 2) return "media-alta";
  if (signalCount >= 4) return "media";
  return "baja-media";
}

function buildWhitespaceCoverage(payload, products, declaredSignals, competitorSignals) {
  return [
    `Contexto de marca: ${payload.brand?.name || payload.brand?.url ? "recibido" : "limitado"}.`,
    `Shopify/catalogo: ${products.length ? `${products.length} productos leidos` : "no conectado o sin productos"}.`,
    `Senales declaradas: ${declaredSignals.join(", ")}.`,
    `Competidores declarados: ${competitorSignals.length ? competitorSignals.join(", ") : "ninguno; falta benchmark externo"}.`,
    "Meta/Amazon/TikTok live: no consultados en esta herramienta interna; usar research competitivo profundo para confirmar.",
  ];
}

function buildWhitespaceEvidence({ declaredSignals, catalogSignals, competitorSignals, products }) {
  return {
    strongerSignals: [
      ...declaredSignals.map((signal) => `La solicitud/contexto apunta a ${signal}.`),
      ...catalogSignals.slice(0, 4).map((signal) => `Catalogo: ${signal}.`),
    ],
    weakSignals: [
      competitorSignals.length
        ? `Competidores mencionados por el usuario: ${competitorSignals.join(", ")}. Falta leer sus ads/reviews para confirmar saturacion.`
        : "No se mencionaron competidores directos; la comparacion aun es incompleta.",
      products.length ? "El catalogo ayuda a aterrizar el test, pero no prueba demanda por si solo." : "Sin catalogo conectado, el whitespace depende mas de supuestos.",
    ],
    missingData: [
      "Top 3 competidores directos y sus promesas principales.",
      "Reviews, comentarios o tickets de clientes con lenguaje literal.",
      "AOV, margen, CAC, tasa de conversion y recompra por producto.",
      "Canal principal donde se va a validar el angulo.",
    ],
  };
}

function buildWhitespaceRisks(payload, products) {
  const risks = [
    "Elegir un espacio demasiado amplio y terminar con una promesa generica.",
    "Confundir un angulo interesante con demanda real sin test de conversion.",
    "Copiar lenguaje de competidores en vez de ocupar una objecion no atendida.",
  ];
  if (!products.length) risks.push("Sin catalogo conectado, puede recomendarse un angulo dificil de ejecutar con inventario actual.");
  if (/skin|skincare|piel|suplement|vitamin|salud|health/.test(payloadText(payload).toLowerCase())) {
    risks.push("Categoria sensible a claims: evitar promesas medicas, curas o resultados garantizados sin substanciacion.");
  }
  return risks;
}

function buildWhitespaceValidationPlan(primary, brand) {
  if (!primary) {
    return [
      "Agregar 3 competidores directos y 3 productos top de la marca.",
      "Definir canal principal de validacion.",
      "Volver a correr el analisis con catalogo o evidencia de clientes.",
    ];
  }
  return [
    `Hipotesis: ${primary.title}.`,
    `Pagina/test: ${primary.validationTest}`,
    `Oferta minima: ${primary.firstOffer}.`,
    `Canal: ${primary.channel}.`,
    `Decision: continuar solo si mejora conversion, add-to-cart, respuesta cualitativa o CAC vs el posicionamiento actual de ${brand.name}.`,
  ];
}

function runShopifyPageBuilderTool(payload) {
  const text = payloadText(payload);
  const shop = payload.shopify?.shop || "";
  const page = buildShopifyPageDraft(payload, text);
  const warnings = [];

  if (!shop) {
    warnings.push("Conecta o selecciona una tienda Shopify antes de publicar.");
  }
  warnings.push("Se generó como draft de Agent Genia; la publicación en Shopify requiere aprobación del usuario.");
  warnings.push("Para poder crear páginas reales, la app Shopify debe tener el permiso write_content y la tienda debe reinstalar/autorizar ese permiso.");

  return {
    type: "shopify_page_draft",
    toolUsed: "shopify_page_builder",
    market: payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    shopify: {
      shop,
      focus: payload.shopify?.focus || "",
    },
    page,
    warnings,
    nextSteps: [
      "Revisa el preview y confirma que la oferta, promesas y CTA sean correctos.",
      "Publica solo si la tienda conectada es la tienda correcta.",
      "Después de publicar, revisa la página en Shopify y conecta links/menús si hace falta.",
    ],
  };
}

function buildShopifyPageDraft(payload, text) {
  const brand = payload.brand || {};
  const product = cleanPageTopic(payload.product || brand.name || payload.reference || payload.problem || payload.naturalRequest);
  const brandName = cleanPageTopic(brand.name || inferBrandFromUrl(brand.url) || "Tu marca");
  const goal = cleanSentence(brand.goal || payload.shopify?.focus || "convertir visitantes en clientes");
  const audience = inferPageAudience(text);
  const offer = inferPageOffer(text, product);
  const handle = slugify(`${product} ${offer.short}`);
  const title = `${product}: ${offer.short}`;
  const cta = inferPageCta(text);
  const benefits = buildPageBenefits(text, product, audience);
  const objections = buildPageObjections(text);
  const seoDescription = `${product} de ${brandName}. ${offer.summary}`.slice(0, 155);
  const bodyHtml = buildShopifyPageHtml({
    brandName,
    product,
    audience,
    offer,
    goal,
    cta,
    benefits,
    objections,
  });

  return {
    title,
    handle,
    bodyHtml,
    seoTitle: title.slice(0, 70),
    seoDescription,
    published: true,
    preview: {
      brandName,
      product,
      audience,
      headline: offer.headline,
      subheadline: offer.summary,
      cta,
      benefits,
      objections,
    },
  };
}

function buildShopifyPageHtml({ brandName, product, audience, offer, goal, cta, benefits, objections }) {
  return `
<section style="padding:56px 20px;max-width:1040px;margin:0 auto;font-family:inherit;">
  <p style="margin:0 0 12px;color:#5f6f68;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(brandName)}</p>
  <h1 style="font-size:clamp(34px,6vw,64px);line-height:1.02;margin:0 0 18px;color:#17211c;">${escapeHtml(offer.headline)}</h1>
  <p style="font-size:20px;line-height:1.5;max-width:760px;color:#4d5c56;margin:0 0 28px;">${escapeHtml(offer.summary)}</p>
  <p style="margin:0;"><a href="/collections/all" style="display:inline-block;background:#17211c;color:#fff;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:800;">${escapeHtml(cta)}</a></p>
</section>

<section style="padding:34px 20px;max-width:1040px;margin:0 auto;">
  <h2 style="font-size:32px;line-height:1.15;margin:0 0 18px;color:#17211c;">Para ${escapeHtml(audience)}</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
    ${benefits.map((item) => `<article style="border:1px solid #d9e2dd;border-radius:12px;padding:18px;background:#fff;"><h3 style="font-size:18px;margin:0 0 8px;color:#17211c;">${escapeHtml(item.title)}</h3><p style="margin:0;color:#60706a;line-height:1.45;">${escapeHtml(item.copy)}</p></article>`).join("")}
  </div>
</section>

<section style="padding:34px 20px;max-width:1040px;margin:0 auto;">
  <h2 style="font-size:32px;line-height:1.15;margin:0 0 18px;color:#17211c;">Por qué esta página existe</h2>
  <p style="font-size:18px;line-height:1.55;color:#4d5c56;margin:0;max-width:760px;">${escapeHtml(goal)}. Esta página debe explicar el valor de ${escapeHtml(product)}, reducir dudas y llevar al visitante a una acción simple.</p>
</section>

<section style="padding:34px 20px;max-width:1040px;margin:0 auto;">
  <h2 style="font-size:32px;line-height:1.15;margin:0 0 18px;color:#17211c;">Dudas que debemos resolver</h2>
  <ul style="display:grid;gap:10px;margin:0;padding-left:22px;color:#4d5c56;font-size:18px;line-height:1.5;">
    ${objections.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
  </ul>
</section>

<section style="padding:46px 20px 64px;max-width:1040px;margin:0 auto;text-align:center;">
  <h2 style="font-size:34px;line-height:1.15;margin:0 0 14px;color:#17211c;">Listo para probar ${escapeHtml(product)}?</h2>
  <p style="font-size:18px;line-height:1.45;color:#60706a;margin:0 0 24px;">Empieza con la colección principal y ajusta esta página con datos reales de tráfico, conversiones y preguntas de clientes.</p>
  <a href="/collections/all" style="display:inline-block;background:#0f7b68;color:#fff;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:800;">${escapeHtml(cta)}</a>
</section>`.trim();
}

function inferPageAudience(text) {
  const value = text.toLowerCase();
  if (/mama|mamá|mamas|mamás|madres/.test(value)) return "personas ocupadas que quieren una compra fácil y confiable";
  if (/skincare|piel|beauty|belleza/.test(value)) return "personas que quieren una rutina más clara para su piel";
  if (/suplement|protein|prote[ií]na|vitamin/.test(value)) return "personas que buscan mejorar su rutina diaria sin complicarse";
  if (/shopify|tienda|marca/.test(value)) return "clientes que necesitan entender rápido por qué comprar";
  return "clientes que quieren resolver este problema sin perder tiempo";
}

function inferPageOffer(text, product) {
  const value = text.toLowerCase();
  if (/descuento|promo|oferta/.test(value)) {
    return {
      short: "oferta especial",
      headline: `${product} con una oferta simple de entender`,
      summary: "Una página enfocada en explicar el beneficio, responder dudas y llevar al cliente a comprar con menos fricción.",
    };
  }
  if (/landing|conversion|conversi[oó]n|ads|anuncios/.test(value)) {
    return {
      short: "landing de conversion",
      headline: `${product} explicado para convertir mejor`,
      summary: "Una landing pensada para tráfico frío: promesa clara, beneficios concretos, objeciones resueltas y CTA directo.",
    };
  }
  return {
    short: "pagina de marca",
    headline: `${product} con una propuesta clara`,
    summary: "Una página lista para Shopify que ordena la oferta, muestra beneficios y guía al visitante hacia la colección principal.",
  };
}

function inferPageCta(text) {
  const value = text.toLowerCase();
  if (/reserv|waitlist|lista de espera/.test(value)) return "Unirme a la lista";
  if (/cotiz|contact/.test(value)) return "Pedir información";
  return "Ver productos";
}

function buildPageBenefits(text, product) {
  const category = text.toLowerCase();
  if (/skincare|piel|beauty|belleza/.test(category)) {
    return [
      { title: "Rutina más clara", copy: "Explica qué problema resuelve y cómo encaja en el día a día." },
      { title: "Compra con confianza", copy: "Deja visibles expectativas, uso, ingredientes o prueba social pendiente." },
      { title: "Oferta sin ruido", copy: "Centra la página en el producto principal y evita distraer con demasiadas opciones." },
    ];
  }
  return [
    { title: "Beneficio principal", copy: `Presenta ${product} con una promesa simple y específica.` },
    { title: "Menos fricción", copy: "Responde dudas de envío, calidad, uso y confianza antes del CTA." },
    { title: "Siguiente paso claro", copy: "Lleva al visitante a colección, producto o contacto sin pedirle pensar demasiado." },
  ];
}

function buildPageObjections(text) {
  const objections = ["Qué incluye exactamente.", "Por qué cuesta lo que cuesta.", "Cuánto tarda el envío.", "Qué pasa si no me sirve."];
  if (/skincare|piel|beauty|belleza/.test(text.toLowerCase())) {
    objections.push("Cómo se usa y para qué tipo de piel aplica.");
  }
  return objections;
}

function cleanPageTopic(value) {
  return cleanSentence(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").slice(0, 80) || "Nueva página";
}

function cleanSentence(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function inferBrandFromUrl(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "";
  } catch {
    return "";
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || `agent-genia-page-${Date.now()}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function runShippingRateTool(payload, env) {
  const text = payloadText(payload);
  const currency = inferCurrency(text, payload.market);
  const defaults = defaultProfitabilityAssumptions(text, currency);
  const declaredValue =
    extractMoneyNear(text, ["valor declarado", "valor del paquete", "valor producto", "producto vale", "asegurar"]) ||
    defaults.aov;
  const shippingQuote = await resolveShippingCost({
    payload: {
      ...payload,
      market: currency === "MXN" ? "MX" : payload.market,
    },
    text,
    currency,
    defaults,
    extracted: {},
    env,
    aov: declaredValue,
  });
  const profile = shippingQuote.profile || {};
  const route = {
    originZip: profile.originZip || "",
    originCity: profile.originCity || "",
    originState: profile.originState || "",
    destinationZip: profile.destinationZip || "",
    destinationCity: profile.destinationCity || "",
    destinationState: profile.destinationState || "",
  };
  const packageInfo = {
    weightKg: round((profile.weightOz || 0) / 35.274, 3),
    lengthCm: round((profile.lengthIn || 0) * 2.54, 1),
    widthCm: round((profile.widthIn || 0) * 2.54, 1),
    heightCm: round((profile.heightIn || 0) * 2.54, 1),
    assumedWeight: Boolean(profile.assumedWeight),
    assumedDimensions: Boolean(profile.assumedDimensions),
  };
  const live = isLiveShippingQuote(shippingQuote);
  const warnings = [];

  if (!live && shippingQuote.mode !== "user_provided") {
    if (shippingQuote.mode === "estimated_no_envia_token") {
      warnings.push("Aún no hay ENVIA_TOKEN en Cloudflare; el resultado queda marcado como estimación.");
    } else if (shippingQuote.mode === "estimated_after_envia_error") {
      warnings.push("Envia.com respondió con error; revisa token/carriers y mientras tanto el resultado queda marcado como estimación.");
    } else {
      warnings.push(
        currency === "MXN"
          ? "Faltan datos para cotizar con Envia.com; el resultado queda marcado como estimación."
          : "Aún no hay API key de cotización o faltan datos; el resultado queda marcado como estimación.",
      );
    }
  }
  if (shippingQuote.missingFields?.length) {
    warnings.push(`Para una cotización más precisa falta: ${shippingQuote.missingFields.join(", ")}.`);
  }
  if (packageInfo.assumedDimensions) {
    warnings.push("Las medidas del paquete fueron asumidas; si la caja es más grande, puede subir por peso volumétrico.");
  }

  return {
    type: "shipping_quote",
    toolUsed: "shipping_rate_quote",
    provider: currency === "MXN" ? "Envia.com rate quote" : "EasyPost rate quote",
    rateOnly: true,
    problem: payload.problem,
    reference: payload.reference,
    market: currency === "MXN" ? "MX" : payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    shippingQuote,
    route,
    package: packageInfo,
    warnings,
    nextSteps: buildShippingQuoteSteps(shippingQuote, currency),
  };
}

async function runProfitabilityTool(payload, env) {
  const text = payloadText(payload);
  const currency = inferCurrency(text, payload.market);
  const defaults = defaultProfitabilityAssumptions(text, currency);
  const extracted = extractProfitabilityNumbers(text);
  const feesPercent = extracted.feesPercent ?? 3.2;
  const feesFixed = extracted.feesFixed ?? (currency === "MXN" ? 6 : 0.3);
  const targetNetMargin = extracted.targetNetMargin ?? 15;
  const aov = extracted.aov ?? defaults.aov;
  const cogs = extracted.cogs ?? defaults.cogs;
  const shippingQuote = await resolveShippingCost({ payload, text, currency, defaults, extracted, env, aov });
  const shipping = shippingQuote.amount;
  const returnRate = extracted.returnRate ?? defaults.returnRate;
  const returnLoss = extracted.returnLoss ?? cogs + shipping + (aov * (feesPercent / 100) + feesFixed);
  const fees = aov * (feesPercent / 100) + feesFixed;
  const returnsReserve = (returnRate / 100) * returnLoss;
  const variableCosts = cogs + shipping + fees + returnsReserve;
  const contribution = aov - variableCosts;
  const margin = aov > 0 ? contribution / aov : 0;
  const targetProfit = aov * (targetNetMargin / 100);
  const cacMax = Math.max(0, contribution);
  const cacTarget = Math.max(0, contribution - targetProfit);
  const breakEvenRoas = cacMax > 0 ? aov / cacMax : Infinity;
  const targetRoas = cacTarget > 0 ? aov / cacTarget : Infinity;
  const repurchaseMultiplier = extracted.repurchaseMultiplier ?? defaults.repurchaseMultiplier;
  const ltvContribution = Math.max(0, contribution * repurchaseMultiplier);

  const profitability = {
    ideaName: cleanIdeaName(payload.reference, payload.problem),
    currency,
    aov,
    cogs,
    shipping,
    feesPercent,
    feesFixed,
    fees,
    returnRate,
    returnLoss,
    returnsReserve,
    variableCosts,
    contribution,
    margin,
    targetNetMargin,
    targetProfit,
    cacMax,
    cacTarget,
    breakEvenRoas,
    targetRoas,
    repurchaseMultiplier,
    ltvContribution,
    differentiation: extracted.differentiation ?? defaults.differentiation,
    channel: extracted.channel ?? defaults.channel,
    shippingQuote,
    assumptions: buildAssumptionNotes({
      extracted,
      defaults,
      currency,
      feesPercent,
      feesFixed,
      targetNetMargin,
      shippingQuote,
    }),
  };
  const score = calculateProfitabilityScore(profitability);
  const verdict = getProfitabilityVerdict(profitability, score);

  return {
    type: "profitability",
    toolUsed: "unit_economics_filter",
    problem: payload.problem,
    reference: payload.reference,
    market: payload.market || "US",
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    profitability,
    score,
    verdict,
    risks: buildProfitabilityRisks(profitability),
    steps: buildProfitabilitySteps(profitability, verdict),
  };
}

function inferCurrency(text, market) {
  const value = text.toLowerCase();
  if (
    market === "MX" ||
    /\b(mxn|pesos?|méxico|mexico|cp origen|cp destino|c[oó]digo postal|codigo postal|jalisco|zacatecas|zapopan|guadalajara|monterrey|cdmx|edomex|quer[eé]taro|puebla|tijuana|m[eé]rida|merida)\b/.test(value)
  ) {
    return "MXN";
  }
  return "USD";
}

function defaultProfitabilityAssumptions(text, currency) {
  const value = text.toLowerCase();
  const multiply = currency === "MXN" ? 18 : 1;
  const defaults = {
    aov: 55,
    cogs: 16,
    shipping: 8,
    returnRate: 10,
    repurchaseMultiplier: 1.15,
    differentiation: "weak",
    channel: "meta",
    category: "producto ecommerce",
    package: { weightOz: 16, lengthIn: 8, widthIn: 6, heightIn: 3 },
  };

  if (/skin|skincare|piel|beauty|belleza|serum|jolie/.test(value)) {
    Object.assign(defaults, {
      aov: 68,
      cogs: 16,
      shipping: 8.5,
      returnRate: 8,
      repurchaseMultiplier: 1.35,
      differentiation: "clear",
      channel: "meta",
      category: "skincare",
      package: { weightOz: 12, lengthIn: 7, widthIn: 5, heightIn: 3 },
    });
  } else if (/suplement|protein|prote[ií]na|vitamin|magnesium|creatina|collagen|col[aá]geno/.test(value)) {
    Object.assign(defaults, {
      aov: 58,
      cogs: 14,
      shipping: 7.5,
      returnRate: 7,
      repurchaseMultiplier: 1.7,
      differentiation: "weak",
      channel: "meta",
      category: "suplementos",
      package: { weightOz: 20, lengthIn: 6, widthIn: 5, heightIn: 5 },
    });
  } else if (/filter|water|agua|ducha|shower|hard/.test(value)) {
    Object.assign(defaults, {
      aov: 84,
      cogs: 22,
      shipping: 10,
      returnRate: 10,
      repurchaseMultiplier: 1.15,
      differentiation: "clear",
      channel: "tiktok-organic",
      category: "filtro de ducha",
      package: { weightOz: 28, lengthIn: 9, widthIn: 6, heightIn: 4 },
    });
  } else if (/gadget|viral|tiktok shop|accesorio/.test(value)) {
    Object.assign(defaults, {
      aov: 29,
      cogs: 9,
      shipping: 6.5,
      returnRate: 12,
      repurchaseMultiplier: 1,
      differentiation: "weak",
      channel: "tiktok-paid",
      category: "gadget viral",
      package: { weightOz: 8, lengthIn: 6, widthIn: 4, heightIn: 2 },
    });
  } else if (/ropa|apparel|fashion|moda|leggings|camiseta|shirt/.test(value)) {
    Object.assign(defaults, {
      aov: 64,
      cogs: 18,
      shipping: 8,
      returnRate: 18,
      repurchaseMultiplier: 1.15,
      differentiation: "weak",
      channel: "influencers",
      category: "moda",
      package: { weightOz: 14, lengthIn: 12, widthIn: 10, heightIn: 2 },
    });
  }

  if (currency === "MXN") {
    defaults.aov = Math.round(defaults.aov * multiply);
    defaults.cogs = Math.round(defaults.cogs * multiply);
    defaults.shipping = Math.round(defaults.shipping * multiply);
  }

  return defaults;
}

async function resolveShippingCost({ payload, text, currency, defaults, extracted, env, aov }) {
  const profile = extractShippingProfile(text, payload.market, env, defaults, aov);
  if (extracted.shipping != null) {
    return {
      mode: "user_provided",
      amount: extracted.shipping,
      currency,
      profile,
      notes: ["Usé el envío escrito por el usuario."],
      missingFields: [],
      rates: [],
    };
  }

  const estimate = estimateShippingCost(profile, defaults, currency);
  if (currency === "MXN") {
    if (!env.ENVIA_TOKEN) {
      return {
        mode: "estimated_no_envia_token",
        amount: estimate.amount,
        currency,
        profile,
        notes: [
          estimate.note,
          "Para cotizar paqueterías mexicanas en vivo configura ENVIA_TOKEN en Cloudflare.",
        ],
        missingFields: profile.missingFields,
        rates: [],
      };
    }

    if (!canQuoteEnviaMexico(profile)) {
      return {
        mode: "estimated_missing_mx_details",
        amount: estimate.amount,
        currency,
        profile,
        notes: [
          estimate.note,
          `Para cotizar en México necesito: ${profile.missingFields.join(", ")}.`,
        ],
        missingFields: profile.missingFields,
        rates: [],
      };
    }

    const live = await quoteEnviaMexicoRates(profile, env);
    if (!live.ok) {
      return {
        mode: "estimated_after_envia_error",
        amount: estimate.amount,
        currency,
        profile,
        notes: [
          estimate.note,
          `Intenté cotizar con Envia.com pero falló: ${live.message}`,
        ],
        missingFields: profile.missingFields,
        rates: [],
      };
    }

    return {
      mode: "live_envia_mx",
      amount: live.selected.amount,
      currency: live.selected.currency,
      carrier: live.selected.carrier,
      service: live.selected.service,
      deliveryDays: live.selected.deliveryDays,
      deliveryEstimate: live.selected.deliveryEstimate,
      profile,
      notes: [`Cotización en vivo México: ${live.selected.carrier} ${live.selected.service}.`],
      missingFields: [],
      rates: live.rates,
    };
  }

  if (!env.EASYPOST_API_KEY) {
    return {
      mode: "estimated_no_api_key",
      amount: estimate.amount,
      currency,
      profile,
      notes: [estimate.note, "Para cotizar carriers en vivo configura EASYPOST_API_KEY en Cloudflare."],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  if (currency !== "USD") {
    return {
      mode: "estimated_unsupported_currency",
      amount: estimate.amount,
      currency,
      profile,
      notes: [
        estimate.note,
        "La cotización automática actual está preparada para envíos domésticos en USD; usé estimado para este mercado.",
      ],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  if (!canQuoteEasyPost(profile)) {
    return {
      mode: "estimated_missing_details",
      amount: estimate.amount,
      currency,
      profile,
      notes: [
        estimate.note,
        `Para cotizar en vivo necesito: ${profile.missingFields.join(", ")}.`,
      ],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  const live = await quoteEasyPostRates(profile, env.EASYPOST_API_KEY);
  if (!live.ok) {
    return {
      mode: "estimated_after_quote_error",
      amount: estimate.amount,
      currency,
      profile,
      notes: [
        estimate.note,
        `Intenté cotizar con EasyPost pero falló: ${live.message}`,
      ],
      missingFields: profile.missingFields,
      rates: [],
    };
  }

  return {
    mode: "live_easypost",
    amount: live.selected.amount,
    currency: live.selected.currency,
    carrier: live.selected.carrier,
    service: live.selected.service,
    deliveryDays: live.selected.deliveryDays,
    profile,
    notes: [`Cotización en vivo: ${live.selected.carrier} ${live.selected.service}.`],
    missingFields: [],
    rates: live.rates,
  };
}

function extractShippingProfile(text, market, env, defaults, declaredValue) {
  const postalCodes = extractPostalCodes(text);
  const labeledOriginZip = extractZipNear(text, ["origen", "desde", "sale de", "bodega", "warehouse", "from", "zip origen", "cp origen"]);
  const labeledDestinationZip = extractZipNear(text, ["destino", "hacia", "cliente", "enviar a", "ship to", "to", "zip destino", "cp destino"]);
  const originZip =
    labeledOriginZip ||
    env.SHIP_FROM_ZIP ||
    postalCodes.find((zip) => zip !== labeledDestinationZip) ||
    "";
  const destinationZip =
    labeledDestinationZip ||
    postalCodes.find((zip) => zip !== originZip) ||
    "";
  const dimensions = extractDimensions(text) || {};
  const originLocation = inferMexicoLocation(originZip);
  const destinationLocation = inferMexicoLocation(destinationZip);
  const profile = {
    country: market === "MX" ? "MX" : "US",
    originZip,
    destinationZip,
    originState: env.SHIP_FROM_STATE || originLocation.state || "",
    originCity: env.SHIP_FROM_CITY || originLocation.city || "",
    originStreet: env.SHIP_FROM_STREET || "Warehouse",
    originName: env.SHIP_FROM_NAME || "Agent Genia",
    originPhone: env.SHIP_FROM_PHONE || "+52 5555555555",
    originEmail: env.SHIP_FROM_EMAIL || "shipping@example.com",
    destinationState: extractStateNear(text, ["estado destino", "destino estado", "estado cliente"]) || destinationLocation.state || "",
    destinationCity: extractTextNear(text, ["ciudad destino", "destino ciudad", "ciudad cliente"]) || destinationLocation.city || "",
    destinationStreet: extractTextNear(text, ["calle destino", "direccion destino", "dirección destino"]) || "Direccion pendiente",
    declaredValue: Number.isFinite(declaredValue) && declaredValue > 0 ? declaredValue : 1000,
    weightOz: extractWeightOz(text) || defaults.package.weightOz,
    lengthIn: dimensions.lengthIn || defaults.package.lengthIn,
    widthIn: dimensions.widthIn || defaults.package.widthIn,
    heightIn: dimensions.heightIn || defaults.package.heightIn,
    assumedWeight: !extractWeightOz(text),
    assumedDimensions: !dimensions.lengthIn,
  };

  profile.missingFields = [];
  if (!profile.originZip) profile.missingFields.push("zip/código postal de origen");
  if (!profile.destinationZip) profile.missingFields.push("zip/código postal del cliente");
  if (profile.country === "MX" && !profile.originState) profile.missingFields.push("estado de origen");
  if (profile.country === "MX" && !profile.destinationState) profile.missingFields.push("estado destino");
  if (profile.assumedWeight) profile.missingFields.push("peso del paquete");
  if (profile.assumedDimensions) profile.missingFields.push("largo x ancho x alto del paquete");
  return profile;
}

function extractPostalCodes(text) {
  return [...new Set((text.match(/\b\d{5}\b/g) || []).filter((zip) => Number(zip.slice(0, 2)) <= 99))];
}

function extractZipNear(text, labels) {
  for (const label of labels) {
    const forward = new RegExp(`${escapeRegExp(label)}[^0-9]{0,35}(\\d{5}(?:-\\d{4})?)`, "i");
    const backward = new RegExp(`(\\d{5}(?:-\\d{4})?)[^a-z0-9]{0,35}${escapeRegExp(label)}`, "i");
    const match = text.match(forward) || text.match(backward);
    if (match) return match[1];
  }
  return "";
}

function extractTextNear(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${escapeRegExp(label)}\\s*[:=-]?\\s*([a-záéíóúñ\\s.]{2,35})`, "i"));
    if (match) return match[1].replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "");
  }
  return "";
}

function extractStateNear(text, labels) {
  const states = {
    aguascalientes: "AG",
    "baja california": "BC",
    "baja california sur": "BS",
    campeche: "CM",
    chiapas: "CS",
    chihuahua: "CH",
    cdmx: "CX",
    "ciudad de mexico": "CX",
    "ciudad de méxico": "CX",
    coahuila: "CO",
    colima: "CL",
    durango: "DG",
    guanajuato: "GT",
    guerrero: "GR",
    hidalgo: "HG",
    jalisco: "JA",
    "estado de mexico": "EM",
    "estado de méxico": "EM",
    edomex: "EM",
    michoacan: "MI",
    michoacán: "MI",
    morelos: "MO",
    nayarit: "NA",
    "nuevo leon": "NL",
    "nuevo león": "NL",
    oaxaca: "OA",
    puebla: "PU",
    queretaro: "QT",
    querétaro: "QT",
    "quintana roo": "QR",
    "san luis potosi": "SL",
    "san luis potosí": "SL",
    sinaloa: "SI",
    sonora: "SO",
    tabasco: "TB",
    tamaulipas: "TM",
    tlaxcala: "TL",
    veracruz: "VE",
    yucatan: "YU",
    yucatán: "YU",
    zacatecas: "ZA",
  };
  const value = extractTextNear(text, labels).toLowerCase();
  if (!value) return "";
  const code = value.match(/\b[A-Z]{2}\b/i)?.[0]?.toUpperCase();
  if (code) return code;
  return states[value] || "";
}

function extractWeightOz(text) {
  const match =
    text.match(/(?:peso del paquete|peso paquete|weight|paquete pesa|pesa|\bpeso\b)\D{0,20}([0-9]+(?:[.,][0-9]+)?)\s*(oz|onza|onzas|lb|lbs|libra|libras|kg|kilo|kilos|g|gr|gramos?)\b/i) ||
    text.match(/\b([0-9]+(?:[.,][0-9]+)?)\s*(kg|kilo|kilos|g|gr|gramos?|lb|lbs|oz|onzas?)\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return null;
  if (["lb", "lbs", "libra", "libras"].includes(unit)) return value * 16;
  if (["kg", "kilo", "kilos"].includes(unit)) return value * 35.274;
  if (["g", "gr", "gramo", "gramos"].includes(unit)) return value * 0.035274;
  return value;
}

function extractDimensions(text) {
  const match =
    text.match(/(?:dimensiones|medidas|size|caja)\D{0,20}([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*(in|inch|inches|pulgadas?|cm|centimetros|centímetros)?/i) ||
    text.match(/\b([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*[x×]\s*([0-9]+(?:[.,][0-9]+)?)\s*(in|inch|inches|pulgadas?|cm|centimetros|centímetros)\b/i);
  if (!match) return null;
  const values = [match[1], match[2], match[3]].map((item) => Number(item.replace(",", ".")));
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  const unit = (match[4] || "in").toLowerCase();
  const multiplier = ["cm", "centimetro", "centimetros", "centímetro", "centímetros"].includes(unit) ? 0.393701 : 1;
  return {
    lengthIn: values[0] * multiplier,
    widthIn: values[1] * multiplier,
    heightIn: values[2] * multiplier,
  };
}

function estimateShippingCost(profile, defaults, currency) {
  if (currency === "MXN") {
    const weightKg = profile.weightOz / 35.274;
    const dimensionalWeightKg = (profile.lengthIn * 2.54 * profile.widthIn * 2.54 * profile.heightIn * 2.54) / 5000;
    const billableWeight = Math.max(0.5, weightKg, dimensionalWeightKg);
    const sameMetro = profile.originZip && profile.destinationZip && profile.originZip.slice(0, 2) === profile.destinationZip.slice(0, 2);
    const sameRegion =
      profile.originZip &&
      profile.destinationZip &&
      Math.abs(Number(profile.originZip.slice(0, 2)) - Number(profile.destinationZip.slice(0, 2))) <= 8;
    const base = sameMetro ? 95 : sameRegion ? 125 : 155;
    const perKg = sameMetro ? 28 : sameRegion ? 36 : 52;
    const amount = Math.max(defaults.shipping, Math.round(base + billableWeight * perKg));
    return {
      amount,
      note: `Estimé envío doméstico en México usando peso facturable aproximado (${round(billableWeight, 2)} kg).`,
    };
  }

  const weightLb = Math.max(0.25, profile.weightOz / 16);
  const dimensionalWeightLb = (profile.lengthIn * profile.widthIn * profile.heightIn) / 139;
  const billableWeight = Math.max(weightLb, dimensionalWeightLb);
  const base = profile.destinationZip && profile.originZip ? 4.85 : defaults.shipping * 0.75;
  const amount = round(Math.max(defaults.shipping, base + billableWeight * 1.65 + (billableWeight > 2 ? 1.75 : 0)), 2);
  return {
    amount,
    note: `Estimé envío con peso facturable de ${round(billableWeight, 2)} lb.`,
  };
}

function inferMexicoLocation(zip) {
  if (!zip || !/^\d{5}$/.test(zip)) return {};
  const prefix = Number(zip.slice(0, 2));
  const ranges = [
    [1, 16, "CX", "Ciudad de Mexico"],
    [20, 20, "AG", "Aguascalientes"],
    [21, 22, "BC", "Tijuana"],
    [23, 23, "BS", "La Paz"],
    [24, 24, "CM", "Campeche"],
    [25, 27, "CO", "Saltillo"],
    [28, 28, "CL", "Colima"],
    [29, 30, "CS", "Tuxtla Gutierrez"],
    [31, 33, "CH", "Chihuahua"],
    [34, 35, "DG", "Durango"],
    [36, 38, "GT", "Leon"],
    [39, 41, "GR", "Acapulco"],
    [42, 43, "HG", "Pachuca"],
    [44, 49, "JA", "Guadalajara"],
    [50, 57, "EM", "Toluca"],
    [58, 61, "MI", "Morelia"],
    [62, 62, "MO", "Cuernavaca"],
    [63, 63, "NA", "Tepic"],
    [64, 67, "NL", "Monterrey"],
    [68, 71, "OA", "Oaxaca"],
    [72, 75, "PU", "Puebla"],
    [76, 76, "QT", "Queretaro"],
    [77, 77, "QR", "Cancun"],
    [78, 79, "SL", "San Luis Potosi"],
    [80, 82, "SI", "Culiacan"],
    [83, 85, "SO", "Hermosillo"],
    [86, 86, "TB", "Villahermosa"],
    [87, 89, "TM", "Tampico"],
    [90, 90, "TL", "Tlaxcala"],
    [91, 96, "VE", "Veracruz"],
    [97, 97, "YU", "Merida"],
    [98, 99, "ZA", "Zacatecas"],
  ];
  const match = ranges.find(([from, to]) => prefix >= from && prefix <= to);
  return match ? { state: match[2], city: match[3] } : {};
}

function canQuoteEnviaMexico(profile) {
  return (
    profile.country === "MX" &&
    profile.originZip &&
    profile.destinationZip &&
    profile.originState &&
    profile.destinationState &&
    profile.weightOz > 0 &&
    profile.lengthIn > 0 &&
    profile.widthIn > 0 &&
    profile.heightIn > 0
  );
}

async function quoteEnviaMexicoRates(profile, env) {
  const carriers = (env.ENVIA_CARRIERS || "dhl,estafeta,fedex,ups,paquetexpress")
    .split(",")
    .map((carrier) => carrier.trim().toLowerCase())
    .filter(Boolean);
  const baseUrl = (env.ENVIA_API_BASE || (env.ENVIA_ENV === "sandbox" ? "https://api-test.envia.com" : "https://api.envia.com")).replace(/\/$/, "");
  const results = await Promise.all(carriers.map((carrier) => quoteEnviaCarrierRate(profile, env.ENVIA_TOKEN, baseUrl, carrier)));
  const rates = results
    .flatMap((result) => (result.ok ? result.rates : []))
    .filter((rate) => Number.isFinite(rate.amount) && rate.amount > 0)
    .sort((a, b) => a.amount - b.amount);

  if (!rates.length) {
    const message =
      results.find((result) => !result.ok)?.message ||
      "Envia.com no regresó tarifas para la ruta y paquete enviados.";
    return { ok: false, message };
  }

  return {
    ok: true,
    selected: rates[0],
    rates: rates.slice(0, 6),
  };
}

async function quoteEnviaCarrierRate(profile, token, baseUrl, carrier) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${baseUrl}/ship/rate/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        origin: {
          name: profile.originName,
          phone: profile.originPhone,
          street: profile.originStreet,
          city: profile.originCity || "Ciudad de Mexico",
          state: profile.originState,
          country: "MX",
          postalCode: profile.originZip,
        },
        destination: {
          name: "Cliente",
          phone: "+52 5555555555",
          street: profile.destinationStreet,
          city: profile.destinationCity || "Ciudad de Mexico",
          state: profile.destinationState,
          country: "MX",
          postalCode: profile.destinationZip,
        },
        packages: [
          {
            type: "box",
            content: "Producto ecommerce",
            amount: 1,
            declaredValue: Math.max(1, round(profile.declaredValue, 2)),
            lengthUnit: "CM",
            weightUnit: "KG",
            weight: round(profile.weightOz / 35.274, 2),
            dimensions: {
              length: round(profile.lengthIn * 2.54, 1),
              width: round(profile.widthIn * 2.54, 1),
              height: round(profile.heightIn * 2.54, 1),
            },
          },
        ],
        shipment: {
          type: 1,
          carrier,
        },
        settings: {
          currency: "MXN",
        },
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, message: body?.message || body?.error || `${carrier}: HTTP ${response.status}` };
    }

    const data = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
    const rates = data
      .map((rate) => ({
        carrier: rate.carrier || carrier,
        service: rate.serviceDescription || rate.service || "servicio",
        amount: Number(rate.totalPrice ?? rate.total ?? rate.price),
        currency: rate.currency || "MXN",
        deliveryDays: rate.deliveryDate?.dateDifference ?? null,
        deliveryEstimate: rate.deliveryEstimate || "",
      }))
      .filter((rate) => Number.isFinite(rate.amount) && rate.amount > 0);

    return rates.length ? { ok: true, rates } : { ok: false, message: `${carrier}: sin tarifas disponibles` };
  } catch (error) {
    const message = error && error.name === "AbortError" ? `${carrier}: timeout` : error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  } finally {
    clearTimeout(timeout);
  }
}

function canQuoteEasyPost(profile) {
  return (
    profile.country === "US" &&
    profile.originZip &&
    profile.destinationZip &&
    profile.weightOz > 0 &&
    profile.lengthIn > 0 &&
    profile.widthIn > 0 &&
    profile.heightIn > 0
  );
}

async function quoteEasyPostRates(profile, apiKey) {
  try {
    const response = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        shipment: {
          to_address: {
            name: "Customer",
            street1: "Address omitted",
            city: profile.destinationCity || "Unknown",
            state: profile.destinationState || "NA",
            zip: profile.destinationZip,
            country: profile.country,
            phone: "5555555555",
            email: "customer@example.com",
          },
          from_address: {
            name: profile.originName,
            street1: profile.originStreet,
            city: profile.originCity || "Unknown",
            state: profile.originState || "NA",
            zip: profile.originZip,
            country: profile.country,
            phone: profile.originPhone,
            email: profile.originEmail,
          },
          parcel: {
            length: round(profile.lengthIn, 2),
            width: round(profile.widthIn, 2),
            height: round(profile.heightIn, 2),
            weight: round(profile.weightOz, 2),
          },
        },
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, message: body?.error?.message || `HTTP ${response.status}` };
    }

    const rates = Array.isArray(body.rates)
      ? body.rates
          .map((rate) => ({
            carrier: rate.carrier,
            service: rate.service,
            amount: Number(rate.rate),
            currency: rate.currency || "USD",
            deliveryDays: rate.delivery_days ?? null,
          }))
          .filter((rate) => Number.isFinite(rate.amount) && rate.amount > 0)
          .sort((a, b) => a.amount - b.amount)
      : [];

    if (!rates.length) {
      return { ok: false, message: "EasyPost no regresó tarifas disponibles." };
    }

    return {
      ok: true,
      selected: rates[0],
      rates: rates.slice(0, 5),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function extractProfitabilityNumbers(text) {
  return {
    aov: extractMoneyNear(text, [
      "precio",
      "venta",
      "vender",
      "vendo",
      "pedido",
      "orden",
      "aov",
      "ticket",
      "cobrar",
    ]),
    cogs: extractMoneyNear(text, [
      "costo del producto",
      "costo producto",
      "producto me cuesta",
      "me cuesta",
      "proveedor",
      "fabricacion",
      "fabricación",
      "cogs",
      "unitario",
    ]),
    shipping: extractMoneyNear(text, ["envio", "envío", "shipping", "fulfillment", "entrega", "paqueteria", "paquetería"]),
    feesFixed: extractMoneyNear(text, ["fee fijo", "cargo fijo", "tarifa fija"]),
    returnLoss: extractMoneyNear(text, ["costo por devolucion", "costo por devolución", "return loss", "perdida por devolucion", "pérdida por devolución"]),
    feesPercent: extractPercentNear(text, ["fee", "fees", "tarjeta", "stripe", "shopify", "plataforma", "procesador"]),
    returnRate: extractPercentNear(text, ["devoluciones", "returns", "regresan", "refund", "reembolso"]),
    targetNetMargin: extractPercentNear(text, ["margen objetivo", "ganancia objetivo", "utilidad objetivo"]),
    repurchaseMultiplier: inferRepurchase(text),
    differentiation: inferDifferentiation(text),
    channel: inferChannel(text),
  };
}

function extractMoneyNear(text, labels) {
  for (const label of labels) {
    const forward = new RegExp(`${escapeRegExp(label)}[^0-9$]{0,45}(?:[$]|usd|mxn|pesos?)?\\s*([0-9]+(?:[.,][0-9]+)?)`, "i");
    const backward = new RegExp(`(?:[$]|usd|mxn|pesos?)?\\s*([0-9]+(?:[.,][0-9]+)?)[^a-z0-9]{0,45}${escapeRegExp(label)}`, "i");
    const matches = [text.match(forward), text.match(backward)].filter(Boolean);
    for (const match of matches) {
      const amount = Number(match[1].replace(",", "."));
      if (looksLikePostalCodeAmount(match[0], amount)) continue;
      const context = text.slice(Math.max(0, (match.index || 0) - 45), (match.index || 0) + match[0].length);
      if (looksLikeProductCostNearShipping(context, label)) continue;
      return amount;
    }
  }
  return null;
}

function looksLikePostalCodeAmount(context, amount) {
  return /\b(cp|c\.p\.|zip|codigo postal|código postal)\b/i.test(context) && amount >= 10000 && amount <= 99999;
}

function looksLikeProductCostNearShipping(context, label) {
  const isShippingLabel = /env[ií]o|shipping|fulfillment|entrega|paqueter[ií]a/i.test(label);
  return isShippingLabel && /costo\s+(del\s+)?producto|producto\s+me\s+cuesta|cogs|proveedor/i.test(context);
}

function extractPercentNear(text, labels) {
  for (const label of labels) {
    const forward = new RegExp(`${escapeRegExp(label)}[^0-9%]{0,45}([0-9]+(?:[.,][0-9]+)?)\\s*%`, "i");
    const backward = new RegExp(`([0-9]+(?:[.,][0-9]+)?)\\s*%[^a-z0-9]{0,45}${escapeRegExp(label)}`, "i");
    const match = text.match(forward) || text.match(backward);
    if (match) return Number(match[1].replace(",", "."));
  }
  return null;
}

function inferRepurchase(text) {
  const value = text.toLowerCase();
  if (/suscripci[oó]n|cada mes|mensual|recurrente|consumible|suplement|vitamin|prote[ií]na/.test(value)) return 1.7;
  if (/recompra alta|reponer|cartucho|refill|repuesto|rutina|skincare/.test(value)) return 1.35;
  if (/recompra baja|one time|una vez|no recompra/.test(value)) return 1;
  return null;
}

function inferDifferentiation(text) {
  const value = text.toLowerCase();
  if (/patente|patentado|propietari|clinico|cl[ií]nico|certificaci[oó]n|dif[ií]cil de copiar/.test(value)) return "defensible";
  if (/diferente|diferenci|[uú]nico|mecanismo|prueba|certificado|mejor que/.test(value)) return "clear";
  if (/commodity|gen[eé]rico|igual|dropshipping|solo empaque|sin diferencia/.test(value)) return "commodity";
  return null;
}

function inferChannel(text) {
  const value = text.toLowerCase();
  if (/tiktok org[aá]nico|organico en tiktok|orgánico en tiktok/.test(value)) return "tiktok-organic";
  if (/tiktok ads|anuncios en tiktok|tiktok paid/.test(value)) return "tiktok-paid";
  if (/influencer|creador/.test(value)) return "influencers";
  if (/google|search|seo/.test(value)) return "search";
  if (/amazon/.test(value)) return "amazon";
  if (/meta|facebook|instagram|paid ads|anuncios/.test(value)) return "meta";
  return null;
}

function buildAssumptionNotes({ extracted, defaults, currency, feesPercent, feesFixed, targetNetMargin, shippingQuote }) {
  const notes = [];
  notes.push(
    extracted.aov == null
      ? `No diste precio; usé ${formatMoney(defaults.aov, currency)} como venta promedio inicial para ${defaults.category}.`
      : `Usé el precio que escribiste: ${formatMoney(extracted.aov, currency)} por pedido.`,
  );
  notes.push(
    extracted.cogs == null
      ? `No diste costo de producto; usé ${formatMoney(defaults.cogs, currency)} como costo inicial.`
      : `Usé el costo de producto que escribiste: ${formatMoney(extracted.cogs, currency)}.`,
  );
  notes.push(...buildShippingNotes(shippingQuote, currency));
  notes.push(
    extracted.returnRate == null
      ? `No diste devoluciones; asumí ${defaults.returnRate}% de pedidos con devolución.`
      : `Usé devoluciones estimadas de ${extracted.returnRate}%.`,
  );
  notes.push(`Cobros de plataforma estimados: ${feesPercent}% + ${formatMoney(feesFixed, currency)} por pedido.`);
  notes.push(`Meta sana: dejar ${targetNetMargin}% de la venta como ganancia antes de escalar.`);
  notes.push("Esto es un filtro inicial: confirma precio, proveedor, envío, comisiones y devoluciones antes de comprar inventario.");
  return notes;
}

function buildShippingNotes(shippingQuote, currency) {
  if (shippingQuote.mode === "live_envia_mx") {
    const days = shippingQuote.deliveryDays ? `, entrega aprox. ${shippingQuote.deliveryDays} días` : "";
    return [
      `Envío cotizado en vivo para México: ${formatMoney(shippingQuote.amount, shippingQuote.currency)} con ${shippingQuote.carrier} ${shippingQuote.service}${days}.`,
      `Paquete usado: ${round(shippingQuote.profile.weightOz / 35.274, 2)} kg, ${round(shippingQuote.profile.lengthIn * 2.54, 1)} x ${round(shippingQuote.profile.widthIn * 2.54, 1)} x ${round(shippingQuote.profile.heightIn * 2.54, 1)} cm.`,
    ];
  }

  if (shippingQuote.mode === "live_easypost") {
    return [
      `Envío cotizado en vivo: ${formatMoney(shippingQuote.amount, shippingQuote.currency)} con ${shippingQuote.carrier} ${shippingQuote.service}.`,
      `Paquete usado: ${round(shippingQuote.profile.weightOz, 1)} oz, ${round(shippingQuote.profile.lengthIn, 1)} x ${round(shippingQuote.profile.widthIn, 1)} x ${round(shippingQuote.profile.heightIn, 1)} in.`,
    ];
  }

  if (shippingQuote.mode === "user_provided") {
    return [`Usé el envío que escribiste: ${formatMoney(shippingQuote.amount, currency)}.`];
  }

  const details = shippingQuote.missingFields?.length
    ? ` Para mejorar precisión escribe ${shippingQuote.missingFields.join(", ")}.`
    : "";
  return [`No diste envío exacto; usé ${formatMoney(shippingQuote.amount, currency)} por pedido. ${shippingQuote.notes.join(" ")}${details}`];
}

function cleanIdeaName(reference, problem) {
  const ref = (reference || "").trim();
  if (ref && ref !== "marca de referencia") {
    return ref.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0];
  }
  return (problem || "Idea ecommerce").replace(/\s+/g, " ").slice(0, 90);
}

function calculateProfitabilityScore(data) {
  if (data.aov <= 0) return 0;

  let score = 0;
  score += clamp(((data.margin - 0.25) / 0.4) * 24, 0, 24);
  score += data.breakEvenRoas <= 1.8 ? 16 : data.breakEvenRoas <= 2.5 ? 12 : data.breakEvenRoas <= 3.2 ? 8 : data.breakEvenRoas <= 4 ? 4 : 0;
  score += data.cogs / data.aov <= 0.25 ? 8 : data.cogs / data.aov <= 0.35 ? 5 : data.cogs / data.aov <= 0.45 ? 2 : 0;
  score += data.shipping / data.aov <= 0.1 ? 6 : data.shipping / data.aov <= 0.16 ? 4 : data.shipping / data.aov <= 0.23 ? 2 : 0;
  score += data.returnRate <= 6 ? 6 : data.returnRate <= 12 ? 4 : data.returnRate <= 20 ? 2 : 0;
  score += { 1: 0, 1.15: 3, 1.35: 6, 1.7: 8 }[data.repurchaseMultiplier] || 0;
  score += { commodity: -8, weak: 0, clear: 6, defensible: 9 }[data.differentiation] || 0;
  score += data.cacTarget / data.aov >= 0.35 ? 8 : data.cacTarget / data.aov >= 0.2 ? 5 : data.cacTarget / data.aov >= 0.1 ? 2 : 0;

  const paidCacFloor = data.currency === "MXN" ? 350 : 20;
  if (isPaidChannel(data.channel)) {
    score += data.cacTarget >= paidCacFloor ? 5 : -10;
  } else {
    score += 4;
  }

  return Math.round(clamp(score, 0, 100));
}

function getProfitabilityVerdict(data, score) {
  const paidCacFloor = data.currency === "MXN" ? 350 : 20;
  const severe =
    data.aov <= 0 ||
    data.contribution <= 0 ||
    data.margin < 0.25 ||
    data.breakEvenRoas > 4.5 ||
    (isPaidChannel(data.channel) && data.cacTarget < paidCacFloor * 0.55);

  if (severe || score < 48) {
    return {
      level: "fail",
      label: "No lanzar todavía",
      title: "La idea se ve muy apretada",
      copy:
        "Antes de comprar inventario, mejora el precio, baja costos, baja envío o encuentra una diferencia más fuerte.",
    };
  }

  if (score < 72) {
    return {
      level: "watch",
      label: "Probar muy pequeño",
      title: "Puede funcionar, pero con cuidado",
      copy:
        "Haz una página simple, lista de espera o muestra pequeña. No compres mucho inventario hasta ver si conseguir clientes sale barato.",
    };
  }

  return {
    level: "pass",
    label: "Sí se puede probar pequeño",
    title: "La idea tiene espacio para respirar",
    copy:
      "Los números permiten un experimento controlado. Aun así, respeta el máximo que puedes pagar por cliente.",
  };
}

function buildProfitabilityRisks(data) {
  const risks = [];
  const paidCacFloor = data.currency === "MXN" ? 350 : 20;

  if (data.aov <= 0) risks.push("<strong>Falta precio.</strong> Necesitamos saber en cuánto se vendería cada pedido.");
  if (data.contribution <= 0) risks.push("<strong>Pierde dinero antes de anuncios.</strong> El producto, envío y devoluciones cuestan más que la venta.");
  if (data.margin < 0.35) risks.push(`<strong>Queda poco dinero por venta.</strong> Después de costos solo queda ${formatPercent(data.margin)} antes de anuncios.`);
  if (data.cogs / data.aov > 0.35) risks.push(`<strong>Producto caro.</strong> El producto consume ${formatPercent(data.cogs / data.aov)} de lo que cobras.`);
  if (data.shipping / data.aov > 0.16) risks.push(`<strong>Envío pesado.</strong> El envío consume ${formatPercent(data.shipping / data.aov)} de lo que cobras.`);
  if (data.shippingQuote?.mode && !isLiveShippingQuote(data.shippingQuote) && data.shippingQuote.mode !== "user_provided") {
    const provider = data.currency === "MXN" ? "Envia.com" : "EasyPost";
    risks.push(`<strong>Envío sin cotización viva.</strong> Para precisión real necesitamos origen, destino, peso, medidas y una API key de ${provider} configurada.`);
  }
  if (data.returnRate > 15) risks.push(`<strong>Muchas devoluciones.</strong> Estás asumiendo que regresan ${formatPercent(data.returnRate / 100)} de los pedidos.`);
  if (data.breakEvenRoas > 3.2) risks.push(`<strong>Los anuncios tendrían que ser muy buenos.</strong> Necesitas vender ${formatRoas(data.breakEvenRoas)} por cada $1 en anuncios solo para no perder.`);
  if (isPaidChannel(data.channel) && data.cacTarget < paidCacFloor) {
    risks.push(`<strong>Muy poco presupuesto para conseguir clientes.</strong> La meta sana es ${formatMoney(data.cacTarget, data.currency)} por cliente en ${channelLabels[data.channel]}.`);
  }
  if (data.differentiation === "commodity") risks.push("<strong>Se parece demasiado a otras opciones.</strong> Si solo cambia el empaque, será más caro convencer a la gente.");
  if (data.repurchaseMultiplier === 1) risks.push("<strong>No parece que vuelvan a comprar.</strong> Entonces casi toda la ganancia debe salir del primer pedido.");

  if (!risks.length) {
    risks.push("<strong>No hay bloqueo obvio.</strong> El siguiente riesgo es comprobar que estos números sean reales con proveedor, página simple y una prueba pequeña.");
  }

  return risks;
}

function buildProfitabilitySteps(data, verdict) {
  const steps = [];
  const channel = channelLabels[data.channel];

  if (verdict.level === "fail") {
    steps.push("No compres inventario todavía. Primero sube el precio con bundle, baja el costo del producto/envío o usa un canal menos caro.");
  } else {
    steps.push(`Prueba pequeña permitida: no pagues más de <strong>${formatMoney(data.cacTarget, data.currency)}</strong> para conseguir un cliente.`);
  }

  steps.push(`Dónde conseguir clientes: <strong>${channel}</strong>. La primera prueba debe medir costo por cliente, no me gusta ni vistas.`);
  steps.push(`Anuncios: necesitas vender <strong>${formatRoas(data.breakEvenRoas)}</strong> por cada $1 gastado solo para no perder.`);
  if (!isLiveShippingQuote(data.shippingQuote)) {
    const zipLabel = data.currency === "MXN" ? "CP origen, CP destino" : "origen ZIP, destino ZIP";
    steps.push(`Para mejorar el cálculo de envío, escribe: ${zipLabel}, peso del paquete y medidas largo x ancho x alto.`);
  }
  steps.push(`Recompra: <strong>${repurchaseLabels[data.repurchaseMultiplier]}</strong>. No cuentes recompra como ganancia hasta verla en datos reales.`);
  steps.push(`Diferenciación: <strong>${differentiationLabels[data.differentiation]}</strong>.`);

  if (data.margin >= 0.5 && data.cacTarget > 0) {
    steps.push("Siguiente búsqueda: mira competidores con precio parecido y anuncios activos para comparar oferta, no copiar promesas.");
  }

  return steps;
}

function buildShippingQuoteSteps(shippingQuote, currency) {
  const steps = [];
  if (isLiveShippingQuote(shippingQuote)) {
    steps.push("Usa la tarifa más barata como costo base de envío en el cálculo de rentabilidad.");
    steps.push("Antes de prometer tiempos al cliente, valida cobertura y días de entrega con la paquetería seleccionada.");
  } else {
    const provider = currency === "MXN" ? "Envia.com" : "EasyPost";
    steps.push(`Configura la API key de ${provider} para pasar de estimación a cotización viva.`);
    steps.push("Escribe siempre origen, destino, peso y medidas; sin medidas puede cambiar por peso volumétrico.");
  }
  steps.push("No se creó guía ni se compró envío; esta herramienta solo cotiza tarifas.");
  return steps;
}

const repurchaseLabels = {
  1: "Sin recompra clara",
  1.15: "Baja",
  1.35: "Media",
  1.7: "Alta",
};

const differentiationLabels = {
  commodity: "Casi igual a los demás",
  weak: "Un poco diferente",
  clear: "Se entiende la diferencia",
  defensible: "Difícil de copiar",
};

const channelLabels = {
  meta: "Facebook/Instagram",
  "tiktok-organic": "videos orgánicos en TikTok",
  "tiktok-paid": "anuncios en TikTok",
  influencers: "creadores o influencers",
  search: "Google",
  amazon: "Amazon",
};

function isPaidChannel(channel) {
  return ["meta", "tiktok-paid", "influencers"].includes(channel);
}

function isLiveShippingQuote(shippingQuote) {
  return shippingQuote?.mode === "live_easypost" || shippingQuote?.mode === "live_envia_mx";
}

function formatMoney(value, currency) {
  const locale = currency === "MXN" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value) {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

function formatRoas(value) {
  if (!Number.isFinite(value)) return "Sin margen";
  return `${value.toFixed(value >= 10 ? 0 : 1)}x`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
