import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.HARNESS_PORT || 8788);
const HOST = process.env.HOST || "127.0.0.1";
const TOKEN = process.env.HARNESS_TOKEN || "";
const CODEX_BIN = process.env.CODEX_BIN || "codex";
const MODEL = process.env.CODEX_MODEL || "";
const TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 900000);
const SCHEMA_PATH = join(__dirname, "research-schema.json");

if (!TOKEN) {
  console.error("HARNESS_TOKEN is required. Example: HARNESS_TOKEN=$(openssl rand -hex 32) node server/harness-server.mjs");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/healthz") {
      return sendJson(response, 200, { ok: true, service: "alibaba-sourcing-harness" });
    }

    if (request.method !== "POST" || request.url !== "/research") {
      return sendJson(response, 404, { ok: false, code: "not_found" });
    }

    if (!isAuthorized(request)) {
      return sendJson(response, 401, { ok: false, code: "unauthorized" });
    }

    const payload = await readJson(request);
    const validationError = validatePayload(payload);
    if (validationError) {
      return sendJson(response, 400, { ok: false, code: "invalid_payload", message: validationError });
    }

    const result = await runCodexResearch(payload);
    return sendJson(response, 200, { ok: true, report: result.report, diagnostics: result.diagnostics });
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      code: "harness_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Alibaba sourcing harness listening on http://${HOST}:${PORT}`);
});

function isAuthorized(request) {
  const expected = `Bearer ${TOKEN}`;
  return request.headers.authorization === expected;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Missing payload.";
  if (!stringField(payload.naturalRequest, 3000)) return "Missing or invalid request.";
  if (payload.product && !stringField(payload.product, 500)) return "Invalid product.";
  if (payload.productDetails && !stringField(payload.productDetails, 2000)) return "Invalid product details.";
  if (payload.goals && !Array.isArray(payload.goals)) return "Invalid goals.";
  if (payload.businessStage && !["starter", "brand", "shopify"].includes(payload.businessStage)) return "Invalid business stage.";
  if (payload.shopify && typeof payload.shopify !== "object") return "Invalid Shopify payload.";
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

async function runCodexResearch(payload) {
  const runDir = await mkdtemp(join(tmpdir(), "alibaba-sourcing-"));
  await mkdir(runDir, { recursive: true });
  const attachmentFiles = await writeAttachments(runDir, payload.attachments || []);
  await writeFile(join(runDir, "request.json"), JSON.stringify(payload, null, 2));
  await writeFile(join(runDir, "prompt.md"), buildPrompt(payload, attachmentFiles));

  const outputPath = join(runDir, "result.json");
  const args = [
    "exec",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--output-schema",
    SCHEMA_PATH,
    "--output-last-message",
    outputPath,
    "--cd",
    runDir,
    "-",
  ];

  if (MODEL) {
    args.splice(1, 0, "--model", MODEL);
  }

  const startedAt = Date.now();
  const execution = await runProcess(CODEX_BIN, args, await readFile(join(runDir, "prompt.md"), "utf8"), TIMEOUT_MS);
  const raw = await readFile(outputPath, "utf8");
  const report = JSON.parse(raw);

  return {
    report,
    diagnostics: {
      runDir,
      durationMs: Date.now() - startedAt,
      stderrTail: execution.stderr.slice(-2000),
    },
  };
}

async function writeAttachments(runDir, attachments) {
  if (!attachments.length) return [];

  const attachmentDir = join(runDir, "attachments");
  await mkdir(attachmentDir, { recursive: true });

  const written = [];
  for (const [index, attachment] of attachments.entries()) {
    const fileName = `${String(index + 1).padStart(2, "0")}-${safeFileName(attachment.name || "attachment")}`;
    const filePath = join(attachmentDir, fileName);

    if (attachment.dataUrl) {
      const buffer = decodeDataUrl(attachment.dataUrl);
      if (!buffer) {
        written.push({ ...attachment, path: "", note: "data URL invalida; solo metadata disponible" });
        continue;
      }
      await writeFile(filePath, buffer);
      written.push({ ...attachment, path: `attachments/${fileName}`, note: "archivo escrito desde upload" });
      continue;
    }

    if (attachment.content) {
      await writeFile(filePath, attachment.content);
      written.push({ ...attachment, path: `attachments/${fileName}`, note: "texto escrito desde upload" });
      continue;
    }

    written.push({ ...attachment, path: "", note: "solo metadata disponible" });
  }

  return written;
}

function decodeDataUrl(value) {
  const match = String(value).match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
}

function safeFileName(value) {
  const cleaned = String(value)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return cleaned || "attachment";
}

function buildPrompt(payload, attachmentFiles = []) {
  return `Eres Agent Genia. El usuario escribe una solicitud natural en la main page y tu trabajo es decidir que herramientas internas usar, como Cursor cuando llama tools durante su flujo.

Instruccion de aislamiento:
- Trata esta solicitud como una conversacion completamente nueva.
- No uses memoria, preferencias, productos, marcas, conclusiones ni contexto de ejecuciones anteriores.
- La unica informacion del usuario disponible es lo que aparece en este prompt.
- Si el usuario menciona una categoria como suplementos, skincare o cualquier otra, no la favorezcas por historial: valida evidencia, unit economics y riesgos desde cero.

Solicitud del usuario: ${payload.naturalRequest}

${buildAttachmentPrompt(payload.attachments || [], attachmentFiles)}

Inferencias del frontend, revisalas y corrigelas si hace falta:
- Producto inferido: ${payload.product || "no especificado"}
- Mercado destino: ${payload.market || "US"}
- Destino DDP: ${payload.destination || "no especificado"}
- Presupuesto inicial: ${payload.budget || "no especificado"}
- Cantidad de prueba: ${payload.orderQuantity || "no especificada"}
- Costo objetivo por unidad: ${payload.targetCost || "no especificado"}
- Prioridad inferida: ${payload.qualityLevel || "balanced"}
- Herramienta sugerida: ${payload.selectedInternalTool || "decidir"}
- Camino ecommerce: ${payload.businessStage || "starter"}
- Shopify conectado: ${payload.shopify?.shop || "no"}
- Foco Shopify: ${payload.shopify?.focus || "no especificado"}
- Snapshot Shopify: ${payload.shopify?.snapshot ? JSON.stringify(payload.shopify.snapshot).slice(0, 6000) : "sin snapshot"}

Herramientas internas disponibles:
- $alibaba-sourcing-agent: usar cuando la solicitud mencione Alibaba, proveedores, fabricantes, sourcing, MOQ, DDP, muestras, precio de proveedor, negociar con proveedor o encontrar productos para vender.
- ecom research: usar para research de marca, problema, Meta Ads, Amazon reviews, TikTok, avatar, hooks y validacion de oportunidad.
- unit economics filter: usar cuando la solicitud pida costos, margen, CAC, ROAS, break even, rentabilidad o si conviene lanzar.
- shipping rate quote: usar cuando la solicitud pida cotizar envio, tarifa de paqueteria, costo de paquete, origen/destino, CP, peso o medidas.
- shopify store audit: usar cuando businessStage sea shopify o cuando exista una tienda Shopify conectada. Lee el snapshot como contexto real; no pidas tokens manuales.

Reglas:
- Si businessStage es shopify, conserva la auditoria dentro del mismo schema y, cuando tengas datos suficientes, llena shopifyPlan con resumen de tienda, oportunidades de catalogo y acciones prioritarias.
- Si eliges Alibaba sourcing, usa $alibaba-sourcing-agent como herramienta interna. No lo presentes como pagina separada ni pidas al usuario llenar formulario extra.
- Si detectas intencion de costos, margen, CAC, ROAS, break even o rentabilidad, separa numeros dados de supuestos y no recomiendes lanzar sin pasar por unit economics.
- Si detectas intencion de envio, usa cotizacion de tarifa como herramienta interna. No crees guia ni compres envio; solo cotiza y marca faltantes.
- Si la solicitud no es sourcing, conserva el resultado dentro del schema usando secciones compatibles y explica en limitations que no se llamo Alibaba.
- Busca y compara proveedores/productos de Alibaba si tienes acceso web. Incluye URL de Alibaba por proveedor cuando exista.
- La main page es el cockpit. No le digas al usuario que abra Alibaba ni que haga busquedas manuales como siguiente paso principal.
- Devuelve agentWorkLog con lo que hiciste o lo que queda listo para ejecutar desde backend.
- No inventes proveedores, precios, certificaciones ni DDP. Si no puedes verificar datos vivos, dilo en limitations y entrega criterios/perfiles accionables, usando alibabaUrl como "".
- Prioriza principiantes: muestra primero, Trade Assurance, terminos escritos, costo aterrizado, DDP claro y calidad verificable antes de inventario.
- Negocia segun presupuesto, cantidad de prueba, costo objetivo y prioridad del usuario.
- Devuelve supplierOutreachQueue con mensajes listos por proveedor. Si no existe sesion/API autorizada para enviar mensajes en Alibaba, marca needsUserApproval=true y status como pendiente de aprobacion, no como enviado.
- No afirmes que contactaste o negociaste con un proveedor a menos que realmente hayas enviado un mensaje autorizado.
- Para DDP, confirma freight, customs clearance, import duties, taxes, importer of record, final door delivery, tracking y exclusiones. No recomiendes evasion de duties/taxes.
- Para categorias reguladas o sensibles, agrega certificaciones, documentos y limites de claim.
- Entrega mensajes listos para enviar al proveedor en ingles, con terminos claros y profesionales.
- Responde solo en JSON conforme al schema de salida.
`;
}

function buildAttachmentPrompt(attachments, files) {
  if (!attachments.length) return "Adjuntos subidos por el usuario: ninguno.";

  const fileLines = attachments.map((attachment, index) => {
    const written = files[index];
    const localPath = written?.path ? ` | archivo local: ${written.path}` : "";
    const mode = attachment.contentMode || "metadata-only";
    const size = attachment.sizeLabel || `${attachment.size || 0} bytes`;
    return `- ${attachment.name || "archivo"} | tipo: ${attachment.type || "desconocido"} | tamano: ${size} | modo: ${mode}${localPath}`;
  });

  return `Adjuntos subidos por el usuario:
${fileLines.join("\n")}

Reglas para adjuntos:
- Usa los adjuntos como contexto de producto, proveedor, empaque, capturas de Alibaba, listas de precios o especificaciones.
- Si existe archivo local, puedes inspeccionarlo desde el directorio de trabajo antes de responder.
- Si un adjunto solo tiene metadata o no puedes leerlo, dilo en limitations y no inventes contenido visual, precios ni specs.
- Incorpora insights relevantes de los adjuntos en supplierSearchPlan, qualityPlan, negotiationPlan y beginnerNextSteps.`;
}

function runProcess(command, args, stdin, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        NO_COLOR: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`Codex timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Codex exited with code ${code}: ${stderr.slice(-4000)}`));
      }
    });

    child.stdin.end(stdin);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(body));
}
