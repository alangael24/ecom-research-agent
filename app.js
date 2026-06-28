const state = {
  latest: null,
  attachments: [],
  config: null,
  session: null,
  runs: [],
  shopifyStores: [],
  pendingShopifyShop: "",
  user: null,
};

const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const TEXT_ATTACHMENT_LIMIT = 60000;

const form = document.querySelector("#researchForm");
const resultPanel = document.querySelector(".result-panel");
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
const brandFields = document.querySelector("#brandFields");
const brandNameInput = document.querySelector("#brandName");
const brandUrlInput = document.querySelector("#brandUrl");
const brandChannelsInput = document.querySelector("#brandChannels");
const brandGoalInput = document.querySelector("#brandGoal");
const shopifyFields = document.querySelector("#shopifyFields");
const shopifyDomainInput = document.querySelector("#shopifyDomain");
const shopifyStoreSelect = document.querySelector("#shopifyStore");
const shopifyFocusInput = document.querySelector("#shopifyFocus");
const shopifyConnectionStatus = document.querySelector("#shopifyConnectionStatus");
const stageCards = [...document.querySelectorAll("[data-stage-card]")];
const hero = document.querySelector(".hero");
const authPage = document.querySelector("#authPage");
const authError = document.querySelector("#authError");
const userPill = document.querySelector("#userPill");
const pendingRequestKey = "agentGeniaPendingRequest";
const SHOPIFY_PRODUCTION_ORIGIN = "https://agentgenia.com";

const tabLabelSets = {
  sourcing: ["Resumen", "Herramientas", "Proveedores", "Negociacion", "DDP", "Calidad"],
  brand: ["Resumen", "Marca", "Oferta", "Crecimiento", "Conversion", "Siguiente"],
  brandWhitespace: ["Resumen", "Espacios", "Evidencia", "Validacion", "Riesgos", "Siguiente"],
  shopify: ["Resumen", "Shopify", "Catalogo", "Acciones", "DDP", "Calidad"],
  profitability: ["Resumen", "Numeros", "Alertas", "Siguiente", "Supuestos", "Notas"],
  shipping: ["Resumen", "Tarifas", "Detalles", "Alertas", "Siguiente", "Notas"],
  shopifyPage: ["Preview", "Contenido", "Shopify", "Publicar", "SEO", "Notas"],
};

const repurchaseLabels = {
  1: "Sin recompra clara",
  1.15: "Baja",
  1.35: "Media",
  1.7: "Alta",
};

const differentiationLabels = {
  commodity: "Casi igual a los demas",
  weak: "Un poco diferente",
  clear: "Se entiende la diferencia",
  defensible: "Dificil de copiar",
};

const channelLabels = {
  meta: "Facebook/Instagram",
  "tiktok-organic": "videos organicos en TikTok",
  "tiktok-paid": "anuncios en TikTok",
  influencers: "creadores o influencers",
  search: "Google",
  amazon: "Amazon",
};

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
  shopify: {
    label: "Auditar Shopify",
    icon: "shopping-bag",
    className: "shopify",
  },
  brand: {
    label: "Auditar marca",
    icon: "store",
    className: "brand",
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
  setupStageControls();
  await bootAuth();
  renderAuthState();
  renderRoute();
  if (handleShopifyEntryParams()) return;
  handleShopifyCallbackParams();
  loadShopifyStores();
  form.addEventListener("submit", handleSubmit);
  form.querySelector(".plus-button")?.addEventListener("click", () => attachmentInput?.click());
  attachmentInput?.addEventListener("change", (event) => void handleAttachmentInput(event));
  attachmentTray?.addEventListener("click", handleAttachmentTrayClick);
  signInForm?.addEventListener("submit", handleSignIn);
  document.querySelector("#signOut")?.addEventListener("click", signOut);
  document.querySelector("#toggleHistory")?.addEventListener("click", toggleHistory);
  document.querySelector("#closeHistory")?.addEventListener("click", () => closeHistory());
  historyList?.addEventListener("click", (event) => void handleHistoryClick(event));
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
  document.querySelector("#copySummary").addEventListener("click", copySummary);
  document.addEventListener("click", handleDocumentClick);
  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  lucide.createIcons();
  resumePendingRequest();
}

function setupStageControls() {
  form.querySelectorAll("input[name='businessStage']").forEach((input) => {
    input.addEventListener("change", updateStageUI);
  });
  stageCards.forEach((card) => {
    card.addEventListener("click", () => selectBusinessStage(card.dataset.stageCard));
  });
  document.querySelector("#loginShopify")?.addEventListener("click", startShopifyLogin);
  document.querySelector("#connectShopify")?.addEventListener("click", connectShopifyStore);
  document.querySelector("#refreshShopifyStores")?.addEventListener("click", loadShopifyStores);
  document.querySelector("#disconnectShopify")?.addEventListener("click", disconnectSelectedShopifyStore);
  document.querySelector("#closeShopifyPanel")?.addEventListener("click", () => selectBusinessStage("starter"));
  document.querySelector("#closeBrandPanel")?.addEventListener("click", () => selectBusinessStage("starter"));
  updateStageUI();
}

function selectBusinessStage(stage) {
  const input = form.querySelector(`input[name='businessStage'][value='${stage}']`);
  if (!input) return;
  input.checked = true;
  updateStageUI();
  if (stage === "shopify" || stage === "brand") {
    (stage === "shopify" ? shopifyFields : brandFields)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function handleShopifyEntryParams() {
  const params = new URLSearchParams(window.location.search);
  const shop = normalizeShopifyDomain(params.get("shop"));
  if (!shop || !isValidShopifyDomain(shop) || params.has("shopify_connected")) return false;

  window.location.replace(shopifyApiUrl(`/api/shopify/start${window.location.search}`));
  return true;
}

function handleShopifyCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const connectedShop = normalizeShopifyDomain(params.get("shopify_connected"));
  if (!connectedShop) return;

  const shopifyInput = form.querySelector("input[name='businessStage'][value='shopify']");
  if (shopifyInput) shopifyInput.checked = true;
  state.pendingShopifyShop = connectedShop;
  if (shopifyDomainInput) shopifyDomainInput.value = connectedShop;
  updateStageUI();
  showToast(`Tienda conectada: ${connectedShop}`);

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("shopify_connected");
  cleanUrl.searchParams.delete("stage");
  window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
}

async function startShopifyLogin() {
  const button = document.querySelector("#loginShopify");
  if (button) button.disabled = true;

  try {
    const response = await fetch(shopifyApiUrl("/api/shopify/login"), {
      headers: { accept: "application/json" },
    });
    const body = await response.json();
    if (!response.ok || !body.ok || !body.redirectUrl) {
      openManualShopifyFallback();
      showToast(body.message || "Falta activar el install link de Shopify");
      return;
    }
    window.location.href = body.redirectUrl;
  } catch {
    openManualShopifyFallback();
    showToast("No se pudo iniciar sesion con Shopify");
  } finally {
    if (button) button.disabled = false;
  }
}

function openManualShopifyFallback() {
  document.querySelector(".manual-shopify")?.setAttribute("open", "");
}

function selectedBusinessStage() {
  return form.businessStage?.value || "starter";
}

function updateStageUI() {
  const isShopify = selectedBusinessStage() === "shopify";
  const isBrand = selectedBusinessStage() === "brand";
  if (brandFields) brandFields.hidden = !isBrand;
  if (shopifyFields) shopifyFields.hidden = !isShopify;
  document.body.classList.toggle("shopify-mode", isShopify);
  document.body.classList.toggle("brand-mode", isBrand);
  stageCards.forEach((card) => {
    const active = card.dataset.stageCard === selectedBusinessStage();
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

async function loadShopifyStores() {
  if (!shopifyStoreSelect) return;
  try {
    const response = await fetch(shopifyApiUrl("/api/shopify"));
    if (response.status === 404) throw new Error("Shopify backend not deployed");
    const body = await response.json();
    if (!body.ok) throw new Error(body.message || "No se pudieron leer las tiendas Shopify.");
    state.shopifyStores = body.stores || [];
    renderShopifyStoreOptions();
    if (shopifyConnectionStatus) {
      shopifyConnectionStatus.textContent = state.shopifyStores.length
        ? `${state.shopifyStores.length} tienda(s) conectada(s).`
        : "Conecta cada tienda una vez con OAuth de Shopify.";
    }
  } catch (error) {
    state.shopifyStores = [];
    renderShopifyStoreOptions();
    if (shopifyConnectionStatus) {
      shopifyConnectionStatus.textContent = "La conexion Shopify funciona desde la URL publicada en Cloudflare.";
    }
  }
}

function renderShopifyStoreOptions() {
  if (!shopifyStoreSelect) return;
  const current = state.pendingShopifyShop || shopifyStoreSelect.value;
  shopifyStoreSelect.innerHTML = state.shopifyStores.length
    ? state.shopifyStores
        .map((store) => {
          const label = store.shopInfo?.name ? `${store.shopInfo.name} (${store.shop})` : store.shop;
          return `<option value="${escapeHtml(store.shop)}">${escapeHtml(label)}</option>`;
        })
        .join("")
    : '<option value="">Sin tiendas conectadas</option>';

  if (state.shopifyStores.some((store) => store.shop === current)) {
    shopifyStoreSelect.value = current;
  }
  state.pendingShopifyShop = "";
}

function connectShopifyStore() {
  const shop = normalizeShopifyDomain(shopifyDomainInput?.value);
  if (!isValidShopifyDomain(shop)) {
    showToast("Usa tu dominio .myshopify.com o el nombre de tu tienda");
    return;
  }
  window.location.href = shopifyApiUrl(`/api/shopify/connect?shop=${encodeURIComponent(shop)}`);
}

async function disconnectSelectedShopifyStore() {
  const shop = shopifyStoreSelect?.value || "";
  if (!shop) {
    showToast("Selecciona una tienda conectada");
    return;
  }

  const response = await fetch(shopifyApiUrl("/api/shopify"), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shop }),
  });
  const body = await response.json();
  if (!body.ok) {
    showToast(body.message || "No se pudo desconectar Shopify");
    return;
  }
  showToast(`Tienda desconectada: ${shop}`);
  await loadShopifyStores();
}

async function requestShopifySnapshot(shop) {
  const response = await fetch(shopifyApiUrl("/api/shopify"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shop }),
  });
  const body = await response.json();
  if (!body.ok) {
    throw new Error(body.message || "No se pudo leer Shopify.");
  }
  return body.shopify;
}

function normalizeShopifyDomain(value) {
  const raw = String(value || "").trim();
  const adminStoreMatch = raw.match(/admin\.shopify\.com\/store\/([^/?#]+)/i);
  const cleaned = (
    adminStoreMatch
      ? adminStoreMatch[1]
      : raw
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split(/[/?#]/)[0]
  ).toLowerCase();
  if (/^[a-z0-9][a-z0-9-]*$/.test(cleaned)) return `${cleaned}.myshopify.com`;
  return cleaned;
}

function isValidShopifyDomain(shop) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

function shopifyApiUrl(path) {
  if (usesLocalPreview()) return `${SHOPIFY_PRODUCTION_ORIGIN}${path}`;
  return path;
}

function usesLocalPreview() {
  return ["", "localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

async function bootAuth() {
  document.body.classList.add("auth-required");
  if (authGate) authGate.hidden = false;
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
    renderAuthState();
  } catch (error) {
    clearSession();
    renderAuthState();
    setAuthStatus(error.message || "No se pudo iniciar sesion.");
  } finally {
    button.disabled = false;
  }
}

async function enterAuthenticatedApp() {
  document.body.classList.remove("auth-required");
  document.body.classList.add("authenticated");
  if (authGate) authGate.hidden = true;
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
  renderAuthState();
  document.body.classList.remove("authenticated", "report-ready");
  document.body.classList.add("auth-required");
  resultPanel.hidden = true;
  if (authGate) authGate.hidden = false;
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
  if (authStatus) authStatus.textContent = message;
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
  if (!attachmentTray) return;
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
    if (authGate) authGate.hidden = false;
    setAuthStatus("Inicia sesion para usar el agente.");
    return;
  }

  const data = readForm();
  if (!state.user) {
    document.body.classList.add("auth-required");
    if (authGate) authGate.hidden = false;
    setAuthStatus("Inicia sesion para usar el agente.");
    return;
  }
  await runResearch(data);
}

async function runResearch(data) {
  setLoading(true);

  if ((data.businessStage === "shopify" || data.businessStage === "brand") && data.shopify.shop) {
    try {
      data.shopify.snapshot = await requestShopifySnapshot(data.shopify.shop);
    } catch (error) {
      data.shopify.error = error instanceof Error ? error.message : "No se pudo leer la tienda Shopify.";
    }
  }

  const report = buildReport(data);

  try {
    const backend = await requestBackendReport(data);
    if (backend?.ok && backend.report) {
      if (renderTypedBackendReport(backend.report)) {
        saveState(backend.report);
        setLoading(false);
        await loadHistory();
        resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast(typedReportToast(backend.report));
        return;
      }
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
  resultPanel.hidden = false;
  renderReport(report);
  activateTab("brief");
  saveState(report);
  setLoading(false);
  await loadHistory();
  showToast(report.ai ? "Sourcing generado con Codex" : "Plan guiado generado");
}

function renderTypedBackendReport(report) {
  if (!report?.type) return false;

  if (report.type === "profitability") {
    state.latest = report;
    document.body.classList.add("report-ready");
    resultPanel.hidden = false;
    renderProfitabilityReport(report);
  } else if (report.type === "shipping_quote") {
    state.latest = report;
    document.body.classList.add("report-ready");
    resultPanel.hidden = false;
    renderShippingQuoteReport(report);
  } else if (report.type === "shopify_page_draft") {
    state.latest = report;
    document.body.classList.add("report-ready");
    resultPanel.hidden = false;
    renderShopifyPageDraftReport(report);
  } else if (report.type === "brand_whitespace") {
    state.latest = report;
    document.body.classList.add("report-ready");
    resultPanel.hidden = false;
    renderBrandWhitespaceReport(report);
  } else {
    return false;
  }

  activateTab("brief");
  return true;
}

function typedReportToast(report) {
  if (report.type === "profitability") return "Analisis de rentabilidad listo";
  if (report.type === "shipping_quote") return "Cotizacion de envio lista";
  if (report.type === "shopify_page_draft") return "Preview de pagina Shopify listo";
  if (report.type === "brand_whitespace") return "Whitespace de marca listo";
  return "Reporte listo";
}

async function fetchSession() {
  try {
    const response = await fetch("./api/session", { credentials: "include" });
    if (!response.ok) return null;
    const session = await response.json();
    return session.authenticated ? session.user : null;
  } catch {
    return null;
  }
}

function handleDocumentClick(event) {
  const publishButton = event.target.closest("[data-publish-shopify-page]");
  if (publishButton) {
    publishShopifyPage(publishButton);
  }
}

function renderAuthState() {
  if (!state.user) {
    userPill.hidden = true;
    userPill.innerHTML = "";
    return;
  }

  userPill.hidden = false;
  userPill.innerHTML = `<span>${escapeHtml(state.user.email || state.user.name || "Cuenta activa")}</span>`;
}

function renderRoute() {
  const isLoginRoute = window.location.pathname === "/login";
  document.body.classList.toggle("auth-mode", isLoginRoute);
  if (hero) hero.hidden = isLoginRoute;
  if (authPage) authPage.hidden = !isLoginRoute;
  if (isLoginRoute) {
    resultPanel.hidden = true;
    renderAuthError();
  }
  if (isLoginRoute && state.user) {
    window.location.replace("/");
  }
}

function renderAuthError() {
  const message = {
    google_config: "Falta configurar Google OAuth.",
    google_state: "La sesion de Google expiro. Intenta de nuevo.",
    google_token: "Google no pudo completar el acceso.",
    google_profile: "No pudimos leer el perfil de Google.",
    google_email: "Google no devolvio un correo.",
    shopify_config: "Falta configurar Shopify OAuth.",
    shopify_shop: "Escribe una tienda valida de Shopify.",
    shopify_state: "La sesion de Shopify expiro. Intenta de nuevo.",
    shopify_hmac: "Shopify no pudo verificar la solicitud.",
    shopify_token: "Shopify no pudo completar el acceso.",
  }[new URLSearchParams(window.location.search).get("error")];

  if (!authError) return;
  authError.hidden = !message;
  authError.textContent = message || "";
}

function queueLogin(naturalRequest) {
  sessionStorage.setItem(pendingRequestKey, naturalRequest);
  window.location.href = "/login";
}

function resumePendingRequest() {
  const params = new URLSearchParams(window.location.search);
  if (!state.user || params.get("auth") !== "success") return;
  const pending = sessionStorage.getItem(pendingRequestKey);
  sessionStorage.removeItem(pendingRequestKey);
  window.history.replaceState({}, "", window.location.pathname);
  if (!pending) return;
  form.naturalRequest.value = pending;
  runResearch(readForm());
}

function readForm() {
  const naturalRequest = form.naturalRequest.value.trim() || "Quiero investigar una oportunidad ecommerce y necesito siguientes pasos claros.";
  const businessStage = selectedBusinessStage();
  const inferred = inferRequest(naturalRequest, businessStage);
  return {
    businessStage,
    naturalRequest,
    ...inferred,
    shopify: {
      shop: shopifyStoreSelect?.value || "",
      focus: shopifyFocusInput?.value.trim() || "",
    },
    brand: {
      name: brandNameInput?.value.trim() || "",
      url: normalizeBrandUrl(brandUrlInput?.value.trim() || ""),
      channels: brandChannelsInput?.value.trim() || "",
      goal: brandGoalInput?.value.trim() || "",
    },
    attachments: serializeAttachments(),
    accessKey: form.accessKey.value.trim(),
  };
}

function inferRequest(naturalRequest, businessStage = "starter") {
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
  const shopifyIntent =
    businessStage === "shopify" ||
    hasAny(text, ["shopify", "tienda", "store", "catalogo", "catálogo", "conversion", "conversiones"]);
  const brandIntent =
    businessStage === "brand" ||
    hasAny(text, ["marca", "brand", "negocio", "ventas", "aov", "retencion", "retención", "email", "ads", "roas"]);
  const whitespaceIntent = hasAny(text, [
    "whitespace",
    "white space",
    "espacio libre",
    "hueco",
    "oportunidad",
    "posicionamiento",
    "diferenciar",
    "diferenciacion",
    "diferenciación",
    "competencia",
    "competidor",
    "competidores",
    "nicho",
    "angulo",
    "ángulo",
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
    goals: sourcingIntent
      ? ["interpret", "search", "negotiate", "ddp", "quality"]
      : brandIntent
        ? ["interpret", "brand", "shopify", "quality"]
      : shopifyIntent
        ? ["interpret", "shopify", "quality"]
        : ["interpret"],
    selectedInternalTool: sourcingIntent
      ? "alibaba-sourcing-agent"
      : brandIntent && whitespaceIntent
        ? "brand_whitespace_tool"
      : brandIntent
        ? "brand-audit-agent"
      : shopifyIntent
        ? "shopify-store-audit"
        : "ecom-research-agent",
  };
}

function normalizeBrandUrl(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(cleaned)) return `https://${cleaned}`;
  return cleaned;
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
    credentials: "include",
    body: JSON.stringify({ ...data, accessKey: undefined }),
  });

  if (response.status === 404) {
    throw new Error("Backend not deployed");
  }

  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      renderAuthState();
      document.body.classList.add("auth-required");
      if (authGate) authGate.hidden = false;
    }
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
    if (data.selectedInternalTool === "brand-audit-agent") {
      return firstStep.concat([
        {
          key: "brand",
          title: "Leer contexto de marca",
          status: data.brand?.url || data.brand?.name ? "contexto recibido" : "requiere contexto",
          result: data.brand?.name
            ? `El agente analizara ${data.brand.name} con la solicitud y los canales disponibles.`
            : "El agente necesita nombre, sitio o canales para entender mejor la marca.",
          nextAction: "Priorizar oferta, conversion, retencion y oportunidades de crecimiento.",
        },
        {
          key: "shopify",
          title: "Cruzar con Shopify",
          status: data.shopify?.shop ? "catalogo disponible" : "opcional",
          result: data.shopify?.shop
            ? `Tambien usara ${data.shopify.shop} como contexto de catalogo real.`
            : "Shopify puede conectarse despues para leer catalogo, precios e inventario.",
          nextAction: "Combinar datos de marca con catalogo si la tienda esta conectada.",
        },
      ]);
    }
    if (data.selectedInternalTool === "shopify-store-audit") {
      return firstStep.concat([
        {
          key: "shopify",
          title: "Leer tienda Shopify",
          status: data.shopify?.shop ? "listo para OAuth" : "requiere conexion",
          result: data.shopify?.shop
            ? `El agente usara la tienda conectada ${data.shopify.shop} como contexto real.`
            : "El agente necesita que conectes una tienda Shopify para leer catalogo real.",
          nextAction: "Auditar catalogo, pricing, inventario y siguientes acciones dentro de esta pagina.",
        },
      ]);
    }
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
  setTabLabels(tabLabelSets.sourcing);
  document.querySelector("#brief").innerHTML = emptyState.innerHTML;
  lucide.createIcons();
}

function renderProfitabilityReport(report) {
  const data = report.profitability || {};
  const currency = data.currency || "USD";
  const verdict = report.verdict || {
    level: "watch",
    label: "Revisar",
    title: "Faltan numeros para decidir",
    copy: "El agente separo los datos dados de los supuestos. No conviene lanzar hasta confirmar costos reales.",
  };
  const risks = Array.isArray(report.risks) && report.risks.length
    ? report.risks
    : ["Faltan riesgos calculados; confirma precio, producto, envio, fees y devoluciones."];
  const steps = Array.isArray(report.steps) && report.steps.length
    ? report.steps
    : ["Completa los numeros faltantes antes de comprar inventario."];
  const assumptions = Array.isArray(data.assumptions) && data.assumptions.length
    ? data.assumptions
    : ["Resultado basado en supuestos conservadores hasta confirmar numeros reales."];
  const score = Number.isFinite(report.score) ? Math.max(0, Math.min(100, report.score)) : 0;
  const scoreClass = verdict.level === "fail" ? "danger" : verdict.level === "watch" ? "warning" : "";

  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.profitability);

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card ${verdict.level === "fail" ? "danger" : verdict.level === "watch" ? "warning" : ""}">
        <strong>${escapeHtml(verdict.label)}</strong>
        <p>veredicto</p>
      </article>
      <article class="metric-card">
        <strong>${score}/100</strong>
        <p>calificacion</p>
      </article>
      <article class="metric-card">
        <strong>${formatMoney(data.cacTarget, currency)}</strong>
        <p>meta sana por cliente</p>
      </article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>${escapeHtml(verdict.title)}</h3>
        <p>${escapeHtml(verdict.copy)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="calculator"></i>Filtro de rentabilidad</span>
          <span class="pill"><i data-lucide="shopping-bag"></i>${formatMoney(data.aov, currency)} por pedido</span>
          <span class="pill"><i data-lucide="megaphone"></i>${escapeHtml(channelLabels[data.channel] || data.channel || "canal pendiente")}</span>
        </div>
      </article>
      <article class="report-card">
        <h3>Dinero antes de anuncios</h3>
        <p>${formatMoney(data.contribution, currency)} por pedido, equivalente a ${formatPercent(data.margin)}.</p>
      </article>
      <article class="report-card">
        <h3>Ventas necesarias</h3>
        <p>Para no perder, necesitas vender ${formatRoas(data.breakEvenRoas)} por cada $1 gastado en anuncios.</p>
      </article>
      <article class="report-card full-span">
        <h3>Calificacion</h3>
        <div class="score-track"><span class="${scoreClass}" style="width: ${score}%"></span></div>
      </article>
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Numeros usados</h3>
        <dl class="calculation-list">
          <div><dt>Venta por pedido</dt><dd>${formatMoney(data.aov, currency)}</dd></div>
          <div><dt>Producto</dt><dd>${formatMoney(data.cogs, currency)}</dd></div>
          <div><dt>Envio</dt><dd>${formatMoney(data.shipping, currency)}</dd></div>
          <div><dt>Cobros de plataforma</dt><dd>${formatMoney(data.fees, currency)}</dd></div>
          <div><dt>Reserva por devoluciones</dt><dd>${formatMoney(data.returnsReserve, currency)}</dd></div>
          <div><dt>Maximo para conseguir cliente</dt><dd>${formatMoney(data.cacMax, currency)}</dd></div>
          <div><dt>Meta sana por cliente</dt><dd>${formatMoney(data.cacTarget, currency)}</dd></div>
          <div><dt>ROAS para no perder</dt><dd>${formatRoas(data.breakEvenRoas)}</dd></div>
          <div><dt>ROAS objetivo</dt><dd>${formatRoas(data.targetRoas)}</dd></div>
          <div><dt>Valor si compra otra vez</dt><dd>${formatMoney(data.ltvContribution, currency)}</dd></div>
        </dl>
      </article>
      ${renderShippingQuoteDetails(data.shippingQuote)}
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span notice-card">
        <h3>Alertas importantes</h3>
        <ul>${risks.map((risk) => `<li>${escapeHtml(stripHtml(risk))}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Que haria despues</h3>
        <ul>${steps.map((step) => `<li>${escapeHtml(stripHtml(step))}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Supuestos usados</h3>
        <ul>${assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Numeros que conviene confirmar</h3>
        <ul>
          <li>Precio real de venta y bundle promedio.</li>
          <li>Costo de producto landed, no solo precio de proveedor.</li>
          <li>Envio real por CP, peso y medidas.</li>
          <li>Fees de plataforma, pagos, devoluciones y reenvios.</li>
        </ul>
      </article>
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Herramienta interna</h3>
        <p>El agente uso el filtro de unit economics sin abrir una pagina separada.</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="wrench"></i>${escapeHtml(report.toolUsed || "unit_economics_filter")}</span>
          <span class="pill"><i data-lucide="map-pin"></i>${escapeHtml(report.market || "mercado pendiente")}</span>
          <span class="pill"><i data-lucide="calendar"></i>${escapeHtml(report.createdAt || "")}</span>
        </div>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderShippingQuoteDetails(shippingQuote) {
  if (!shippingQuote) return "";
  const status = {
    live_envia_mx: "Cotizado en vivo con Envia.com",
    live_easypost: "Cotizado en vivo",
    user_provided: "Escrito por el usuario",
    estimated_no_envia_token: "Estimado para Mexico",
    estimated_missing_mx_details: "Estimado para Mexico",
    estimated_after_envia_error: "Estimado para Mexico",
    estimated_no_api_key: "Estimado",
    estimated_unsupported_currency: "Estimado",
    estimated_missing_details: "Estimado",
    estimated_after_quote_error: "Estimado",
  }[shippingQuote.mode] || "Estimado";
  const profile = shippingQuote.profile || {};
  const currency = shippingQuote.currency || "USD";
  const packageText =
    currency === "MXN"
      ? `${formatNumber((profile.weightOz || 0) / 35.274)} kg, ${formatNumber((profile.lengthIn || 0) * 2.54)} x ${formatNumber((profile.widthIn || 0) * 2.54)} x ${formatNumber((profile.heightIn || 0) * 2.54)} cm`
      : `${formatNumber(profile.weightOz || 0)} oz, ${formatNumber(profile.lengthIn || 0)} x ${formatNumber(profile.widthIn || 0)} x ${formatNumber(profile.heightIn || 0)} in`;
  const routeText =
    currency === "MXN"
      ? `${profile.originZip || "origen pendiente"} -> ${profile.destinationZip || "destino pendiente"}`
      : `${profile.originZip || "origin pending"} -> ${profile.destinationZip || "destination pending"}`;

  return `<article class="report-card full-span">
    <h3>Como se calculo el envio</h3>
    <p><strong>${escapeHtml(status)}:</strong> ${formatMoney(shippingQuote.amount, currency)} por pedido.</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="map-pinned"></i>${escapeHtml(routeText)}</span>
      <span class="pill"><i data-lucide="package"></i>${escapeHtml(packageText)}</span>
    </div>
    ${renderShippingRates(shippingQuote)}
  </article>`;
}

function renderShippingQuoteReport(report) {
  const quote = report.shippingQuote || {};
  const profile = quote.profile || {};
  const currency = quote.currency || "MXN";
  const route = `${profile.originZip || "origen pendiente"} -> ${profile.destinationZip || "destino pendiente"}`;
  const live = quote.mode === "live_envia_mx" || quote.mode === "live_easypost";
  const status = live ? "Cotizacion viva" : quote.mode === "user_provided" ? "Envio escrito" : "Estimacion";
  const notes = Array.isArray(quote.notes) ? quote.notes : [];
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps : [];

  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.shipping);

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card ${live ? "" : "warning"}">
        <strong>${formatMoney(quote.amount, currency)}</strong>
        <p>costo de envio</p>
      </article>
      <article class="metric-card">
        <strong>${escapeHtml(status)}</strong>
        <p>tipo de calculo</p>
      </article>
      <article class="metric-card">
        <strong>${escapeHtml(quote.carrier || (currency === "MXN" ? "Envia" : "API"))}</strong>
        <p>proveedor</p>
      </article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Ruta cotizada</h3>
        <p>${escapeHtml(route)}${profile.originCity || profile.destinationCity ? ` · ${escapeHtml([profile.originCity, profile.destinationCity].filter(Boolean).join(" a "))}` : ""}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="truck"></i>Solo cotizacion</span>
          <span class="pill"><i data-lucide="package"></i>${escapeHtml(packageSummary(report.package, currency))}</span>
          <span class="pill"><i data-lucide="shield-check"></i>No se compro guia</span>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Notas</h3>
        <ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Tarifas disponibles</h3>
        ${renderShippingRates(quote)}
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Detalles usados</h3>
        <dl class="calculation-list">
          <div><dt>Origen</dt><dd>${escapeHtml(profile.originZip || "pendiente")}</dd></div>
          <div><dt>Destino</dt><dd>${escapeHtml(profile.destinationZip || "pendiente")}</dd></div>
          <div><dt>Peso</dt><dd>${formatNumber(report.package?.weightKg || 0)} kg</dd></div>
          <div><dt>Medidas</dt><dd>${formatNumber(report.package?.lengthCm || 0)} x ${formatNumber(report.package?.widthCm || 0)} x ${formatNumber(report.package?.heightCm || 0)} cm</dd></div>
          <div><dt>Valor declarado</dt><dd>${formatMoney(profile.declaredValue || 0, currency)}</dd></div>
        </dl>
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span ${warnings.length ? "notice-card" : ""}">
        <h3>Alertas</h3>
        <ul>${(warnings.length ? warnings : ["No hay alertas adicionales para esta cotizacion."]).map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Que haria despues</h3>
        <ul>${(nextSteps.length ? nextSteps : ["Usa esta tarifa como costo base; confirma cobertura y tiempos antes de prometerlo al cliente."]).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Modo de la herramienta</h3>
        <p>Solo cotiza tarifas. No crea guia, no compra envio y no contacta paqueterias.</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="wrench"></i>${escapeHtml(report.provider || "shipping_rate_quote")}</span>
          <span class="pill"><i data-lucide="calendar"></i>${escapeHtml(report.createdAt || "")}</span>
        </div>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderShippingRates(quote) {
  if (!Array.isArray(quote.rates) || !quote.rates.length) {
    const notes = Array.isArray(quote.notes) ? quote.notes : ["No hay tarifas vivas disponibles; se uso estimacion."];
    return `<p>${escapeHtml(notes.join(" "))}</p>`;
  }
  return `<dl class="calculation-list mini-list">${quote.rates
    .map(
      (rate) => `<div><dt>${escapeHtml(rate.carrier)} ${escapeHtml(rate.service)}</dt><dd>${formatMoney(rate.amount, rate.currency || quote.currency || "USD")}</dd></div>`,
    )
    .join("")}</dl>`;
}

function packageSummary(packageInfo, currency) {
  if (!packageInfo) return "paquete";
  if (currency === "MXN") {
    return `${formatNumber(packageInfo.weightKg || 0)} kg · ${formatNumber(packageInfo.lengthCm || 0)} x ${formatNumber(packageInfo.widthCm || 0)} x ${formatNumber(packageInfo.heightCm || 0)} cm`;
  }
  return `${formatNumber(packageInfo.weightKg || 0)} kg`;
}

function renderShopifyPageDraftReport(report) {
  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.shopifyPage);

  const page = report.page || {};
  const preview = page.preview || {};
  const publication = report.publication || null;
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps : [];
  const shop = report.shopify?.shop || "";
  const canPublish = Boolean(shop && page.title && page.bodyHtml);
  const publishedCard = publication
    ? `<article class="report-card full-span success-card">
        <h3>Pagina publicada</h3>
        <p>La pagina ya fue creada en Shopify.</p>
        <div class="pill-row">
          <a class="pill link-pill" href="${escapeHtml(publication.url || "#")}" target="_blank" rel="noreferrer"><i data-lucide="external-link"></i>Ver pagina</a>
          <a class="pill link-pill" href="${escapeHtml(publication.adminUrl || "#")}" target="_blank" rel="noreferrer"><i data-lucide="settings"></i>Abrir en Shopify</a>
        </div>
      </article>`
    : "";

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${escapeHtml(shop || "Pendiente")}</strong><p>tienda</p></article>
      <article class="metric-card"><strong>${escapeHtml(page.handle || "--")}</strong><p>handle</p></article>
      <article class="metric-card"><strong>Preview</strong><p>requiere aprobacion</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>${escapeHtml(preview.headline || page.title || "Nueva pagina Shopify")}</h3>
        <p>${escapeHtml(preview.subheadline || "Preview generado para Shopify.")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(shop || "conecta Shopify")}</span>
          <span class="pill"><i data-lucide="file-text"></i>${escapeHtml(page.title || "sin titulo")}</span>
          <span class="pill"><i data-lucide="mouse-pointer-click"></i>${escapeHtml(preview.cta || "CTA pendiente")}</span>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Preview visual</h3>
        ${renderShopifyPagePreview(preview)}
      </article>
      ${publishedCard}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Contenido que se publicara</h3>
        <dl class="calculation-list">
          <div><dt>Titulo</dt><dd>${escapeHtml(page.title || "--")}</dd></div>
          <div><dt>URL</dt><dd>/pages/${escapeHtml(page.handle || "--")}</dd></div>
          <div><dt>SEO title</dt><dd>${escapeHtml(page.seoTitle || page.title || "--")}</dd></div>
          <div><dt>SEO description</dt><dd>${escapeHtml(page.seoDescription || "--")}</dd></div>
        </dl>
      </article>
      <article class="report-card full-span">
        <h3>HTML Shopify</h3>
        <pre class="message-box">${escapeHtml(page.bodyHtml || "")}</pre>
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span ${shop ? "" : "notice-card"}">
        <h3>Conexion Shopify</h3>
        <p>${shop ? `Se publicara en ${escapeHtml(shop)}.` : "Conecta Shopify antes de publicar esta pagina."}</p>
        <ul>
          <li>La app debe tener permiso <strong>write_content</strong>.</li>
          <li>Si ya conectaste la tienda antes de este cambio, vuelve a iniciar sesion con Shopify para aceptar el permiso nuevo.</li>
          <li>El contenido se crea como una pagina de Online Store, no como theme edit.</li>
        </ul>
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Publicar en Shopify</h3>
        <p>Esto crea una pagina real en la tienda conectada. Revisa el preview antes de publicar.</p>
        <button class="primary-button" type="button" data-publish-shopify-page ${canPublish || publication ? "" : "disabled"}>
          <i data-lucide="${publication ? "check-circle" : "upload-cloud"}"></i>
          ${publication ? "Publicado" : "Publicar pagina en Shopify"}
        </button>
        <p class="publish-status" id="shopifyPagePublishStatus">${publication ? `Publicada: ${escapeHtml(publication.url || publication.handle || "")}` : canPublish ? "Lista para publicar." : "Conecta Shopify para publicar."}</p>
      </article>
      <article class="report-card full-span notice-card">
        <h3>Antes de publicar</h3>
        <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>SEO y estructura</h3>
        <dl class="calculation-list">
          <div><dt>SEO title</dt><dd>${escapeHtml(page.seoTitle || page.title || "--")}</dd></div>
          <div><dt>Meta description sugerida</dt><dd>${escapeHtml(page.seoDescription || "--")}</dd></div>
          <div><dt>CTA</dt><dd>${escapeHtml(preview.cta || "--")}</dd></div>
        </dl>
      </article>
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Siguientes pasos</h3>
        <ol>${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderShopifyPagePreview(preview) {
  const benefits = Array.isArray(preview.benefits) ? preview.benefits : [];
  const objections = Array.isArray(preview.objections) ? preview.objections : [];
  return `<div class="shopify-page-preview">
    <div class="preview-hero">
      <span>${escapeHtml(preview.brandName || "Marca")}</span>
      <h4>${escapeHtml(preview.headline || "Nueva pagina")}</h4>
      <p>${escapeHtml(preview.subheadline || "")}</p>
      <button type="button">${escapeHtml(preview.cta || "Ver productos")}</button>
    </div>
    <div class="preview-benefits">
      ${benefits
        .map(
          (item) => `<article>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.copy)}</p>
          </article>`,
        )
        .join("")}
    </div>
    <ul class="preview-objections">
      ${objections.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  </div>`;
}

async function publishShopifyPage(button) {
  const report = state.latest;
  if (!report || report.type !== "shopify_page_draft") return;
  if (report.publication) {
    showToast("Esta pagina ya fue publicada");
    return;
  }

  const status = document.querySelector("#shopifyPagePublishStatus");
  const page = report.page || {};
  const shop = report.shopify?.shop || "";
  if (!shop) {
    showToast("Conecta Shopify antes de publicar");
    return;
  }

  button.disabled = true;
  button.innerHTML = '<i data-lucide="loader-circle"></i> Publicando...';
  if (status) status.textContent = "Publicando en Shopify...";
  lucide.createIcons();

  try {
    const response = await fetch("./api/shopify/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        shop,
        title: page.title,
        handle: page.handle,
        bodyHtml: page.bodyHtml,
        published: page.published !== false,
      }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.message || "No se pudo publicar en Shopify.");
    }

    report.publication = body.page;
    state.latest = report;
    saveState(report);
    renderShopifyPageDraftReport(report);
    activateTab("negotiation");
    showToast("Pagina publicada en Shopify");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo publicar en Shopify.";
    if (status) status.textContent = message;
    button.disabled = false;
    button.innerHTML = '<i data-lucide="upload-cloud"></i> Publicar pagina en Shopify';
    lucide.createIcons();
    showToast(message);
  }
}

function renderReport(report) {
  if (report.businessStage === "brand") {
    renderBrandReport(report);
    return;
  }

  const isShopify = report.businessStage === "shopify";
  setTabLabels(isShopify ? tabLabelSets.shopify : tabLabelSets.sourcing);
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
  const goals = (report.goals || []).map((key) => goalConfig[key]?.label || key).join(", ");
  const shopifyOverview = isShopify ? renderShopifyOverview(report) : "";
  const shopifyProductCount = report.shopify?.snapshot?.products?.length || 0;
  const backendNotice = report.backendError
    ? `<article class="report-card full-span notice-card">
        <h3>Backend privado</h3>
        <p>${escapeHtml(report.backendError)}</p>
      </article>`
    : "";

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${isShopify ? shopifyProductCount : supplierShortlist.length}</strong><p>${isShopify ? "productos Shopify" : ai ? "proveedores" : "candidatos meta"}</p></article>
      <article class="metric-card"><strong>${isShopify ? (report.shopify?.shop || "--") : report.targetUnitCost ? formatMoney(report.targetUnitCost) : "--"}</strong><p>${isShopify ? "tienda" : "costo objetivo"}</p></article>
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
      ${shopifyOverview}
      ${backendNotice}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      ${isShopify ? renderShopifyOverview(report) : ""}
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
        </ul>
      </article>
      <article class="report-card">
        <h3>Sin formularios extra</h3>
        <p>Si falta un dato, el agente usa una suposicion conservadora o lo marca como pendiente. El usuario no tiene que aprender Alibaba para arrancar.</p>
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = isShopify
    ? renderShopifyCatalog(report)
    : `
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
  document.querySelector("#negotiation").innerHTML = isShopify
    ? renderShopifyActions(report)
    : `
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

function renderBrandReport(report) {
  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.brand);

  const brand = normalizeBrandContext(report);
  const audit = buildBrandAudit(report, brand);
  const shopifyOverview = report.shopify?.shop ? renderShopifyOverview(report) : "";
  const backendNotice = report.backendError
    ? `<article class="report-card full-span notice-card">
        <h3>Backend privado</h3>
        <p>${escapeHtml(report.backendError)}</p>
      </article>`
    : "";

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${escapeHtml(brand.name)}</strong><p>marca</p></article>
      <article class="metric-card"><strong>${escapeHtml(brand.stage)}</strong><p>estado</p></article>
      <article class="metric-card"><strong>${escapeHtml(toolLabel(report.selectedInternalTool))}</strong><p>herramienta interna</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Decision</h3>
        <p>${escapeHtml(audit.decision)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="store"></i>${escapeHtml(brand.name)}</span>
          <span class="pill"><i data-lucide="globe"></i>${escapeHtml(brand.url || "sitio pendiente")}</span>
          <span class="pill"><i data-lucide="megaphone"></i>${escapeHtml(brand.channels || "canales pendientes")}</span>
          <span class="pill"><i data-lucide="target"></i>${escapeHtml(brand.goal)}</span>
        </div>
      </article>
      <article class="report-card">
        <h3>Contexto recibido</h3>
        <ul>${audit.context.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Riesgos principales</h3>
        <ul>${audit.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Trabajo del agente</h3>
        ${renderAgentWorkLog(report.agentTasks)}
      </article>
      ${shopifyOverview}
      ${backendNotice}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Mapa de marca</h3>
        ${renderCompactSections([
          ["Posicionamiento", audit.positioning],
          ["Cliente", audit.customer],
          ["Datos que faltan", audit.missingData],
        ])}
      </article>
      <article class="report-card full-span">
        <h3>Fuentes de contexto</h3>
        <div class="pill-row">
          <span class="pill"><i data-lucide="message-square-text"></i>${escapeHtml(report.naturalRequest)}</span>
          <span class="pill"><i data-lucide="globe"></i>${escapeHtml(brand.url || "sin URL")}</span>
          <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(report.shopify?.shop || "Shopify opcional")}</span>
        </div>
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Oferta y catalogo</h3>
        ${renderCompactSections([
          ["Que revisar primero", audit.offer],
          ["Catalogo", audit.catalog],
          ["Pruebas de producto", audit.productTests],
        ])}
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Plan de crecimiento</h3>
        <ol>${audit.growth.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Mensajes a probar</h3>
        <ul>${audit.messaging.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Conversion</h3>
        ${renderCompactSections([
          ["Landing / PDP", audit.conversion],
          ["AOV y recompra", audit.retention],
          ["Medicion", audit.measurement],
        ])}
      </article>
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Siguientes experimentos</h3>
        <ol>${audit.nextExperiments.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Prompt profundo</h3>
        <p>${escapeHtml(buildPrompt(report))}</p>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderBrandWhitespaceReport(report) {
  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.brandWhitespace);

  const brand = report.brand || {};
  const brief = report.executiveBrief || {};
  const candidates = Array.isArray(report.candidates) ? report.candidates : [];
  const evidence = report.evidence || {};
  const coverage = Array.isArray(report.sourceCoverage) ? report.sourceCoverage : [];
  const risks = Array.isArray(report.risks) ? report.risks : [];
  const validationPlan = Array.isArray(report.validationPlan) ? report.validationPlan : [];
  const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps : [];
  const primary = candidates[0] || {};

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${escapeHtml(brand.name || "Marca")}</strong><p>marca</p></article>
      <article class="metric-card"><strong>${escapeHtml(brief.confidence || primary.confidence || "baja")}</strong><p>confianza</p></article>
      <article class="metric-card"><strong>${candidates.length}</strong><p>hipotesis</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Decision</h3>
        <p>${escapeHtml(brief.decision || "No hay suficiente contexto para elegir un espacio libre confiable.")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="store"></i>${escapeHtml(brand.name || "marca")}</span>
          <span class="pill"><i data-lucide="target"></i>${escapeHtml(brief.primaryWhitespace || primary.title || "whitespace pendiente")}</span>
          <span class="pill"><i data-lucide="shield-check"></i>${escapeHtml(brand.stage || "contexto declarado")}</span>
        </div>
      </article>
      <article class="report-card full-span notice-card">
        <h3>Guardrail</h3>
        <p>${escapeHtml(brief.guardrail || "Tratamos el whitespace como hipotesis hasta validarlo con datos de mercado y conversion.")}</p>
      </article>
      <article class="report-card full-span">
        <h3>Cobertura de fuentes</h3>
        <ul>${coverage.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      ${candidates.map(renderWhitespaceCandidate).join("") || emptyReportCard("Sin hipotesis", "Agrega competidores, catalogo o contexto de clientes para generar espacios posibles.")}
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Senales fuertes</h3>
        <ul>${(evidence.strongerSignals || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Senales debiles</h3>
        <ul>${(evidence.weakSignals || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Datos faltantes</h3>
        <ul>${(evidence.missingData || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Plan de validacion</h3>
        <ol>${validationPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Primer test recomendado</h3>
        <dl class="calculation-list">
          <div><dt>Oferta</dt><dd>${escapeHtml(primary.firstOffer || "oferta de entrada pendiente")}</dd></div>
          <div><dt>Canal</dt><dd>${escapeHtml(primary.channel || "canal principal pendiente")}</dd></div>
          <div><dt>Metrica</dt><dd>conversion, add-to-cart, CAC o respuesta cualitativa</dd></div>
        </dl>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span notice-card">
        <h3>Riesgos</h3>
        <ul>${risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Claims y ruido</h3>
        <p>No convertir claims de competidores, comentarios sueltos o preferencias internas en prueba. El espacio libre se confirma con evidencia externa y una metrica de negocio.</p>
      </article>
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Siguientes pasos</h3>
        <ol>${nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Prompt profundo</h3>
        <p>${escapeHtml(`Actua como Agent Genia. Toma la marca ${brand.name || "marca"} y valida el whitespace "${brief.primaryWhitespace || primary.title || ""}" contra competidores, reviews, ads y comentarios reales. Separa evidencia fuerte, hipotesis y ruido.`)}</p>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderWhitespaceCandidate(candidate) {
  return `<article class="report-card full-span">
    <h3>${escapeHtml(candidate.title || "Whitespace")}</h3>
    <p>${escapeHtml(candidate.positioningAngle || "")}</p>
    <dl class="calculation-list">
      <div><dt>Cliente</dt><dd>${escapeHtml(candidate.targetCustomer || "--")}</dd></div>
      <div><dt>Problema no atendido</dt><dd>${escapeHtml(candidate.underservedProblem || "--")}</dd></div>
      <div><dt>Confianza</dt><dd>${escapeHtml(candidate.confidence || "baja")}</dd></div>
      <div><dt>Canal</dt><dd>${escapeHtml(candidate.channel || "--")}</dd></div>
    </dl>
    <div class="compact-section">
      <h4>Por que podria estar abierto</h4>
      <ul>${(candidate.whyItMayBeOpen || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
    <div class="compact-section">
      <h4>Senales usadas</h4>
      <ul>${(candidate.supportingSignals || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  </article>`;
}

function emptyReportCard(title, copy) {
  return `<article class="report-card full-span"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`;
}

function normalizeBrandContext(report) {
  const brand = report.brand || {};
  const inferredName =
    brand.name ||
    inferBrandNameFromUrl(brand.url) ||
    report.product?.split(/\s+/).slice(0, 4).join(" ") ||
    "Marca";
  return {
    name: inferredName,
    url: brand.url || "",
    channels: brand.channels || "canales no definidos",
    goal: brand.goal || report.shopify?.focus || "crecer con mejor contexto",
    stage: report.shopify?.shop ? "con tienda conectada" : brand.url ? "marca con presencia digital" : "contexto inicial",
  };
}

function inferBrandNameFromUrl(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "";
  } catch {
    return "";
  }
}

function buildBrandAudit(report, brand) {
  const products = report.shopify?.snapshot?.products || [];
  const hasCatalog = products.length > 0;
  const goal = brand.goal.toLowerCase();
  const conversionFocus = /conversion|conversi[oó]n|roas|cac|ads|anuncios/.test(goal);
  const retentionFocus = /retencion|retenci[oó]n|email|recompra|ltv|clientes/.test(goal);

  return {
    decision: hasCatalog
      ? `Analizar ${brand.name} como una marca en operacion: cruzar posicionamiento, catalogo, pricing e inventario antes de sugerir crecimiento.`
      : `Analizar ${brand.name} como marca existente: primero ordenar contexto, promesa, oferta, canales y datos faltantes antes de recomendar anuncios o inventario.`,
    context: [
      `Objetivo principal: ${brand.goal}.`,
      `Canales declarados: ${brand.channels}.`,
      brand.url ? `Sitio o referencia: ${brand.url}.` : "Falta sitio, tienda o perfil social para leer señales externas.",
      report.shopify?.shop ? `Shopify conectado: ${report.shopify.shop}.` : "Shopify no conectado; la auditoria usa contexto declarado.",
    ],
    risks: [
      "Optimizar anuncios sin tener clara la oferta y el margen real.",
      "Confundir trafico con problema de producto, precio o confianza.",
      "Tomar decisiones sin separar datos reales de supuestos.",
    ],
    positioning: [
      "Definir una frase: para quien es, que problema resuelve y por que comprar aqui.",
      "Identificar el angulo ganador: precio, calidad, resultado, rapidez, identidad o conveniencia.",
      "Comparar la promesa principal contra competidores directos antes de meter mas presupuesto.",
    ],
    customer: [
      "Separar comprador actual, comprador ideal y comprador que solo pregunta pero no compra.",
      "Mapear objeciones: precio, confianza, envio, calidad, talla, garantia o resultados.",
      "Usar mensajes distintos para frio, retargeting y clientes existentes.",
    ],
    missingData: [
      "AOV, margen bruto, CAC, tasa de conversion y recompra.",
      "Productos mas vendidos, productos con inventario y productos que atraen trafico pero no convierten.",
      "Canales con gasto, ventas atribuidas y principales objeciones de clientes.",
    ],
    offer: [
      "Auditar si la oferta tiene resultado claro, prueba, garantia y urgencia real.",
      "Crear un producto/bundle gancho si el catalogo se siente disperso.",
      "Alinear precio con margen, envio, devoluciones y costo de adquirir cliente.",
    ],
    catalog: hasCatalog
      ? [
          `${products.length} productos leidos desde Shopify.`,
          "Ordenar productos por inventario, precio y estado antes de decidir campañas.",
          "Detectar productos sin categoria, sin tipo o con poca claridad de uso.",
        ]
      : [
          "Conectar Shopify para leer catalogo real, inventario y precios.",
          "Si no usa Shopify, pegar productos top y precios en el prompt.",
          "Priorizar 3-5 SKUs antes de intentar optimizar toda la marca.",
        ],
    productTests: [
      "Testear 3 hooks: problema, resultado y comparacion contra alternativa.",
      "Probar una oferta de entrada y un bundle de mayor AOV.",
      "Revisar si las fotos explican uso, escala, calidad y transformacion.",
    ],
    growth: [
      conversionFocus ? "Auditar landing/PDP antes de subir presupuesto de ads." : "Elegir un canal principal y una metrica de decision por 14 dias.",
      "Crear tablero simple: visitas, conversion, AOV, margen, CAC, recompra y devoluciones.",
      "Probar mensajes por avatar antes de producir mas creativos.",
      "Usar clientes actuales para extraer objeciones, reviews y lenguaje real.",
    ],
    messaging: [
      "Hook de dolor: lo que el cliente intenta resolver hoy.",
      "Hook de resultado: como se ve la vida despues de comprar.",
      "Hook de prueba: evidencia, reviews, antes/despues o comparacion.",
    ],
    conversion: [
      "Above the fold debe decir que vendes, para quien y por que importa.",
      "PDP necesita fotos claras, beneficios, prueba social, envio/devoluciones y CTA visible.",
      "Eliminar friccion: costos ocultos, tiempos ambiguos, dudas de talla/calidad o checkout largo.",
    ],
    retention: retentionFocus
      ? [
          "Diseñar flows de email/SMS: bienvenida, abandono, post-compra, recompra y winback.",
          "Crear motivo de recompra: refill, accesorios, bundle, suscripcion o temporada.",
          "Segmentar clientes por producto comprado y margen.",
        ]
      : [
          "Medir si el producto permite recompra o si necesita upsell/cross-sell.",
          "Crear post-compra que pida review, resuelva dudas y ofrezca siguiente compra.",
          "No depender solo de adquisicion si el CAC sube.",
        ],
    measurement: [
      "Separar ventas nuevas vs clientes existentes.",
      "Medir margen despues de envio, descuentos, fees y devoluciones.",
      "Documentar cada experimento con hipotesis, metrica y decision.",
    ],
    nextExperiments: [
      "Pegar URL de marca y 3 productos top para una auditoria mas precisa.",
      "Conectar Shopify cuando el install flow este listo para leer catalogo real.",
      "Ejecutar filtro de rentabilidad con AOV, costo, envio, margen y CAC objetivo.",
      "Crear 5 hooks por avatar y escoger 2 para probar en ads o TikTok organico.",
    ],
  };
}

function renderShopifyOverview(report) {
  const snapshot = report.shopify?.snapshot || null;
  const plan = report.ai?.shopifyPlan || null;
  const shop = snapshot?.shop || null;
  const products = snapshot?.products || [];
  const focus = report.shopify?.focus || "conversion, catalogo y producto ganador";
  const error = report.shopify?.error || "";

  if (!report.shopify?.shop) {
    return `<article class="report-card full-span notice-card">
      <h3>Shopify sin conectar</h3>
      <p>Selecciona el modo Tienda Shopify, conecta una tienda .myshopify.com y vuelve a ejecutar el agente para auditar catalogo real.</p>
    </article>`;
  }

  if (error) {
    return `<article class="report-card full-span notice-card">
      <h3>No se pudo leer Shopify</h3>
      <p>${escapeHtml(error)}</p>
    </article>`;
  }

  return `<article class="report-card full-span">
    <h3>${escapeHtml(shop?.name || report.shopify.shop)}</h3>
    <p>${escapeHtml(plan?.storeSummary || `Tienda conectada por OAuth. El agente puede leer catalogo y enfocar la auditoria en ${focus}.`)}</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(report.shopify.shop)}</span>
      <span class="pill"><i data-lucide="package-search"></i>${products.length} productos</span>
      <span class="pill"><i data-lucide="coins"></i>${escapeHtml(shop?.currencyCode || "moneda pendiente")}</span>
      <span class="pill"><i data-lucide="target"></i>${escapeHtml(focus)}</span>
    </div>
  </article>`;
}

function renderShopifyCatalog(report) {
  const snapshot = report.shopify?.snapshot || null;
  const products = snapshot?.products || [];
  if (!report.shopify?.shop) {
    return `<div class="report-grid">${renderShopifyOverview(report)}</div>`;
  }
  if (report.shopify?.error) {
    return `<div class="report-grid">${renderShopifyOverview(report)}</div>`;
  }
  if (!products.length) {
    return `<div class="report-grid">
      ${renderShopifyOverview(report)}
      <article class="report-card full-span notice-card">
        <h3>Catalogo vacio</h3>
        <p>No encontre productos en la tienda. El siguiente paso es definir oferta, precio, fotos y primer producto para test.</p>
      </article>
    </div>`;
  }

  return `<div class="report-grid">
    ${renderShopifyOverview(report)}
    <article class="report-card full-span">
      <h3>Catalogo Shopify</h3>
      <div class="table-wrap"><table class="comparison-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Inventario</th>
            <th>Precio</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (product) => `<tr>
                <td>${escapeHtml(product.title || "Producto")}</td>
                <td>${escapeHtml(product.productType || product.vendor || "--")}</td>
                <td>${escapeHtml(product.status || "--")}</td>
                <td>${escapeHtml(product.totalInventory ?? "--")}</td>
                <td>${escapeHtml(product.priceRange || "--")}</td>
                <td>${escapeHtml(formatDate(product.updatedAt))}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table></div>
    </article>
  </div>`;
}

function renderShopifyActions(report) {
  const snapshot = report.shopify?.snapshot || null;
  const products = snapshot?.products || [];
  const plan = report.ai?.shopifyPlan || null;
  const actions = Array.isArray(plan?.priorityActions) && plan.priorityActions.length
    ? plan.priorityActions
    : buildShopifyActions(products, report);
  const opportunities = Array.isArray(plan?.catalogOpportunities) && plan.catalogOpportunities.length
    ? plan.catalogOpportunities
    : buildShopifyCatalogOpportunities(products);

  return `<div class="report-grid">
    ${renderShopifyOverview(report)}
    <article class="report-card">
      <h3>Acciones prioritarias</h3>
      <ol>${actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
    </article>
    <article class="report-card">
      <h3>Oportunidades de catalogo</h3>
      <ul>${opportunities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  </div>`;
}

function buildShopifyActions(products, report) {
  if (!report.shopify?.shop) {
    return ["Conectar una tienda Shopify para leer catalogo real.", "Definir foco: conversion, catalogo, pricing o producto ganador."];
  }
  if (report.shopify?.error) {
    return ["Reinstalar la app OAuth si el permiso expiro.", "Confirmar que la tienda tenga permiso read_products."];
  }
  if (!products.length) {
    return ["Crear el primer producto con fotos, precio y propuesta clara.", "Validar una landing simple antes de comprar inventario grande."];
  }
  return [
    "Separar productos activos de borradores y priorizar los que tienen inventario.",
    "Detectar productos sin tipo/vendor para ordenar el catalogo y mejorar filtros.",
    "Comparar precios por rango para identificar bundles, upsells o productos gancho.",
    "Usar reviews, ads y TikTok para validar el producto con mayor potencial antes de meter mas presupuesto.",
  ];
}

function buildShopifyCatalogOpportunities(products) {
  if (!products.length) return ["Sin catalogo conectado todavia."];
  const draftCount = products.filter((product) => product.status && product.status !== "ACTIVE").length;
  const noTypeCount = products.filter((product) => !product.productType).length;
  const lowInventoryCount = products.filter((product) => Number(product.totalInventory) <= 3).length;
  return [
    `${products.length} productos leidos desde Shopify.`,
    draftCount ? `${draftCount} productos no activos requieren decision: publicar, mejorar o eliminar.` : "No se detectaron borradores en la muestra leida.",
    noTypeCount ? `${noTypeCount} productos no tienen tipo; conviene categorizar para analizar oferta.` : "Los productos leidos ya tienen tipo/categoria.",
    lowInventoryCount ? `${lowInventoryCount} productos tienen inventario bajo o cero.` : "No se detecto inventario critico en la muestra leida.",
  ];
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

function setTabLabels(labels) {
  tabs.forEach((tab, index) => {
    tab.textContent = labels[index] || tab.textContent;
  });
}

async function loadHistory() {
  if (!state.session?.access_token || !historyList) return;
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
  if (!historyList) return;
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
  if (!historyDrawer) return;
  if (historyDrawer.hidden) {
    await loadHistory();
    historyDrawer.hidden = false;
  } else {
    closeHistory();
  }
}

function closeHistory() {
  if (historyDrawer) historyDrawer.hidden = true;
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
    if (renderTypedBackendReport(run.result_json || null)) {
      closeHistory();
      return;
    }

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
    resultPanel.hidden = false;
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
  if (uploadButton) uploadButton.disabled = isLoading;
  button.title = isLoading ? "Trabajando" : "Ejecutar agente";
  button.innerHTML = isLoading
    ? '<i data-lucide="loader-circle"></i>'
    : '<i data-lucide="arrow-up"></i>';
  lucide.createIcons();
}

function buildPrompt(report) {
  const attachments = attachmentSummary(report.attachments);
  if (report.businessStage === "brand") {
    const brand = normalizeBrandContext(report);
    return `Actua como Agent Genia. El usuario tiene una marca existente: ${brand.name}. Solicitud: "${report.naturalRequest}". Adjuntos: ${attachments}. Analiza posicionamiento, oferta, catalogo, conversion, canales, retencion, metricas faltantes y siguientes experimentos. Si Shopify esta conectado, usa catalogo/precios/inventario como contexto real.`;
  }
  return `Actua como Agent Genia. El usuario escribio: "${report.naturalRequest}". Adjuntos: ${attachments}. Decide que herramienta interna usar. Si hay intencion de Alibaba/proveedores/MOQ/DDP/negociacion, usa $alibaba-sourcing-agent sin sacar al usuario de la main page. Entrega bitacora de tool calls, shortlist, score, cola de mensajes de negociacion, plan DDP, checklist de calidad y siguientes pasos.`;
}

function buildMarkdown(report) {
  if (!report) return "";
  if (report.type === "profitability") {
    return buildProfitabilityMarkdown(report);
  }
  if (report.type === "shipping_quote") {
    return buildShippingQuoteMarkdown(report);
  }
  if (report.type === "shopify_page_draft") {
    return buildShopifyPageMarkdown(report);
  }
  if (report.type === "brand_whitespace") {
    return buildBrandWhitespaceMarkdown(report);
  }
  if (report.businessStage === "brand") {
    return buildBrandMarkdown(report);
  }
  if (report.ai) {
    return buildAiMarkdown(report);
  }
  const shopifySection = report.businessStage === "shopify" ? buildShopifyMarkdown(report) : "";
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
${shopifySection}

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

function buildBrandMarkdown(report) {
  const brand = normalizeBrandContext(report);
  const audit = buildBrandAudit(report, brand);
  const shopifySection = report.shopify?.shop ? buildShopifyMarkdown(report) : "";

  return `# Auditoria de marca

Fecha: ${report.createdAt}
Marca: ${brand.name}
Sitio: ${brand.url || "no definido"}
Canales: ${brand.channels}
Objetivo: ${brand.goal}
Solicitud: ${report.naturalRequest}
Herramienta interna: ${toolLabel(report.selectedInternalTool)}
${shopifySection}

## Decision

${audit.decision}

## Riesgos

${audit.risks.map((item) => `- ${item}`).join("\n")}

## Oferta

${audit.offer.map((item) => `- ${item}`).join("\n")}

## Crecimiento

${audit.growth.map((item) => `- ${item}`).join("\n")}

## Conversion

${audit.conversion.map((item) => `- ${item}`).join("\n")}

## Siguientes experimentos

${audit.nextExperiments.map((item) => `- ${item}`).join("\n")}
`;
}

function buildBrandWhitespaceMarkdown(report) {
  const brand = report.brand || {};
  const brief = report.executiveBrief || {};
  const candidates = Array.isArray(report.candidates) ? report.candidates : [];
  const evidence = report.evidence || {};

  return `# Whitespace de marca

Fecha: ${report.createdAt || ""}
Marca: ${brand.name || "Marca"}
Sitio: ${brand.url || "no definido"}
Canales: ${brand.channels || "no definidos"}
Objetivo: ${brand.goal || "no definido"}
Solicitud: ${report.naturalRequest || ""}
Herramienta interna: ${toolLabel(report.toolUsed || report.selectedInternalTool)}

## Decision

${brief.decision || ""}

Confianza: ${brief.confidence || ""}
Guardrail: ${brief.guardrail || ""}

## Hipotesis de whitespace

${candidates
  .map(
    (candidate, index) => `### ${index + 1}. ${candidate.title}

- Cliente: ${candidate.targetCustomer || ""}
- Problema no atendido: ${candidate.underservedProblem || ""}
- Angulo: ${candidate.positioningAngle || ""}
- Oferta inicial: ${candidate.firstOffer || ""}
- Canal: ${candidate.channel || ""}
- Confianza: ${candidate.confidence || ""}
- Test: ${candidate.validationTest || ""}
`,
  )
  .join("\n")}

## Evidencia y limites

Senales fuertes:
${(evidence.strongerSignals || []).map((item) => `- ${item}`).join("\n")}

Senales debiles:
${(evidence.weakSignals || []).map((item) => `- ${item}`).join("\n")}

Datos faltantes:
${(evidence.missingData || []).map((item) => `- ${item}`).join("\n")}

## Riesgos

${(report.risks || []).map((item) => `- ${item}`).join("\n")}

## Plan de validacion

${(report.validationPlan || []).map((item) => `- ${item}`).join("\n")}
`;
}

function buildShopifyMarkdown(report) {
  const snapshot = report.shopify?.snapshot || null;
  const products = snapshot?.products || [];
  const productsText = products.length
    ? products
        .slice(0, 20)
        .map((product) => `- ${product.title}: ${product.status || "sin status"} | inventario ${product.totalInventory ?? "--"} | ${product.priceRange || "precio pendiente"}`)
        .join("\n")
    : "- Sin productos leidos.";

  return `
Tienda Shopify: ${report.shopify?.shop || "no conectada"}
Foco Shopify: ${report.shopify?.focus || "no definido"}
Productos leidos: ${products.length}

## Shopify

${productsText}
`;
}

function buildShippingQuoteMarkdown(report) {
  const quote = report.shippingQuote || {};
  const profile = quote.profile || {};
  const rates = Array.isArray(quote.rates) && quote.rates.length
    ? quote.rates.map((rate) => `- ${rate.carrier} ${rate.service}: ${formatMoney(rate.amount, rate.currency || quote.currency || "USD")}`).join("\n")
    : "- Sin tarifas vivas; se uso estimacion.";
  const warnings = Array.isArray(report.warnings) && report.warnings.length
    ? report.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- Sin alertas adicionales.";
  const nextSteps = Array.isArray(report.nextSteps) && report.nextSteps.length
    ? report.nextSteps.map((step) => `- ${step}`).join("\n")
    : "- Usa esta tarifa como costo base y confirma cobertura antes de prometer tiempos.";

  return `# Cotizacion de envio

Fecha: ${report.createdAt || ""}
Modo: ${quote.mode || "estimado"}
Proveedor: ${report.provider || ""}
Solo cotizacion: ${report.rateOnly ? "si" : "no"}

## Ruta
- Origen: ${profile.originZip || "pendiente"} ${profile.originCity || ""}
- Destino: ${profile.destinationZip || "pendiente"} ${profile.destinationCity || ""}

## Paquete
- Peso: ${formatNumber(report.package?.weightKg || 0)} kg
- Medidas: ${formatNumber(report.package?.lengthCm || 0)} x ${formatNumber(report.package?.widthCm || 0)} x ${formatNumber(report.package?.heightCm || 0)} cm
- Valor declarado: ${formatMoney(profile.declaredValue || 0, quote.currency || "USD")}

## Resultado
- Costo usado: ${formatMoney(quote.amount, quote.currency || "USD")}
- Carrier: ${quote.carrier || "No disponible"}
- Servicio: ${quote.service || "No disponible"}

## Tarifas
${rates}

## Alertas
${warnings}

## Siguiente
${nextSteps}
`;
}

function buildShopifyPageMarkdown(report) {
  const page = report.page || {};
  const preview = page.preview || {};
  const publication = report.publication || null;
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps : [];

  return `# Shopify Page Builder

Fecha: ${report.createdAt || ""}
Tienda: ${report.shopify?.shop || "no conectada"}
Titulo: ${page.title || ""}
Handle: ${page.handle || ""}
Publicada: ${publication ? publication.url || publication.handle || "si" : "no"}

## Preview

Headline: ${preview.headline || ""}
Subheadline: ${preview.subheadline || ""}
CTA: ${preview.cta || ""}

## Beneficios

${(preview.benefits || []).map((item) => `- ${item.title}: ${item.copy}`).join("\n")}

## Advertencias

${warnings.map((item) => `- ${item}`).join("\n")}

## Siguientes pasos

${nextSteps.map((item) => `- ${item}`).join("\n")}

## HTML Shopify

\`\`\`html
${page.bodyHtml || ""}
\`\`\`
`;
}

function buildProfitabilityMarkdown(report) {
  const data = report.profitability || {};
  const currency = data.currency || "USD";
  const assumptions = Array.isArray(data.assumptions) ? data.assumptions : [];
  const risks = Array.isArray(report.risks) ? report.risks : [];
  const steps = Array.isArray(report.steps) ? report.steps : [];

  return `# Analisis de rentabilidad

Idea: ${data.ideaName || report.problem || report.reference || "Idea ecommerce"}
Veredicto: ${report.verdict?.label || "Revisar"}
Calificacion: ${Number.isFinite(report.score) ? report.score : 0}/100

## Preguntas
- Venta promedio por pedido: ${formatMoney(data.aov, currency)}
- Costo del producto: ${formatMoney(data.cogs, currency)}
- Costo de envio: ${formatMoney(data.shipping, currency)}
- Fuente del envio: ${shippingQuoteSummary(data.shippingQuote)}
- Cobros de plataforma/tarjeta: ${formatMoney(data.fees, currency)}
- Devoluciones estimadas: ${formatPercent((data.returnRate || 0) / 100)}
- Recompra posible: ${repurchaseLabels[data.repurchaseMultiplier] || "Pendiente"}
- Diferencia: ${differentiationLabels[data.differentiation] || "Pendiente"}
- Donde conseguir clientes: ${channelLabels[data.channel] || "Pendiente"}

## Resultado
- Dinero que queda antes de anuncios: ${formatPercent(data.margin)}
- Maximo para conseguir un cliente: ${formatMoney(data.cacMax, currency)}
- Meta sana para conseguir un cliente: ${formatMoney(data.cacTarget, currency)}
- Ventas necesarias por cada $1 en anuncios: ${formatRoas(data.breakEvenRoas)}
- Meta sana de ventas por cada $1 en anuncios: ${formatRoas(data.targetRoas)}
- Valor si compra otra vez: ${formatMoney(data.ltvContribution, currency)}

## Supuestos
${assumptions.map((item) => `- ${item}`).join("\n")}

## Alertas
${risks.map((item) => `- ${stripHtml(item)}`).join("\n")}

## Siguiente
${steps.map((item) => `- ${stripHtml(item)}`).join("\n")}
`;
}

function shippingQuoteSummary(shippingQuote) {
  if (!shippingQuote) return "No disponible";
  if (shippingQuote.mode === "live_envia_mx") {
    return `Cotizado con Envia.com (${shippingQuote.carrier || ""} ${shippingQuote.service || ""})`.trim();
  }
  if (shippingQuote.mode === "live_easypost") {
    return `Cotizado en vivo (${shippingQuote.carrier || ""} ${shippingQuote.service || ""})`.trim();
  }
  if (shippingQuote.mode === "user_provided") return "Numero escrito por el usuario";
  return "Estimacion por falta de datos o API key";
}

function buildAiMarkdown(report) {
  const ai = report.ai;
  const shopifySection = ai.shopifyPlan
    ? `
## Shopify

${ai.shopifyPlan.storeSummary || ""}

${(ai.shopifyPlan.priorityActions || []).map((item) => `- ${item}`).join("\n")}
`
    : report.businessStage === "shopify"
      ? buildShopifyMarkdown(report)
      : "";
  return `# Agent Genia Brief

Fecha: ${report.createdAt}
Solicitud: ${report.naturalRequest}
Producto: ${report.product}
Mercado: ${report.market}
Destino DDP: ${report.destination}
Modo: Codex harness
Adjuntos: ${attachmentSummary(report.attachments)}
${shopifySection}

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
  localStorage.setItem(
    "alibabaSourcingLatest",
    JSON.stringify({
      ...report,
      attachments: (report.attachments || []).map(({ dataUrl, content, ...attachment }) => ({
        ...attachment,
        contentMode: attachment.contentMode || "metadata-only",
      })),
    }),
  );
}

function attachmentKind(file) {
  const type = file.type || "";
  const name = file.name || "";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/\.(docx?|xlsx?|csv|json)$/i.test(name)) return "document";
  if (isTextAttachment(file)) return "text";
  return "file";
}

function attachmentLabel(attachment) {
  if (attachment.kind === "image") return "imagen";
  if (attachment.kind === "pdf") return "PDF";
  if (attachment.contentMode === "text" || attachment.kind === "text") return "texto";
  if (attachment.kind === "document") return "documento";
  return "archivo";
}

function attachmentSummary(attachments = []) {
  if (!attachments.length) return "ninguno";
  return attachments
    .map((item) => `${item.name} (${item.sizeLabel || formatBytes(item.size)}, ${attachmentLabel(item)})`)
    .join("; ");
}

function iconForAttachment(attachment) {
  if (attachment.kind === "image") return "image";
  if (attachment.kind === "pdf") return "file-text";
  if (attachment.contentMode === "text" || attachment.kind === "text") return "file-type";
  if (attachment.kind === "document") return "file-spreadsheet";
  return "paperclip";
}

function isTextAttachment(file) {
  return (
    (file.type && file.type.startsWith("text/")) ||
    ["application/json", "text/csv"].includes(file.type) ||
    /\.(txt|csv|json|md)$/i.test(file.name || "")
  );
}

function fallbackMimeType(name = "") {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.json$/i.test(name)) return "application/json";
  if (/\.csv$/i.test(name)) return "text/csv";
  if (/\.txt$/i.test(name)) return "text/plain";
  return "application/octet-stream";
}

function readFileAsDataUrl(file) {
  return readFile(file, "readAsDataURL");
}

function readFileAsText(file) {
  return readFile(file, "readAsText");
}

function readFile(file, method) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
    reader[method](file);
  });
}

function createAttachmentId() {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${Date.now().toString(36)}-${random[0].toString(36)}${random[1].toString(36)}`;
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatMoney(value, currency = "USD") {
  const number = Number(value);
  const locale = currency === "MXN" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isFinite(number) && Math.abs(number) >= 100 ? 0 : 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function formatPercent(value) {
  const number = Number(value);
  return `${Math.round((Number.isFinite(number) ? number : 0) * 100)}%`;
}

function formatRoas(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Sin margen";
  return `${number.toFixed(number >= 10 ? 0 : 1)}x`;
}

function formatNumber(value) {
  const number = Number(value);
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatRunDate(value) {
  return formatDate(value);
}

function toolLabel(value) {
  if (value === "alibaba-sourcing-agent") return "Alibaba sourcing";
  if (value === "shopify-store-audit") return "Shopify audit";
  if (value === "brand-audit-agent") return "Brand audit";
  if (value === "brand_whitespace_tool") return "Brand whitespace";
  if (value === "shopify_page_builder") return "Shopify page builder";
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

function stripHtml(value) {
  const node = document.createElement("div");
  node.innerHTML = String(value);
  return node.textContent || node.innerText || "";
}

init();
