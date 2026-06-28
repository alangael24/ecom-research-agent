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
    if (!env.HARNESS_URL || !env.HARNESS_TOKEN) {
      throw httpError(
        503,
        "harness_not_configured",
        "Cloudflare backend is live, but HARNESS_URL/HARNESS_TOKEN are not configured.",
      );
    }

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
    const harnessPayload = {
      ...payload,
      userId: auth.user.id,
      researchRunId: runContext.id,
      attachments: (payload.attachments || []).map((attachment, index) => ({
        ...attachment,
        storageBucket: storedAttachments[index]?.storage_bucket || ATTACHMENT_BUCKET,
        storagePath: storedAttachments[index]?.storage_path || "",
      })),
    };

    const upstream = await requestHarness(env, harnessPayload);

    if (upstream.body?.ok && upstream.body.report) {
      await persistReport(auth.config, auth.accessToken, auth.user.id, runContext.id, payload, upstream.body.report);
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
  if (payload.attachments && !validAttachments(payload.attachments)) return "Invalid attachments.";
  return "";
}

function stringField(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validAttachments(value) {
  if (!Array.isArray(value) || value.length > 6) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    if (!optionalString(item.id, 120)) return false;
    if (!optionalString(item.name, 180)) return false;
    if (!optionalString(item.type, 160)) return false;
    if (!optionalString(item.kind, 40)) return false;
    if (!optionalString(item.contentMode, 40)) return false;
    if (typeof item.size !== "number" || item.size < 0 || item.size > 4 * 1024 * 1024) return false;
    if (item.dataUrl && !optionalString(item.dataUrl, 6 * 1024 * 1024)) return false;
    if (item.content && !optionalString(item.content, 80000)) return false;
    return true;
  });
}

function optionalString(value, maxLength) {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}
