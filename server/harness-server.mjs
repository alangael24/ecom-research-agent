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
  if (payload.brand && typeof payload.brand !== "object") return "Invalid brand payload.";
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
  const brandHelper = buildBrandStrategyHelper(payload);
  const websiteHelper = buildWebsiteStrategyHelper(payload, brandHelper);

  return `Eres Agent Genia. El usuario escribe una solicitud natural en la main page y tu trabajo es decidir que herramientas internas usar, como Cursor cuando llama tools durante su flujo.

Instruccion de aislamiento:
- Trata esta solicitud como una conversacion completamente nueva.
- No uses memoria, preferencias, productos, marcas, conclusiones ni contexto de ejecuciones anteriores.
- La unica informacion del usuario disponible es lo que aparece en este prompt.
- Si el usuario menciona una categoria como suplementos, skincare o cualquier otra, no la favorezcas por historial: valida evidencia, unit economics y riesgos desde cero.

Solicitud del usuario: ${payload.naturalRequest}

${buildAttachmentPrompt(payload.attachments || [], attachmentFiles)}

${brandHelper.prompt}

${websiteHelper.prompt}

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
- Marca: ${payload.brand?.name || "no especificada"}
- Sitio o referencia de marca: ${payload.brand?.url || "no especificado"}
- Canales de marca: ${payload.brand?.channels || "no especificados"}
- Objetivo de marca: ${payload.brand?.goal || "no especificado"}
- Shopify conectado: ${payload.shopify?.shop || "no"}
- Foco Shopify: ${payload.shopify?.focus || "no especificado"}
- Snapshot Shopify: ${payload.shopify?.snapshot ? JSON.stringify(payload.shopify.snapshot).slice(0, 6000) : "sin snapshot"}

Herramientas internas disponibles:
- $alibaba-sourcing-agent: usar cuando la solicitud mencione Alibaba, proveedores, fabricantes, sourcing, MOQ, DDP, muestras, precio de proveedor, negociar con proveedor o encontrar productos para vender.
- $ecom-problem-research: usar para research de marca, problema, Meta Ads, Amazon reviews, TikTok, avatar, hooks, performance creativa, voz del cliente y validacion de oportunidad.
- unit economics filter: usar cuando la solicitud pida costos, margen, CAC, ROAS, break even, rentabilidad o si conviene lanzar.
- shipping rate quote: usar cuando la solicitud pida cotizar envio, tarifa de paqueteria, costo de paquete, origen/destino, CP, peso o medidas.
- brand audit: usar cuando businessStage sea brand o el usuario tenga una marca/tienda existente. Analiza posicionamiento, oferta, catalogo, conversion, canales, retencion, metricas faltantes y experimentos. Si pide competencia o inspiracion, desglosa hooks, headlines, formato, avatar y pain points. Si pide avatar research, frases reales, objeciones, deseos, momentos de uso, creencias, pains o why now, usa avatarResearch. Si pide ads/videos con mejor o peor rendimiento, usa creativePerformance.
- shopify store audit: usar cuando businessStage sea shopify o cuando exista una tienda Shopify conectada. Lee el snapshot como contexto real; no pidas tokens manuales.
- retail to online agent: usar cuando el usuario ya tiene tienda fisica/local/negocio offline y quiere vender en internet, crear pagina web, elegir TikTok organico vs paid ads, entender producto, analizar competencia o crear contenido.
- brand strategy helper: usar cuando la solicitud pida nombre de marca, colores, identidad visual, branding, nicho/problema o crear una marca desde cero.
- website page builder: usar cuando la solicitud pida pagina web, landing page, homepage, PDP, tienda online, estructura de pagina, copy de web o cuando brandPlan necesite convertirse en una primera web.

Reglas:
- Si la solicitud pide nombre, colores, identidad visual, nueva marca, o si brand strategy helper tiene señal alta, llena brandPlan en el JSON. Usa nombres memorables segun problema/nicho y colores en hex segun nombre, tono y categoria. No digas que el nombre esta legalmente disponible; pide revisar marca registrada, dominio y redes.
- Si la solicitud pide web, pagina, landing, tienda online, homepage, PDP o si llenas brandPlan para una marca nueva, llena websitePlan. websitePlan debe aplicar el nombre recomendado, colores, tono y problema/nicho en hero, secciones, copy y guardrails. No afirmes que ya creaste/deployaste una web si solo estas entregando el plan.
- Si el usuario tiene tienda fisica y quiere vender online, primero entiende producto/oferta/margen/capacidad; recomienda web simple, canal inicial, research de competencia y contenido. No asumas que Shopify audit aplica si no hay tienda Shopify conectada.
- Si businessStage es brand, responde como auditoria de marca existente. No trates al usuario como principiante sin tienda; separa lo que ya existe, lo que falta medir y las decisiones de crecimiento.
- Si la solicitud pide competencia, competidores, inspiracion, hooks, headlines, formato, avatar o pain points, entrega un bloque de inspiracion competitiva. Separa evidencia observada de hipotesis; no inventes que viste anuncios si no los pudiste verificar. El desglose minimo debe cubrir: hook, headline, formato, avatar y pain point.
- Si la solicitud pide avatar research, investigacion del avatar, voice of customer, VOC, frases reales, lenguaje real, objeciones, deseos, momentos de uso, creencias, pains, why now, JTBD, jobs to be done, miedos, detonadores, triggers o urgencia de compra, llena avatarResearch. Extrae segmentos de avatar, frases reales, pains, objeciones, deseos, momentos de uso, creencias, why-now triggers y angulos creativos. No inventes citas directas: voiceOfCustomer.quote solo debe contener texto observado en adjuntos, comentarios, reviews, transcripciones, ads, links o datos declarados por el usuario. Si no hay fuente real, deja voiceOfCustomer vacio, marca ideas como hipotesis y pon los faltantes en researchGaps. Usa evidenceType como observado, adjunto, declarado_por_usuario, link_no_verificado o hipotesis.
- Si la solicitud pide ads con mejor rendimiento, bajo rendimiento, ganadores/perdedores, videos organicos virales, TikTok/Reels/UGC, CTR, CPA, ROAS, watch time o performance creativa, llena creativePerformance. Debe comparar paid ads vs organico viral cuando aplique, separar winners y underperformers, explicar first frame, hook, guion, formato, avatar, pain point, prueba visual, CTA, oferta y metrica. No trates viralidad como ventas; marca si la evidencia es observada, declarada por el usuario, adjunto, link o hipotesis.
- Para creativePerformance, si faltan metricas, no inventes numeros. Pide o lista: spend, impressions, CTR, CPM, CPC, CPA, ROAS, purchases, 3s views, average watch time, completion rate, shares, saves, comentarios con intencion, profile clicks, sesiones, add-to-cart, conversion, AOV y margen.
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

function buildBrandStrategyHelper(payload) {
  const text = [
    payload.naturalRequest,
    payload.product,
    payload.productDetails,
    payload.problem,
    payload.reference,
    payload.brand?.name,
    payload.brand?.goal,
    payload.brand?.channels,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const wantsBrandHelp =
    /nombre|name|naming|marca|brand|colores?|colors?|paleta|palette|identidad|branding|logo|visual/.test(text) ||
    payload.selectedInternalTool === "brand-audit-agent";
  const niche = inferBrandNiche(text, payload.product);
  const problem = inferBrandProblem(text, payload.productDetails || payload.naturalRequest || "");
  const tone = inferBrandTone(text, niche);
  const existingName = cleanBrandName(payload.brand?.name || "");
  const nameOptions = buildBrandNameOptions(problem, niche, tone);
  const selectedName = existingName || nameOptions[0]?.name || "Nova";
  const palette = buildColorPaletteForBrand(selectedName, niche, tone);

  return {
    wantsBrandHelp,
    niche,
    problem,
    tone,
    selectedName,
    nameOptions,
    palette,
    prompt: `Brand strategy helper:
- Señal de branding: ${wantsBrandHelp ? "alta" : "baja"}
- Nicho detectado: ${niche}
- Problema/transformacion detectada: ${problem}
- Tono recomendado: ${tone}
- Nombre existente si aplica: ${existingName || "ninguno"}
- Opciones iniciales de nombre: ${nameOptions.map((option) => `${option.name} (${option.rationale})`).join("; ")}
- Paleta inicial segun nombre/nicho: primary ${palette.primary}, secondary ${palette.secondary}, accent ${palette.accent}, background ${palette.background}, text ${palette.text}

Reglas para brandPlan:
- Si el usuario pide crear marca, escoger nombre, colores, identidad visual o posicionamiento de marca, devuelve brandPlan completo.
- selectedName debe ser una recomendacion clara, no solo una lista.
- nameOptions debe explicar problema, nicho, tono y riesgo de cada nombre.
- colorPalette debe usar hex reales y explicar por que esos colores encajan con el nombre y el problema.
- Evita prometer disponibilidad legal. Agrega nextChecks para trademark, dominio, handles sociales y confusion con competidores.
- Si el nicho es salud, skincare, suplementos o resultados corporales, evita nombres/claims medicos o promesas absolutas.`,
  };
}

function buildWebsiteStrategyHelper(payload, brandHelper) {
  const text = [
    payload.naturalRequest,
    payload.product,
    payload.productDetails,
    payload.problem,
    payload.reference,
    payload.brand?.name,
    payload.brand?.goal,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const wantsWebsite =
    /p[aá]gina|web|website|landing|homepage|pdp|tienda online|sitio|site|checkout|copy/.test(text) ||
    /crear marca|nueva marca|nombre de marca|nombre para marca|colores?|paleta|identidad visual|branding/.test(text);
  const brandName = brandHelper.selectedName || cleanBrandName(payload.brand?.name || "") || "Marca";
  const product = payload.product || brandHelper.niche || "producto principal";
  const problem = brandHelper.problem || payload.productDetails || payload.naturalRequest || "problema principal";
  const palette = brandHelper.palette || buildColorPaletteForBrand(brandName, brandHelper.niche, brandHelper.tone);
  const hero = buildWebsiteHeroCopy(brandName, product, problem, brandHelper.tone);
  const sections = buildWebsiteSections(brandHelper.niche, product);
  const copyBlocks = buildWebsiteCopyBlocks(brandName, product, problem);

  return {
    wantsWebsite,
    prompt: `Website page builder:
- Señal de pagina web: ${wantsWebsite ? "alta" : "baja"}
- Nombre/paleta a aplicar: ${brandName} | primary ${palette.primary}, secondary ${palette.secondary}, accent ${palette.accent}, background ${palette.background}, text ${palette.text}
- Hero inicial: "${hero.headline}" / "${hero.subheadline}" / CTA "${hero.primaryCta}"
- Secciones iniciales: ${sections.map((section) => `${section.name}: ${section.goal}`).join("; ")}
- Copy blocks iniciales: ${copyBlocks.join(" | ")}

Reglas para websitePlan:
- Si el usuario pide pagina web/landing/tienda online o si estas creando una marca nueva con brandPlan, devuelve websitePlan completo.
- Usa brandPlan.selectedName y brandPlan.colorPalette como sistema visual si brandPlan existe.
- La primera web debe ser simple: hero, problema, producto/oferta, prueba/confianza, como funciona, FAQ, CTA y medicion.
- El copy debe usar lenguaje de principiante y vender una promesa clara, sin claims ilegales o exagerados.
- nextBuildSteps debe decir que construir primero, que assets faltan y que medir antes de paid ads.`,
  };
}

function buildWebsiteHeroCopy(brandName, product, problem, tone) {
  const clearProduct = String(product || "producto").replace(/\s+/g, " ").trim();
  const clearProblem = String(problem || "problema").replace(/\s+/g, " ").trim().slice(0, 120);
  if (/premium|aspiracional|lujo|elegante/.test(tone)) {
    return {
      headline: `${brandName}: ${clearProduct} con una experiencia mas cuidada`,
      subheadline: `Una primera pagina enfocada en confianza, detalle y una solucion clara para ${clearProblem}.`,
      primaryCta: "Ver la oferta",
      secondaryCta: "Conocer la historia",
    };
  }
  if (/audaz|viral|social/.test(tone)) {
    return {
      headline: `${brandName} convierte ${clearProblem} en una compra facil`,
      subheadline: `Una landing directa para explicar el problema, mostrar el producto y capturar demanda desde contenido.`,
      primaryCta: "Quiero verlo",
      secondaryCta: "Ver como funciona",
    };
  }
  return {
    headline: `${brandName} ayuda a resolver ${clearProblem}`,
    subheadline: `Una pagina simple para presentar ${clearProduct}, explicar el beneficio y convertir visitas en pedidos o leads.`,
    primaryCta: "Empezar",
    secondaryCta: "Ver detalles",
  };
}

function buildWebsiteSections(niche, product) {
  const productLabel = product || "producto";
  const base = [
    { name: "Hero", goal: "explicar que vende la marca y para quien es", copyAngle: "beneficio principal + CTA claro" },
    { name: "Problema", goal: "hacer que el visitante se sienta entendido", copyAngle: "dolor cotidiano explicado sin exagerar" },
    { name: "Oferta", goal: `presentar ${productLabel} como solucion`, copyAngle: "beneficios, diferenciadores y que incluye" },
    { name: "Prueba", goal: "crear confianza antes de pedir la compra", copyAngle: "reviews, demos, fotos reales o historia del negocio" },
    { name: "FAQ", goal: "resolver objeciones de envio, calidad, uso y devoluciones", copyAngle: "respuestas cortas y especificas" },
    { name: "CTA final", goal: "cerrar con una sola accion", copyAngle: "comprar, reservar, WhatsApp o lista de espera" },
  ];
  if (niche.includes("skincare") || niche.includes("wellness")) {
    base.splice(4, 0, { name: "Seguridad", goal: "reducir riesgo de claims sensibles", copyAngle: "ingredientes, uso responsable, disclaimers y documentos" });
  }
  if (niche.includes("food")) {
    base.splice(4, 0, { name: "Entrega", goal: "explicar frescura, zona, tiempos y pickup", copyAngle: "confianza local y disponibilidad" });
  }
  return base;
}

function buildWebsiteCopyBlocks(brandName, product, problem) {
  const productLabel = product || "producto";
  const problemLabel = String(problem || "tu problema").slice(0, 90);
  return [
    `${brandName} existe para hacer mas simple ${problemLabel}.`,
    `Presenta ${productLabel} con fotos reales, beneficios concretos y una promesa facil de comprobar.`,
    "Usa una sola accion principal: comprar, pedir por WhatsApp o unirse a lista de espera.",
  ];
}

function inferBrandNiche(text, fallback = "") {
  const source = `${text} ${fallback}`.toLowerCase();
  const niches = [
    { key: "skincare / beauty", pattern: /skin|skincare|piel|beauty|belleza|serum|cosmetic|cosmetico|acne|acné|hair|cabello/ },
    { key: "wellness / supplements", pattern: /suplement|vitamin|prote[ií]na|protein|magnesium|creatina|col[aá]geno|wellness|salud|energia|energ[ií]a/ },
    { key: "home / decor", pattern: /hogar|home|decor|mueble|casa|kitchen|cocina|organiza|limpieza/ },
    { key: "fashion / accessories", pattern: /ropa|moda|fashion|apparel|zapato|joyer|bolsa|accesorio|boutique/ },
    { key: "food / beverage", pattern: /comida|food|bebida|drink|cafe|caf[eé]|pan|pastel|snack|salsa|restaurant/ },
    { key: "pets", pattern: /pet|perro|gato|mascota|dog|cat/ },
    { key: "tech / gadgets", pattern: /tech|gadget|electron|usb|charger|cargador|led|app|software/ },
    { key: "kids / family", pattern: /ni[nñ]o|bebe|beb[eé]|kids|family|familia|mama|mam[aá]/ },
  ];
  return niches.find((item) => item.pattern.test(source))?.key || "general ecommerce";
}

function inferBrandProblem(text, fallback = "") {
  const source = `${text} ${fallback}`.replace(/\s+/g, " ").trim();
  const explicit =
    source.match(/(?:problema|dolor|pain|ayuda a|resuelve|para personas que|para gente que)\s+([^.;\n]{8,120})/i)?.[1] ||
    source.match(/(?:quiero|necesito|busco)\s+([^.;\n]{8,120})/i)?.[1];
  if (explicit) return explicit.trim();
  if (/acne|acné|piel/.test(source)) return "sentirse mejor con la piel sin rutinas confusas";
  if (/energia|energ[ií]a|suplement/.test(source)) return "mejorar bienestar diario sin complicarse";
  if (/orden|organiza|hogar/.test(source)) return "hacer la vida en casa mas simple y ordenada";
  if (/tienda fisica|tienda física|local/.test(source)) return "llevar confianza de tienda fisica a ventas online";
  return "resolver una necesidad concreta con una compra facil de entender";
}

function inferBrandTone(text, niche) {
  if (/premium|lujo|luxury|elegante|high end/.test(text)) return "premium, calmado y aspiracional";
  if (/barato|accesible|economico|econ[oó]mico/.test(text)) return "claro, cercano y accesible";
  if (/viral|tiktok|joven|gen z|bold/.test(text)) return "audaz, social y facil de recordar";
  if (/medic|clin|derma|salud/.test(text) || niche.includes("skincare") || niche.includes("wellness")) return "confiable, limpio y cuidadoso";
  if (niche.includes("food")) return "calido, apetitoso y local";
  return "moderno, simple y confiable";
}

function buildBrandNameOptions(problem, niche, tone) {
  const roots = brandRootsForNiche(niche);
  const modifiers = brandModifiersForProblem(problem, tone);
  const options = [];
  for (const root of roots) {
    for (const modifier of modifiers) {
      if (options.length >= 6) break;
      const name = cleanBrandName(`${modifier}${root}`);
      options.push({
        name,
        rationale: `Combina una señal de ${problem.slice(0, 42)} con una categoria ${niche}.`,
        problemFit: `Sugiere ${modifier.toLowerCase()} como transformacion o beneficio principal.`,
        nicheFit: `Funciona para ${niche} porque suena ${tone}.`,
        tone,
        risk: "Revisar trademark, dominio .com y handles antes de usarlo.",
      });
    }
  }
  return options;
}

function brandRootsForNiche(niche) {
  if (niche.includes("skincare")) return ["Skin", "Glow", "Derma", "Luma", "Aura", "Clara"];
  if (niche.includes("wellness")) return ["Well", "Vita", "Root", "Daily", "Nura", "Forma"];
  if (niche.includes("home")) return ["Casa", "Nest", "Modo", "Haven", "Room", "Terra"];
  if (niche.includes("fashion")) return ["Wear", "Mode", "Atelier", "Line", "Loom", "Vera"];
  if (niche.includes("food")) return ["Bite", "Mesa", "Savor", "Miga", "Rico", "Casa"];
  if (niche.includes("pets")) return ["Paw", "Milo", "Wag", "Nido", "Pup", "Feli"];
  if (niche.includes("tech")) return ["Volt", "Sync", "Core", "Nova", "Loop", "Edge"];
  if (niche.includes("kids")) return ["Mini", "Nido", "Luna", "Mimo", "Kiko", "Bloom"];
  return ["Nova", "Luma", "Claro", "Nido", "Aura", "Modo"];
}

function brandModifiersForProblem(problem, tone) {
  const source = `${problem} ${tone}`.toLowerCase();
  if (/confianza|segur|clin|limpio|cuidadoso/.test(source)) return ["Pure", "True", "Clear", "Noble", "Calm", "Proof"];
  if (/simple|facil|orden|casa/.test(source)) return ["Easy", "Simple", "Bright", "Tidy", "Daily", "Open"];
  if (/energia|bold|viral|audaz/.test(source)) return ["Viva", "Spark", "Bold", "Zest", "Rise", "Pop"];
  if (/premium|lujo|elegante|aspiracional/.test(source)) return ["Aure", "Maison", "Vela", "Sora", "Luxe", "Vale"];
  if (/local|tienda|cercano|calido/.test(source)) return ["Casa", "Amiga", "Noble", "Barrio", "Mia", "Viva"];
  return ["Luma", "Nova", "Noble", "Clear", "Viva", "Mira"];
}

function cleanBrandName(value) {
  const words = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}

function buildColorPaletteForBrand(name, niche, tone) {
  const palettes = paletteSetForNiche(niche);
  const index = Math.abs(hashString(`${name}-${tone}-${niche}`)) % palettes.length;
  return palettes[index];
}

function paletteSetForNiche(niche) {
  if (niche.includes("skincare")) {
    return [
      { strategy: "clean clinical warmth", primary: "#47685A", secondary: "#E9DCCB", accent: "#C76D5B", background: "#FBFAF6", text: "#18231F", rationale: "Verde da cuidado y naturalidad, coral agrega vida sin parecer medico.", accessibilityNotes: "Usar texto oscuro sobre fondos claros; no usar coral para texto pequeño." },
      { strategy: "soft premium beauty", primary: "#3F4E59", secondary: "#D8C7B2", accent: "#9E6F82", background: "#FAF7F2", text: "#171A1C", rationale: "Azul gris genera confianza; mauve aporta belleza y calma.", accessibilityNotes: "Mantener contraste alto con texto #171A1C." },
    ];
  }
  if (niche.includes("wellness")) {
    return [
      { strategy: "energetic trust", primary: "#1F5E5A", secondary: "#E7E0C9", accent: "#D6A533", background: "#FCFBF5", text: "#16211F", rationale: "Teal comunica balance; dorado sugiere energia controlada.", accessibilityNotes: "Evitar texto dorado sobre blanco." },
      { strategy: "daily performance", primary: "#233B5E", secondary: "#DCE7E1", accent: "#77A83D", background: "#F8FAF8", text: "#101923", rationale: "Azul da credibilidad; verde lima moderado comunica vitalidad.", accessibilityNotes: "Usar el accent solo para CTAs grandes." },
    ];
  }
  if (niche.includes("home")) {
    return [
      { strategy: "warm organized home", primary: "#3D5A49", secondary: "#D9C2A3", accent: "#A65F46", background: "#FAF6EF", text: "#1D211D", rationale: "Verde y arcilla se sienten hogar, orden y confianza.", accessibilityNotes: "Texto oscuro sobre beige mantiene lectura comoda." },
      { strategy: "modern calm home", primary: "#2F4550", secondary: "#D7E2DA", accent: "#C88A4A", background: "#F7F8F4", text: "#161D20", rationale: "Azul petroleo ordena; acento cobre agrega calidez.", accessibilityNotes: "No usar cobre para parrafos." },
    ];
  }
  if (niche.includes("fashion")) {
    return [
      { strategy: "editorial premium", primary: "#111111", secondary: "#EFEAE2", accent: "#B84A55", background: "#FAF8F4", text: "#111111", rationale: "Negro/ivory da moda; rojo apagado crea memoria visual.", accessibilityNotes: "Excelente contraste si el rojo se usa solo como acento." },
      { strategy: "soft boutique", primary: "#4B465A", secondary: "#E8D7CA", accent: "#6F8B78", background: "#FBF8F4", text: "#17151A", rationale: "Ciruela sobrio y sage dan boutique accesible.", accessibilityNotes: "Usar primary para texto y botones." },
    ];
  }
  if (niche.includes("food")) {
    return [
      { strategy: "local appetite", primary: "#7A2E1F", secondary: "#F0D9B5", accent: "#2F6B4F", background: "#FFF9EF", text: "#211815", rationale: "Rojo tierra abre apetito; verde da frescura.", accessibilityNotes: "Usar rojo con texto blanco en botones." },
      { strategy: "fresh market", primary: "#245C45", secondary: "#F2D8A7", accent: "#D45B35", background: "#FFF9EF", text: "#18231D", rationale: "Verde mercado y naranja dan frescura y energia.", accessibilityNotes: "Mantener naranja como acento." },
    ];
  }
  return [
    { strategy: "modern trustworthy", primary: "#173F3A", secondary: "#E8DDC7", accent: "#D06C4B", background: "#FBFAF6", text: "#121816", rationale: "Teal profundo comunica confianza; coral da accion y calidez.", accessibilityNotes: "Texto oscuro sobre background y botones primary con texto blanco." },
    { strategy: "clear digital retail", primary: "#253D5B", secondary: "#DDE6E4", accent: "#E0A437", background: "#F9FAF7", text: "#101820", rationale: "Azul profesional, aqua suave y dorado equilibran claridad y comercio.", accessibilityNotes: "Evitar accent para texto pequeño; usarlo en iconos/CTA." },
    { strategy: "warm approachable", primary: "#5A3F32", secondary: "#E8D6BC", accent: "#3E7C6B", background: "#FCF8F1", text: "#211A16", rationale: "Cafe sobrio y teal crean cercania sin verse barato.", accessibilityNotes: "Asegurar botones con contraste fuerte." },
  ];
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
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
- Usa los adjuntos como contexto de producto, proveedor, empaque, capturas de Alibaba, listas de precios, especificaciones, capturas de ads, exports de performance o creativos/video de marca.
- Si existe archivo local, puedes inspeccionarlo desde el directorio de trabajo antes de responder.
- Si un adjunto solo tiene metadata o no puedes leerlo, dilo en limitations y no inventes contenido visual, precios ni specs.
- Si el usuario pide analisis de marca/ads/organico/avatar, incorpora adjuntos relevantes en creativePerformance y avatarResearch; separa observacion real de hipotesis.
- Incorpora insights relevantes de los adjuntos en supplierSearchPlan, qualityPlan, negotiationPlan, creativePerformance, avatarResearch y beginnerNextSteps.`;
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
