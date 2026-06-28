const state = {
  latest: null,
  attachments: [],
  config: null,
  session: null,
  user: null,
  runs: [],
};

const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const TEXT_ATTACHMENT_LIMIT = 60000;

const form = document.querySelector("#researchForm");
const attachmentInput = document.querySelector("#attachmentInput");
const attachmentTray = document.querySelector("#attachmentTray");
const authGate = document.querySelector("#authGate");
const signInForm = document.querySelector("#signInForm");
const authStatus = document.querySelector("#authStatus");
const historyDrawer = document.querySelector("#historyDrawer");
const historyList = document.querySelector("#historyList");
const panels = [...document.querySelectorAll("[data-panel]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
const emptyState = document.querySelector("#emptyState");

const goalConfig = {
  interpret: {
    label: "Interpretar solicitud",
    icon: "sparkles",
    className: "interpret",
  },
  search: {
    label: "Buscar proveedores",
    icon: "search",
    className: "alibaba",
  },
  negotiate: {
    label: "Negociar precio/MOQ",
    icon: "message-square",
    className: "negotiate",
  },
  ddp: {
    label: "Resolver DDP",
    icon: "truck",
    className: "ddp",
  },
  quality: {
    label: "Calidad maxima",
    icon: "shield-check",
    className: "quality",
  },
};

const productProfiles = [
  {
    match: ["bottle", "botella", "tumbler", "termo", "thermo", "vaso", "flask", "drinkware"],
    category: "botellas termicas / drinkware",
    searchTerms: [
      "custom stainless steel tumbler manufacturer",
      "vacuum insulated bottle custom logo",
      "stainless steel water bottle private label",
      "insulated tumbler ddp usa",
    ],
    mustHave: [
      "acero inoxidable 304 o 316 especificado",
      "prueba de fuga y retencion de temperatura",
      "opcion de muestra con logo o muestra neutra",
      "empaque individual resistente para ecom",
    ],
    certifications: ["LFGB", "FDA food contact", "BPA free"],
    sampleChecks: [
      "llenar con agua y revisar fugas 24 horas",
      "medir retencion frio/calor contra lo prometido",
      "revisar olor metalico, pintura y rayones",
      "probar tapa, popote, rosca y empaque",
    ],
    ddpRisks: [
      "peso volumetrico puede cambiar mucho el costo aterrizado",
      "confirmar si la cotizacion incluye duties y entrega final",
      "pedir carton size y gross weight antes de aceptar DDP",
    ],
  },
  {
    match: ["skin", "skincare", "piel", "beauty", "belleza", "serum", "cosmetic", "cosmetico"],
    category: "skincare / cosmeticos",
    searchTerms: [
      "private label skincare manufacturer low moq",
      "custom face serum manufacturer",
      "cosmetic manufacturer private label ddp",
      "skincare sample private label supplier",
    ],
    mustHave: [
      "formula, INCI y lote claramente documentados",
      "muestras antes de cualquier produccion",
      "GMP/ISO o documentos equivalentes visibles",
      "claims conservadores y revisables",
    ],
    certifications: ["GMP", "ISO 22716", "MSDS"],
    sampleChecks: [
      "revisar textura, olor, irritacion percibida y estabilidad basica",
      "comparar etiqueta, INCI y claims permitidos",
      "pedir COA/MSDS y fecha de caducidad",
      "verificar compatibilidad de envase con la formula",
    ],
    ddpRisks: [
      "cosmeticos pueden requerir documentacion especifica por pais",
      "DDP no elimina responsabilidad de claims o etiquetado",
      "evitar proveedores que prometen efectos medicos",
    ],
  },
  {
    match: ["led", "charger", "cargador", "electronics", "electronico", "battery", "bateria", "usb"],
    category: "electronicos / accesorios",
    searchTerms: [
      "consumer electronics manufacturer low moq",
      "custom usb charger supplier certification",
      "private label electronics manufacturer ddp",
      "electronic accessory factory trade assurance",
    ],
    mustHave: [
      "certificaciones para el mercado destino",
      "prueba funcional de muestra y cableado",
      "manual, etiquetas y advertencias correctas",
      "empaque que proteja en transporte",
    ],
    certifications: ["CE", "FCC", "RoHS"],
    sampleChecks: [
      "probar funcionamiento continuo",
      "revisar calentamiento, conectores y materiales",
      "verificar que el cargador/cable sea el prometido",
      "pedir test reports emitidos a la fabrica o producto",
    ],
    ddpRisks: [
      "baterias y electronicos pueden tener restricciones de transporte",
      "certificaciones falsas son un riesgo alto",
      "DDP debe explicar aduanas y documentos de importacion",
    ],
  },
  {
    match: ["pet", "dog", "cat", "perro", "gato", "mascota"],
    category: "productos para mascotas",
    searchTerms: [
      "pet product manufacturer custom logo",
      "dog accessory supplier low moq",
      "cat toy manufacturer private label",
      "pet product ddp usa supplier",
    ],
    mustHave: [
      "material seguro y sin olor fuerte",
      "costuras o piezas pequenas resistentes",
      "empaque claro para uso del producto",
      "muestra para prueba de durabilidad",
    ],
    certifications: ["CPSIA", "EN71"],
    sampleChecks: [
      "jalar costuras, broches y piezas pequenas",
      "revisar olor, bordes filosos y desprendimientos",
      "probar tamano real con el tipo de mascota objetivo",
      "confirmar instrucciones y advertencias de uso",
    ],
    ddpRisks: [
      "productos grandes pueden inflar costo por volumen",
      "juguetes o productos para mordida necesitan prueba de seguridad",
      "confirmar duties y final delivery por escrito",
    ],
  },
];

async function init() {
  renderEmptyState();
  form.accessKey.value = localStorage.getItem("alibabaSourcingAccessKey") || "";
  form.addEventListener("submit", handleSubmit);
  form.querySelector(".plus-button").addEventListener("click", () => attachmentInput.click());
  attachmentInput.addEventListener("change", (event) => void handleAttachmentInput(event));
  attachmentTray.addEventListener("click", handleAttachmentTrayClick);
  signInForm.addEventListener("submit", handleSignIn);
  document.querySelector("#signOut").addEventListener("click", signOut);
  document.querySelector("#toggleHistory").addEventListener("click", toggleHistory);
  document.querySelector("#closeHistory").addEventListener("click", () => closeHistory());
  historyList.addEventListener("click", (event) => void handleHistoryClick(event));
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
  document.querySelector("#copySummary").addEventListener("click", copySummary);
  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  lucide.createIcons();
  await bootAuth();
}

async function bootAuth() {
  document.body.classList.add("auth-required");
  authGate.hidden = false;
  setAuthStatus("Conectando con Supabase...");

  try {
    const response = await fetch("./api/config", { headers: { "cache-control": "no-store" } });
    const config = await response.json();
    if (!response.ok || !config?.ok) {
      throw new Error(config?.message || "Supabase no esta configurado.");
    }

    state.config = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    };

    const restored = await restoreSession();
    if (restored) {
      await enterAuthenticatedApp();
    } else {
      setAuthStatus("Usa una cuenta invitada para entrar.");
    }
  } catch (error) {
    setAuthStatus(error.message || "No se pudo conectar Supabase.");
  }

  lucide.createIcons();
}

async function handleSignIn(event) {
  event.preventDefault();
  if (!state.config) {
    setAuthStatus("Supabase todavia no esta configurado.");
    return;
  }

  const button = signInForm.querySelector("button[type='submit']");
  button.disabled = true;
  setAuthStatus("Entrando...");

  try {
    const email = signInForm.email.value.trim();
    const password = signInForm.password.value;
    const session = await supabaseAuthRequest("token?grant_type=password", {
      method: "POST",
      body: { email, password },
    });
    setSession(session);
    await enterAuthenticatedApp();
  } catch (error) {
    clearSession();
    setAuthStatus(error.message || "No se pudo iniciar sesion.");
  } finally {
    button.disabled = false;
  }
}

async function enterAuthenticatedApp() {
  document.body.classList.remove("auth-required");
  document.body.classList.add("authenticated");
  authGate.hidden = true;
  setAuthStatus("");
  await loadHistory();
}

async function restoreSession() {
  const stored = readStoredSession();
  if (!stored?.access_token) return false;
  state.session = stored;

  try {
    if (stored.expires_at && Date.now() > stored.expires_at - 60000 && stored.refresh_token) {
      const refreshed = await supabaseAuthRequest("token?grant_type=refresh_token", {
        method: "POST",
        useSession: false,
        body: { refresh_token: stored.refresh_token },
      });
      setSession(refreshed);
    }

    const user = await supabaseAuthRequest("user", { method: "GET" });
    state.user = user.user || user;
    return Boolean(state.user?.id);
  } catch {
    clearSession();
    return false;
  }
}

async function signOut() {
  if (state.session?.access_token && state.config) {
    await fetch(`${state.config.supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => null);
  }
  clearSession();
  state.latest = null;
  state.runs = [];
  closeHistory();
  document.body.classList.remove("authenticated", "report-ready");
  document.body.classList.add("auth-required");
  document.querySelector(".result-panel").hidden = true;
  authGate.hidden = false;
  setAuthStatus("Sesion cerrada.");
}

async function supabaseAuthRequest(path, options = {}) {
  const response = await fetch(`${state.config.supabaseUrl}/auth/v1/${path}`, {
    method: options.method || "GET",
    headers: authHeaders({}, options.useSession !== false),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(body.msg || body.message || body.error_description || "Error de autenticacion.");
  }
  return body;
}

function authHeaders(extra = {}, useSession = true) {
  return {
    apikey: state.config.supabaseAnonKey,
    authorization: useSession && state.session?.access_token ? `Bearer ${state.session.access_token}` : `Bearer ${state.config.supabaseAnonKey}`,
    "content-type": "application/json",
    ...extra,
  };
}

function setSession(session) {
  const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + Number(session.expires_in || 3600) * 1000;
  state.session = { ...session, expires_at: expiresAt };
  state.user = session.user || state.user;
  localStorage.setItem("agentGeniaSession", JSON.stringify(state.session));
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem("agentGeniaSession") || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  state.session = null;
  state.user = null;
  localStorage.removeItem("agentGeniaSession");
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

async function handleAttachmentInput(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  await addAttachments(files);
}

async function addAttachments(files) {
  if (!files.length) return;

  const slots = MAX_ATTACHMENTS - state.attachments.length;
  if (slots <= 0) {
    showToast(`Maximo ${MAX_ATTACHMENTS} adjuntos`);
    return;
  }

  let added = 0;
  for (const file of files.slice(0, slots)) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast(`${file.name} pesa mas de ${formatBytes(MAX_ATTACHMENT_BYTES)}`);
      continue;
    }

    const totalBytes = state.attachments.reduce((sum, item) => sum + item.size, 0) + file.size;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      showToast(`Adjuntos maximo ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} en total`);
      break;
    }

    try {
      state.attachments.push(await fileToAttachment(file));
      added += 1;
    } catch {
      showToast(`No pude leer ${file.name}`);
    }
  }

  if (files.length > slots && added) {
    showToast(`${added} adjuntos agregados. Maximo ${MAX_ATTACHMENTS}.`);
  } else if (files.length > slots) {
    showToast(`Maximo ${MAX_ATTACHMENTS} adjuntos`);
  } else if (added) {
    showToast(added === 1 ? "Adjunto agregado" : `${added} adjuntos agregados`);
  }

  renderAttachments();
}

async function fileToAttachment(file) {
  const kind = attachmentKind(file);
  const attachment = {
    id: createAttachmentId(),
    name: file.name || "archivo",
    type: file.type || fallbackMimeType(file.name),
    size: file.size,
    sizeLabel: formatBytes(file.size),
    kind,
    contentMode: "metadata-only",
  };

  if (kind === "image") {
    attachment.previewUrl = URL.createObjectURL(file);
    attachment.dataUrl = await readFileAsDataUrl(file);
    attachment.contentMode = "image-data-url";
    return attachment;
  }

  if (isTextAttachment(file)) {
    const text = await readFileAsText(file);
    attachment.content = text.slice(0, TEXT_ATTACHMENT_LIMIT);
    attachment.truncated = text.length > TEXT_ATTACHMENT_LIMIT;
    attachment.contentMode = "text";
    return attachment;
  }

  attachment.dataUrl = await readFileAsDataUrl(file);
  attachment.contentMode = "binary-data-url";
  return attachment;
}

function renderAttachments() {
  attachmentTray.hidden = state.attachments.length === 0;
  attachmentTray.innerHTML = state.attachments.map(renderAttachmentChip).join("");
  lucide.createIcons();
}

function renderAttachmentChip(attachment) {
  const visual =
    attachment.kind === "image" && attachment.previewUrl
      ? `<img class="attachment-thumb" src="${escapeHtml(attachment.previewUrl)}" alt="" />`
      : `<span class="attachment-icon"><i data-lucide="${iconForAttachment(attachment)}"></i></span>`;

  return `<article class="attachment-chip">
    ${visual}
    <div class="attachment-copy">
      <strong>${escapeHtml(attachment.name)}</strong>
      <span>${escapeHtml(attachment.sizeLabel)} · ${escapeHtml(attachmentLabel(attachment))}</span>
    </div>
    <button class="attachment-remove" type="button" data-attachment-id="${escapeHtml(attachment.id)}" title="Quitar adjunto" aria-label="Quitar ${escapeHtml(attachment.name)}">
      <i data-lucide="x"></i>
    </button>
  </article>`;
}

function handleAttachmentTrayClick(event) {
  const button = event.target.closest("[data-attachment-id]");
  if (!button) return;
  const id = button.dataset.attachmentId;
  const attachment = state.attachments.find((item) => item.id === id);
  if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  state.attachments = state.attachments.filter((item) => item.id !== id);
  renderAttachments();
}

function serializeAttachments() {
  return state.attachments.map(({ previewUrl, ...attachment }) => attachment);
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!state.session?.access_token) {
    document.body.classList.add("auth-required");
    authGate.hidden = false;
    setAuthStatus("Inicia sesion para usar el agente.");
    return;
  }

  const data = readForm();
  const report = buildReport(data);
  setLoading(true);

  try {
    const backend = await requestBackendReport(data);
    if (backend?.ok && backend.report) {
      report.ai = backend.report;
      report.backendMode = "codex-harness";
      report.diagnostics = backend.diagnostics || null;
    } else if (backend?.message) {
      report.backendError = backend.message;
    }
  } catch (error) {
    report.backendError = error.message || "No se pudo conectar con el backend.";
  }

  state.latest = report;
  document.body.classList.add("report-ready");
  document.querySelector(".result-panel").hidden = false;
  renderReport(report);
  activateTab("brief");
  saveState(report);
  setLoading(false);
  await loadHistory();
  showToast(report.ai ? "Sourcing generado con Codex" : "Plan guiado generado");
}

function readForm() {
  const naturalRequest = form.naturalRequest.value.trim() || "Quiero investigar una oportunidad ecommerce y necesito siguientes pasos claros.";
  const inferred = inferRequest(naturalRequest);
  return {
    naturalRequest,
    ...inferred,
    accessKey: form.accessKey.value.trim(),
    attachments: serializeAttachments(),
  };
}

function inferRequest(naturalRequest) {
  const text = naturalRequest.toLowerCase();
  const sourcingIntent = hasAny(text, [
    "alibaba",
    "proveedor",
    "proveedores",
    "supplier",
    "factory",
    "fabricante",
    "ddp",
    "moq",
    "negociar",
    "cotizar",
    "sourcing",
  ]);
  const market = text.includes("mexico") || text.includes("méxico") ? "MX" : text.includes("latam") ? "LATAM" : "US";
  const destination = inferDestination(text, market);
  const budget = inferMoney(text, ["presupuesto", "budget", "tengo", "invertir"]);
  const targetCost = inferMoney(text, ["costo", "cost", "unidad", "unit"], true);
  const orderQuantity = inferQuantity(text) || 100;
  const qualityLevel = text.includes("premium") || text.includes("calidad") ? "premium" : text.includes("barato") || text.includes("precio bajo") ? "lowest-price" : text.includes("moq") ? "low-moq" : "balanced";
  const product = inferProduct(naturalRequest);

  return {
    product,
    productDetails: naturalRequest,
    market,
    destination,
    budget,
    targetCost,
    orderQuantity,
    qualityLevel,
    depth: text.includes("profundo") || text.includes("completo") ? "profundo" : "rapido",
    goals: sourcingIntent ? ["interpret", "search", "negotiate", "ddp", "quality"] : ["interpret"],
    selectedInternalTool: sourcingIntent ? "alibaba-sourcing-agent" : "ecom-research-agent",
  };
}

function buildReport(data) {
  const text = `${data.product} ${data.productDetails}`.toLowerCase();
  const category =
    productProfiles.find((item) => item.match.some((word) => text.includes(word))) ||
    genericProfile(data.product);
  const query = cleanQuery(data.product, category.category);
  const targetUnitCost =
    data.targetCost || (data.budget && data.orderQuantity ? data.budget / data.orderQuantity : 0);
  const agentTasks = buildAgentTasks(query, data, category);
  const evidenceLinks = buildEvidenceLinks(query, data, category);
  const supplierProfiles = buildGuidedSupplierProfiles(data, category, targetUnitCost);

  return {
    ...data,
    category,
    query,
    targetUnitCost,
    agentTasks,
    evidenceLinks,
    supplierProfiles,
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
}

async function requestBackendReport(data) {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${state.session.access_token}`,
  };

  const response = await fetch("./api/research", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...data, accessKey: undefined }),
  });

  if (response.status === 404) {
    throw new Error("Backend not deployed");
  }

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || "No se pudo generar el research.");
  }
  return body;
}

function defaultDestination(market) {
  if (market === "MX") return "Ciudad de Mexico, Mexico";
  if (market === "LATAM") return "pais y ciudad destino";
  if (market === "GLOBAL") return "destino final";
  return "Miami, FL 33166, USA";
}

function inferDestination(text, market) {
  if (text.includes("miami")) return "Miami, FL, USA";
  if (text.includes("mexico") || text.includes("méxico")) return "Ciudad de Mexico, Mexico";
  const cityMatch = text.match(/\b(?:a|en|para)\s+([a-záéíóúñ\s]+,\s*[a-z]{2,})\b/i);
  if (cityMatch) return normalizeDestination(cityMatch[1]);
  return defaultDestination(market);
}

function inferProduct(value) {
  const directMatch = value.match(/(?:vender|buscar|encontrar|cotizar|comprar)\s+(.+?)(?:\s+para\s+|\s+y\s+|\s+con\s+|\s+en\s+alibaba|\.|$)/i);
  if (directMatch?.[1]) return directMatch[1].trim().slice(0, 90);
  const cleaned = value
    .replace(/quiero|necesito|busco|encontrar|proveedores?|fabricantes?|alibaba|ddp|moq|negociar|cotizar/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 8).join(" ");
  return words || "producto ecommerce";
}

function inferMoney(text, nearbyWords, requireNearby = false) {
  const moneyMatches = [...text.matchAll(/\$?\s*(\d+(?:[.,]\d+)?)\s*(k|mil|usd|dolares|dólares)?/gi)];
  if (!moneyMatches.length) return 0;
  const scored = moneyMatches
    .map((match) => {
      const index = match.index || 0;
      const windowText = text.slice(Math.max(0, index - 35), index + 35);
      const score = nearbyWords.some((word) => windowText.includes(word)) ? 2 : 1;
      let value = Number(match[1].replace(",", "."));
      if (match[2] && ["k", "mil"].includes(match[2].toLowerCase())) value *= 1000;
      return { value, score };
    })
    .filter((item) => !requireNearby || item.score > 1)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.value || 0;
}

function inferQuantity(text) {
  const quantityMatch = text.match(/(\d+)\s*(unidades|piezas|pcs|units|botellas|productos)/i);
  return quantityMatch ? Number(quantityMatch[1]) : 0;
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function normalizeDestination(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function genericProfile(product) {
  const base = product.split(/\s+/).slice(0, 5).join(" ") || "producto ecommerce";
  return {
    category: base,
    searchTerms: [
      `${base} manufacturer low moq`,
      `${base} private label supplier`,
      `${base} trade assurance ddp`,
      `${base} custom packaging manufacturer`,
    ],
    mustHave: [
      "muestra disponible antes de comprar inventario",
      "MOQ compatible con presupuesto inicial",
      "Trade Assurance y terminos escritos",
      "especificaciones claras de producto y empaque",
    ],
    certifications: ["certificacion relevante al mercado destino"],
    sampleChecks: [
      "comparar muestra contra fotos y especificaciones",
      "revisar materiales, acabados, olor, defectos y empaque",
      "medir dimensiones/peso reales",
      "probar uso normal del producto por varios dias",
    ],
    ddpRisks: [
      "DDP debe explicar duties, taxes, customs clearance y entrega final",
      "cotizar con direccion destino real",
      "pedir carton size y gross weight antes de comparar flete",
    ],
  };
}

function cleanQuery(product, category) {
  const value = `${product} ${category}`.replace(/\s+/g, " ").trim();
  return value.slice(0, 90);
}

function buildAgentTasks(query, data, category) {
  const quantity = data.orderQuantity || 100;
  const firstStep = [
    {
      key: "interpret",
      title: "Interpretar lenguaje natural",
      status: "completado",
      result: `El agente leyo la solicitud y selecciono ${toolLabel(data.selectedInternalTool)} como herramienta interna.`,
      nextAction: "No se pidieron formularios extra al usuario.",
    },
  ];
  if (data.selectedInternalTool !== "alibaba-sourcing-agent") {
    return firstStep.concat([
      {
        key: "search",
        title: "Research de oportunidad",
        status: "listo para backend",
        result: "El agente preparara research ecom con señales de mercado, problemas, objeciones y siguientes pasos.",
        nextAction: "Si detecta necesidad de proveedores, puede llamar Alibaba sourcing internamente.",
      },
    ]);
  }
  return firstStep.concat([
    {
      key: "search",
      title: "Buscar y filtrar proveedores",
      status: "listo para backend",
      result: `El agente buscara fabricantes para "${query}" y filtrara Verified Supplier, Trade Assurance, MOQ bajo y muestra disponible.`,
      nextAction: "Con backend conectado, esta busqueda se ejecuta desde la main page.",
    },
    {
      key: "quality",
      title: "Comparar calidad y certificaciones",
      status: "listo para backend",
      result: `Se revisaran requisitos como ${category.mustHave.slice(0, 2).join(", ")} y certificados ${category.certifications.join(", ")}.`,
      nextAction: "El agente separara proveedores serios de listings baratos con poca prueba.",
    },
    {
      key: "negotiate",
      title: "Preparar negociacion",
      status: "listo para outreach",
      result: `El agente pedira precio por ${quantity} unidades, muestra, MOQ de prueba, tiers de recompra y Trade Assurance.`,
      nextAction: "Los mensajes quedan en la cola de negociacion dentro de esta pagina.",
    },
    {
      key: "ddp",
      title: "Resolver DDP",
      status: "requiere confirmacion escrita",
      result: `Se validara DDP a ${data.destination}: duties, taxes, customs clearance, importer of record y entrega final.`,
      nextAction: "No se recomendara compra si DDP queda ambiguo.",
    },
  ]);
}

function buildEvidenceLinks(query, data, category) {
  const terms = [query, ...category.searchTerms].slice(0, data.depth === "profundo" ? 5 : 3);
  return terms.map((term, index) => ({
    key: index === 0 ? "search" : "quality",
    title: index === 0 ? "Query principal" : `Query alternativa ${index}`,
    note: index === 0
      ? "El agente usa esta busqueda como punto de partida cuando el harness esta conectado."
      : "Query secundaria para encontrar fabricantes similares y evitar depender de un solo resultado.",
    query: term,
    href: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(term)}`,
  })).concat([
    {
      key: "ddp",
      title: "Buscar opciones con DDP",
      note: "No aceptar DDP sin confirmar duties, taxes, customs clearance y door delivery.",
      query: `${query} ddp ${data.market}`,
      href: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(`${query} ddp ${data.market}`)}`,
    },
  ]);
}

function buildGuidedSupplierProfiles(data, category, targetUnitCost) {
  const quantity = data.orderQuantity || 100;
  const target = targetUnitCost ? formatMoney(targetUnitCost) : "definir costo objetivo";
  const qualityBoost = data.qualityLevel === "premium" ? 5 : 0;
  const priceBoost = data.qualityLevel === "lowest-price" ? 5 : 0;
  const moqBoost = data.qualityLevel === "low-moq" ? 5 : 0;

  return [
    {
      supplierName: "Perfil A: fabricante verificado",
      alibabaUrl: "",
      productMatch: "Mejor balance para un principiante si tiene muestra, Trade Assurance y specs claras.",
      moq: `ideal <= ${quantity}`,
      unitPrice: target,
      sampleTerms: "muestra pagada, idealmente reembolsable contra orden",
      ddpStatus: "pedir EXW/FOB/DDP y detalle por escrito",
      qualityProof: category.mustHave.slice(0, 2).join("; "),
      certifications: category.certifications.join(", "),
      score: 84 + qualityBoost,
      redFlags: [],
      nextAsk: "Enviar RFQ completo y pedir videos reales de producto.",
    },
    {
      supplierName: "Perfil B: MOQ bajo para test",
      alibabaUrl: "",
      productMatch: "Sirve para probar mercado con menos riesgo, aunque la unidad salga mas cara.",
      moq: `trial order de ${Math.max(25, Math.round(quantity / 2))}-${quantity}`,
      unitPrice: "puede ser mayor en primer pedido",
      sampleTerms: "confirmar muestra exacta de produccion",
      ddpStatus: "validar si acepta DDP a destino pequeno",
      qualityProof: "confirmar que no bajan material por MOQ bajo",
      certifications: category.certifications.join(", "),
      score: 76 + moqBoost,
      redFlags: ["precio de prueba puede no representar reorden"],
      nextAsk: "Negociar MOQ bajo y precio de recompra por volumen.",
    },
    {
      supplierName: "Perfil C: proveedor con DDP fuerte",
      alibabaUrl: "",
      productMatch: "Prioridad si el usuario no entiende importacion y necesita entrega puerta a puerta.",
      moq: "flexible segun flete",
      unitPrice: "comparar costo aterrizado, no solo unit price",
      sampleTerms: "sample + shipping separados",
      ddpStatus: `DDP a ${data.destination} con duties/taxes/customs claros`,
      qualityProof: "carton size, gross weight, HS code y proforma",
      certifications: category.certifications.join(", "),
      score: 78 + priceBoost,
      redFlags: ["rechazar si DDP no explica duties/taxes"],
      nextAsk: "Pedir desglose DDP exacto e importer-of-record.",
    },
  ];
}

function renderEmptyState() {
  document.querySelector("#brief").innerHTML = emptyState.innerHTML;
  lucide.createIcons();
}

function renderReport(report) {
  const ai = report.ai || null;
  const supplierShortlist = ai?.supplierShortlist?.length ? ai.supplierShortlist : report.supplierProfiles;
  const agentWorkLog = ai?.agentWorkLog?.length ? ai.agentWorkLog : report.agentTasks;
  const topRisks = ai?.executiveBrief?.topRisks?.length
    ? ai.executiveBrief.topRisks
    : [
        "comprar inventario sin muestra aprobada",
        "comparar solo precio sin costo DDP aterrizado",
        "aceptar certificaciones o DDP sin documentos",
      ];
  const goals = report.goals.map((key) => goalConfig[key]?.label || key).join(", ");
  const backendNotice = report.backendError
    ? `<article class="report-card full-span notice-card">
        <h3>Backend privado</h3>
        <p>${escapeHtml(report.backendError)}</p>
      </article>`
    : "";

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${supplierShortlist.length}</strong><p>${ai ? "proveedores" : "candidatos meta"}</p></article>
      <article class="metric-card"><strong>${report.targetUnitCost ? formatMoney(report.targetUnitCost) : "--"}</strong><p>costo objetivo</p></article>
      <article class="metric-card"><strong>${escapeHtml(toolLabel(report.selectedInternalTool))}</strong><p>herramienta interna</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Decision</h3>
        <p>${escapeHtml(ai?.executiveBrief?.decision || "El agente interpreto tu solicitud y preparo el flujo interno. Si la intencion es sourcing, usara Alibaba como herramienta interna y devolvera shortlist, negociacion, DDP y calidad aqui mismo.")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="message-square-text"></i>${escapeHtml(report.naturalRequest)}</span>
          <span class="pill"><i data-lucide="package"></i>${escapeHtml(report.product)}</span>
          <span class="pill"><i data-lucide="map-pin"></i>${escapeHtml(report.destination)}</span>
          <span class="pill"><i data-lucide="wrench"></i>${escapeHtml(toolLabel(report.selectedInternalTool))}</span>
          ${renderAttachmentPills(report.attachments)}
          ${ai ? '<span class="pill"><i data-lucide="cpu"></i>Codex harness</span>' : ""}
        </div>
      </article>
      <article class="report-card">
        <h3>Ruta recomendada</h3>
        <p>${escapeHtml(ai?.executiveBrief?.recommendedPath || "Conectar el backend de produccion para que el agente busque proveedores, compare candidatos, prepare outreach y devuelva todo dentro de esta pagina.")}</p>
      </article>
      <article class="report-card">
        <h3>Riesgos principales</h3>
        <ul>${topRisks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Herramientas activas</h3>
        <p>${escapeHtml(goals)}</p>
      </article>
      <article class="report-card full-span">
        <h3>Trabajo del agente</h3>
        ${renderAgentWorkLog(agentWorkLog)}
      </article>
      ${backendNotice}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Tool routing</h3>
        <p>${escapeHtml(ai?.executiveBrief?.recommendedPath || `Solicitud recibida en lenguaje natural. Tool seleccionada: ${toolLabel(report.selectedInternalTool)}.`)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="sparkles"></i>Entrada natural</span>
          <span class="pill"><i data-lucide="wrench"></i>${escapeHtml(toolLabel(report.selectedInternalTool))}</span>
          <span class="pill"><i data-lucide="undo-2"></i>Resultado en main page</span>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Llamadas internas</h3>
        ${renderAgentWorkLog(agentWorkLog)}
      </article>
      <article class="report-card">
        <h3>Inferido por el agente</h3>
        <ul>
          <li>Producto: ${escapeHtml(report.product)}</li>
          <li>Mercado: ${escapeHtml(report.market)}</li>
          <li>Destino: ${escapeHtml(report.destination)}</li>
          <li>Prioridad: ${escapeHtml(report.qualityLevel)}</li>
          <li>Adjuntos: ${escapeHtml(attachmentSummary(report.attachments))}</li>
        </ul>
      </article>
      <article class="report-card">
        <h3>Sin formularios extra</h3>
        <p>Si falta un dato, el agente usa una suposicion conservadora o lo marca como pendiente. El usuario no tiene que aprender Alibaba para arrancar.</p>
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="source-list">
      <article class="report-card full-span">
        <h3>${ai ? "Shortlist de proveedores" : "Shortlist objetivo del agente"}</h3>
        ${renderSupplierTable(supplierShortlist)}
      </article>
      <article class="report-card full-span">
        <h3>${ai ? "Criterios usados por el agente" : "Criterios que usara el agente"}</h3>
        ${ai?.supplierSearchPlan ? `
        ${renderCompactSections([
          ["Queries", ai.supplierSearchPlan.alibabaQueries],
          ["Filtros", ai.supplierSearchPlan.filters],
          ["Datos a capturar", ai.supplierSearchPlan.dataToCapture],
          ["Reglas de rechazo", ai.supplierSearchPlan.rejectRules],
        ])}` : renderCompactSections([
          ["Queries internas", report.evidenceLinks.map((source) => source.query)],
          ["Filtros", ["Verified Supplier", "Trade Assurance", "sample available", "MOQ compatible", "respuesta clara sobre DDP"]],
          ["Reglas de rechazo", ["sin muestra", "sin Trade Assurance", "DDP ambiguo", "certificados no verificables", "presion para pagar fuera de Alibaba"]],
        ])}
      </article>
    </div>`;

  const negotiation = ai?.negotiationPlan || buildNegotiationPlan(report);
  const outreachQueue = ai?.supplierOutreachQueue?.length
    ? ai.supplierOutreachQueue
    : buildOutreachQueue(supplierShortlist, negotiation);
  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Cola de negociacion</h3>
        ${renderOutreachQueue(outreachQueue)}
      </article>
      ${renderMessageCard("RFQ inicial", negotiation.rfqMessage)}
      ${renderMessageCard("Negociar precio", negotiation.priceNegotiationMessage)}
      ${renderMessageCard("Negociar MOQ", negotiation.moqMessage)}
      ${renderMessageCard("Confirmar muestra", negotiation.sampleMessage)}
      <article class="report-card full-span">
        <h3>Terminos a confirmar</h3>
        <ul>${(negotiation.termsToConfirm || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  const ddp = ai?.ddpPlan || buildDdpPlan(report);
  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card">
        <h3>Destino</h3>
        <p>${escapeHtml(ddp.destination || report.destination)}</p>
      </article>
      <article class="report-card">
        <h3>Incoterm alternativo</h3>
        <p>${escapeHtml(ddp.fallbackIncoterm || "FOB + freight forwarder si DDP no queda claro.")}</p>
      </article>
      <article class="report-card">
        <h3>Preguntas DDP</h3>
        <ul>${(ddp.ddpQuestions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Debe incluir</h3>
        <ul>${(ddp.includedChecklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Red flags DDP</h3>
        <ul>${(ddp.redFlags || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  const quality = ai?.qualityPlan || buildQualityPlan(report);
  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card">
        <h3>Checklist de muestra</h3>
        <ul>${(quality.sampleChecklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Certificaciones</h3>
        <ul>${(quality.certificationChecks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Inspeccion</h3>
        <ul>${(quality.inspectionPlan || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Empaque</h3>
        <ul>${(quality.packagingChecks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>No-go defects</h3>
        <ul>${(quality.noGoDefects || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Prompt profundo</h3>
        <p>${escapeHtml(buildPrompt(report))}</p>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderSupplierTable(rows) {
  return `<div class="table-wrap"><table class="comparison-table">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Proveedor</th>
        <th>MOQ</th>
        <th>Precio</th>
        <th>DDP</th>
        <th>Calidad</th>
        <th>Score</th>
        <th>Siguiente pregunta</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, index) => `<tr>
            <td>${index + 1}</td>
            <td>${renderSupplierName(row)}</td>
            <td>${escapeHtml(row.moq || "--")}</td>
            <td>${escapeHtml(row.unitPrice || row.unit_price || "--")}</td>
            <td>${escapeHtml(row.ddpStatus || row.ddp_status || "--")}</td>
            <td>${escapeHtml(row.qualityProof || row.quality_proof || "--")}</td>
            <td><strong>${escapeHtml(row.score ?? "--")}</strong></td>
            <td>${escapeHtml(row.nextAsk || row.next_ask || "--")}</td>
          </tr>`,
        )
        .join("")}
    </tbody>
  </table></div>`;
}

function renderAgentWorkLog(items) {
  return `<div class="agent-work-grid">
    ${(items || [])
      .map((item) => {
        const config = goalConfig[item.key] || goalConfig.search;
        return `<article class="agent-step">
          <div class="source-icon ${config.className}"><i data-lucide="${config.icon}"></i></div>
          <div>
            <div class="step-head">
              <h4>${escapeHtml(item.title || item.step || "Tarea")}</h4>
              <span>${escapeHtml(item.status || "pendiente")}</span>
            </div>
            <p>${escapeHtml(item.result || "")}</p>
            <small>${escapeHtml(item.nextAction || item.next_action || "")}</small>
          </div>
        </article>`;
      })
      .join("")}
  </div>`;
}

function renderOutreachQueue(items) {
  return `<div class="outreach-list">
    ${(items || [])
      .map(
        (item) => `<article class="outreach-item">
          <div>
            <h4>${escapeHtml(item.supplierName || item.supplier_name || "Proveedor")}</h4>
            <p>${escapeHtml(item.messageType || item.message_type || "Mensaje")}</p>
          </div>
          <span>${escapeHtml(item.status || "listo")}</span>
          <p>${escapeHtml(item.waitingFor || item.waiting_for || "Esperando respuesta del proveedor.")}</p>
        </article>`,
      )
      .join("")}
  </div>`;
}

function renderSupplierName(row) {
  const name = row.supplierName || row.supplier_name || "Proveedor";
  const url = row.alibabaUrl || row.alibaba_url || "";
  if (!url) return escapeHtml(name);
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(name)}</a>`;
}

function renderMessageCard(title, message) {
  return `<article class="report-card">
    <h3>${escapeHtml(title)}</h3>
    <pre class="message-box">${escapeHtml(message)}</pre>
  </article>`;
}

function buildNegotiationPlan(report) {
  const quantity = report.orderQuantity || 100;
  const target = report.targetUnitCost ? formatMoney(report.targetUnitCost) : "[TARGET LANDED COST]";
  return {
    rfqMessage: `Hello, I am sourcing ${report.product} for ${report.market}. I am comparing suppliers for a first test order of ${quantity} units and possible repeat orders.\n\nPlease quote MOQ, price tiers, sample cost, EXW/FOB/DDP options to ${report.destination}, lead time, packaging details, carton size/gross weight, certifications, customization options, and Alibaba Trade Assurance payment terms.\n\nPlease also share real product photos/videos and any recent inspection or test documents.`,
    priceNegotiationMessage: `Thank you for the quote. I like the product, but the landed cost is above my target for a first test order.\n\nIf we start with ${quantity} units and reorder if quality is good, can you improve the unit price, MOQ, sample refund, and DDP shipping cost to ${report.destination}?\n\nMy target landed cost is ${target} per unit. Please send your best option without reducing material quality or packaging quality.`,
    moqMessage: `This is a first market test, so I cannot start with a large MOQ yet. If the sample passes and sales are good, I plan repeat orders.\n\nCan you support a trial order of ${quantity} units with the same product quality? Please quote both the trial price and the reorder price for a larger quantity.`,
    sampleMessage: `Before bulk order I need to test a sample.\n\nPlease confirm sample price, shipping cost, courier, exact product version/specs, sample lead time, whether sample cost can be deducted from the bulk order, and photos/videos of the exact sample before shipping.`,
    termsToConfirm: [
      "MOQ and price tiers",
      "sample cost and sample shipping",
      "EXW, FOB and DDP quotes",
      "carton size, gross weight and HS code",
      "lead time for sample and bulk order",
      "Trade Assurance payment terms",
      "custom logo/packaging cost",
    ],
  };
}

function buildOutreachQueue(suppliers, negotiation) {
  return (suppliers || []).slice(0, 3).map((supplier, index) => ({
    supplierName: supplier.supplierName || supplier.supplier_name || `Proveedor ${index + 1}`,
    status: "listo en la main page",
    messageType: index === 0 ? "RFQ inicial" : "Follow-up de comparacion",
    message: index === 0 ? negotiation.rfqMessage : negotiation.priceNegotiationMessage,
    waitingFor: "MOQ, precio por tier, muestra, DDP, lead time, certificaciones y Trade Assurance.",
    needsUserApproval: true,
  }));
}

function buildDdpPlan(report) {
  return {
    destination: report.destination,
    ddpQuestions: [
      `Does DDP to ${report.destination} include import duties, taxes, customs clearance and final door delivery?`,
      "Who is importer of record and what costs are excluded?",
      "What shipping method, transit time and tracking will be used?",
      "Can you quote DDP only after confirming carton size and gross weight?",
    ],
    includedChecklist: [
      "international freight",
      "export handling",
      "customs clearance",
      "import duties",
      "taxes/VAT/sales tax if applicable",
      "final door delivery",
      "tracking",
    ],
    redFlags: report.category.ddpRisks.concat([
      "supplier gives DDP price without destination ZIP/city",
      "supplier asks off-platform payment to avoid duties",
      "supplier says free shipping but cannot explain customs",
    ]),
    fallbackIncoterm: "FOB + freight forwarder if DDP is vague or too risky.",
  };
}

function buildQualityPlan(report) {
  return {
    sampleChecklist: report.category.sampleChecks,
    certificationChecks: report.category.certifications.map(
      (cert) => `Pedir ${cert} o explicar si no aplica para ${report.market}.`,
    ),
    inspectionPlan: [
      "pedir fotos/videos de produccion antes de envio",
      "definir defectos criticos, mayores y menores",
      "usar inspeccion de tercero antes de bulk order si el pedido crece",
      "guardar golden sample para comparar produccion",
    ],
    packagingChecks: [
      "empaque individual resistente",
      "caja master con medidas y peso confirmados",
      "logo, barcode, instrucciones y advertencias correctas",
      "proteccion suficiente para ecom y devoluciones bajas",
    ],
    noGoDefects: [
      "material distinto al prometido",
      "olor fuerte, fugas, piezas flojas o defectos funcionales",
      "certificados no verificables",
      "proveedor no acepta muestra o Trade Assurance",
    ],
  };
}

function activateTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
}

async function loadHistory() {
  if (!state.session?.access_token) return;
  try {
    const response = await fetch("./api/runs", {
      headers: {
        authorization: `Bearer ${state.session.access_token}`,
      },
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.message || "No se pudo cargar historial.");
    state.runs = body.runs || [];
    renderHistory();
  } catch (error) {
    historyList.innerHTML = `<p class="auth-status">${escapeHtml(error.message || "No se pudo cargar historial.")}</p>`;
  }
}

function renderHistory() {
  if (!state.runs.length) {
    historyList.innerHTML = '<p class="auth-status">Todavia no hay research guardado.</p>';
    return;
  }

  historyList.innerHTML = state.runs
    .map(
      (run) => `<button class="history-item" type="button" data-run-id="${escapeHtml(run.id)}">
        <strong>${escapeHtml(run.natural_request || "Research")}</strong>
        <span>${escapeHtml(run.status || "sin estado")} · ${escapeHtml(formatRunDate(run.created_at))}</span>
      </button>`,
    )
    .join("");
}

async function toggleHistory() {
  if (historyDrawer.hidden) {
    await loadHistory();
    historyDrawer.hidden = false;
  } else {
    closeHistory();
  }
}

function closeHistory() {
  historyDrawer.hidden = true;
}

async function handleHistoryClick(event) {
  const button = event.target.closest("[data-run-id]");
  if (!button) return;
  const runId = button.dataset.runId;
  button.disabled = true;

  try {
    const response = await fetch(`./api/runs/${encodeURIComponent(runId)}`, {
      headers: {
        authorization: `Bearer ${state.session.access_token}`,
      },
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.message || "No se pudo abrir el research.");

    const run = body.run;
    const input = run.input_json || {};
    const report = buildReport({
      ...input,
      naturalRequest: run.natural_request || input.naturalRequest || "Research guardado",
      attachments: input.attachments || [],
      accessKey: "",
    });
    report.ai = run.result_json || null;
    report.backendMode = "supabase";
    report.runId = run.id;
    state.latest = report;
    document.body.classList.add("report-ready");
    document.querySelector(".result-panel").hidden = false;
    renderReport(report);
    activateTab("brief");
    closeHistory();
  } catch (error) {
    showToast(error.message || "No se pudo abrir");
  } finally {
    button.disabled = false;
  }
}

function renderCompactSections(sections) {
  return sections
    .filter(([, items]) => Array.isArray(items) && items.length)
    .map(
      ([title, items]) => `<div class="compact-section">
        <h4>${escapeHtml(title)}</h4>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");
}

function setLoading(isLoading) {
  const button = form.querySelector("button[type='submit']");
  const uploadButton = form.querySelector(".plus-button");
  button.disabled = isLoading;
  uploadButton.disabled = isLoading;
  button.title = isLoading ? "Trabajando" : "Ejecutar agente";
  button.innerHTML = isLoading
    ? '<i data-lucide="loader-circle"></i>'
    : '<i data-lucide="arrow-up"></i>';
  lucide.createIcons();
}

function buildPrompt(report) {
  const attachments = attachmentSummary(report.attachments);
  return `Actua como Agent Genia. El usuario escribio: "${report.naturalRequest}". Adjuntos: ${attachments}. Decide que herramienta interna usar. Si hay intencion de Alibaba/proveedores/MOQ/DDP/negociacion, usa $alibaba-sourcing-agent sin sacar al usuario de la main page. Entrega bitacora de tool calls, shortlist, score, cola de mensajes de negociacion, plan DDP, checklist de calidad y siguientes pasos.`;
}

function buildMarkdown(report) {
  if (!report) return "";
  if (report.ai) {
    return buildAiMarkdown(report);
  }
  const negotiation = buildNegotiationPlan(report);
  const ddp = buildDdpPlan(report);
  const quality = buildQualityPlan(report);

  return `# Agent Genia Brief

Fecha: ${report.createdAt}
Solicitud: ${report.naturalRequest}
Herramienta interna: ${toolLabel(report.selectedInternalTool)}
Producto: ${report.product}
Detalles: ${report.productDetails}
Mercado: ${report.market}
Destino DDP: ${report.destination}
Presupuesto: ${report.budget || "no definido"}
Cantidad: ${report.orderQuantity || "no definida"}
Costo objetivo: ${report.targetUnitCost ? formatMoney(report.targetUnitCost) : "no definido"}
Adjuntos: ${attachmentSummary(report.attachments)}

## Decision

No compres inventario todavia. Busca proveedores verificados, pide cotizacion completa y ordena muestras primero.

## Trabajo del agente

${report.agentTasks.map((task) => `- ${task.title}: ${task.result}`).join("\n")}

## Perfiles de proveedor

${report.supplierProfiles
  .map((row) => `- ${row.supplierName}: ${row.productMatch} | MOQ: ${row.moq} | DDP: ${row.ddpStatus} | Score: ${row.score}`)
  .join("\n")}

## RFQ inicial

${negotiation.rfqMessage}

## DDP

${ddp.ddpQuestions.map((item) => `- ${item}`).join("\n")}

## Calidad

${quality.sampleChecklist.map((item) => `- ${item}`).join("\n")}

## Prompt profundo

${buildPrompt(report)}
`;
}

function buildAiMarkdown(report) {
  const ai = report.ai;
  return `# Agent Genia Brief

Fecha: ${report.createdAt}
Solicitud: ${report.naturalRequest}
Producto: ${report.product}
Mercado: ${report.market}
Destino DDP: ${report.destination}
Modo: Codex harness
Adjuntos: ${attachmentSummary(report.attachments)}

## Decision

${ai.executiveBrief.decision}

## Ruta recomendada

${ai.executiveBrief.recommendedPath}

## Proveedores

${ai.supplierShortlist
  .map((item, index) => `${index + 1}. ${item.supplierName} | ${item.alibabaUrl || "sin URL"} | MOQ: ${item.moq} | Precio: ${item.unitPrice} | DDP: ${item.ddpStatus} | Score: ${item.score}`)
  .join("\n")}

## RFQ

${ai.negotiationPlan.rfqMessage}

## Cola de negociacion

${(ai.supplierOutreachQueue || [])
  .map((item) => `- ${item.supplierName}: ${item.status} | ${item.waitingFor}`)
  .join("\n")}

## DDP

${ai.ddpPlan.ddpQuestions.map((item) => `- ${item}`).join("\n")}

## Calidad

${ai.qualityPlan.sampleChecklist.map((item) => `- ${item}`).join("\n")}

## Limitaciones

${ai.limitations.map((item) => `- ${item}`).join("\n")}

## Siguientes pasos

${ai.beginnerNextSteps.map((item) => `- ${item}`).join("\n")}
`;
}

function downloadBrief() {
  if (!state.latest) {
    showToast("Genera un sourcing primero");
    return;
  }
  const blob = new Blob([buildMarkdown(state.latest)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `alibaba-sourcing-${Date.now()}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copySummary() {
  if (!state.latest) {
    showToast("Genera un sourcing primero");
    return;
  }
  await navigator.clipboard.writeText(buildMarkdown(state.latest));
  showToast("Resumen copiado");
}

function saveState(report) {
  const lightReport = {
    ...report,
    attachments: (report.attachments || []).map(({ dataUrl, content, ...attachment }) => ({
      ...attachment,
      contentPreview: content ? content.slice(0, 400) : "",
      hasInlineData: Boolean(dataUrl || content),
    })),
  };
  try {
    localStorage.setItem("alibabaSourcingLatest", JSON.stringify(lightReport));
  } catch {
    localStorage.removeItem("alibabaSourcingLatest");
  }
}

function attachmentKind(file) {
  const name = file.name || "";
  const type = file.type || "";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/\.(docx?|xlsx?|csv|txt|json|md)$/i.test(name)) return "document";
  return "file";
}

function attachmentLabel(attachment) {
  if (attachment.kind === "image") return "imagen";
  if (attachment.kind === "pdf") return "PDF";
  if (attachment.contentMode === "text") return "texto";
  if (attachment.kind === "document") return "documento";
  return "archivo";
}

function attachmentSummary(attachments = []) {
  if (!attachments.length) return "ninguno";
  return attachments
    .map((item) => `${item.name} (${item.sizeLabel || formatBytes(item.size)}, ${attachmentLabel(item)})`)
    .join("; ");
}

function renderAttachmentPills(attachments = []) {
  return attachments
    .map(
      (item) => `<span class="pill"><i data-lucide="${iconForAttachment(item)}"></i>${escapeHtml(item.name)}</span>`,
    )
    .join("");
}

function iconForAttachment(attachment) {
  if (attachment.kind === "image") return "image";
  if (attachment.kind === "pdf") return "file-text";
  if (attachment.contentMode === "text") return "file-type";
  return "paperclip";
}

function isTextAttachment(file) {
  const type = file.type || "";
  return (
    type.startsWith("text/") ||
    ["application/json", "text/csv"].includes(type) ||
    /\.(txt|csv|json|md)$/i.test(file.name || "")
  );
}

function fallbackMimeType(name = "") {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.csv$/i.test(name)) return "text/csv";
  if (/\.json$/i.test(name)) return "application/json";
  if (/\.txt$/i.test(name)) return "text/plain";
  if (/\.docx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.xlsx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

function readFileAsDataUrl(file) {
  return readFile(file, "DataURL");
}

function readFileAsText(file) {
  return readFile(file, "Text");
}

function readFile(file, method) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader[`readAs${method}`](file);
  });
}

function createAttachmentId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatRunDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function toolLabel(value) {
  if (value === "alibaba-sourcing-agent") return "Alibaba sourcing";
  return "Ecom research";
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 1900);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
