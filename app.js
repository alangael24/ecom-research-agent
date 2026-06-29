const state = {
  latest: null,
  attachments: [],
  config: null,
  session: null,
  runs: [],
  shopifyStores: [],
  pendingShopifyShop: "",
  pendingCommerceStore: "",
  user: null,
  mvpMode: false,
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
const toolMenuToggle = document.querySelector("#toolMenuToggle");
const toolMenu = document.querySelector("#toolMenu");
const toolOptionButtons = [...document.querySelectorAll("[data-tool-option]")];
const connectPlatformButtons = [...document.querySelectorAll("[data-connect-platform]")];
const uploadToolButton = document.querySelector("[data-tool-action='upload']");
const activeContextChip = document.querySelector("#activeContextChip");
const hero = document.querySelector(".hero");
const authPage = document.querySelector("#authPage");
const authError = document.querySelector("#authError");
const shopifyAuthLogin = document.querySelector("#shopifyAuthLogin");
const userPill = document.querySelector("#userPill");
const pendingRequestKey = "agentGeniaPendingRequest";
const SHOPIFY_PRODUCTION_ORIGIN = "https://agentgenia.com";

const tabLabelSets = {
  sourcing: ["Resumen", "Herramientas", "Proveedores", "Negociacion", "DDP", "Calidad"],
  brand: ["Resumen", "Competencia", "Oferta", "Crecimiento", "Web", "Siguiente"],
  brandWhitespace: ["Resumen", "Espacios", "Evidencia", "Validacion", "Riesgos", "Siguiente"],
  toolFactory: ["Resumen", "Arquitectura", "MVP", "Datos", "Riesgos", "Siguiente"],
  shopify: ["Resumen", "Tienda", "Catalogo", "Acciones", "DDP", "Calidad"],
  profitability: ["Resumen", "Numeros", "Alertas", "Siguiente", "Supuestos", "Notas"],
  shipping: ["Resumen", "Tarifas", "Detalles", "Alertas", "Siguiente", "Notas"],
  shopifyPage: ["Preview", "Contenido", "Shopify", "Publicar", "SEO", "Notas"],
  retail: ["Resumen", "Costos", "Canal", "Contenido", "Web", "Siguiente"],
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
  problem: {
    label: "Descubrir problema",
    icon: "scan-search",
    className: "interpret",
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
  customize: {
    label: "Producto personalizado",
    icon: "package-plus",
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
  retail: {
    label: "Pasar tienda fisica a online",
    icon: "store",
    className: "brand",
  },
  costs: {
    label: "Analizar costos",
    icon: "calculator",
    className: "quality",
  },
  shipping: {
    label: "Validar envio",
    icon: "truck",
    className: "ddp",
  },
  content: {
    label: "Crear contenido",
    icon: "video",
    className: "shopify",
  },
  web: {
    label: "Crear web",
    icon: "layout-template",
    className: "alibaba",
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
  const openShopifyPickerOnBoot = consumeShopifyPickerParam();
  loadShopifyStores();
  form.addEventListener("submit", handleSubmit);
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
  if (openShopifyPickerOnBoot) startShopifyLogin();
}

function setupStageControls() {
  form.querySelectorAll("input[name='businessStage']").forEach((input) => {
    input.addEventListener("change", updateStageUI);
  });
  toolMenuToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleToolMenu();
  });
  activeContextChip?.addEventListener("click", (event) => {
    event.stopPropagation();
    clearContextSelection();
  });
  uploadToolButton?.addEventListener("click", () => {
    closeToolMenu();
    attachmentInput?.click();
  });
  toolOptionButtons.forEach((button) => {
    button.addEventListener("click", () => selectToolOption(button.dataset.toolOption));
  });
  connectPlatformButtons.forEach((button) => {
    button.addEventListener("click", () => startStoreConnection(button.dataset.connectPlatform));
  });
  shopifyAuthLogin?.addEventListener("click", (event) => {
    event.preventDefault();
    selectBusinessStage("shopify");
    startStoreConnection("shopify");
  });
  document.querySelector("#connectShopify")?.addEventListener("click", connectShopifyStore);
  document.querySelector("#refreshShopifyStores")?.addEventListener("click", loadShopifyStores);
  document.querySelector("#disconnectShopify")?.addEventListener("click", disconnectSelectedShopifyStore);
  updateStageUI();
}

function toggleToolMenu(forceOpen) {
  if (!toolMenu || !toolMenuToggle) return;
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : toolMenu.hidden;
  toolMenu.hidden = !shouldOpen;
  toolMenuToggle.setAttribute("aria-expanded", String(shouldOpen));
  if (shouldOpen) lucide.createIcons();
}

function closeToolMenu() {
  if (!toolMenu || !toolMenuToggle) return;
  toolMenu.hidden = true;
  toolMenuToggle.setAttribute("aria-expanded", "false");
}

function selectToolOption(stage) {
  closeToolMenu();
  if (stage === "starter" || selectedBusinessStage() === stage) {
    clearContextSelection();
  } else {
    selectBusinessStage(stage);
  }
  form.naturalRequest.focus();
}

function clearContextSelection() {
  selectBusinessStage("starter");
  state.pendingShopifyShop = "";
  state.pendingCommerceStore = "";
  showToast("Contexto eliminado");
  form.naturalRequest.focus();
}

function selectBusinessStage(stage) {
  const input = form.querySelector(`input[name='businessStage'][value='${stage}']`);
  if (!input) return;
  input.checked = true;
  updateStageUI();
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
  const connectedCommerce = params.get("commerce_connected") || "";
  if (connectedCommerce) {
    const shopifyInput = form.querySelector("input[name='businessStage'][value='shopify']");
    if (shopifyInput) shopifyInput.checked = true;
    state.pendingCommerceStore = connectedCommerce;
    updateStageUI();
    showToast(`Tienda conectada: ${connectedCommerce.replace(":", " ")}`);

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("commerce_connected");
    cleanUrl.searchParams.delete("stage");
    window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    return;
  }
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

function consumeShopifyPickerParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("connect_shopify")) return false;
  url.searchParams.delete("connect_shopify");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  return true;
}

function startShopifyLogin() {
  startStoreConnection("shopify");
}

async function startStoreConnection(platform = "shopify") {
  closeToolMenu();
  selectBusinessStage("shopify");
  if (platform === "tiendanube") {
    window.location.href = shopifyApiUrl("/api/commerce/tiendanube/start");
    return;
  }
  if (platform === "woocommerce") {
    await connectWooCommerceStore();
    return;
  }
  window.location.href = shopifyApiUrl("/api/shopify/login");
}

function selectedBusinessStage() {
  return form.businessStage?.value || "starter";
}

function updateStageUI() {
  const stage = selectedBusinessStage();
  const isShopify = stage === "shopify";
  const isBrand = stage === "brand";
  if (brandFields) brandFields.hidden = true;
  if (shopifyFields) shopifyFields.hidden = true;
  document.body.classList.toggle("shopify-mode", isShopify);
  document.body.classList.toggle("brand-mode", isBrand);
  toolOptionButtons.forEach((button) => {
    const active = button.dataset.toolOption === stage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    if (button.dataset.toolOption === "starter") button.hidden = stage === "starter";
  });
  updateActiveContextChip(stage);
}

function updateActiveContextChip(stage) {
  if (!activeContextChip) return;
  const config = {
    brand: { icon: "store", label: "Analizar marca" },
    shopify: { icon: "shopping-bag", label: "Shopify" },
  }[stage];

  if (!config) {
    activeContextChip.hidden = true;
    activeContextChip.innerHTML = "";
    activeContextChip.removeAttribute("data-active-stage");
    return;
  }

  activeContextChip.hidden = false;
  activeContextChip.title = `Quitar contexto: ${config.label}`;
  activeContextChip.setAttribute("aria-label", `Quitar contexto activo: ${config.label}`);
  activeContextChip.dataset.activeStage = stage;
  activeContextChip.innerHTML = `<i data-lucide="${config.icon}"></i><i class="context-clear-icon" data-lucide="x"></i>`;
  lucide.createIcons();
}

async function loadShopifyStores() {
  if (!shopifyStoreSelect) return;
  try {
    const response = await fetch(shopifyApiUrl("/api/commerce"));
    if (response.status === 404) throw new Error("Commerce backend not deployed");
    const body = await response.json();
    if (!body.ok) throw new Error(body.message || "No se pudieron leer las tiendas conectadas.");
    state.shopifyStores = body.stores || [];
    renderShopifyStoreOptions();
    if (shopifyConnectionStatus) {
      shopifyConnectionStatus.textContent = state.shopifyStores.length
        ? `${state.shopifyStores.length} tienda(s) conectada(s).`
        : "Conecta Shopify, Tiendanube o WooCommerce una vez.";
    }
  } catch (error) {
    state.shopifyStores = [];
    renderShopifyStoreOptions();
    if (shopifyConnectionStatus) {
      shopifyConnectionStatus.textContent = "La conexion de tiendas funciona desde la URL publicada en Cloudflare.";
    }
  }
}

function renderShopifyStoreOptions() {
  if (!shopifyStoreSelect) return;
  const current = state.pendingCommerceStore || (state.pendingShopifyShop ? commerceStoreValue({ platform: "shopify", id: state.pendingShopifyShop }) : shopifyStoreSelect.value);
  shopifyStoreSelect.innerHTML = state.shopifyStores.length
    ? state.shopifyStores
        .map((store) => {
          const value = commerceStoreValue(store);
          const label = store.label || store.domain || store.id;
          return `<option value="${escapeHtml(value)}">${escapeHtml(`${store.platformLabel || platformLabel(store.platform)} - ${label}`)}</option>`;
        })
        .join("")
    : '<option value="">Sin tiendas conectadas</option>';

  if (state.shopifyStores.some((store) => commerceStoreValue(store) === current)) {
    shopifyStoreSelect.value = current;
  } else if (state.shopifyStores[0]?.id) {
    shopifyStoreSelect.value = commerceStoreValue(state.shopifyStores[0]);
  }
  state.pendingShopifyShop = "";
  state.pendingCommerceStore = "";
}

function connectShopifyStore() {
  const shop = normalizeShopifyDomain(shopifyDomainInput?.value);
  if (!isValidShopifyDomain(shop)) {
    startShopifyLogin();
    return;
  }
  window.location.href = shopifyApiUrl(`/api/shopify/login?shop=${encodeURIComponent(shop)}`);
}

async function disconnectSelectedShopifyStore() {
  const selected = selectedCommerceStore();
  if (!selected?.id) {
    showToast("Selecciona una tienda conectada");
    return;
  }

  const response = await fetch(shopifyApiUrl("/api/commerce"), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ platform: selected.platform, id: selected.id }),
  });
  const body = await response.json();
  if (!body.ok) {
    showToast(body.message || "No se pudo desconectar la tienda");
    return;
  }
  showToast(`Tienda desconectada: ${selected.label || selected.id}`);
  await loadShopifyStores();
}

async function requestShopifySnapshot(shop) {
  return requestCommerceSnapshot({ platform: "shopify", id: shop });
}

async function requestCommerceSnapshot(store) {
  const response = await fetch(shopifyApiUrl("/api/commerce"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ platform: store.platform, id: store.id }),
  });
  const body = await response.json();
  if (!body.ok) {
    throw new Error(body.message || "No se pudo leer la tienda.");
  }
  return body.commerce;
}

async function requestInstalledShopifyTools(shop) {
  const response = await fetch(shopifyApiUrl(`/api/shopify/tools?shop=${encodeURIComponent(shop)}`), {
    headers: shopifyToolHeaders({ accept: "application/json" }),
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "No se pudieron leer las herramientas Agent Genia.");
  }
  return Array.isArray(body.tools) ? body.tools : [];
}

async function connectWooCommerceStore() {
  const siteUrl = window.prompt("URL de tu tienda WooCommerce (ej. https://mitienda.com)");
  if (!siteUrl) return;
  const consumerKey = window.prompt("WooCommerce Consumer Key (ck_...)");
  if (!consumerKey) return;
  const consumerSecret = window.prompt("WooCommerce Consumer Secret (cs_...)");
  if (!consumerSecret) return;

  try {
    const response = await fetch(shopifyApiUrl("/api/commerce/woocommerce"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteUrl, consumerKey, consumerSecret }),
    });
    const body = await response.json();
    if (!body.ok) throw new Error(body.message || "No se pudo conectar WooCommerce.");
    state.pendingCommerceStore = commerceStoreValue(body.store);
    await loadShopifyStores();
    showToast(`WooCommerce conectado: ${body.store?.label || body.store?.domain || "tienda"}`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "No se pudo conectar WooCommerce.");
  }
}

function selectedCommerceStore() {
  const value = shopifyStoreSelect?.value || "";
  const [platform, ...idParts] = value.split(":");
  const id = idParts.join(":");
  if (!platform || !id) return null;
  const found = state.shopifyStores.find((store) => commerceStoreValue(store) === value);
  return found || { platform, id, label: id };
}

function commerceStoreValue(store = {}) {
  if (!store.platform || !store.id) return "";
  return `${store.platform}:${store.id}`;
}

function platformLabel(platform) {
  if (platform === "tiendanube") return "Tiendanube";
  if (platform === "woocommerce") return "WooCommerce";
  return platform ? "Shopify" : "tienda ecommerce";
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
  try {
    const response = await fetch("./api/config", { headers: { "cache-control": "no-store" } });
    const config = await response.json();
    if (!response.ok || !config?.ok) {
      throw new Error(config?.message || "Supabase no esta configurado.");
    }

    state.config = config.supabaseUrl && config.supabaseAnonKey
      ? {
          supabaseUrl: config.supabaseUrl,
          supabaseAnonKey: config.supabaseAnonKey,
          authRequired: Boolean(config.authRequired),
          allowGuestResearch: Boolean(config.allowGuestResearch),
        }
      : null;

    if (!config.authRequired) {
      state.user = await fetchSession();
      enterMvpApp();
      return;
    }

    document.body.classList.add("auth-required");
    if (authGate) authGate.hidden = false;
    setAuthStatus("Conectando con Supabase...");

    const restored = await restoreSession();
    if (restored) {
      await enterAuthenticatedApp();
    } else {
      setAuthStatus("Usa una cuenta invitada para entrar.");
    }
  } catch {
    enterMvpApp();
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
  document.body.classList.remove("mvp-mode");
  document.body.classList.add("authenticated");
  state.mvpMode = false;
  if (authGate) authGate.hidden = true;
  setAuthStatus("");
  await loadHistory();
}

function enterMvpApp() {
  state.mvpMode = true;
  document.body.classList.remove("auth-required", "authenticated");
  document.body.classList.add("mvp-mode");
  if (authGate) authGate.hidden = true;
  setAuthStatus("");
  renderAuthState();
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
  const authRequired = Boolean(state.config?.authRequired);
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
  resultPanel.hidden = true;
  if (authRequired) {
    document.body.classList.add("auth-required");
    if (authGate) authGate.hidden = false;
    setAuthStatus("Sesion cerrada.");
  } else {
    enterMvpApp();
  }
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
  const data = readForm();
  if (!canRunRealAgent()) {
    queueLogin(data.naturalRequest);
    return;
  }
  await runResearch(data);
}

function canRunRealAgent() {
  return Boolean(
    state.session?.access_token ||
      state.user?.email ||
      state.user?.provider ||
      (state.mvpMode && state.config?.allowGuestResearch),
  );
}

async function runResearch(data) {
  setLoading(true);

  if ((data.businessStage === "shopify" || data.businessStage === "brand") && data.commerce?.storeId) {
    try {
      data.commerce.snapshot = await requestCommerceSnapshot({
        platform: data.commerce.platform,
        id: data.commerce.storeId,
      });
      if (data.commerce.platform === "shopify") {
        data.shopify.snapshot = data.commerce.snapshot;
      }
    } catch (error) {
      data.commerce.error = error instanceof Error ? error.message : "No se pudo leer la tienda conectada.";
      if (data.commerce.platform === "shopify") data.shopify.error = data.commerce.error;
    }
    if (data.commerce.platform === "shopify" && data.shopify.shop) {
      try {
        data.shopify.installedTools = await requestInstalledShopifyTools(data.shopify.shop);
      } catch (error) {
        data.shopify.installedToolsError = error instanceof Error ? error.message : "No se pudieron leer las herramientas Agent Genia.";
      }
    }
  }

  try {
    let backend = await requestBackendReport(data);
    if (backend?.pending && backend.jobId) {
      showToast("Agente ejecutandose en backend");
      backend = await pollBackendReport(backend);
    }
    if (backend?.ok && backend.report) {
      if (renderTypedBackendReport(backend.report)) {
        saveState(backend.report);
        setLoading(false);
        await loadHistory();
        resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast(typedReportToast(backend.report));
        return;
      }
      const report = buildBackendReportShell(data);
      report.ai = backend.report;
      report.backendMode = "codex-harness";
      report.diagnostics = backend.diagnostics || null;
      state.latest = report;
      document.body.classList.add("report-ready");
      resultPanel.hidden = false;
      renderReport(report);
      activateTab("brief");
      saveState(report);
      setLoading(false);
      await loadHistory();
      showToast("Research generado con backend real");
      return;
    }
    throw new Error(backend?.message || "El backend no devolvio un reporte.");
  } catch (error) {
    renderAgentExecutionError(data, error);
    setLoading(false);
    return;
  }
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
  } else if (report.type === "retail_to_online") {
    state.latest = report;
    document.body.classList.add("report-ready");
    resultPanel.hidden = false;
    renderRetailToOnlineReport(report);
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
  } else if (report.type === "tool_factory") {
    state.latest = report;
    document.body.classList.add("report-ready");
    resultPanel.hidden = false;
    renderToolFactoryReport(report);
  } else {
    return false;
  }

  activateTab("brief");
  return true;
}

function typedReportToast(report) {
  if (report.type === "profitability") return "Analisis de rentabilidad listo";
  if (report.type === "shipping_quote") return "Cotizacion de envio lista";
  if (report.type === "retail_to_online") return "Ruta online lista";
  if (report.type === "shopify_page_draft") return "Preview de pagina Shopify listo";
  if (report.type === "brand_whitespace") return "Whitespace de marca listo";
  if (report.type === "tool_factory") return "Tool Factory listo";
  return "Reporte listo";
}

function renderAgentExecutionError(data, error) {
  const message = error instanceof Error ? error.message : "No se pudo ejecutar el agente.";
  const report = {
    type: "agent_error",
    createdAt: new Date().toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short" }),
    naturalRequest: data.naturalRequest,
    backendError: message,
  };
  state.latest = report;
  document.body.classList.add("report-ready");
  resultPanel.hidden = false;
  setTabLabels(["Error", "Contexto", "Backend", "Siguiente", "Notas", ""]);
  document.querySelector("#brief").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span notice-card">
        <h3>El agente no se ejecuto</h3>
        <p>${escapeHtml(message)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="message-square-text"></i>${escapeHtml(data.naturalRequest)}</span>
          <span class="pill"><i data-lucide="shield-alert"></i>Sin resultado simulado</span>
        </div>
      </article>
      <article class="report-card">
        <h3>Que significa</h3>
        <p>La app no genero un reporte local de relleno. Hay que arreglar sesion, backend o harness antes de prometer que el agente trabajo.</p>
      </article>
      <article class="report-card">
        <h3>Siguiente</h3>
        <p>Inicia sesion de nuevo o revisa que HARNESS_URL/HARNESS_TOKEN esten activos en Cloudflare.</p>
      </article>
    </div>`;
  ["tools", "suppliers", "negotiation", "ddp", "quality"].forEach((id) => {
    const panel = document.querySelector(`#${id}`);
    if (panel) panel.innerHTML = "";
  });
  activateTab("brief");
  showToast("El agente no se ejecuto");
  lucide.createIcons();
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
  const target = event.target instanceof Element ? event.target : null;
  if (!target || !target.closest(".tool-menu-wrap")) closeToolMenu();
  const publishButton = target?.closest("[data-publish-shopify-page]");
  if (publishButton) {
    publishShopifyPage(publishButton);
    return;
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
  const inferredBrand = businessStage === "brand" ? inferBrandContext(naturalRequest) : {};
  const selectedStore = businessStage === "shopify" ? selectedCommerceStore() : null;
  const commerce = selectedStore
    ? {
        platform: selectedStore.platform,
        platformLabel: selectedStore.platformLabel || platformLabel(selectedStore.platform),
        storeId: selectedStore.id,
        label: selectedStore.label || selectedStore.domain || selectedStore.id,
        focus: shopifyFocusInput?.value.trim() || inferShopifyFocus(naturalRequest),
      }
    : {
        platform: "",
        platformLabel: "",
        storeId: "",
        label: "",
        focus: shopifyFocusInput?.value.trim() || inferShopifyFocus(naturalRequest),
      };
  const brand = businessStage === "brand"
    ? {
        name: brandNameInput?.value.trim() || inferredBrand.name || "",
        url: normalizeBrandUrl(brandUrlInput?.value.trim() || inferredBrand.url || ""),
        channels: brandChannelsInput?.value.trim() || inferredBrand.channels || "",
        goal: brandGoalInput?.value.trim() || inferredBrand.goal || "",
      }
    : {
        name: "",
        url: "",
        channels: "",
        goal: "",
      };
  return {
    businessStage,
    naturalRequest,
    ...inferred,
    commerce,
    shopify: {
      shop: commerce.platform === "shopify" ? commerce.storeId : "",
      focus: businessStage === "shopify" ? commerce.focus : "",
    },
    brand,
    attachments: serializeAttachments(),
    accessKey: form.accessKey.value.trim(),
  };
}

function inferBrandContext(value) {
  const text = String(value || "");
  const lower = text.toLowerCase();
  const url = inferUrlFromText(text);
  const channels = inferChannelsFromText(lower);
  const goal = inferBrandGoalFromText(lower);
  const referenceMode = isReferenceBrandRequest(lower);
  const nameMatch = text.match(
    /(?:marca|brand|tienda|store)\s+(?:se llama|llamada|llamado|es|de)?\s*([a-z0-9áéíóúñ& .'-]{2,60})/i,
  );
  const name = referenceMode ? "" : cleanBrandName(nameMatch?.[1] || inferBrandNameFromUrl(url));

  return { name, url, channels, goal };
}

function inferUrlFromText(value) {
  const match = String(value || "").match(/https?:\/\/[^\s,]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,]*)?/i);
  return match ? normalizeBrandUrl(match[0]) : "";
}

function inferChannelsFromText(value) {
  const channels = [];
  if (/meta|facebook|instagram|ig\b/.test(value)) channels.push("Meta Ads");
  if (/tiktok|reels|shorts|viral|org[aá]nico|organic/.test(value)) channels.push("TikTok/organico");
  if (/email|klaviyo|sms/.test(value)) channels.push("email/SMS");
  if (/google|search|seo/.test(value)) channels.push("Google/Search");
  if (/amazon|marketplace/.test(value)) channels.push("marketplace");
  return channels.join(", ");
}

function inferBrandGoalFromText(value) {
  if (isCreativePerformanceText(value)) {
    return "analizar patrones de performance creativa";
  }
  if (/compet|inspiraci[oó]n|hooks?|headlines?|titulares?|avatar|pain points?|puntos? de dolor|formatos?|creativos?/.test(value)) {
    return "sacar inspiracion de competencia";
  }
  if (/conversion|conversi[oó]n|cvr|checkout/.test(value)) return "mejorar conversion";
  if (/retencion|retenci[oó]n|recompra|ltv|email/.test(value)) return "mejorar retencion";
  if (/aov|ticket|bundle|paquete/.test(value)) return "subir AOV";
  if (/ads|roas|cac|anuncios/.test(value)) return "mejorar adquisicion pagada";
  if (/catalogo|cat[aá]logo|producto ganador|sku/.test(value)) return "ordenar catalogo";
  if (/marca|brand|posicionamiento/.test(value)) return "mejorar posicionamiento";
  return "";
}

function inferShopifyFocus(value) {
  const goal = inferBrandGoalFromText(String(value || "").toLowerCase());
  return goal || "";
}

function cleanBrandName(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(como esta|como este|similar a|parecid[ao] a|inspirad[ao] en)\b/gi, "")
    .replace(/\s+(que|para|con|en|y|,|\.).*$/i, "")
    .trim()
    .slice(0, 60);
}

function isReferenceBrandRequest(value) {
  return /\b(marca como|brand like|como esta|como este|similar a|parecid[ao] a|inspirad[ao] en|inspirarme en)\b/i.test(
    String(value || ""),
  );
}

function inferRequest(naturalRequest, businessStage = "starter") {
  const text = naturalRequest.toLowerCase();
  const hasReferenceUrl = Boolean(inferUrlFromText(naturalRequest));
  const referenceBrandIntent =
    isReferenceBrandRequest(text) ||
    (hasReferenceUrl &&
      hasAny(text, [
        "marca",
        "brand",
        "posicion",
        "posicionar",
        "posicionarme",
        "posicionamiento",
        "diferenciar",
        "diferenciacion",
        "diferenciación",
        "competencia",
        "competidor",
        "similar",
        "inspiracion",
        "inspiración",
      ]));
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
    hasAny(text, ["shopify", "tiendanube", "nuvemshop", "woocommerce", "woo commerce", "catalogo", "catálogo", "conversion", "conversiones"]);
  const physicalRetailIntent = hasAny(text, [
    "tienda fisica",
    "tienda física",
    "local",
    "negocio local",
    "negocio fisico",
    "negocio físico",
    "sucursal",
    "mostrador",
    "boutique",
  ]);
  const onlineTransitionIntent = hasAny(text, [
    "vender en internet",
    "vender online",
    "vender por internet",
    "tienda online",
    "ecommerce",
    "e-commerce",
    "crear pagina",
    "crear página",
    "pagina web",
    "página web",
  ]);
  const channelPlanningIntent = hasAny(text, [
    "tiktok organico",
    "tiktok orgánico",
    "paid ads",
    "anuncios pagados",
    "competencia",
    "contenido",
    "ads",
  ]);
  const brandCreationIntent = hasAny(text, [
    "crear marca",
    "nueva marca",
    "nombre de marca",
    "nombre para marca",
    "naming",
    "colores",
    "paleta",
    "identidad visual",
    "branding",
    "logo",
  ]);
  const customizationIntent = hasAny(text, [
    "personalizado",
    "personalizada",
    "personalizar",
    "custom",
    "private label",
    "marca propia",
    "producto propio",
    "empaque",
    "packaging",
    "envase",
    "caja",
    "box",
    "bolsa",
    "pouch",
    "sleeve",
    "etiqueta",
    "label",
    "insert",
    "unboxing",
    "variante",
    "variantes",
    "acabado",
    "material",
    "colorway",
    "formula",
    "fórmula",
    "fragancia",
    "muestra",
    "sample",
  ]);
  const productRecommendationIntent = hasAny(text, [
    "que vender",
    "qué vender",
    "que producto vender",
    "qué producto vender",
    "vender algo",
    "que me recomiendas",
    "qué me recomiendas",
    "recomiendame",
    "recomiéndame",
    "idea de producto",
    "ideas de producto",
    "producto recomendable",
  ]);
  const structuralStrengthIntent = hasAny(text, [
    "estructuralmente fuerte",
    "estructura fuerte",
    "resistente",
    "durable",
    "no fragil",
    "no frágil",
    "que aguante",
    "aguante envios",
    "aguante envíos",
    "dificil de romper",
    "difícil de romper",
    "bajo riesgo de envio",
    "bajo riesgo de envío",
  ]);
  const problemDiscoveryIntent = hasAny(text, [
    "buscar problema",
    "encontrar problema",
    "problema real",
    "validar oportunidad",
    "validar idea",
    "oportunidad",
    "nicho",
    "avatar",
    "pain point",
    "pain points",
    "punto de dolor",
    "puntos de dolor",
    "angulo",
    "ángulo",
    "no explotado",
    "whitespace",
    "white space",
    "research profundo",
    "investigacion profunda",
    "investigación profunda",
    "audiencia",
    "voz del cliente",
    "voice of customer",
    "meta ads",
    "amazon reviews",
    "reseñas amazon",
    "tiktok",
    "lanzar marca",
    "empezar marca",
    "producto que resuelva",
    "solucion de producto",
    "solución de producto",
    "posicionarme",
    "posicionar",
    "posicionamiento",
    "diferenciar",
    "diferenciacion",
    "diferenciación",
    "competencia",
    "competidor",
    "competidores",
    "marca como",
    "brand like",
    "como esta",
    "como este",
    "similar a",
    "parecida a",
    "parecido a",
  ]) || referenceBrandIntent || productRecommendationIntent || structuralStrengthIntent;
  const creativePerformanceIntent = isCreativePerformanceText(text);
  const inspirationIntent = creativePerformanceIntent || hasAny(text, [
    "inspiracion",
    "inspiración",
    "hook",
    "hooks",
    "headline",
    "headlines",
    "titular",
    "titulares",
    "avatar",
    "pain point",
    "pain points",
    "punto de dolor",
    "puntos de dolor",
    "formato",
    "formatos",
    "creativo",
    "creativos",
    "ugc",
    "reels",
    "shorts",
  ]);
  const retailToOnlineIntent =
    physicalRetailIntent ||
    (onlineTransitionIntent && channelPlanningIntent) ||
    (onlineTransitionIntent && hasAny(text, ["tienda", "local", "negocio", "producto", "productos"]));
  const brandIntent =
    businessStage === "brand" ||
    brandCreationIntent ||
    inspirationIntent ||
    creativePerformanceIntent ||
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
  const toolFactoryIntent =
    hasAny(text, [
      "app",
      "apps",
      "plugin",
      "extension",
      "extensión",
      "herramienta",
      "tool",
      "widget",
      "funcion",
      "función",
      "automatizacion",
      "automatización",
      "bloque",
    ]) &&
    (hasAny(text, [
      "paga",
      "pagada",
      "mensualidad",
      "subscription",
      "suscripcion",
      "suscripción",
      "gratis",
      "sin pagar",
      "ahorrar",
      "reemplazar",
      "sustituir",
      "alternativa",
      "terceros",
      "third party",
    ]) ||
      hasAny(text, ["crear", "hacer", "construir", "generar", "configurar", "necesito"]));
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
      ? ["interpret", "search", "negotiate", "ddp", "quality"].concat(customizationIntent ? ["customize"] : [])
      : toolFactoryIntent
        ? ["interpret", "shopify", "web", "quality"]
      : retailToOnlineIntent
        ? ["interpret", "retail", "costs", "content", "web"]
      : customizationIntent
        ? ["interpret", "customize", "brand", "quality"]
      : problemDiscoveryIntent
        ? ["interpret", "problem", "costs", "content"].concat(structuralStrengthIntent ? ["shipping", "quality"] : ["brand"])
      : brandIntent
        ? ["interpret", "brand", "shopify", "quality"]
      : shopifyIntent
        ? ["interpret", "shopify", "quality"]
        : ["interpret"],
    selectedInternalTool: sourcingIntent
      ? "alibaba-sourcing-agent"
      : toolFactoryIntent
        ? "agentgenia_tool_factory"
      : retailToOnlineIntent
        ? "retail-to-online-agent"
      : customizationIntent
        ? "product-customization-agent"
      : problemDiscoveryIntent
        ? "problem-discovery-agent"
      : brandIntent && whitespaceIntent && !inspirationIntent
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
  const customizationPlan =
    data.selectedInternalTool === "product-customization-agent" || data.goals?.includes("customize")
      ? buildGuidedCustomizationPlan(data, category)
      : null;
  const problemDiscovery =
    data.selectedInternalTool === "problem-discovery-agent" || data.goals?.includes("problem")
      ? buildGuidedProblemDiscovery(data, category)
      : null;

  return {
    ...data,
    category,
    query,
    targetUnitCost,
    agentTasks,
    evidenceLinks,
    supplierProfiles,
    ...(customizationPlan ? { customizationPlan } : {}),
    ...(problemDiscovery ? { problemDiscovery } : {}),
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
}

function buildBackendReportShell(data) {
  const category =
    productProfiles.find((item) => item.match.some((word) => `${data.product} ${data.productDetails}`.toLowerCase().includes(word))) ||
    genericProfile(data.product || "producto");
  return {
    ...data,
    category,
    query: cleanQuery(data.product || data.naturalRequest || "producto", category.category),
    targetUnitCost: data.targetCost || (data.budget && data.orderQuantity ? data.budget / data.orderQuantity : 0),
    agentTasks: [],
    evidenceLinks: [],
    supplierProfiles: [],
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
}

async function requestBackendReport(data) {
  const headers = {
    "content-type": "application/json",
  };
  if (state.session?.access_token) {
    headers.authorization = `Bearer ${state.session.access_token}`;
  }

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

async function pollBackendReport(initial) {
  const startedAt = Date.now();
  const maxWaitMs = 12 * 60 * 1000;
  let delayMs = Number(initial.pollAfterMs) || 2500;
  let latest = initial;

  while (Date.now() - startedAt < maxWaitMs) {
    await sleep(delayMs);
    latest = await requestBackendJobStatus(latest);
    if (!latest.pending) return latest;
    delayMs = Math.min(Number(latest.pollAfterMs) || delayMs + 500, 6000);
  }

  throw new Error("El agente sigue ejecutandose, pero la espera del navegador se agoto. Intenta abrir el historial en unos minutos.");
}

async function requestBackendJobStatus(job) {
  const headers = {};
  if (state.session?.access_token) {
    headers.authorization = `Bearer ${state.session.access_token}`;
  }
  const params = new URLSearchParams({
    jobId: job.jobId,
  });
  if (job.runId) params.set("runId", job.runId);

  const response = await fetch(`./api/research?${params.toString()}`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok || body.ok === false) {
    throw new Error(body.message || "No se pudo leer el resultado del job agentico.");
  }
  return body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const withoutUrls = String(value || "").replace(/https?:\/\/\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,]*)?/gi, " ");
  const combined = `${value || ""} ${withoutUrls}`.toLowerCase();
  if (/\b(que|qué)\s+(me\s+)?recomiendas?\b|recomiendame|recomiéndame|\b(que|qué)\s+vender\b|vender algo|ideas? de producto|estructuralmente fuerte/.test(combined)) {
    return "producto por descubrir";
  }
  if (/jolie|skin|skincare|piel|beauty|belleza|glow|serum|acne|acné|facial/.test(combined)) {
    return "skincare";
  }
  const directMatch = withoutUrls.match(/(?:vender|buscar|encontrar|cotizar|comprar)\s+(.+?)(?:\s+para\s+|\s+y\s+|\s+con\s+|\s+en\s+alibaba|\.|$)/i);
  if (directMatch?.[1]) return directMatch[1].trim().slice(0, 90);
  const cleaned = withoutUrls
    .replace(/quiero|quisiera|me encantaria|me gustaría|necesito|busco|encontrar|proveedores?|fabricantes?|alibaba|ddp|moq|negociar|cotizar|marca|brand|como esta|como este|similar|parecid[ao]|posicionarme|posicionar|posicionamiento|ayudar/gi, " ")
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

function isCreativePerformanceText(value) {
  const text = String(value || "").toLowerCase();
  const directSignal = /performance creativa|creative performance|mejor(?:es)? rendimiento|peor(?:es)? rendimiento|alto rendimiento|bajo rendimiento|ganador(?:es)?|perdedor(?:es)?|winner|los que no|no funcion|no convirti[oó]|viral(?:es)?|ctr|cpa|cpm|roas|watch time|retenci[oó]n de video|thumbstop|hook rate|views|vistas|engagement/.test(text);
  const socialSource = /tiktok|reels|shorts|ugc|org[aá]nico|organic|paid ads|anuncios? pagados?|meta ads|creative|creativo/.test(text);
  const performanceContext = /rendimiento|performance|ganador|perdedor|viral|hook|views|vistas|watch|retenci[oó]n|ctr|cpa|roas|conversion/.test(text);
  return directSignal || (socialSource && performanceContext);
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
    if (data.selectedInternalTool === "retail-to-online-agent") {
      return firstStep.concat([
        {
          key: "retail",
          title: "Entender tienda fisica",
          status: "contexto inicial",
          result: `El agente tratara "${data.product}" como inventario/servicio existente que necesita canal online.`,
          nextAction: "Separar producto, margen, ticket promedio, envio/pickup y prueba social antes de recomendar canal.",
        },
        {
          key: "costs",
          title: "Revisar si los numeros permiten ads",
          status: "listo para calculo",
          result: "El agente estimara contribucion por pedido, CAC maximo y ROAS break-even usando datos escritos o supuestos conservadores.",
          nextAction: "Si el margen no permite pagar CAC, empezar por TikTok organico y contenido local.",
        },
        {
          key: "content",
          title: "Mapear competencia y contenido",
          status: "listo para research",
          result: "Se prepararan queries para TikTok, Meta Ads, Google y competidores locales/directos.",
          nextAction: "Convertir objeciones y preguntas reales en videos, landing sections y ofertas.",
        },
        {
          key: "web",
          title: "Diseñar primera web vendible",
          status: "listo para implementar",
          result: "Se definira una web simple: producto estrella, prueba social, FAQ, entrega/pickup, pagos y WhatsApp.",
          nextAction: "No construir catalogo gigante; lanzar con 1-3 productos/ofertas con mejor margen.",
        },
      ]);
    }
    if (data.selectedInternalTool === "brand-audit-agent") {
      const tasks = [
        {
          key: "brand",
          title: "Leer contexto de marca",
          status: data.brand?.url || data.brand?.name ? "contexto recibido" : "requiere contexto",
          result: data.brand?.name
            ? `El agente analizara ${data.brand.name} con la solicitud y los canales disponibles.`
            : "El agente necesita nombre, sitio o canales para entender mejor la marca.",
          nextAction: "Priorizar oferta, conversion, retencion y oportunidades de crecimiento.",
        },
      ];
      if (isCreativePerformanceText(`${data.naturalRequest || ""} ${data.brand?.goal || ""}`)) {
        tasks.push({
          key: "content",
          title: "Separar performance creativa",
          status: "listo para comparar",
          result: "El agente comparara ads pagados, piezas organicas virales, ganadores, perdedores y creativos sin datos suficientes.",
          nextAction: "Pegar links, subir capturas o adjuntar exports con CTR, CPA, ROAS, watch time y conversion.",
        });
      }
      tasks.push(
        {
          key: "shopify",
          title: "Cruzar con Shopify",
          status: data.shopify?.shop ? "catalogo disponible" : "opcional",
          result: data.shopify?.shop
            ? `Tambien usara ${data.shopify.shop} como contexto de catalogo real.`
            : "Shopify puede conectarse despues para leer catalogo, precios e inventario.",
          nextAction: "Combinar datos de marca con catalogo si la tienda esta conectada.",
        },
      );
      return firstStep.concat(tasks);
    }
    if (data.selectedInternalTool === "product-customization-agent") {
      return firstStep.concat([
        {
          key: "customize",
          title: "Diseñar producto personalizado",
          status: "listo para harness",
          result: `El agente convertira "${data.product}" en variantes de producto, empaque y branding.`,
          nextAction: "Escoger una ruta low-MOQ, una premium y una giftable antes de pedir muestras.",
        },
        {
          key: "quality",
          title: "Preparar brief de proveedor",
          status: "listo para RFQ",
          result: "Se pediran specs, metodo de personalizacion, dielines, MOQ por variante, muestra, lead time y empaque.",
          nextAction: "No pasar a bulk order hasta aprobar muestra neutra, muestra con logo/empaque y pre-production sample.",
        },
      ]);
    }
    if (data.selectedInternalTool === "problem-discovery-agent") {
      return firstStep.concat([
        {
          key: "problem",
          title: "Descubrir problema real",
          status: "listo para research",
          result: "El agente preparara un mapa de problema/avatar usando Meta Ads, Amazon reviews y TikTok como fuentes separadas.",
          nextAction: "Separar evidencia recolectada de hipotesis antes de escoger producto o angulo.",
        },
        {
          key: "content",
          title: "Traducir a hooks",
          status: "listo para creatividad",
          result: "El resultado conectara dolor, avatar, lenguaje real, angulos y primeros scripts/formatos a probar.",
          nextAction: "No grabar ads hasta elegir 2-3 hooks con evidencia o una hipotesis clara.",
        },
        {
          key: "costs",
          title: "Conectar con economics",
          status: "siguiente filtro",
          result: "Despues del problema/producto, el agente debe validar si COGS y margen permiten paid ads.",
          nextAction: "Si el CAC objetivo no da, cambiar a organic-first o buscar otra oferta/producto.",
        },
      ]);
    }
    if (data.selectedInternalTool === "shopify-store-audit") {
      const platform = data.commerce?.platformLabel || platformLabel(data.commerce?.platform);
      const store = data.commerce?.label || data.commerce?.storeId || "";
      return firstStep.concat([
        {
          key: "shopify",
          title: "Leer tienda conectada",
          status: data.commerce?.storeId ? "lista para lectura" : "requiere conexion",
          result: data.commerce?.storeId
            ? `El agente usara ${platform} (${store}) como contexto real.`
            : "El agente necesita que conectes Shopify, Tiendanube o WooCommerce para leer catalogo real.",
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

function buildGuidedCustomizationPlan(data, category) {
  const product = data.product || category.category || "producto ecommerce";
  const brandName = data.brand?.name || "la marca";
  const destination = data.destination || "destino final";

  return {
    productConcept: `${product} con una direccion private-label: validar primero una version simple, luego una version de marca y finalmente un empaque mas memorable.`,
    differentiationAngle: "Diferenciar por experiencia de uso, calidad verificable y empaque que explique la promesa; no depender solo de poner logo.",
    recommendedDirection: "Empezar con low-MOQ validation: producto base probado, logo simple, empaque individual resistente y muestra aprobada antes de pagar tooling o caja custom.",
    variantOptions: [
      {
        name: "Low-MOQ validation",
        productChanges: "Producto base del proveedor con specs claras, color disponible y logo simple si el MOQ lo permite.",
        packaging: "Empaque individual resistente, etiqueta/sticker de marca y caja master con medidas confirmadas.",
        branding: `Aplicar ${brandName} de forma simple: logo, one-liner, instrucciones y barcode si aplica.`,
        bestFor: "primer test con menos riesgo",
        pros: ["menor costo inicial", "menos riesgo de tooling", "mas facil conseguir muestra"],
        risks: ["se puede sentir generico si el producto no tiene un angulo claro"],
      },
      {
        name: "Brand signature",
        productChanges: "Color, acabado o accesorio propio que conecte con el problema del cliente sin cambiar toda la fabricacion.",
        packaging: "Sleeve o caja ligera impresa con direccion visual de marca.",
        branding: "Paleta, tono, claim conservador, insert de uso y garantia/confianza.",
        bestFor: "validar percepcion premium",
        pros: ["mejor diferenciacion", "mas facil producir contenido", "eleva percepcion de precio"],
        risks: ["puede subir MOQ, costo por unidad y lead time"],
      },
      {
        name: "Giftable unboxing",
        productChanges: "Bundle, set o detalle extra que haga mas clara la ocasion de compra.",
        packaging: "Caja custom, proteccion interna e insert de thank-you/uso.",
        branding: "Unboxing pensado para UGC: primer impacto, textura visual y CTA de recompra/review.",
        bestFor: "regalos, contenido y AOV mas alto",
        pros: ["mejor experiencia", "mas shareable", "puede justificar bundle"],
        risks: ["mayor costo de flete, mayor MOQ y mas puntos de defecto"],
      },
    ],
    packagingOptions: [
      {
        name: "Starter label",
        format: "Producto stock + etiqueta, sticker o hangtag.",
        materials: "Etiqueta BOPP/papel, polybag/caja individual segun categoria.",
        finish: "Matte o satin para verse limpio sin subir mucho costo.",
        insertIdeas: ["guia de uso", "QR a video/demo", "thank-you note con soporte"],
        unitCostImpact: "bajo",
        moqImpact: "normalmente el mas flexible",
        shippingRisk: "bajo si el empaque protege el producto y no infla volumen",
        bestFor: "validar demanda antes de invertir en caja custom",
      },
      {
        name: "Printed sleeve",
        format: "Sleeve/caja ligera alrededor del empaque individual.",
        materials: "Cartulina 300-400 gsm o caja corrugada ligera si el producto pesa mas.",
        finish: "Matte lamination, spot UV solo si el margen lo permite.",
        insertIdeas: ["claim principal", "beneficios", "instrucciones", "QR a landing"],
        unitCostImpact: "medio",
        moqImpact: "puede exigir MOQ de impresion separado",
        shippingRisk: "medio; validar dimensiones finales y resistencia",
        bestFor: "verse como marca real sin rediseñar el producto completo",
      },
      {
        name: "Full unboxing kit",
        format: "Caja custom + proteccion interna + insert.",
        materials: "Rigid box, mailer box o corrugado reforzado segun peso/fragilidad.",
        finish: "Pantone/hex match, foil o emboss solo despues de validar margen.",
        insertIdeas: ["historia de marca", "pasos de uso", "cross-sell", "review request"],
        unitCostImpact: "alto",
        moqImpact: "alto por tooling/dieline/printing",
        shippingRisk: "alto; pedir drop test, carton size y gross weight antes de DDP",
        bestFor: "producto premium, regalo o contenido de unboxing",
      },
    ],
    supplierBrief: `Hello, I am developing a private-label version of ${product} for ${destination}. Please quote three options: (1) low-MOQ stock product with simple logo/label, (2) brand signature version with custom color/finish and printed packaging, and (3) giftable unboxing kit with custom box and insert.\n\nPlease include MOQ by option, unit price tiers, sample cost, customization method, printing method, packaging dielines, lead time, carton size/gross weight, EXW/FOB/DDP to ${destination}, certifications, and Alibaba Trade Assurance terms.`,
    supplierQuestions: [
      "What is the lowest MOQ for a stock product with logo or label?",
      "What customization methods do you support: laser, screen print, heat transfer, sticker, emboss, custom mold, color matching?",
      "Can you provide packaging dielines and material specs before we pay for samples?",
      "What are the sample costs and lead times for neutral sample, logo sample, and packaging sample?",
      "What is the MOQ and unit price impact for custom color, custom packaging, and inserts?",
      `Can you quote EXW, FOB and DDP to ${destination} after confirming carton size and gross weight?`,
      "Which certifications/test reports apply to this product and market?",
    ],
    samplePlan: [
      "Ordenar una muestra neutra para validar producto base.",
      "Si pasa, pedir muestra con logo/label y confirmar metodo de personalizacion.",
      "Despues pedir muestra de empaque/pre-production sample antes de bulk order.",
    ],
    qualityChecks: category.sampleChecks.concat([
      "comparar colores reales contra hex/Pantone aprobado",
      "revisar alineacion de logo, errores de texto, barcode e instrucciones",
      "hacer prueba de empaque: caida, aplastamiento, humedad ligera y apertura/cierre",
    ]),
    nextSteps: [
      "Escoger una sola variante para el primer test.",
      "Pedir cotizacion con MOQ, muestra, empaque y DDP por escrito.",
      "Aprobar muestra antes de pagar bulk order.",
      "Guardar golden sample para comparar produccion.",
    ],
  };
}

function buildGuidedProblemDiscovery(data, category) {
  const product = data.product || category.category || "producto ecommerce";
  const market = data.market || "US";
  const problem = inferProblemSeed(data.naturalRequest, product);
  const categoryLabel = category.category || product;
  const avatar = inferProblemAvatar(data.naturalRequest, categoryLabel);

  return {
    researchQuestion: `Que problema suficientemente urgente en ${categoryLabel} puede resolver ${product}, para que avatar y con que angulo inicial?`,
    decision: "No lanzar todavia: usar esto como mapa inicial y correr research live de Meta Ads, Amazon reviews y TikTok antes de comprar inventario o grabar ads.",
    opportunityScore: 54,
    confidence: "baja-media; fallback guiado sin recoleccion live completa",
    sourceCoverage: [
      {
        source: "Meta Ads",
        status: "pendiente/no ejecutado",
        coverage: "Preparado para revisar promesas, hooks, ofertas, landing URLs y claims de competidores.",
        whatItCanProve: "Que angulos y ofertas estan siendo testeados activamente por el mercado.",
        limitations: "Sin captura live no sabemos gasto, rendimiento ni saturacion real.",
      },
      {
        source: "Amazon reviews",
        status: "pendiente/no ejecutado",
        coverage: "Preparado para minar 1-3 estrellas y 4-5 estrellas de productos comparables.",
        whatItCanProve: "Frustraciones, requisitos de producto, objeciones y lenguaje de compra.",
        limitations: "Sin ASINs/reviews extraidas, los pains siguen como hipotesis.",
      },
      {
        source: "TikTok organic",
        status: "pendiente/no ejecutado",
        coverage: "Preparado para descubrir videos y comentarios organicos con filtro de ruido.",
        whatItCanProve: "Lenguaje emocional, momentos de uso, preguntas repetidas e intencion.",
        limitations: "Viralidad no prueba ventas; requiere clicks/conversion o comentarios con intencion.",
      },
    ],
    evidenceMatrix: [
      {
        source: "Prompt del usuario",
        evidenceType: "contexto declarado",
        signal: "El usuario busca validar problema/producto/angulo antes de lanzar.",
        avatar,
        pain: problem,
        quoteOrObservation: data.naturalRequest || "",
        confidence: "media",
      },
      {
        source: "Categoria inferida",
        evidenceType: "hipotesis",
        signal: `La categoria ${categoryLabel} requiere comparar dolor, solucion, margen y claims antes de ads.`,
        avatar,
        pain: problem,
        quoteOrObservation: "Pendiente confirmar con Meta, Amazon y TikTok.",
        confidence: "baja-media",
      },
    ],
    avatars: [
      {
        name: avatar,
        problem,
        trigger: "Busca solucion cuando el problema ya afecta compra, rutina, tiempo, confianza o autoestima.",
        language: [
          "No se que producto escoger.",
          "No quiero comprar algo que no funcione.",
          "Quiero una solucion simple sin perder tiempo investigando.",
        ],
        objections: ["precio", "confianza", "si realmente funciona", "calidad", "envio/devoluciones"],
        whereToFind: ["TikTok organic comments", "Amazon 1-3 star reviews", "Meta Ads comments/landing objections"],
        confidence: "hipotesis inicial",
      },
    ],
    painPoints: [
      {
        pain: problem,
        urgency: "media hasta confirmar repeticion y lenguaje literal en fuentes externas",
        currentAlternatives: ["comprar la opcion mas barata", "seguir comparando reviews", "postergar la compra"],
        desiredOutcome: "resolver el problema con una compra clara, confiable y facil de justificar",
        evidenceSources: ["prompt", "categoria inferida"],
        confidence: "baja-media",
      },
    ],
    angleCandidates: [
      {
        angle: "Compra sin duda",
        avatar,
        pain: "miedo a elegir mal entre productos que parecen iguales",
        whyItMayBeUnderused: "Muchas marcas venden features, pero pocas reducen incertidumbre con prueba, comparacion y limites claros.",
        creativeHook: `Antes de comprar ${product}, revisa estas 3 cosas.`,
        proofNeeded: "Reviews/reclamos repetidos + comentarios TikTok con preguntas de decision.",
        risk: "Puede sonar generico si no se amarra a un pain especifico.",
        score: 62,
      },
      {
        angle: "Solucion simple para un momento especifico",
        avatar,
        pain: problem,
        whyItMayBeUnderused: "El mercado suele hablar de producto; el angulo debe hablar del momento exacto donde aparece el dolor.",
        creativeHook: `Si te pasa esto, no necesitas mas opciones: necesitas ${product} con estas specs.`,
        proofNeeded: "Comentarios organicos que mencionen el momento de uso y objecion.",
        risk: "Si el momento no es urgente, paid ads puede salir caro.",
        score: 58,
      },
    ],
    productHypotheses: [
      {
        product,
        whyItSolves: `Debe resolver ${problem} mejor que alternativas genericas, con specs y empaque que comuniquen confianza.`,
        requiredFeatures: category.mustHave || ["muestra verificable", "calidad consistente", "explicacion clara de uso"],
        sourcingNotes: [
          "Validar MOQ bajo antes de bulk order.",
          "Pedir sample y pruebas de calidad.",
          "Comparar costo aterrizado contra CAC posible.",
        ],
        claimRisks: buildProblemClaimRisks(categoryLabel, data.naturalRequest),
        validationStep: "Correr research live y luego probar 3 hooks antes de comprar inventario grande.",
      },
    ],
    creativeBrief: {
      corePromise: `Ayudar a ${avatar.toLowerCase()} a resolver ${problem} con menos duda y mas claridad.`,
      hooks: [
        `El error que mucha gente comete antes de comprar ${product}.`,
        `Como saber si ${product} realmente te sirve.`,
        `3 senales de que estas comprando la opcion equivocada.`,
      ],
      contentFormats: ["UGC problema-solucion", "comparacion lado a lado", "checklist antes de comprar", "review-style demo"],
      doNotSay: buildProblemClaimRisks(categoryLabel, data.naturalRequest),
      firstTests: [
        "Test 1: hook de dolor vs hook de comparacion.",
        "Test 2: demo de producto vs checklist educativa.",
        "Test 3: landing con una oferta simple y FAQ de objeciones.",
      ],
    },
    nextSteps: [
      "Recolectar Meta Ads de 3-5 competidores directos o indirectos.",
      "Extraer Amazon reviews de productos comparables y separar 1-3 estrellas de 4-5 estrellas.",
      "Descubrir TikToks organicos y filtrar ruido antes de bajar comentarios.",
      "Actualizar opportunityScore con evidencia real.",
      "Pasar el producto ganador por unit economics antes de paid ads.",
    ],
  };
}

function inferProblemSeed(request, product) {
  const text = String(request || "").toLowerCase();
  const explicit = text.match(/(?:problema|dolor|pain)\s+(?:de|que|es)?\s*([^.;\n]{8,120})/i)?.[1];
  if (explicit) return explicit.trim();
  if (/piel|skincare|acne|acné|beauty/.test(text)) return "confusion, desconfianza o frustracion con resultados de skincare";
  if (/cabello|hair|pelo/.test(text)) return "miedo a dano, caida, frizz o resultados inconsistentes";
  if (/suplement|vitamin|prote[ií]na|wellness/.test(text)) return "querer mejorar rutina sin promesas exageradas ni ingredientes confusos";
  if (/mascota|pet|perro|gato/.test(text)) return "comprar algo seguro y util para la mascota sin equivocarse";
  return `necesidad concreta alrededor de ${product || "la categoria"}`;
}

function inferProblemAvatar(request, category) {
  const text = String(request || "").toLowerCase();
  if (/mama|mamá|madre|padre|familia/.test(text)) return "Padre/madre ocupado que necesita una solucion confiable";
  if (/premium|calidad|lujo/.test(text)) return "Comprador que quiere calidad y prueba antes de pagar mas";
  if (/tiktok|gen z|joven/.test(text)) return "Comprador social que descubre problemas por contenido corto";
  if (/piel|skincare|beauty|belleza/.test(text)) return "Persona que quiere resolver su rutina sin arriesgar su piel";
  return `Comprador de ${category} que necesita una razon clara para elegir`;
}

function buildProblemClaimRisks(category, request) {
  const text = `${category || ""} ${request || ""}`.toLowerCase();
  if (/skin|skincare|piel|acne|acné|salud|suplement|vitamin|cabello|hair|pelo|baby|beb[eé]|food|comida/.test(text)) {
    return [
      "No prometer curas, resultados garantizados ni claims medicos.",
      "Separar experiencia de cliente de evidencia clinica.",
      "Validar etiquetas, ingredientes, advertencias y claims permitidos.",
    ];
  }
  return [
    "No prometer resultados absolutos sin prueba.",
    "No copiar claims de competidores sin verificar.",
    "No usar antes/despues engañosos o imposibles de demostrar.",
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

function renderRetailToOnlineReport(report) {
  const economics = report.economics || {};
  const currency = economics.currency || "USD";
  const channel = report.channelRecommendation || {};
  const product = report.productUnderstanding || {};
  const database = report.databaseContext || {};
  const content = report.contentPlan || {};
  const competitors = report.competitorResearchPlan || {};
  const website = report.websitePlan || {};
  const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps : [];
  const risks = report.executiveBrief?.topRisks || [];
  const missingNumbers = economics.missingNumbers || [];
  const assumptions = economics.assumptions || [];

  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.retail);

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${escapeHtml(channel.primaryChannel || "organic-first")}</strong><p>canal inicial</p></article>
      <article class="metric-card"><strong>${formatMoney(economics.cacTarget || 0, currency)}</strong><p>CAC sano maximo</p></article>
      <article class="metric-card"><strong>${formatPercent(economics.margin || 0)}</strong><p>margen estimado</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Decision</h3>
        <p>${escapeHtml(report.executiveBrief?.decision || "Empezar online con una oferta simple antes de invertir fuerte.")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="store"></i>${escapeHtml(product.storeType || "tienda fisica")}</span>
          <span class="pill"><i data-lucide="package"></i>${escapeHtml(product.product || report.product || "producto")}</span>
          <span class="pill"><i data-lucide="wrench"></i>${escapeHtml(toolLabel(report.toolUsed))}</span>
        </div>
      </article>
      <article class="report-card">
        <h3>Ruta recomendada</h3>
        <p>${escapeHtml(report.executiveBrief?.recommendedPath || channel.path || "")}</p>
      </article>
      <article class="report-card">
        <h3>Producto</h3>
        <p>${escapeHtml(product.summary || "Elegir producto estrella, no subir todo el inventario al inicio.")}</p>
      </article>
      <article class="report-card full-span">
        <h3>Trabajo del agente</h3>
        ${renderAgentWorkLog(report.agentWorkLog || [])}
      </article>
      ${renderRetailDatabaseCard(database)}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Numeros para decidir canal</h3>
        <dl class="calculation-list">
          <div><dt>Ticket promedio</dt><dd>${formatMoney(economics.aov || 0, currency)}</dd></div>
          <div><dt>Costo producto</dt><dd>${formatMoney(economics.cogs || 0, currency)}</dd></div>
          <div><dt>Envio/empaque</dt><dd>${formatMoney(economics.shipping || 0, currency)}</dd></div>
          <div><dt>Fees y pagos</dt><dd>${formatMoney(economics.fees || 0, currency)}</dd></div>
          <div><dt>Reserva devoluciones</dt><dd>${formatMoney(economics.returnsReserve || 0, currency)}</dd></div>
          <div><dt>Contribucion por pedido</dt><dd>${formatMoney(economics.contribution || 0, currency)}</dd></div>
          <div><dt>CAC maximo</dt><dd>${formatMoney(economics.cacMax || 0, currency)}</dd></div>
          <div><dt>CAC sano</dt><dd>${formatMoney(economics.cacTarget || 0, currency)}</dd></div>
          <div><dt>ROAS break-even</dt><dd>${economics.breakEvenRoas ? formatRoas(economics.breakEvenRoas) : "pendiente"}</dd></div>
          <div><dt>ROAS objetivo</dt><dd>${economics.targetRoas ? formatRoas(economics.targetRoas) : "pendiente"}</dd></div>
        </dl>
      </article>
      <article class="report-card full-span ${missingNumbers.length ? "notice-card" : ""}">
        <h3>Numeros faltantes</h3>
        <ul>${(missingNumbers.length ? missingNumbers : ["Hay base suficiente para una primera decision; aun asi confirma numeros reales."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Canal recomendado</h3>
        <p>${escapeHtml(channel.summary || "")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="video"></i>${escapeHtml(channel.primaryChannel || "contenido")}</span>
          <span class="pill"><i data-lucide="megaphone"></i>${escapeHtml(channel.paidAdsReadiness || "needs_validation")}</span>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Primer test</h3>
        <p>${escapeHtml(channel.firstTest || "Publicar contenido, medir intencion y despues decidir paid ads.")}</p>
      </article>
      <article class="report-card full-span notice-card">
        <h3>Riesgos</h3>
        <ul>${(risks.length ? risks : ["Gastar en ads antes de confirmar margen y conversion."]).map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Research de competencia</h3>
        <p>${escapeHtml(competitors.goal || "Entender mensajes, ofertas y formatos antes de crear contenido.")}</p>
        <div class="source-list">
          ${(competitors.sources || []).map((source) => `
            <article class="source-item">
              <span><i data-lucide="search"></i></span>
              <div>
                <strong>${escapeHtml(source.source)}</strong>
                <p>${escapeHtml(source.query)} · ${escapeHtml(source.useFor)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Contenido inicial</h3>
        <ul>${(content.firstContentSprint || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Medir</h3>
        <ul>${(content.measurement || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>No hacer todavia</h3>
        <ul>${(content.doNotDoYet || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Primera web</h3>
        <p>${escapeHtml(website.recommendation || "Crear una web simple de venta.")}</p>
        <p>${escapeHtml(website.firstBuild || "")}</p>
      </article>
      <article class="report-card">
        <h3>Stack</h3>
        <p>${escapeHtml(website.stackSuggestion || "Shopify si necesita catalogo; landing + checkout/WhatsApp si solo validara una oferta.")}</p>
      </article>
      <article class="report-card">
        <h3>Reglas</h3>
        <ul>${(website.launchGuardrails || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Secciones necesarias</h3>
        <ul>${(website.requiredSections || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      ${renderRetailDatabaseCard(database)}
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Siguientes pasos</h3>
        <ul>${(nextSteps.length ? nextSteps : ["Elegir producto estrella, confirmar numeros y lanzar web simple."]).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Supuestos</h3>
        <ul>${(assumptions.length ? assumptions : ["Resultado basado en supuestos conservadores."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderRetailDatabaseCard(database = {}) {
  if (!database.hasDatabase) {
    return `<article class="report-card full-span notice-card">
      <h3>DB digital</h3>
      <p>No se subio una base de datos. Si tiene inventario, ventas, clientes o productos en CSV, Excel, JSON, SQL o SQLite, puede subirlo desde el boton +.</p>
    </article>`;
  }

  const files = database.files || [];
  const columns = database.detectedColumns || [];
  const signals = database.usefulSignals || [];
  const uses = database.recommendedUses || [];

  return `<article class="report-card full-span">
    <h3>DB digital subida</h3>
    <p>${escapeHtml(database.summary || "Base de datos recibida.")}</p>
    <div class="pill-row">
      ${files.map((file) => `<span class="pill"><i data-lucide="database"></i>${escapeHtml(file.name)}${file.sizeLabel ? ` · ${escapeHtml(file.sizeLabel)}` : ""}</span>`).join("")}
    </div>
    ${columns.length ? `<h4>Columnas detectadas</h4><p>${escapeHtml(columns.slice(0, 16).join(", "))}</p>` : ""}
    ${signals.length ? `<h4>Señales utiles</h4><ul>${signals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${uses.length ? `<h4>Como la usara el agente</h4><ul>${uses.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

function renderToolFactoryReport(report) {
  const requested = report.requestedTool || {};
  const brief = report.executiveBrief || {};
  const strategy = report.buildStrategy || {};
  const replacement = report.appReplacement || {};
  const toolSpec = report.toolSpec || {};
  const mvp = report.mvp || {};
  const savings = report.savings || {};
  const risks = Array.isArray(report.risks) ? report.risks : [];
  const validationPlan = Array.isArray(report.validationPlan) ? report.validationPlan : [];
  const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps : [];
  const primitives = Array.isArray(strategy.primitives) ? strategy.primitives : [];
  const dataModel = Array.isArray(strategy.dataModel) ? strategy.dataModel : [];
  const events = Array.isArray(strategy.events) ? strategy.events : [];
  const adminActions = Array.isArray(strategy.adminActions) ? strategy.adminActions : [];
  const publication = report.publication || null;
  const installedTools = Array.isArray(report.installedTools)
    ? report.installedTools
    : Array.isArray(report.shopify?.installedTools)
      ? report.shopify.installedTools
      : [];
  const installedToolsLoaded = report.installedToolsLoaded || Array.isArray(report.shopify?.installedTools);
  const shop = report.shopify?.shop || "";
  const runtime = toolFactoryRuntimeSupport(report);
  const canCreateTool = Boolean(shop && (requested.name || requested.category) && runtime.supported && replacement.canCreateNow !== false && !publication);
  const toolAction = report.toolAction || null;
  const actionCard = toolAction
    ? `<article class="report-card full-span ${toolAction.status === "completed" ? "success-card" : "notice-card"}">
        <h3>Accion del agente</h3>
        <p>${escapeHtml(toolAction.message || "Agent Genia proceso la accion solicitada.")}</p>
      </article>`
    : "";
  const publishedCard = publication
    ? `<article class="report-card full-span success-card">
        <h3>Herramienta aplicada</h3>
        <p>Agent Genia ya publico, actualizo o instalo esta herramienta en Shopify.</p>
        <div class="pill-row">
          <a class="pill link-pill" href="${escapeHtml(publication.url || "#")}" target="_blank" rel="noreferrer"><i data-lucide="external-link"></i>Ver herramienta</a>
          <a class="pill link-pill" href="${escapeHtml(publication.adminUrl || "#")}" target="_blank" rel="noreferrer"><i data-lucide="settings"></i>Abrir en Shopify</a>
        </div>
      </article>`
    : "";

  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.toolFactory);

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${escapeHtml(requested.feasibility || "media")}</strong><p>viabilidad</p></article>
      <article class="metric-card"><strong>${escapeHtml(requested.category || "herramienta")}</strong><p>categoria</p></article>
      <article class="metric-card"><strong>${escapeHtml(savings.costAvoidedRange || "por estimar")}</strong><p>ahorro potencial</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>${escapeHtml(requested.name || "Tool Factory")}</h3>
        <p>${escapeHtml(brief.decision || "Construir un MVP nativo antes de pagar otra app.")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="wrench"></i>${escapeHtml(toolLabel(report.toolUsed))}</span>
          <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(shop || "Shopify opcional")}</span>
          <span class="pill"><i data-lucide="target"></i>${escapeHtml(requested.desiredOutcome || "ahorrar subscription")}</span>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Tesis de valor</h3>
        <p>${escapeHtml(brief.valueThesis || "Agent Genia crea la herramienta exacta que necesita el merchant.")}</p>
      </article>
      <article class="report-card full-span">
        <h3>Build vs buy</h3>
        <p>${escapeHtml(replacement.buildOrBuyDecision || "Construir solo la parte que resuelve el trabajo real; pagar una app solo si el merchant necesita profundidad que Agent Genia no debe improvisar.")}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="route"></i>${escapeHtml(replacement.replaceabilityLevel || "definir alcance")}</span>
          <span class="pill"><i data-lucide="cpu"></i>${escapeHtml(replacement.runtimeLabel || requested.runtimeLabel || "runtime por definir")}</span>
          <span class="pill"><i data-lucide="rocket"></i>${replacement.canCreateNow ? "crear ahora" : "runtime avanzado"}</span>
          ${replacement.existingTool ? `<span class="pill"><i data-lucide="layers"></i>${escapeHtml(`ya existe: ${replacement.existingTool.title || replacement.existingTool.category}`)}</span>` : ""}
        </div>
      </article>
      <article class="report-card full-span notice-card">
        <h3>Guardrail</h3>
        <p>${escapeHtml(brief.guardrail || "No prometemos paridad enterprise; construimos el 20% que resuelve el 80% de la necesidad.")}</p>
      </article>
      ${actionCard}
      ${publishedCard}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Arquitectura nativa</h3>
        <p>${escapeHtml(strategy.appShell || "Agent Genia Shopify app como contenedor unico.")}</p>
        <ul>${primitives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Acciones del agente</h3>
        <ol>${adminActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Mapa de reemplazo</h3>
        <dl class="calculation-list">
          <div><dt>Primera version</dt><dd>${escapeHtml(replacement.firstVersion || "MVP por definir")}</dd></div>
          <div><dt>Runtime</dt><dd>${escapeHtml(replacement.runtimeLabel || requested.runtimeLabel || "por definir")}</dd></div>
          <div><dt>Ruta si funciona</dt><dd>${escapeHtml(replacement.upgradePath || "Convertirlo en herramienta reutilizable solo si se usa varias veces.")}</dd></div>
        </dl>
      </article>
      <article class="report-card full-span">
        <h3>Herramientas instaladas</h3>
        ${renderInstalledShopifyTools({ tools: installedTools, loaded: installedToolsLoaded, loading: report.installedToolsLoading, error: report.installedToolsError || report.shopify?.installedToolsError })}
      </article>
    </div>`;

  document.querySelector("#suppliers").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>${escapeHtml(mvp.name || "MVP")}</h3>
        <p>Primero se construye una version pequena, medible y reversible.</p>
        <div class="compact-section">
          <h4>Incluye</h4>
          <ul>${(mvp.included || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div class="compact-section">
          <h4>No incluye todavia</h4>
          <ul>${(mvp.notIncluded || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Build steps</h3>
        <ol>${(mvp.buildSteps || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Criterios de aceptacion</h3>
        <ul>${(mvp.acceptanceCriteria || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Spec ejecutable</h3>
        ${renderToolSpecCard(toolSpec)}
      </article>
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Datos que guarda</h3>
        <ul>${dataModel.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Eventos que mide</h3>
        <ul>${events.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span notice-card">
        <h3>Riesgos</h3>
        <ul>${risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Cuando una app de terceros sigue ganando</h3>
        <ul>${(savings.whenThirdPartyStillBetter || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Plan de validacion</h3>
        <ol>${validationPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span">
        <h3>Siguientes pasos</h3>
        <ol>${nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      <article class="report-card full-span ${runtime.supported ? "" : "notice-card"}">
        <h3>Herramienta en Shopify</h3>
        <p>${escapeHtml(toolFactoryPublishMessage({ shop, runtime, publication, canCreateTool, replacement }))}</p>
        <p class="publish-status" id="shopifyToolCreateStatus">${
          publication
            ? `Publicada: ${escapeHtml(publication.url || publication.handle || "")}`
            : canCreateTool
              ? "Para publicarla, escribe algo como: publica esta herramienta en mi Shopify."
              : escapeHtml(toolFactoryPublishMessage({ shop, runtime, publication, canCreateTool, replacement }))
        }</p>
      </article>
    </div>`;

  lucide.createIcons();
  if (shop && !installedToolsLoaded && !report.installedToolsLoading) {
    void refreshInstalledShopifyTools(report);
  }
}

function renderInstalledShopifyTools({ tools, loaded, loading, error }) {
  if (error) return `<p>${escapeHtml(error)}</p>`;
  if (loading || !loaded) return "<p>Leyendo herramientas Agent Genia instaladas en esta tienda...</p>";
  if (!tools.length) return "<p>Todavia no hay herramientas Agent Genia registradas para esta tienda.</p>";
  return `<dl class="calculation-list">
    ${tools
      .map(
        (tool) => `<div>
          <dt>${tool.url ? `<a class="link-pill" href="${escapeHtml(tool.url)}" target="_blank" rel="noreferrer">${escapeHtml(tool.title || tool.requestedTool?.name || "Herramienta")}</a>` : escapeHtml(tool.title || tool.requestedTool?.name || "Herramienta")}</dt>
          <dd>
            ${escapeHtml([tool.category, tool.mode || tool.publishMode, tool.status].filter(Boolean).join(" · "))}
            ${renderInstalledToolActions(tool)}
          </dd>
        </div>`,
      )
      .join("")}
  </dl>`;
}

function renderInstalledToolActions(tool) {
  if (!tool?.id) return "";
  const status = tool.status || "active";
  const icon = status === "active" ? "play" : status === "paused" ? "pause" : "archive";
  return `<span class="pill-row">
    <span class="pill"><i data-lucide="${icon}"></i>${escapeHtml(status)}</span>
  </span>`;
}

function renderToolSpecCard(toolSpec) {
  if (!toolSpec?.version) return "<p>La spec se generara cuando el agente detecte la herramienta a construir.</p>";
  const fields = Array.isArray(toolSpec.fields) ? toolSpec.fields : [];
  const blocks = Array.isArray(toolSpec.blocks) ? toolSpec.blocks : [];
  const rules = Array.isArray(toolSpec.automationRules) ? toolSpec.automationRules : [];
  return `
    <dl class="calculation-list">
      <div><dt>Runtime</dt><dd>${escapeHtml(toolSpec.runtime || toolSpec.surface || "por definir")}</dd></div>
      <div><dt>Accion principal</dt><dd>${escapeHtml(toolSpec.primaryAction?.label || "Enviar solicitud")}</dd></div>
      <div><dt>Metrica de exito</dt><dd>${escapeHtml(toolSpec.successMetric || "uso repetido")}</dd></div>
      <div><dt>Destino de datos</dt><dd>${escapeHtml(toolSpec.dataDestination || "por definir")}</dd></div>
    </dl>
    ${fields.length ? `<h4>Campos</h4><ul>${fields.map((field) => `<li>${escapeHtml(field.label || field.id)}${field.required ? " · requerido" : ""}</li>`).join("")}</ul>` : ""}
    ${blocks.length ? `<h4>Bloques</h4><ul>${blocks.map((block) => `<li>${escapeHtml(`${block.type || block.id}: ${block.purpose || ""}`)}</li>`).join("")}</ul>` : ""}
    ${rules.length ? `<h4>Reglas</h4><ul>${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>` : ""}
  `;
}

async function refreshInstalledShopifyTools(report) {
  const shop = report?.shopify?.shop || "";
  if (!shop) return;
  report.installedToolsLoading = true;
  report.installedToolsError = "";
  const activeTab = document.querySelector(".tab.active")?.dataset.tab || "brief";

  try {
    const response = await fetch(`./api/shopify/tools?shop=${encodeURIComponent(shop)}`, {
      headers: shopifyToolHeaders({ accept: "application/json" }),
      credentials: "include",
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.message || "No se pudieron leer las herramientas instaladas.");
    }
    report.installedTools = Array.isArray(body.tools) ? body.tools : [];
    report.installedToolsLoaded = true;
  } catch (error) {
    report.installedToolsLoaded = true;
    report.installedToolsError = error instanceof Error ? error.message : "No se pudieron leer las herramientas instaladas.";
  } finally {
    report.installedToolsLoading = false;
    if (state.latest === report) {
      saveState(report);
      renderToolFactoryReport(report);
      activateTab(activeTab);
    }
  }
}

function toolFactoryRuntimeSupport(reportOrCategory) {
  const report = typeof reportOrCategory === "object" && reportOrCategory ? reportOrCategory : null;
  const publishMode = report?.appReplacement?.publishMode || report?.requestedTool?.publishMode || "";
  const runtimeLabel = report?.appReplacement?.runtimeLabel || report?.requestedTool?.runtimeLabel || "runtime avanzado";
  if (publishMode === "theme_template_block") {
    return {
      supported: true,
      publishMode,
      message: "Se puede instalar como bloque nativo en el template del theme de una LP existente.",
    };
  }
  if (publishMode && publishMode !== "shopify_page_mvp") {
    return {
      supported: false,
      publishMode,
      message: `Esta herramienta necesita ${runtimeLabel}. Agent Genia puede planearla, pero no debe fingir ejecucion sin ese runtime.`,
    };
  }
  if (publishMode === "shopify_page_mvp") {
    return {
      supported: true,
      publishMode,
      message: "Este reporte antiguo se puede publicar como pagina Shopify legacy.",
    };
  }

  const category = report?.requestedTool?.category || reportOrCategory;
  const normalized = String(category || "herramienta ecommerce personalizada").toLowerCase();
  if (["retencion y mensajes", "tracking y analytics", "ofertas, bundles y carrito"].includes(normalized)) {
    return {
      supported: false,
      publishMode: "advanced_runtime",
      message:
        "Esta categoria toca mensajes, pixels, checkout o descuentos. Agent Genia debe construirla como extension/runtime avanzado antes de publicarla.",
    };
  }
  return {
    supported: true,
    publishMode: "theme_template_block",
    message: "Se puede instalar como bloque nativo en el template del theme de una LP existente.",
  };
}

function toolFactoryPublishMessage({ shop, runtime, publication, replacement }) {
  if (publication) return "La herramienta ya existe en Shopify. Puedes abrirla, revisarla y decidir si iterarla.";
  if (!shop) return "Conecta una tienda Shopify para que Agent Genia pueda crear esta herramienta.";
  if (replacement?.existingTool) {
    return `Ya existe una herramienta parecida: ${replacement.existingTool.title || replacement.existingTool.category}. Para iterarla sin crear otra, pidele al agente que la actualice.`;
  }
  if (!runtime.supported) return runtime.message;
  return "Esto instala un bloque nativo en el theme de la LP objetivo: editable, medible y reversible.";
}

function shopifyToolHeaders(extra = {}) {
  return {
    ...(state.session?.access_token ? { authorization: `Bearer ${state.session.access_token}` } : {}),
    ...extra,
  };
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

function extractBrandPlan(report) {
  return report?.ai?.brandPlan || (isBackendHarnessReport(report) ? null : report?.brandPlan) || null;
}

function extractWebsitePlan(report) {
  return report?.ai?.websitePlan || (isBackendHarnessReport(report) ? null : report?.websitePlan) || null;
}

function extractCustomizationPlan(report) {
  return report?.ai?.customizationPlan || (isBackendHarnessReport(report) ? null : report?.customizationPlan) || null;
}

function extractProblemDiscovery(report) {
  return report?.ai?.problemDiscovery || (isBackendHarnessReport(report) ? null : report?.problemDiscovery) || null;
}

function isBackendHarnessReport(report) {
  return report?.backendMode === "codex-harness";
}

function isBrandStrategyReport(report) {
  return (
    report?.businessStage === "brand" ||
    report?.selectedInternalTool === "brand-audit-agent" ||
    report?.selectedInternalTool === "problem-discovery-agent" ||
    Boolean(extractBrandPlan(report)) ||
    Boolean(extractWebsitePlan(report))
  );
}

function renderBrandPlanCard(brandPlan) {
  if (!brandPlan) return "";
  const selectedName = brandPlan.selectedName || {};
  const options = Array.isArray(brandPlan.nameOptions) ? brandPlan.nameOptions : [];
  const taglines = Array.isArray(brandPlan.taglineOptions) ? brandPlan.taglineOptions : [];
  const nextChecks = Array.isArray(brandPlan.nextChecks) ? brandPlan.nextChecks : [];

  return `<article class="report-card full-span">
    <h3>Nombre y colores</h3>
    <p>${escapeHtml(brandPlan.namingBrief || "El agente eligio una direccion de marca desde problema y nicho.")}</p>
    <div class="brand-plan-hero">
      <div>
        <span class="eyebrow">Nombre recomendado</span>
        <strong>${escapeHtml(selectedName.name || "Nombre pendiente")}</strong>
        <p>${escapeHtml(selectedName.rationale || selectedName.problemFit || "Revisar ajuste con cliente, nicho y disponibilidad.")}</p>
      </div>
      ${renderBrandPalette(brandPlan.colorPalette)}
    </div>
    ${options.length ? `<div class="brand-name-options">${options.slice(0, 4).map((option) => `
      <div>
        <strong>${escapeHtml(option.name)}</strong>
        <p>${escapeHtml(option.problemFit || option.rationale || "")}</p>
      </div>`).join("")}</div>` : ""}
    ${taglines.length ? `<h4>Taglines</h4><ul>${taglines.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${nextChecks.length ? `<h4>Checks antes de usarlo</h4><ul>${nextChecks.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

function renderBrandPalette(palette = {}) {
  const tokens = [
    ["Primary", palette.primary],
    ["Secondary", palette.secondary],
    ["Accent", palette.accent],
    ["Background", palette.background],
    ["Text", palette.text],
  ].filter(([, value]) => value);

  if (!tokens.length) return "";
  return `<div class="brand-palette" aria-label="Paleta de marca">
    ${tokens.map(([label, value]) => {
      const color = safeHexColor(value);
      return `<span class="brand-swatch" title="${escapeHtml(`${label}: ${value}`)}">
        <span style="background:${color}"></span>
        <small>${escapeHtml(value)}</small>
      </span>`;
    }).join("")}
  </div>`;
}

function safeHexColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#d9e1dc";
}

function buildBrandWebsitePlan(report, brandPlan, audit) {
  const brand = normalizeBrandContext(report);
  const selectedName = brandPlan?.selectedName?.name || brand.name;
  const product = report.product || report.ai?.executiveBrief?.product || "producto principal";
  const problem =
    brandPlan?.selectedName?.problemFit ||
    report.problem ||
    report.productDetails ||
    report.naturalRequest ||
    "un problema claro del cliente";

  return {
    recommendation: "Convertir la direccion de marca en una landing simple antes de construir un sitio grande.",
    firstBuild: `Primera pagina para ${selectedName}: hero claro, problema, oferta, prueba, FAQ y CTA principal.`,
    stackSuggestion: "Landing + checkout/WhatsApp para validar; Shopify cuando haya catalogo, pagos e inventario que administrar.",
    hero: {
      headline: `${selectedName} ayuda a resolver ${String(problem).slice(0, 80)}`,
      subheadline: `Presenta ${product} con una promesa concreta, visuales consistentes y una accion facil de tomar.`,
      primaryCta: "Ver la oferta",
      secondaryCta: "Como funciona",
    },
    brandApplication: [
      "Usar primary para encabezados, nav y botones principales.",
      "Usar accent solo en CTA, iconos o detalles que necesiten energia.",
      "Usar background/text para mantener lectura clara en mobile.",
    ],
    requiredSections: [
      "Hero con promesa y CTA",
      "Problema del cliente",
      "Producto u oferta principal",
      "Beneficios y diferenciadores",
      "Prueba social o confianza",
      "FAQ",
      "CTA final",
    ],
    sections: [
      { name: "Hero", goal: "explicar que vende la marca y para quien es", copyAngle: "nombre + beneficio principal + CTA" },
      { name: "Problema", goal: "hacer que el visitante se sienta entendido", copyAngle: "dolor cotidiano con lenguaje simple" },
      { name: "Oferta", goal: "presentar el producto o bundle principal", copyAngle: "beneficios concretos y que incluye" },
      { name: "Prueba", goal: "crear confianza", copyAngle: "reviews, demos, historia, materiales o garantia" },
      { name: "FAQ", goal: "reducir dudas", copyAngle: "envio, devoluciones, uso, calidad y tiempos" },
      { name: "CTA final", goal: "cerrar con una accion", copyAngle: "comprar, reservar, WhatsApp o lista de espera" },
    ],
    copyBlocks: audit?.messaging || [
      "Hook de dolor: lo que el cliente intenta resolver hoy.",
      "Hook de resultado: como se ve la vida despues de comprar.",
      "Hook de prueba: evidencia, reviews o comparacion.",
    ],
    launchGuardrails: [
      "No construir catalogo grande antes de validar una oferta.",
      "No usar claims medicos, financieros o absolutos sin evidencia.",
      "Medir clics al CTA, conversion, preguntas frecuentes y abandono.",
    ],
    nextBuildSteps: [
      "Escoger una oferta principal y un CTA.",
      "Reunir fotos/video reales, precio, tiempos de envio y politica de cambios.",
      "Crear landing mobile-first con la paleta de brandPlan.",
      "Probar 7-14 dias con contenido organico antes de subir presupuesto.",
    ],
  };
}

function renderWebsitePlanCard(websitePlan, brandPlan, brandNameFallback = "Marca") {
  if (!websitePlan) return "";
  const palette = brandPlan?.colorPalette || {};
  const hero = websitePlan.hero || {};
  const brandName = brandPlan?.selectedName?.name || brandNameFallback;
  const sections = normalizeWebsiteSections(websitePlan);
  const brandApplication = Array.isArray(websitePlan.brandApplication) ? websitePlan.brandApplication : [];
  const copyBlocks = Array.isArray(websitePlan.copyBlocks) ? websitePlan.copyBlocks : [];
  const guardrails = Array.isArray(websitePlan.launchGuardrails) ? websitePlan.launchGuardrails : [];
  const steps = Array.isArray(websitePlan.nextBuildSteps) ? websitePlan.nextBuildSteps : [];
  const previewStyle = [
    `--website-primary:${safeHexColor(palette.primary || "#173F3A")}`,
    `--website-secondary:${safeHexColor(palette.secondary || "#E8DDC7")}`,
    `--website-accent:${safeHexColor(palette.accent || "#D06C4B")}`,
    `--website-bg:${safeHexColor(palette.background || "#FBFAF6")}`,
    `--website-text:${safeHexColor(palette.text || "#121816")}`,
  ].join(";");

  return `<article class="report-card full-span">
    <h3>Primera web</h3>
    <p>${escapeHtml(websitePlan.recommendation || "Crear una landing simple conectada a la direccion de marca.")}</p>
    <div class="website-plan-grid">
      <div class="website-preview" style="${previewStyle}">
        <div class="website-preview-nav">
          <strong>${escapeHtml(brandName)}</strong>
          <span></span>
        </div>
        <div class="website-preview-hero">
          <span>${escapeHtml(websitePlan.stackSuggestion || "Landing de validacion")}</span>
          <h4>${escapeHtml(hero.headline || websitePlan.firstBuild || "Hero pendiente")}</h4>
          <p>${escapeHtml(hero.subheadline || "Subheadline pendiente.")}</p>
          <button type="button">${escapeHtml(hero.primaryCta || "Ver oferta")}</button>
        </div>
      </div>
      <div>
        <h4>Secciones</h4>
        <div class="website-section-list">
          ${sections.slice(0, 6).map((section) => `<div>
            <strong>${escapeHtml(section.name)}</strong>
            <p>${escapeHtml(section.copyAngle || section.goal || "")}</p>
          </div>`).join("")}
        </div>
      </div>
    </div>
    ${brandApplication.length ? `<h4>Aplicacion de marca</h4><ul>${brandApplication.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${copyBlocks.length ? `<h4>Copy inicial</h4><ul>${copyBlocks.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${guardrails.length ? `<h4>Reglas de lanzamiento</h4><ul>${guardrails.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${steps.length ? `<h4>Siguientes pasos de build</h4><ol>${steps.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : ""}
  </article>`;
}

function renderProblemDiscoveryCard(problemDiscovery) {
  if (!problemDiscovery) return "";
  const coverage = Array.isArray(problemDiscovery.sourceCoverage) ? problemDiscovery.sourceCoverage : [];
  const avatars = Array.isArray(problemDiscovery.avatars) ? problemDiscovery.avatars : [];
  const pains = Array.isArray(problemDiscovery.painPoints) ? problemDiscovery.painPoints : [];
  const angles = Array.isArray(problemDiscovery.angleCandidates) ? problemDiscovery.angleCandidates : [];
  const products = Array.isArray(problemDiscovery.productHypotheses) ? problemDiscovery.productHypotheses : [];
  const evidence = Array.isArray(problemDiscovery.evidenceMatrix) ? problemDiscovery.evidenceMatrix : [];
  const creative = problemDiscovery.creativeBrief || {};
  const score = Number.isFinite(Number(problemDiscovery.opportunityScore))
    ? Math.max(0, Math.min(100, Number(problemDiscovery.opportunityScore)))
    : 0;

  return `<article class="report-card full-span problem-discovery-card">
    <h3>Problem discovery</h3>
    <p>${escapeHtml(problemDiscovery.decision || "El agente preparo el mapa de problema, avatar, angulo y producto para validar.")}</p>
    <div class="problem-score-row">
      <div class="problem-score">
        <strong>${score}/100</strong>
        <span>${escapeHtml(problemDiscovery.confidence || "confianza pendiente")}</span>
        <div class="score-track"><span style="width: ${score}%"></span></div>
      </div>
      <div>
        <span class="eyebrow">Pregunta de research</span>
        <p>${escapeHtml(problemDiscovery.researchQuestion || "Que problema vale la pena resolver, para quien y con que producto?")}</p>
      </div>
    </div>
    ${coverage.length ? `<h4>Fuentes</h4><div class="source-coverage-grid">
      ${coverage.slice(0, 3).map((source) => `<article>
        <strong>${escapeHtml(source.source || "Fuente")}</strong>
        <span>${escapeHtml(source.status || "pendiente")}</span>
        <p>${escapeHtml(source.coverage || source.whatItCanProve || "")}</p>
      </article>`).join("")}
    </div>` : ""}
    ${avatars.length || pains.length ? `<div class="problem-map-grid">
      ${avatars.length ? `<div>
        <h4>Avatar</h4>
        ${avatars.slice(0, 2).map((avatar) => `<article class="problem-mini-card">
          <strong>${escapeHtml(avatar.name || "Avatar")}</strong>
          <p>${escapeHtml(avatar.problem || "")}</p>
          <small>${escapeHtml(avatar.trigger || "")}</small>
          ${Array.isArray(avatar.language) && avatar.language.length ? `<ul>${avatar.language.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        </article>`).join("")}
      </div>` : ""}
      ${pains.length ? `<div>
        <h4>Pains</h4>
        ${pains.slice(0, 2).map((pain) => `<article class="problem-mini-card">
          <strong>${escapeHtml(pain.pain || "Pain")}</strong>
          <p>${escapeHtml(pain.desiredOutcome || "")}</p>
          <small>${escapeHtml(`Urgencia: ${pain.urgency || "pendiente"}`)}</small>
        </article>`).join("")}
      </div>` : ""}
    </div>` : ""}
    ${angles.length ? `<h4>Angulos candidatos</h4><div class="angle-grid">
      ${angles.slice(0, 3).map((angle) => `<article>
        <div><strong>${escapeHtml(angle.angle || "Angulo")}</strong><span>${escapeHtml(`${Number(angle.score || 0)}/100`)}</span></div>
        <p>${escapeHtml(angle.creativeHook || angle.whyItMayBeUnderused || "")}</p>
        <small>${escapeHtml(angle.proofNeeded || angle.risk || "")}</small>
      </article>`).join("")}
    </div>` : ""}
    ${products.length ? `<h4>Producto hipotesis</h4><ul>${products.slice(0, 2).map((item) => `<li><strong>${escapeHtml(item.product || "Producto")}</strong>: ${escapeHtml(item.whyItSolves || item.validationStep || "")}</li>`).join("")}</ul>` : ""}
    ${evidence.length ? `<h4>Evidencia / hipotesis</h4><ul>${evidence.slice(0, 4).map((item) => `<li>${escapeHtml(`${item.source || "Fuente"}: ${item.signal || item.quoteOrObservation || ""} (${item.confidence || "confianza pendiente"})`)}</li>`).join("")}</ul>` : ""}
    ${creative.hooks?.length ? `<h4>Hooks iniciales</h4><ul>${creative.hooks.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

function renderCustomizationPlanCard(customizationPlan, brandPlan) {
  if (!customizationPlan) return "";
  const variants = Array.isArray(customizationPlan.variantOptions) ? customizationPlan.variantOptions : [];
  const packagingOptions = Array.isArray(customizationPlan.packagingOptions) ? customizationPlan.packagingOptions : [];
  const supplierQuestions = Array.isArray(customizationPlan.supplierQuestions) ? customizationPlan.supplierQuestions : [];
  const samplePlan = Array.isArray(customizationPlan.samplePlan) ? customizationPlan.samplePlan : [];
  const qualityChecks = Array.isArray(customizationPlan.qualityChecks) ? customizationPlan.qualityChecks : [];
  const nextSteps = Array.isArray(customizationPlan.nextSteps) ? customizationPlan.nextSteps : [];
  const palette = brandPlan?.colorPalette || {};
  const accent = safeHexColor(palette.accent || "#D06C4B");
  const primary = safeHexColor(palette.primary || "#173F3A");

  return `<article class="report-card full-span customization-card" style="--custom-primary:${primary};--custom-accent:${accent};">
    <h3>Producto personalizado</h3>
    <p>${escapeHtml(customizationPlan.productConcept || "El agente preparo variantes de producto, empaque y branding para validar con proveedores.")}</p>
    <div class="customization-direction">
      <div>
        <span>Diferenciacion</span>
        <strong>${escapeHtml(customizationPlan.differentiationAngle || "Diferenciar por uso, empaque y confianza; no solo por logo.")}</strong>
      </div>
      <div>
        <span>Ruta recomendada</span>
        <strong>${escapeHtml(customizationPlan.recommendedDirection || "Empezar con una version low-MOQ y muestras antes de bulk order.")}</strong>
      </div>
    </div>
    ${variants.length ? `<h4>Variantes</h4><div class="customization-grid">
      ${variants.slice(0, 3).map((variant) => `<article class="customization-option">
        <span>${escapeHtml(variant.bestFor || "primer test")}</span>
        <strong>${escapeHtml(variant.name || "Variante")}</strong>
        <p>${escapeHtml(variant.productChanges || "")}</p>
        <dl>
          <div><dt>Empaque</dt><dd>${escapeHtml(variant.packaging || "--")}</dd></div>
          <div><dt>Branding</dt><dd>${escapeHtml(variant.branding || "--")}</dd></div>
        </dl>
        ${Array.isArray(variant.risks) && variant.risks.length ? `<small>${escapeHtml(variant.risks[0])}</small>` : ""}
      </article>`).join("")}
    </div>` : ""}
    ${packagingOptions.length ? `<h4>Opciones de empaque</h4><div class="packaging-grid">
      ${packagingOptions.slice(0, 3).map((option) => `<article class="packaging-option">
        <strong>${escapeHtml(option.name || "Empaque")}</strong>
        <p>${escapeHtml(option.format || "")}</p>
        <ul>
          <li>${escapeHtml(option.materials || "material por confirmar")}</li>
          <li>${escapeHtml(option.finish || "acabado por confirmar")}</li>
          <li>${escapeHtml(option.unitCostImpact || "impacto de costo por confirmar")}</li>
          <li>${escapeHtml(option.moqImpact || "MOQ por confirmar")}</li>
          <li>${escapeHtml(option.shippingRisk || "riesgo de flete por confirmar")}</li>
        </ul>
      </article>`).join("")}
    </div>` : ""}
    ${customizationPlan.supplierBrief ? `<h4>Brief para proveedor</h4><pre class="supplier-brief">${escapeHtml(customizationPlan.supplierBrief)}</pre>` : ""}
    ${supplierQuestions.length ? `<h4>Preguntas al proveedor</h4><ul>${supplierQuestions.slice(0, 7).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${samplePlan.length || qualityChecks.length || nextSteps.length ? renderCompactSections([
      ["Muestras", samplePlan],
      ["Calidad", qualityChecks],
      ["Siguiente", nextSteps],
    ].filter(([, items]) => items.length)) : ""}
  </article>`;
}

function renderAgentAnswerCard({ report, ai, problemDiscovery, topRisks, agentWorkLog, backendMode }) {
  const brief = ai?.executiveBrief || {};
  const nextSteps = normalizeTextList(ai?.beginnerNextSteps?.length ? ai.beginnerNextSteps : problemDiscovery?.nextSteps);
  const lead =
    brief.decision ||
    problemDiscovery?.decision ||
    (backendMode
      ? "El harness respondio, pero no devolvio una respuesta principal suficientemente clara."
      : "El agente preparo el flujo interno para convertir la solicitud en una decision accionable.");
  const path =
    brief.recommendedPath ||
    problemDiscovery?.recommendedPath ||
    "Primero entender el problema y el mercado; despues pasar por margen, envio, devoluciones, diferenciacion y canal.";
  const understood = [
    report.product ? `Producto/contexto: ${report.product}.` : "",
    report.market ? `Mercado: ${report.market}.` : "",
    report.destination ? `Destino usado para logistica: ${report.destination}.` : "",
    report.selectedInternalTool ? `Herramienta interna: ${toolLabel(report.selectedInternalTool)}.` : "",
  ].filter(Boolean);
  const riskItems = normalizeTextList(topRisks).slice(0, 4);
  const actionItems = (nextSteps.length ? nextSteps : [path]).slice(0, 5);

  return `<article class="report-card full-span agent-answer-card">
    <div class="answer-kicker"><i data-lucide="sparkles"></i><span>Respuesta del agente</span></div>
    <p class="answer-lead">${escapeHtml(lead)}</p>
    <div class="answer-columns">
      <section>
        <h4>Cómo lo estoy viendo</h4>
        <p>${escapeHtml(path)}</p>
        ${understood.length ? `<ul>${understood.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      </section>
      <section>
        <h4>Lo que haría después</h4>
        <ul>${actionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h4>Lo que no ignoraría</h4>
        <ul>${riskItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Separar datos reales de hipotesis antes de comprar inventario.</li>"}</ul>
      </section>
    </div>
    <details class="agent-trace">
      <summary>Ver cómo trabajó</summary>
      ${renderAgentWorkLog(agentWorkLog)}
    </details>
  </article>`;
}

function normalizeTextList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeWebsiteSections(websitePlan = {}) {
  if (Array.isArray(websitePlan.sections) && websitePlan.sections.length) {
    return websitePlan.sections;
  }
  return (websitePlan.requiredSections || []).map((section) => ({
    name: section,
    goal: "Seccion necesaria para la primera version.",
    copyAngle: section,
  }));
}

function renderReport(report) {
  if (isBrandStrategyReport(report)) {
    renderBrandReport(report);
    return;
  }

  const storeContext = commerceContext(report);
  const isShopify = report.businessStage === "shopify" || Boolean(storeContext.storeId && report.selectedInternalTool === "shopify-store-audit");
  const backendMode = isBackendHarnessReport(report);
  setTabLabels(isShopify ? tabLabelSets.shopify : tabLabelSets.sourcing);
  const ai = report.ai || null;
  const brandPlan = extractBrandPlan(report);
  const problemDiscovery = extractProblemDiscovery(report);
  const customizationPlan = extractCustomizationPlan(report);
  const supplierShortlist = ai?.supplierShortlist?.length ? ai.supplierShortlist : backendMode ? [] : report.supplierProfiles;
  const agentWorkLog = ai?.agentWorkLog?.length ? ai.agentWorkLog : backendMode ? [] : report.agentTasks;
  const topRisks = ai?.executiveBrief?.topRisks?.length
    ? ai.executiveBrief.topRisks
    : backendMode
      ? ["El harness no devolvio riesgos especificos para esta ejecucion."]
      : [
        "comprar inventario sin muestra aprobada",
        "comparar solo precio sin costo DDP aterrizado",
        "aceptar certificaciones o DDP sin documentos",
      ];
  const goals = (report.goals || []).map((key) => goalConfig[key]?.label || key).join(", ");
  const shopifyOverview = isShopify ? renderShopifyOverview(report) : "";
  const shopifyProductCount = storeContext.products.length || 0;
  const backendNotice = report.backendError
    ? `<article class="report-card full-span notice-card">
        <h3>Backend privado</h3>
        <p>${escapeHtml(report.backendError)}</p>
      </article>`
    : "";

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${isShopify ? shopifyProductCount : supplierShortlist.length}</strong><p>${isShopify ? "productos de tienda" : ai ? "proveedores" : "candidatos meta"}</p></article>
      <article class="metric-card"><strong>${isShopify ? (storeContext.label || "--") : report.targetUnitCost ? formatMoney(report.targetUnitCost) : "--"}</strong><p>${isShopify ? storeContext.platformLabel || "tienda" : "costo objetivo"}</p></article>
      <article class="metric-card"><strong>${escapeHtml(toolLabel(report.selectedInternalTool))}</strong><p>herramienta interna</p></article>
    </div>
    <div class="report-grid">
      ${renderAgentAnswerCard({ report, ai, problemDiscovery, topRisks, agentWorkLog, backendMode })}
      <article class="report-card full-span">
        <h3>Herramientas activas</h3>
        <p>${escapeHtml(goals)}</p>
      </article>
      ${renderProblemDiscoveryCard(problemDiscovery)}
      ${renderBrandPlanCard(brandPlan)}
      ${shopifyOverview}
      ${backendNotice}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      ${isShopify ? renderShopifyOverview(report) : ""}
      ${renderProblemDiscoveryCard(problemDiscovery)}
      <article class="report-card full-span">
        <h3>Routing interno</h3>
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
        ])}` : backendMode ? "<p>El harness no devolvio supplierSearchPlan; no se muestran criterios simulados.</p>" : renderCompactSections([
          ["Queries internas", report.evidenceLinks.map((source) => source.query)],
          ["Filtros", ["Verified Supplier", "Trade Assurance", "sample available", "MOQ compatible", "respuesta clara sobre DDP"]],
          ["Reglas de rechazo", ["sin muestra", "sin Trade Assurance", "DDP ambiguo", "certificados no verificables", "presion para pagar fuera de Alibaba"]],
        ])}
      </article>
    </div>`;

  const negotiation = ai?.negotiationPlan || (backendMode ? missingNegotiationPlan() : buildNegotiationPlan(report));
  const outreachQueue = ai?.supplierOutreachQueue?.length
    ? ai.supplierOutreachQueue
    : backendMode
      ? []
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

  const ddp = ai?.ddpPlan || (backendMode ? missingDdpPlan(report) : buildDdpPlan(report));
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

  const quality = ai?.qualityPlan || (backendMode ? missingQualityPlan() : buildQualityPlan(report));
  document.querySelector("#quality").innerHTML = `
    <div class="report-grid">
      ${renderCustomizationPlanCard(customizationPlan, brandPlan)}
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
    </div>`;

  lucide.createIcons();
}

function missingNegotiationPlan() {
  return {
    rfqMessage: "El harness no devolvio rfqMessage.",
    priceNegotiationMessage: "El harness no devolvio priceNegotiationMessage.",
    moqMessage: "El harness no devolvio moqMessage.",
    sampleMessage: "El harness no devolvio sampleMessage.",
    termsToConfirm: ["negotiationPlan no devuelto por el harness"],
  };
}

function missingDdpPlan(report) {
  return {
    destination: report.destination || "destino pendiente",
    ddpQuestions: [],
    includedChecklist: [],
    redFlags: ["ddpPlan no devuelto por el harness"],
    fallbackIncoterm: "pendiente",
  };
}

function missingQualityPlan() {
  return {
    sampleChecklist: [],
    certificationChecks: [],
    inspectionPlan: [],
    packagingChecks: [],
    noGoDefects: ["qualityPlan no devuelto por el harness"],
  };
}

function renderBrandReport(report) {
  resultPanel.hidden = false;
  setTabLabels(tabLabelSets.brand);

  const backendMode = isBackendHarnessReport(report);
  const brand = normalizeBrandContext(report);
  const audit = backendMode ? buildBackendBrandAudit(report, brand) : buildBrandAudit(report, brand);
  const brandPlan = extractBrandPlan(report);
  const websitePlan = extractWebsitePlan(report) || (!backendMode && brandPlan ? buildBrandWebsitePlan(report, brandPlan, audit) : null);
  const problemDiscovery = extractProblemDiscovery(report);
  const customizationPlan = extractCustomizationPlan(report);
  const competitorInspiration = backendMode ? buildBackendCompetitorInspiration(report, brand) : buildCompetitorInspiration(report, brand);
  const creativePerformance = buildCreativePerformanceLab(report, brand, competitorInspiration);
  const angleValidator = normalizeAngleWhitespaceValidator(report.angleValidation || report.angleWhitespaceValidator || report.ai?.angleWhitespaceValidator);
  const storeContext = commerceContext(report);
  const shopifyOverview = storeContext.storeId ? renderShopifyOverview(report) : "";
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
      ${renderBrandPlanCard(brandPlan)}
      ${renderProblemDiscoveryCard(problemDiscovery)}
      ${shopifyOverview}
      ${backendNotice}
    </div>`;

  document.querySelector("#tools").innerHTML = `
    <div class="report-grid">
      ${renderProblemDiscoveryCard(problemDiscovery)}
      ${renderCompetitorInspiration(competitorInspiration)}
      ${renderAngleWhitespaceValidator(angleValidator)}
      ${renderCreativePerformanceLab(creativePerformance)}
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
          <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(storeContext.storeId ? `${storeContext.platformLabel}: ${storeContext.label || storeContext.storeId}` : "tienda opcional")}</span>
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
      ${renderCustomizationPlanCard(customizationPlan, brandPlan)}
    </div>`;

  document.querySelector("#negotiation").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Plan de crecimiento</h3>
        <ol>${audit.growth.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
      ${renderCreativeTestPlan(creativePerformance)}
      <article class="report-card full-span">
        <h3>Mensajes a probar</h3>
        <ul>${audit.messaging.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#ddp").innerHTML = `
    <div class="report-grid">
      ${renderWebsitePlanCard(websitePlan, brandPlan, brand.name)}
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
  const angleValidator = normalizeAngleWhitespaceValidator(report.angleValidation || report.angleWhitespaceValidator || report.ai?.angleWhitespaceValidator);
  const primaryAngle =
    angleValidator?.angles.find((angle) => angle.verdict === "libre_necesita_test") ||
    angleValidator?.angles.find((angle) => angle.verdict === "debil") ||
    angleValidator?.angles[0] ||
    null;
  const primary = candidates[0] || {};

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row compact-metrics">
      <article class="metric-card"><strong>${escapeHtml(brand.name || "Marca")}</strong><p>marca</p></article>
      <article class="metric-card"><strong>${escapeHtml(brief.confidence || primaryAngle?.confidence || primary.confidence || "baja")}</strong><p>confianza</p></article>
      <article class="metric-card"><strong>${candidates.length}</strong><p>hipotesis</p></article>
      <article class="metric-card"><strong>${angleValidator?.angles.length || 0}</strong><p>angulos</p></article>
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
      ${renderAngleWhitespaceValidator(angleValidator)}
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
          <div><dt>Angulo</dt><dd>${escapeHtml(primaryAngle?.angle || primary.title || "angulo pendiente")}</dd></div>
          <div><dt>Veredicto</dt><dd>${escapeHtml(primaryAngle?.verdictLabel || "necesita test")}</dd></div>
          <div><dt>Canal</dt><dd>${escapeHtml(primary.channel || "canal principal pendiente")}</dd></div>
          <div><dt>Test</dt><dd>${escapeHtml(primaryAngle?.nextTest || primary.validationTest || "landing/PDP + creativos pequenos")}</dd></div>
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

function normalizeAngleWhitespaceValidator(value) {
  const source = value || {};
  const rawAngles = Array.isArray(source.angles) ? source.angles : [];
  const angles = rawAngles
    .map((angle) => {
      const verdict = angle.verdict || normalizeAngleVerdict(angle.verdictLabel);
      const meta = angleVerdictDisplay(verdict);
      return {
        angle: angle.angle || angle.title || "Angulo pendiente",
        verdict,
        verdictLabel: angle.verdictLabel || meta.label,
        saturationLevel: angle.saturationLevel || "pendiente",
        demandSignal: angle.demandSignal || "pendiente",
        competitorPressure: angle.competitorPressure || "pendiente",
        confidence: angle.confidence || "baja",
        evidence: Array.isArray(angle.evidence) ? angle.evidence : [],
        why: angle.why || "",
        risk: angle.risk || "",
        nextTest: angle.nextTest || "",
        decisionRule: angle.decisionRule || "",
        recommendedAction: angle.recommendedAction || meta.action,
      };
    })
    .filter((angle) => angle.angle);
  if (!angles.length) return null;
  const verdictCounts = source.verdictCounts || angles.reduce(
    (counts, angle) => {
      counts[angle.verdict] = (counts[angle.verdict] || 0) + 1;
      return counts;
    },
    { explotado: 0, debil: 0, libre_necesita_test: 0, no_recomendado: 0 },
  );
  const competitors = Array.isArray(source.competitors) ? source.competitors : [];
  return {
    summary: source.summary || `Se evaluaron ${angles.length} angulos contra el contexto disponible.`,
    primaryRecommendation: source.primaryRecommendation || angles[0]?.recommendedAction || "",
    verdictCounts,
    competitors,
    angles,
    guardrails: Array.isArray(source.guardrails) ? source.guardrails : [],
  };
}

function normalizeAngleVerdict(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("explot")) return "explotado";
  if (text.includes("debil")) return "debil";
  if (text.includes("no recomendado")) return "no_recomendado";
  return "libre_necesita_test";
}

function angleVerdictDisplay(verdict) {
  if (verdict === "explotado") {
    return {
      label: "Explotado",
      tone: "notice-card",
      action: "No competir igual; estrechar avatar, mecanismo o prueba.",
    };
  }
  if (verdict === "debil") {
    return {
      label: "Debil / mal defendido",
      tone: "notice-card",
      action: "Hacerlo mas especifico antes de convertirlo en posicionamiento.",
    };
  }
  if (verdict === "no_recomendado") {
    return {
      label: "No recomendado",
      tone: "notice-card",
      action: "No usar hasta resolver evidencia, claims y margen.",
    };
  }
  return {
    label: "Libre, necesita test",
    tone: "success-card",
    action: "Probar pequeno con landing/PDP o 3-5 creativos antes de invertir fuerte.",
  };
}

function renderAngleWhitespaceValidator(validator) {
  if (!validator) return "";
  const counts = validator.verdictCounts || {};
  const primary =
    validator.angles.find((angle) => angle.verdict === "libre_necesita_test") ||
    validator.angles.find((angle) => angle.verdict === "debil") ||
    validator.angles[0];
  return `<article class="report-card full-span angle-validator-card">
    <h3>Angle / Whitespace Validator</h3>
    <p>${escapeHtml(validator.summary)}</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="search-check"></i>${escapeHtml(primary?.verdictLabel || "veredicto pendiente")}</span>
      <span class="pill"><i data-lucide="target"></i>${escapeHtml(primary?.angle || "angulo pendiente")}</span>
      <span class="pill"><i data-lucide="users-round"></i>${validator.competitors.length || 0} competidor(es)</span>
    </div>
    <div class="metric-row compact-metrics">
      <article class="metric-card"><strong>${counts.explotado || 0}</strong><p>explotados</p></article>
      <article class="metric-card"><strong>${counts.debil || 0}</strong><p>debiles</p></article>
      <article class="metric-card"><strong>${counts.libre_necesita_test || 0}</strong><p>libres con test</p></article>
      <article class="metric-card"><strong>${counts.no_recomendado || 0}</strong><p>no usar</p></article>
    </div>
    <div class="table-wrap">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Angulo</th>
            <th>Veredicto</th>
            <th>Saturacion</th>
            <th>Senal</th>
            <th>Presion</th>
            <th>Siguiente test</th>
          </tr>
        </thead>
        <tbody>
          ${validator.angles.map((angle) => `<tr>
            <td><strong>${escapeHtml(angle.angle)}</strong><small>${escapeHtml(angle.why || "")}</small></td>
            <td><strong>${escapeHtml(angle.verdictLabel)}</strong><small>${escapeHtml(angle.recommendedAction || "")}</small></td>
            <td>${escapeHtml(angle.saturationLevel)}</td>
            <td>${escapeHtml(angle.demandSignal)}</td>
            <td>${escapeHtml(angle.competitorPressure)}</td>
            <td>${escapeHtml(angle.nextTest || angle.decisionRule || "")}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${validator.competitors.length ? `<div class="compact-section">
      <h4>Competidores usados como referencia</h4>
      <ul>${validator.competitors.map((competitor) => `<li><strong>${escapeHtml(competitor.name || "Competidor")}</strong>: ${escapeHtml((competitor.observedAngles || []).join(", ") || competitor.evidence || "sin patron confirmado")}</li>`).join("")}</ul>
    </div>` : ""}
    ${validator.guardrails.length ? `<div class="compact-section">
      <h4>Guardrails</h4>
      <ul>${validator.guardrails.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>` : ""}
  </article>`;
}

function emptyReportCard(title, copy) {
  return `<article class="report-card full-span"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></article>`;
}

function renderCompetitorInspiration(inspiration) {
  const rows = inspiration.rows || [];
  const references = inspiration.references || [];
  if (!rows.length && !references.length) return "";
  return `<article class="report-card full-span">
    <h3>Analizador de competencia</h3>
    <p>Desglose para inspiracion creativa. No copia claims: convierte patrones en angulos propios para la marca.</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="scan-search"></i>${references.length ? `${references.length} referencia(s)` : "referencias por prompt"}</span>
      <span class="pill"><i data-lucide="message-square-text"></i>hooks + headlines</span>
      <span class="pill"><i data-lucide="user-round-search"></i>avatar + pain points</span>
    </div>
    ${references.length ? `<div class="compact-section">
      <h4>Referencias detectadas</h4>
      <ul>${references.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>` : ""}
    <div class="inspiration-grid">
      ${rows
        .map(
          (row) => `<article class="inspiration-card">
            <div><span>Formato</span><strong>${escapeHtml(row.format)}</strong></div>
            <div><span>Avatar</span><strong>${escapeHtml(row.avatar)}</strong></div>
            <div><span>Pain point</span><strong>${escapeHtml(row.painPoint)}</strong></div>
            <div><span>Hook</span><strong>${escapeHtml(row.hook)}</strong></div>
            <div><span>Headline</span><strong>${escapeHtml(row.headline)}</strong></div>
          </article>`,
        )
        .join("")}
    </div>
  </article>`;
}

function renderCreativePerformanceLab(lab) {
  if (!lab?.shouldRender) return "";
  const rows = lab.rows || [];
  return `<article class="report-card full-span creative-lab-card">
    <h3>Patrones de performance creativa</h3>
    <p>${escapeHtml(lab.summary)}</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="trending-up"></i>${escapeHtml(lab.confidence)}</span>
      <span class="pill"><i data-lucide="badge-dollar-sign"></i>paid + organico</span>
      <span class="pill"><i data-lucide="video"></i>ads y videos virales</span>
    </div>
    <div class="creative-split">
      <section>
        <h4>Patrones ganadores</h4>
        <ul>${(lab.winnerPatterns || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h4>Patrones que suelen perder</h4>
        <ul>${(lab.loserPatterns || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    </div>
    <div class="table-wrap creative-table-wrap">
      <table class="comparison-table creative-performance-table">
        <thead>
          <tr>
            <th>Fuente</th>
            <th>Estado</th>
            <th>Formato</th>
            <th>Hook</th>
            <th>Elementos</th>
            <th>Siguiente test</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>
            <td>${escapeHtml(row.source)}</td>
            <td><strong>${escapeHtml(row.status)}</strong><small>${escapeHtml(row.evidence || "")}</small></td>
            <td>${escapeHtml(row.format)}</td>
            <td>${escapeHtml(row.hook)}</td>
            <td>${escapeHtml(row.elements)}</td>
            <td>${escapeHtml(row.nextTest)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="creative-split three">
      <section>
        <h4>Video viral / organico</h4>
        <ul>${(lab.organicElements || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h4>Paid ads</h4>
        <ul>${(lab.paidElements || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h4>Metricas necesarias</h4>
        <ul>${(lab.metricChecklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    </div>
  </article>`;
}

function renderCreativeTestPlan(lab) {
  if (!lab?.shouldRender) return "";
  return `<article class="report-card full-span">
    <h3>Tests creativos</h3>
    <ol>${(lab.nextTests || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
  </article>`;
}

function normalizeBrandContext(report) {
  const brand = report.brand || {};
  const storeContext = commerceContext(report);
  const promptBrand = inferBrandContext(report.naturalRequest || "");
  const url = brand.url || promptBrand.url || "";
  const referenceMode = isReferenceBrandRequest(report.naturalRequest || "") && !brand.name;
  const inferredName =
    brand.name ||
    (referenceMode ? "Marca nueva" : "") ||
    promptBrand.name ||
    inferBrandNameFromUrl(url) ||
    report.product?.split(/\s+/).slice(0, 4).join(" ") ||
    "Marca";
  return {
    name: inferredName,
    url,
    channels: brand.channels || promptBrand.channels || "canales no definidos",
    goal: brand.goal || storeContext.focus || promptBrand.goal || "crecer con mejor contexto",
    stage: storeContext.storeId
      ? `con ${storeContext.platformLabel} conectado`
      : referenceMode
        ? "marca por definir con referencia competitiva"
      : url ? "marca con presencia digital" : "contexto inicial",
    referenceMode,
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

function buildCompetitorInspiration(report, brand) {
  const text = `${report.naturalRequest || ""} ${brand.goal || ""} ${brand.channels || ""}`.toLowerCase();
  const category = report.category?.category || report.product || "producto";
  const references = extractUrlsFromText(report.naturalRequest || "").filter((url) => brand.referenceMode || url !== brand.url);
  const primaryChannel = inferPrimaryCreativeChannel(text, brand.channels);
  const format = primaryChannel === "TikTok"
    ? "UGC corto / problema-solucion"
    : primaryChannel === "email/SMS"
      ? "Email de objecion + oferta"
      : "Anuncio Meta / creativo estatico";
  const avatar = inferCompetitiveAvatar(text, category);
  const painPoints = inferCompetitivePainPoints(text, category);

  return {
    references,
    rows: [
      {
        format,
        avatar,
        painPoint: painPoints[0],
        hook: `Esto es lo que nadie te dice antes de comprar ${category}`,
        headline: `Antes de elegir ${category}, revisa esto`,
      },
      {
        format: primaryChannel === "TikTok" ? "Comparacion lado a lado" : "Carrusel comparativo",
        avatar,
        painPoint: painPoints[1],
        hook: "La diferencia entre comprar barato y comprar bien",
        headline: `${brand.name}: menos duda, mejor decision`,
      },
      {
        format: "Testimonio / prueba social",
        avatar: "Comprador que necesita confianza antes de pagar",
        painPoint: painPoints[2],
        hook: "Lo que cambia cuando el producto si resuelve el problema",
        headline: "Compra con mas claridad, no con promesas vacias",
      },
      {
        format: "Lista rapida / checklist",
        avatar: "Persona ocupada que quiere decidir rapido",
        painPoint: "No sabe que comparar entre opciones similares.",
        hook: "3 cosas que revisaria antes de comprar",
        headline: "La checklist simple para elegir mejor",
      },
      {
        format: "Founder POV / detras de marca",
        avatar: "Cliente que compra por criterio, historia y confianza",
        painPoint: "Siente que todas las marcas dicen lo mismo.",
        hook: "Por que hicimos esto diferente",
        headline: `Una alternativa mas clara para ${category}`,
      },
    ],
  };
}

function buildCreativePerformanceLab(report, brand, inspiration = {}) {
  const aiLab = normalizeAiCreativePerformance(report.ai?.creativePerformance);
  if (aiLab) return aiLab;
  if (isBackendHarnessReport(report)) return { shouldRender: false };

  const text = `${report.naturalRequest || ""} ${brand.goal || ""} ${brand.channels || ""}`.toLowerCase();
  const creativeSources = collectCreativeSources(report, brand);
  const hasCreativeAttachments = (report.attachments || []).some((item) => ["image", "video", "text", "document"].includes(item.kind));
  const shouldRender = isCreativePerformanceText(text) || (hasCreativeAttachments && /ad|ads|anuncio|creative|creativo|video|viral|tiktok|reels|ugc/.test(text));
  if (!shouldRender) return { shouldRender: false };

  const category = report.category?.category || report.product || "producto";
  const defaultReferences = [
    { source: "Paid ad ganador", label: "patron de anuncio con mejor rendimiento", kind: "paid", signal: "high" },
    { source: "Paid ad con bajo rendimiento", label: "patron de anuncio que no convierte", kind: "paid", signal: "low" },
    { source: "Video organico viral", label: "patron de TikTok/Reels viral", kind: "organic", signal: "high" },
    { source: "Video organico sin traccion", label: "patron organico que no retiene", kind: "organic", signal: "low" },
  ];
  const references = creativeSources.length ? [...creativeSources] : defaultReferences;
  if (creativeSources.length) {
    const signals = new Set(creativeSources.map((source) => source.signal));
    if (!signals.has("high")) {
      references.push({ source: "Ganador pendiente", label: "agrega el mejor creative con metricas", kind: "asset", signal: "unknown", placeholder: "winner" });
    }
    if (!signals.has("low")) {
      references.push({ source: "Bajo rendimiento pendiente", label: "agrega un creative que no funciono", kind: "asset", signal: "unknown", placeholder: "loser" });
    }
  }

  const rows = references.slice(0, 8).map((source, index) => buildCreativePerformanceRow(source, index, category, brand));

  return {
    shouldRender: true,
    summary: creativeSources.length
      ? "Compara piezas declaradas por el usuario y separa lo observable de lo que falta medir antes de escalar."
      : "Framework para analizar ganadores y perdedores creativos cuando todavia faltan links, metricas o exports de plataforma.",
    confidence: creativeSources.length ? "confianza media si las metricas estan en los links/adjuntos" : "confianza baja hasta subir ejemplos y metricas",
    rows,
    winnerPatterns: [
      "El primer segundo muestra problema, resultado o tension visual antes de explicar la marca.",
      "El producto aparece en uso real: escala, textura, transformacion, prueba o comparacion.",
      "El hook promete una decision concreta, no solo un beneficio generico.",
      "Hay una razon para seguir viendo: curiosidad, contraste, error comun, prueba social o antes/despues.",
    ],
    loserPatterns: [
      "Empieza con logo, intro lenta o contexto interno antes de mostrar el problema.",
      "Usa claims amplios sin prueba, demo, review, comparacion o detalle verificable.",
      "Mezcla demasiados mensajes en una sola pieza y no queda claro que hacer despues.",
      "El creative no coincide con landing, oferta, precio o objecion principal del comprador.",
    ],
    organicElements: [
      "Hook hablado o visual en 0-2 segundos.",
      "Edicion nativa: ritmo rapido, cortes claros, captions utiles y prueba visible.",
      "Comentario, pregunta o objecion real convertido en guion.",
      "Señales de calidad: retencion, compartidos, guardados, comentarios con intencion y clicks al perfil.",
    ],
    paidElements: [
      "Angle unico por anuncio: dolor, resultado, comparacion, prueba o oferta.",
      "Headline y first frame repiten la misma promesa para reducir friccion.",
      "CTA alineado con etapa: aprender, comparar, ver oferta o comprar.",
      "Separar performance creativa de problemas de landing, precio, inventario o tracking.",
    ],
    metricChecklist: [
      "Paid: spend, impressions, CTR, CPM, CPC, CPA, ROAS, purchases y hold rate.",
      "Video: 3s views, average watch time, completion rate, shares, saves y comentarios con intencion.",
      "Ecommerce: sesiones, add-to-cart, checkout, conversion, AOV, margen y devoluciones.",
      "Clasificar cada pieza como ganador, prometedor, perdedor o sin datos suficientes.",
    ],
    nextTests: buildCreativeNextTests(category, brand, rows),
  };
}

function normalizeAiCreativePerformance(value) {
  if (!value || typeof value !== "object") return null;
  const winners = Array.isArray(value.winners) ? value.winners : [];
  const losers = Array.isArray(value.underperformers)
    ? value.underperformers
    : Array.isArray(value.losers)
      ? value.losers
      : [];
  if (!winners.length && !losers.length) return null;

  const rows = winners.map((item, index) => aiCreativeRow(item, "Ganador", index)).concat(
    losers.map((item, index) => aiCreativeRow(item, "Bajo rendimiento", index)),
  );

  return {
    shouldRender: true,
    summary: value.summary || "Analisis estructurado de performance creativa desde el backend.",
    confidence: value.confidence || "confianza segun evidencia disponible",
    rows,
    winnerPatterns: winners.map((item) => item.whyItWorked || item.hookPattern || item.performanceSignal).filter(Boolean).slice(0, 5),
    loserPatterns: losers.map((item) => item.whyItFailed || item.performanceSignal || item.hookPattern).filter(Boolean).slice(0, 5),
    organicElements: value.organicViralPatterns || [],
    paidElements: value.paidAdPatterns || [],
    metricChecklist: value.measurementChecklist || [],
    nextTests: value.nextTests || [],
  };
}

function aiCreativeRow(item, fallbackStatus, index) {
  const elements = Array.isArray(item.creativeElements) ? item.creativeElements.join("; ") : item.creativeElements || "";
  return {
    source: item.source || `Creativo ${index + 1}`,
    status: item.status || fallbackStatus,
    format: item.format || "formato no especificado",
    hook: item.hookPattern || item.hook || item.headlinePattern || "hook pendiente",
    elements,
    evidence: item.performanceSignal || item.evidenceType || "evidencia no especificada",
    nextTest: item.nextTest || "crear variacion controlada y medir contra baseline",
  };
}

function collectCreativeSources(report, brand) {
  const urls = extractUrlsFromText(report.naturalRequest || "")
    .filter((url) => url !== brand.url)
    .map((url) => ({
      source: inferCreativeSource(url),
      label: url,
      kind: inferCreativeKind(url),
      signal: inferCreativeSignal(url),
    }));
  const attachments = (report.attachments || [])
    .filter((item) => ["image", "video", "text", "document"].includes(item.kind))
    .map((item) => ({
      source: item.kind === "video" ? "Video adjunto" : item.kind === "image" ? "Creative adjunto" : "Archivo de contexto",
      label: item.name || "adjunto",
      kind: item.kind === "video" ? "organic" : "asset",
      signal: inferCreativeSignal(`${item.name || ""} ${item.content || ""}`),
    }));
  return urls.concat(attachments);
}

function buildCreativePerformanceRow(source, index, category, brand) {
  const status = source.placeholder === "winner"
    ? "Ganador pendiente"
    : source.placeholder === "loser"
      ? "Bajo rendimiento pendiente"
      : creativeStatusFromSignal(source.signal, index);
  const isWinner = /ganador|viral/i.test(status);
  const isPaid = source.kind === "paid";
  const format = inferCreativeFormat(source, isPaid);
  const evidence = creativeEvidenceCopy(source, status);
  const hook = isWinner
    ? winnerHookForCreative(category, source, brand)
    : loserHookForCreative(category, source, brand);
  return {
    source: source.source,
    status,
    format,
    hook,
    elements: isWinner
      ? "first frame claro, problema visible, prueba/uso real, CTA simple"
      : "intro lenta, promesa generica, poca prueba o mismatch con oferta",
    evidence,
    nextTest: isWinner
      ? "extraer 3 variaciones del hook cambiando avatar, pain point y primer frame"
      : "reescribir primeros 3 segundos y aislar si falla hook, oferta, landing o tracking",
  };
}

function creativeStatusFromSignal(signal, index) {
  if (signal === "high") return index % 2 === 0 ? "Ganador / alto rendimiento" : "Viral o prometedor";
  if (signal === "low") return "Bajo rendimiento";
  return "Sin datos suficientes";
}

function creativeEvidenceCopy(source, status) {
  if (source.placeholder) return "comparativo pendiente; no inventar evidencia";
  if (status === "Sin datos suficientes") return "falta metrica verificable";
  if (source.label?.startsWith("http")) return "señal declarada por URL/prompt";
  return "señal declarada por adjunto o descripcion";
}

function inferCreativeSource(value) {
  const text = String(value || "").toLowerCase();
  if (/facebook\.com\/ads|facebook\.com\/ads\/library|meta/.test(text)) return "Meta Ads Library";
  if (/tiktok/.test(text)) return "TikTok";
  if (/instagram|reels/.test(text)) return "Instagram Reels";
  if (/youtube|shorts/.test(text)) return "YouTube Shorts";
  if (/facebook|instagram/.test(text)) return "Meta organic";
  return "Referencia creativa";
}

function inferCreativeKind(value) {
  const text = String(value || "").toLowerCase();
  if (/facebook\.com\/ads|ads|paid|anuncio|meta/.test(text)) return "paid";
  if (/tiktok|reels|shorts|organic|org[aá]nico|viral|ugc/.test(text)) return "organic";
  return "asset";
}

function inferCreativeSignal(value) {
  const text = String(value || "").toLowerCase();
  if (/viral|ganador|winner|mejor|alto rendimiento|top|ctr alto|roas alto|muchas vistas|views|engagement/.test(text)) return "high";
  if (/perdedor|peor|bajo rendimiento|no funcion|no convirti[oó]|roas bajo|cpa alto|pocas vistas/.test(text)) return "low";
  return "unknown";
}

function inferCreativeFormat(source, isPaid) {
  const text = `${source.source || ""} ${source.label || ""}`.toLowerCase();
  if (/tiktok|reels|shorts|video/.test(text)) return "Video corto UGC / demo";
  if (/carrusel|carousel/.test(text)) return "Carrusel comparativo";
  if (/image|imagen|static|estatico|estático/.test(text)) return "Imagen estatica / paid social";
  return isPaid ? "Paid social creative" : "Organic social creative";
}

function winnerHookForCreative(category, source, brand) {
  if (source.kind === "organic") return `El error comun que la gente comete con ${category}`;
  if (source.kind === "paid") return `${brand.name}: una forma mas clara de resolver ${category}`;
  return `Mira esto antes de elegir ${category}`;
}

function loserHookForCreative(category, source, brand) {
  if (source.kind === "organic") return `Por que este video no retiene: demasiado contexto antes del problema`;
  if (source.kind === "paid") return `${brand.name} necesita una promesa mas especifica que "calidad"`;
  return `Falta convertir la referencia en un angulo medible para ${category}`;
}

function buildCreativeNextTests(category, brand, rows) {
  const winner = rows.find((row) => row.status.includes("Ganador") || row.status.includes("Viral"));
  const loser = rows.find((row) => row.status.includes("Bajo"));
  return [
    winner
      ? `Clonar la estructura del mejor patron: mismo pain point, 3 primeros frames distintos, 3 CTAs distintos.`
      : `Subir 2-3 ejemplos ganadores con metricas para extraer patron real de ${category}.`,
    loser
      ? `Rehacer el perdedor cambiando solo el hook inicial para saber si falla la idea o la ejecucion.`
      : "Subir tambien ejemplos que no funcionaron; sin perdedores no se puede ver el contraste.",
    "Separar paid vs organico: un video viral no siempre tiene oferta suficiente para vender en ads.",
    "Medir cada pieza con una etiqueta simple: avatar, pain point, hook, formato, oferta, metrica y decision.",
    `Convertir el mejor patron en un brief reusable para ${brand.name}: guion, first frame, prueba visual y CTA.`,
  ];
}

function commerceContext(report = {}) {
  const commerce = report.commerce || {};
  const snapshot = commerce.snapshot || (report.shopify?.snapshot ? {
    platform: "shopify",
    platformLabel: "Shopify",
    storeId: report.shopify.shop,
    store: report.shopify.snapshot.shop,
    shop: report.shopify.snapshot.shop,
    products: report.shopify.snapshot.products || [],
    capabilities: {
      readCatalog: true,
      publishPages: true,
      installThemeTools: true,
    },
  } : null);
  const platform = commerce.platform || snapshot?.platform || (report.shopify?.shop ? "shopify" : "");
  const label = commerce.platformLabel || snapshot?.platformLabel || platformLabel(platform);
  const storeId = commerce.storeId || snapshot?.storeId || report.shopify?.shop || "";
  const store = snapshot?.store || snapshot?.shop || null;
  const products = Array.isArray(snapshot?.products) ? snapshot.products : [];
  return {
    platform,
    platformLabel: label,
    storeId,
    label: commerce.label || store?.name || storeId,
    focus: commerce.focus || report.shopify?.focus || "conversion, catalogo y producto ganador",
    snapshot,
    store,
    products,
    error: commerce.error || report.shopify?.error || "",
    capabilities: snapshot?.capabilities || {
      readCatalog: Boolean(snapshot),
      publishPages: platform === "shopify",
      installThemeTools: platform === "shopify",
    },
  };
}

function extractUrlsFromText(value) {
  const matches = String(value || "").match(/https?:\/\/[^\s,]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,]*)?/gi) || [];
  return [...new Set(matches.map((match) => normalizeBrandUrl(match)))];
}

function inferPrimaryCreativeChannel(text, channels) {
  const value = `${text} ${channels || ""}`.toLowerCase();
  if (/tiktok|reels|shorts|ugc/.test(value)) return "TikTok";
  if (/email|klaviyo|sms/.test(value)) return "email/SMS";
  if (/google|search|seo/.test(value)) return "Google/Search";
  return "Meta Ads";
}

function inferCompetitiveAvatar(text, category) {
  if (/premium|calidad|lujo/.test(text)) return "Comprador que quiere calidad y seguridad antes de pagar mas";
  if (/precio|barato|descuento/.test(text)) return "Comprador sensible a precio que compara muchas opciones";
  if (/regalo|gift/.test(text)) return "Persona que compra para regalar y quiere evitar equivocarse";
  if (/skincare|piel|beauty|belleza/.test(text)) return "Cliente que quiere resultados visibles sin arriesgar su piel";
  return `Comprador interesado en ${category} que necesita una razon clara para elegir`;
}

function inferCompetitivePainPoints(text, category) {
  if (/skincare|piel|beauty|belleza/.test(text)) {
    return [
      "Tiene miedo de irritacion, ingredientes confusos o resultados exagerados.",
      "No sabe si el producto encaja con su tipo de piel y rutina.",
      "Desconfia de promesas sin prueba social o evidencia visible.",
    ];
  }
  if (/ropa|fashion|moda|talla/.test(text)) {
    return [
      "No sabe si la talla, ajuste o material sera como en las fotos.",
      "Le preocupa pagar por una prenda que no se vea premium en persona.",
      "Quiere evitar devoluciones por fit, color o calidad.",
    ];
  }
  return [
    `No entiende por que una opcion de ${category} es mejor que otra.`,
    "Quiere evitar comprar algo barato que termine saliendo caro.",
    "Necesita confianza: prueba social, garantia, materiales y uso real.",
  ];
}

function buildBackendBrandAudit(report, brand) {
  const ai = report.ai || {};
  const brief = ai.executiveBrief || {};
  const shopifyPlan = ai.shopifyPlan || {};
  const problemDiscovery = ai.problemDiscovery || {};
  const websitePlan = ai.websitePlan || {};
  const customizationPlan = ai.customizationPlan || {};
  const creative = ai.creativePerformance || {};
  const risks = Array.isArray(brief.topRisks) && brief.topRisks.length
    ? brief.topRisks
    : Array.isArray(ai.limitations) && ai.limitations.length
      ? ai.limitations
      : ["El harness no devolvio topRisks/limitations especificos."];
  const hooks = problemDiscovery.creativeBrief?.hooks || websitePlan.copyBlocks || creative.nextTests || [];
  const nextSteps = Array.isArray(ai.beginnerNextSteps) && ai.beginnerNextSteps.length
    ? ai.beginnerNextSteps
    : Array.isArray(problemDiscovery.nextSteps) && problemDiscovery.nextSteps.length
      ? problemDiscovery.nextSteps
      : ["Pedir al agente que complete el bloque faltante con datos concretos, no con hipotesis locales."];
  const catalogActions = Array.isArray(shopifyPlan.catalogOpportunities) && shopifyPlan.catalogOpportunities.length
    ? shopifyPlan.catalogOpportunities
    : ["shopifyPlan.catalogOpportunities no devuelto por el harness."];

  return {
    decision: brief.decision || "El harness respondio, pero no devolvio decision estructurada de marca.",
    context: [
      `Objetivo principal: ${brand.goal}.`,
      `Canales declarados: ${brand.channels}.`,
      brand.url ? `Sitio o referencia: ${brand.url}.` : "No se recibio sitio o referencia.",
      shopifyPlan.storeSummary ? `Store summary: ${shopifyPlan.storeSummary}.` : "shopifyPlan.storeSummary no devuelto por el harness.",
    ],
    risks,
    positioning: [
      brief.recommendedPath || "recommendedPath no devuelto por el harness.",
      problemDiscovery.decision || "problemDiscovery.decision no devuelto por el harness.",
    ],
    customer: problemDiscovery.avatars?.length
      ? problemDiscovery.avatars.map((avatar) => `${avatar.name}: ${avatar.problem || avatar.trigger || ""}`)
      : ["problemDiscovery.avatars no devuelto por el harness."],
    missingData: Array.isArray(shopifyPlan.nextDataToCollect) && shopifyPlan.nextDataToCollect.length
      ? shopifyPlan.nextDataToCollect
      : ["nextDataToCollect no devuelto por el harness."],
    offer: Array.isArray(shopifyPlan.priorityActions) && shopifyPlan.priorityActions.length
      ? shopifyPlan.priorityActions
      : [brief.recommendedPath || "priorityActions no devuelto por el harness."],
    catalog: catalogActions,
    productTests: problemDiscovery.productHypotheses?.length
      ? problemDiscovery.productHypotheses.map((item) => `${item.product}: ${item.validationStep || item.whyItSolves || ""}`)
      : ["productHypotheses no devuelto por el harness."],
    growth: nextSteps,
    messaging: hooks.length ? hooks : ["creative hooks/copy blocks no devueltos por el harness."],
    conversion: websitePlan.sections?.length
      ? websitePlan.sections.map((section) => `${section.name}: ${section.copyAngle || section.goal || ""}`)
      : Array.isArray(shopifyPlan.conversionRisks) && shopifyPlan.conversionRisks.length
        ? shopifyPlan.conversionRisks
        : ["websitePlan.sections/conversionRisks no devuelto por el harness."],
    retention: customizationPlan.nextSteps?.length
      ? customizationPlan.nextSteps
      : ["retention/customization next steps no devueltos por el harness."],
    measurement: creative.measurementChecklist?.length
      ? creative.measurementChecklist
      : ["measurementChecklist no devuelto por el harness."],
    nextExperiments: nextSteps,
  };
}

function buildBackendCompetitorInspiration(report, brand) {
  return {
    references: extractUrlsFromText(report.naturalRequest || "").filter((url) => url !== brand.url),
    rows: [],
  };
}

function buildBrandAudit(report, brand) {
  const storeContext = commerceContext(report);
  const products = storeContext.products;
  const hasCatalog = products.length > 0;
  const goal = brand.goal.toLowerCase();
  const conversionFocus = /conversion|conversi[oó]n|roas|cac|ads|anuncios/.test(goal);
  const retentionFocus = /retencion|retenci[oó]n|email|recompra|ltv|clientes/.test(goal);
  const creativePerformanceFocus = isCreativePerformanceText(`${goal} ${report.naturalRequest || ""}`);
  const inspirationFocus = /compet|inspiraci[oó]n|hooks?|headlines?|titulares?|avatar|pain points?|puntos? de dolor|formatos?|creativos?/.test(
    `${goal} ${report.naturalRequest || ""}`.toLowerCase(),
  );

  return {
    decision: creativePerformanceFocus
      ? `Analizar performance creativa para ${brand.name}: separar ads/videos ganadores, piezas con bajo rendimiento y contenido organico viral antes de producir mas.`
      : brand.referenceMode
        ? `Usar la referencia ${brand.url || "competitiva"} como punto de partida, pero construir una posicion propia: problema, avatar, angulo, oferta y pruebas antes de copiar estetica o claims.`
      : inspirationFocus
      ? `Desglosar competencia para ${brand.name}: extraer patrones de hooks, headlines, formatos, avatar y pain points para inspirar nuevos angulos sin copiar.`
      : hasCatalog
        ? `Analizar ${brand.name} como una marca en operacion: cruzar posicionamiento, catalogo, pricing e inventario antes de sugerir crecimiento.`
        : `Analizar ${brand.name} como marca existente: primero ordenar contexto, promesa, oferta, canales y datos faltantes antes de recomendar anuncios o inventario.`,
    context: [
      `Objetivo principal: ${brand.goal}.`,
      `Canales declarados: ${brand.channels}.`,
      brand.url
        ? `${brand.referenceMode ? "Referencia competitiva" : "Sitio o referencia"}: ${brand.url}.`
        : "Falta sitio, tienda o perfil social para leer señales externas.",
      storeContext.storeId ? `${storeContext.platformLabel} conectado: ${storeContext.label || storeContext.storeId}.` : "Tienda ecommerce no conectada; la auditoria usa contexto declarado.",
    ],
    risks: [
      "Optimizar anuncios sin tener clara la oferta y el margen real.",
      "Confundir trafico con problema de producto, precio o confianza.",
      "Tomar decisiones sin separar datos reales de supuestos.",
      ...(creativePerformanceFocus ? ["Tratar un video viral como prueba de ventas sin revisar intencion, clicks, conversion y margen."] : []),
    ],
    positioning: [
      brand.referenceMode
        ? "No posicionarse como copia de la referencia; elegir un dolor/segmento mas especifico donde la marca pueda ser memorable."
        : "Definir una frase: para quien es, que problema resuelve y por que comprar aqui.",
      "Identificar el angulo ganador: precio, calidad, resultado, rapidez, identidad, ritual, prueba o conveniencia.",
      "Comparar la promesa principal contra competidores directos antes de meter presupuesto.",
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
          `${products.length} productos leidos desde ${storeContext.platformLabel || "la tienda"}.`,
          "Ordenar productos por inventario, precio y estado antes de decidir campañas.",
          "Detectar productos sin categoria, sin tipo o con poca claridad de uso.",
        ]
      : [
          "Conectar Shopify, Tiendanube o WooCommerce para leer catalogo real, inventario y precios.",
          "Si no usa Shopify, pegar productos top y precios en el prompt.",
          "Priorizar 3-5 SKUs antes de intentar optimizar toda la marca.",
        ],
    productTests: [
      "Testear 3 hooks: problema, resultado y comparacion contra alternativa.",
      "Probar una oferta de entrada y un bundle de mayor AOV.",
      "Revisar si las fotos explican uso, escala, calidad y transformacion.",
    ],
    growth: [
      creativePerformanceFocus
        ? "Crear una matriz de creativos: ganador, prometedor, perdedor y sin datos suficientes."
        : conversionFocus ? "Auditar landing/PDP antes de subir presupuesto de ads." : "Elegir un canal principal y una metrica de decision por 14 dias.",
      "Crear tablero simple: visitas, conversion, AOV, margen, CAC, recompra y devoluciones.",
      "Probar mensajes por avatar antes de producir mas creativos.",
      "Usar clientes actuales para extraer objeciones, reviews y lenguaje real.",
    ],
    messaging: [
      ...(creativePerformanceFocus ? ["Hook de performance: que diferencia al ganador del perdedor en los primeros 3 segundos."] : []),
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
      ...(creativePerformanceFocus
        ? [
            "Subir o pegar links de 3 creativos ganadores y 3 perdedores con metricas basicas.",
            "Separar videos virales organicos de ads pagados; medir si el mismo angulo vende cuando tiene CTA/oferta.",
          ]
        : []),
      brand.referenceMode
        ? "Ejecutar deep research de la referencia y 3 competidores: website, ads activos, reviews y TikTok organico."
        : "Pegar URL de marca y 3 productos top para una auditoria mas precisa.",
      "Conectar la plataforma ecommerce cuando el flujo este listo para leer catalogo real.",
      "Ejecutar filtro de rentabilidad con AOV, costo, envio, margen y CAC objetivo.",
      "Crear 5 hooks por avatar y escoger 2 para probar en ads o TikTok organico.",
    ],
  };
}

function renderShopifyOverview(report) {
  const context = commerceContext(report);
  const plan = report.ai?.shopifyPlan || null;
  const shop = context.store || null;
  const products = context.products || [];
  const focus = context.focus || "conversion, catalogo y producto ganador";
  const error = context.error || "";

  if (!context.storeId) {
    return `<article class="report-card full-span notice-card">
      <h3>Tienda sin conectar</h3>
      <p>Selecciona el modo tienda y conecta Shopify, Tiendanube o WooCommerce para auditar catalogo real.</p>
    </article>`;
  }

  if (error) {
    return `<article class="report-card full-span notice-card">
      <h3>No se pudo leer la tienda</h3>
      <p>${escapeHtml(error)}</p>
    </article>`;
  }

  return `<article class="report-card full-span">
    <h3>${escapeHtml(shop?.name || context.label || context.storeId)}</h3>
    <p>${escapeHtml(plan?.storeSummary || `${context.platformLabel} conectado. El agente puede leer catalogo y enfocar la auditoria en ${focus}.`)}</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(context.platformLabel || "Tienda")}</span>
      <span class="pill"><i data-lucide="globe"></i>${escapeHtml(context.storeId)}</span>
      <span class="pill"><i data-lucide="package-search"></i>${products.length} productos</span>
      <span class="pill"><i data-lucide="coins"></i>${escapeHtml(shop?.currencyCode || "moneda pendiente")}</span>
      <span class="pill"><i data-lucide="target"></i>${escapeHtml(focus)}</span>
    </div>
  </article>`;
}

function renderShopifyCatalog(report) {
  const context = commerceContext(report);
  const products = context.products || [];
  if (!context.storeId) {
    return `<div class="report-grid">${renderShopifyOverview(report)}</div>`;
  }
  if (context.error) {
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
      <h3>Catalogo ${escapeHtml(context.platformLabel || "ecommerce")}</h3>
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
  const context = commerceContext(report);
  const products = context.products || [];
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
  const context = commerceContext(report);
  if (!context.storeId) {
    return ["Conectar Shopify, Tiendanube o WooCommerce para leer catalogo real.", "Definir foco: conversion, catalogo, pricing o producto ganador."];
  }
  if (context.error) {
    return ["Reconectar la plataforma si el permiso expiro.", "Confirmar que la tienda tenga permiso de lectura de productos."];
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
  const draftCount = products.filter((product) => product.status && String(product.status).toLowerCase() !== "active").length;
  const noTypeCount = products.filter((product) => !product.productType).length;
  const lowInventoryCount = products.filter((product) => Number(product.totalInventory) <= 3).length;
  return [
    `${products.length} productos leidos desde la tienda conectada.`,
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

    const report = buildBackendReportShell({
      ...input,
      naturalRequest: run.natural_request || input.naturalRequest || "Research guardado",
      attachments: input.attachments || [],
      accessKey: "",
    });
    report.ai = run.result_json || null;
    report.backendMode = "codex-harness";
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
  if (report.selectedInternalTool === "retail-to-online-agent") {
    return `Actua como Agent Genia. El usuario tiene o describe una tienda fisica/local y escribio: "${report.naturalRequest}". Adjuntos: ${attachments}. Ayudalo a pasar a ecommerce desde la main page: entiende producto/oferta, calcula si los numeros permiten paid ads, recomienda TikTok organico vs paid ads, define primera web, plan de competencia y contenido. Separa datos dados de supuestos y no recomiendes gasto en ads si CAC/ROAS no dan.`;
  }
  if (report.businessStage === "brand") {
    const brand = normalizeBrandContext(report);
    return `Actua como Agent Genia. El usuario tiene o quiere crear una marca: ${brand.name}. Solicitud: "${report.naturalRequest}". Adjuntos: ${attachments}. Analiza posicionamiento, oferta, catalogo, conversion, canales, retencion, metricas faltantes y siguientes experimentos. Si pide buscar problema, validar oportunidad, encontrar avatar, descubrir angulo no explotado o hacer research profundo, crea problemDiscovery con Meta Ads, Amazon reviews y TikTok pain points separados por fuente; si no hay browsing real, marca las fuentes como pendientes y no inventes evidencia. Si pide competencia o inspiracion, desglosa hooks, headlines, formato, avatar y pain points; separa evidencia observada de hipotesis y no copies claims. Si pide rendimiento de ads, creativos ganadores/perdedores, videos organicos virales, TikTok/Reels/UGC o performance creativa, compara paid vs organico y separa ganadores, bajo rendimiento y sin datos suficientes; analiza first frame, hook, guion, formato, avatar, pain point, prueba visual, CTA, oferta y metricas necesarias como CTR, CPA, ROAS, watch time, completion, shares, saves y conversion. No trates viralidad como prueba de ventas sin datos de intencion y conversion. Si pide naming, colores o identidad visual, crea brandPlan con nombre recomendado, opciones de nombre, paleta hex y checks de disponibilidad. Si pide producto personalizado, private label, empaque, packaging, logo, variantes, acabados o materiales, crea customizationPlan con variantes de producto/empaque, impacto en MOQ/costo, preguntas para proveedor y brief en ingles. Si pide pagina web/landing o creas brandPlan para marca nueva, crea websitePlan con hero, secciones, copy, aplicacion de colores y pasos de build. Si hay tienda ecommerce conectada, usa catalogo/precios/inventario como contexto real.`;
  }
  return `Actua como Agent Genia. El usuario escribio: "${report.naturalRequest}". Adjuntos: ${attachments}. Decide que herramienta interna usar. Si hay intencion de buscar problema, validar oportunidad, encontrar avatar, descubrir angulo no explotado, elegir producto desde dolor o hacer research profundo, usa problem discovery agent y devuelve problemDiscovery con Meta Ads, Amazon reviews y TikTok pain points separados por fuente; si no hay browsing real, marca fuentes pendientes y no inventes evidencia. Si hay intencion de Alibaba/proveedores/MOQ/DDP/negociacion, usa $alibaba-sourcing-agent sin sacar al usuario de la main page. Si hay intencion de producto personalizado, private label, empaque, packaging, logo, variantes, acabados o materiales, usa product customization helper y devuelve customizationPlan. Si hay intencion de crear marca, naming, colores o identidad visual, usa brand strategy helper y devuelve brandPlan. Si hay intencion de pagina web/landing, o brandPlan necesita convertirse en web, devuelve websitePlan. Entrega bitacora de tool calls, shortlist, score, cola de mensajes de negociacion, plan DDP, checklist de calidad y siguientes pasos.`;
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
  if (report.type === "retail_to_online") {
    return buildRetailToOnlineMarkdown(report);
  }
  if (report.type === "tool_factory") {
    return buildToolFactoryMarkdown(report);
  }
  if (isBrandStrategyReport(report)) {
    return buildBrandMarkdown(report);
  }
  if (report.ai) {
    return buildAiMarkdown(report);
  }
  const shopifySection = report.businessStage === "shopify" ? buildShopifyMarkdown(report) : "";
  const problemDiscoverySection = buildProblemDiscoveryMarkdown(extractProblemDiscovery(report));
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
${problemDiscoverySection}

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
`;
}

function buildBrandMarkdown(report) {
  const backendMode = isBackendHarnessReport(report);
  const brand = normalizeBrandContext(report);
  const audit = backendMode ? buildBackendBrandAudit(report, brand) : buildBrandAudit(report, brand);
  const competitorInspiration = backendMode ? buildBackendCompetitorInspiration(report, brand) : buildCompetitorInspiration(report, brand);
  const creativePerformance = buildCreativePerformanceLab(report, brand, competitorInspiration);
  const angleValidator = normalizeAngleWhitespaceValidator(report.angleValidation || report.angleWhitespaceValidator || report.ai?.angleWhitespaceValidator);
  const shopifySection = commerceContext(report).storeId ? buildShopifyMarkdown(report) : "";
  const brandPlan = extractBrandPlan(report);
  const websitePlan = extractWebsitePlan(report) || (!backendMode && brandPlan ? buildBrandWebsitePlan(report, brandPlan, audit) : null);
  const problemDiscovery = extractProblemDiscovery(report);
  const customizationPlan = extractCustomizationPlan(report);
  const brandPlanSection = buildBrandPlanMarkdown(brandPlan);
  const websitePlanSection = buildWebsitePlanMarkdown(websitePlan);
  const problemDiscoverySection = buildProblemDiscoveryMarkdown(problemDiscovery);
  const customizationPlanSection = buildCustomizationPlanMarkdown(customizationPlan);

  return `# Auditoria de marca

Fecha: ${report.createdAt}
Marca: ${brand.name}
Sitio: ${brand.url || "no definido"}
Canales: ${brand.channels}
Objetivo: ${brand.goal}
Solicitud: ${report.naturalRequest}
Herramienta interna: ${toolLabel(report.selectedInternalTool)}
${shopifySection}
${brandPlanSection}
${websitePlanSection}
${problemDiscoverySection}
${customizationPlanSection}

## Decision

${audit.decision}

## Riesgos

${audit.risks.map((item) => `- ${item}`).join("\n")}

## Inspiracion de competencia

| Formato | Avatar | Pain point | Hook | Headline |
| --- | --- | --- | --- | --- |
${competitorInspiration.rows.map((row) => `| ${row.format} | ${row.avatar} | ${row.painPoint} | ${row.hook} | ${row.headline} |`).join("\n")}

${buildAngleWhitespaceMarkdown(angleValidator)}

${buildCreativePerformanceMarkdown(creativePerformance)}

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

function buildCreativePerformanceMarkdown(lab) {
  if (!lab?.shouldRender) return "";
  return `## Patrones de performance creativa

${lab.summary}

Confianza: ${lab.confidence}

| Fuente | Estado | Formato | Hook | Elementos | Siguiente test |
| --- | --- | --- | --- | --- | --- |
${(lab.rows || []).map((row) => `| ${row.source} | ${row.status} | ${row.format} | ${row.hook} | ${row.elements} | ${row.nextTest} |`).join("\n")}

### Patrones ganadores

${(lab.winnerPatterns || []).map((item) => `- ${item}`).join("\n")}

### Patrones que suelen perder

${(lab.loserPatterns || []).map((item) => `- ${item}`).join("\n")}

### Metricas necesarias

${(lab.metricChecklist || []).map((item) => `- ${item}`).join("\n")}`;
}

function buildAngleWhitespaceMarkdown(validator) {
  if (!validator) return "";
  const counts = validator.verdictCounts || {};
  return `## Angle / Whitespace Validator

${validator.summary || ""}

Recomendacion: ${validator.primaryRecommendation || ""}

Conteo:
- Explotados: ${counts.explotado || 0}
- Debiles: ${counts.debil || 0}
- Libres que necesitan test: ${counts.libre_necesita_test || 0}
- No recomendados: ${counts.no_recomendado || 0}

| Angulo | Veredicto | Saturacion | Senal | Presion | Siguiente test |
| --- | --- | --- | --- | --- | --- |
${validator.angles.map((angle) => `| ${angle.angle} | ${angle.verdictLabel} | ${angle.saturationLevel} | ${angle.demandSignal} | ${angle.competitorPressure} | ${angle.nextTest || angle.decisionRule || ""} |`).join("\n")}

Competidores:
${validator.competitors.map((competitor) => `- ${competitor.name || "Competidor"}: ${(competitor.observedAngles || []).join(", ") || competitor.evidence || ""}`).join("\n")}

Guardrails:
${validator.guardrails.map((item) => `- ${item}`).join("\n")}
`;
}

function buildBrandPlanMarkdown(brandPlan) {
  if (!brandPlan) return "";
  const selectedName = brandPlan.selectedName || {};
  const palette = brandPlan.colorPalette || {};
  const options = Array.isArray(brandPlan.nameOptions) ? brandPlan.nameOptions : [];
  const taglines = Array.isArray(brandPlan.taglineOptions) ? brandPlan.taglineOptions : [];
  const rules = Array.isArray(brandPlan.namingRules) ? brandPlan.namingRules : [];
  const nextChecks = Array.isArray(brandPlan.nextChecks) ? brandPlan.nextChecks : [];

  return `
## Brand plan

Brief: ${brandPlan.namingBrief || ""}

Nombre recomendado: ${selectedName.name || "pendiente"}

${selectedName.rationale || selectedName.problemFit || ""}

Paleta: primary ${palette.primary || "--"} | secondary ${palette.secondary || "--"} | accent ${palette.accent || "--"} | background ${palette.background || "--"} | text ${palette.text || "--"}

${palette.rationale || ""}

Opciones:
${options.map((option) => `- ${option.name}: ${option.rationale || option.problemFit || ""}`).join("\n")}

Taglines:
${taglines.map((item) => `- ${item}`).join("\n")}

Reglas:
${rules.map((item) => `- ${item}`).join("\n")}

Checks:
${nextChecks.map((item) => `- ${item}`).join("\n")}
`;
}

function buildWebsitePlanMarkdown(websitePlan) {
  if (!websitePlan) return "";
  const hero = websitePlan.hero || {};
  const sections = normalizeWebsiteSections(websitePlan);
  const brandApplication = Array.isArray(websitePlan.brandApplication) ? websitePlan.brandApplication : [];
  const copyBlocks = Array.isArray(websitePlan.copyBlocks) ? websitePlan.copyBlocks : [];
  const guardrails = Array.isArray(websitePlan.launchGuardrails) ? websitePlan.launchGuardrails : [];
  const steps = Array.isArray(websitePlan.nextBuildSteps) ? websitePlan.nextBuildSteps : [];

  return `
## Website plan

${websitePlan.recommendation || ""}

Primera version: ${websitePlan.firstBuild || ""}
Stack: ${websitePlan.stackSuggestion || ""}

Hero:
- Headline: ${hero.headline || ""}
- Subheadline: ${hero.subheadline || ""}
- CTA principal: ${hero.primaryCta || ""}
- CTA secundario: ${hero.secondaryCta || ""}

Aplicacion de marca:
${brandApplication.map((item) => `- ${item}`).join("\n")}

Secciones:
${sections.map((section) => `- ${section.name}: ${section.copyAngle || section.goal || ""}`).join("\n")}

Copy:
${copyBlocks.map((item) => `- ${item}`).join("\n")}

Reglas:
${guardrails.map((item) => `- ${item}`).join("\n")}

Build:
${steps.map((item) => `- ${item}`).join("\n")}
`;
}

function buildCustomizationPlanMarkdown(customizationPlan) {
  if (!customizationPlan) return "";
  const variants = Array.isArray(customizationPlan.variantOptions) ? customizationPlan.variantOptions : [];
  const packagingOptions = Array.isArray(customizationPlan.packagingOptions) ? customizationPlan.packagingOptions : [];
  const supplierQuestions = Array.isArray(customizationPlan.supplierQuestions) ? customizationPlan.supplierQuestions : [];
  const samplePlan = Array.isArray(customizationPlan.samplePlan) ? customizationPlan.samplePlan : [];
  const qualityChecks = Array.isArray(customizationPlan.qualityChecks) ? customizationPlan.qualityChecks : [];
  const nextSteps = Array.isArray(customizationPlan.nextSteps) ? customizationPlan.nextSteps : [];

  return `
## Producto personalizado

Concepto: ${customizationPlan.productConcept || ""}

Diferenciacion: ${customizationPlan.differentiationAngle || ""}

Ruta recomendada: ${customizationPlan.recommendedDirection || ""}

Variantes:
${variants.map((variant) => `- ${variant.name}: ${variant.productChanges || ""} | Empaque: ${variant.packaging || ""} | Branding: ${variant.branding || ""} | Ideal para: ${variant.bestFor || ""}`).join("\n")}

Opciones de empaque:
${packagingOptions.map((option) => `- ${option.name}: ${option.format || ""} | ${option.materials || ""} | ${option.finish || ""} | Costo: ${option.unitCostImpact || ""} | MOQ: ${option.moqImpact || ""}`).join("\n")}

Brief proveedor:
${customizationPlan.supplierBrief || ""}

Preguntas proveedor:
${supplierQuestions.map((item) => `- ${item}`).join("\n")}

Muestras:
${samplePlan.map((item) => `- ${item}`).join("\n")}

Calidad:
${qualityChecks.map((item) => `- ${item}`).join("\n")}

Siguiente:
${nextSteps.map((item) => `- ${item}`).join("\n")}
`;
}

function buildProblemDiscoveryMarkdown(problemDiscovery) {
  if (!problemDiscovery) return "";
  const coverage = Array.isArray(problemDiscovery.sourceCoverage) ? problemDiscovery.sourceCoverage : [];
  const evidence = Array.isArray(problemDiscovery.evidenceMatrix) ? problemDiscovery.evidenceMatrix : [];
  const avatars = Array.isArray(problemDiscovery.avatars) ? problemDiscovery.avatars : [];
  const pains = Array.isArray(problemDiscovery.painPoints) ? problemDiscovery.painPoints : [];
  const angles = Array.isArray(problemDiscovery.angleCandidates) ? problemDiscovery.angleCandidates : [];
  const products = Array.isArray(problemDiscovery.productHypotheses) ? problemDiscovery.productHypotheses : [];
  const creative = problemDiscovery.creativeBrief || {};
  const nextSteps = Array.isArray(problemDiscovery.nextSteps) ? problemDiscovery.nextSteps : [];

  return `
## Problem discovery

Pregunta: ${problemDiscovery.researchQuestion || ""}

Decision: ${problemDiscovery.decision || ""}

Score oportunidad: ${problemDiscovery.opportunityScore ?? "pendiente"}/100
Confianza: ${problemDiscovery.confidence || ""}

Fuentes:
${coverage.map((source) => `- ${source.source || "Fuente"}: ${source.status || "pendiente"} | ${source.coverage || source.whatItCanProve || ""} | Limite: ${source.limitations || ""}`).join("\n")}

Evidencia / hipotesis:
${evidence.map((item) => `- ${item.source || "Fuente"} (${item.confidence || "pendiente"}): ${item.signal || item.quoteOrObservation || ""}`).join("\n")}

Avatares:
${avatars.map((avatar) => `- ${avatar.name || "Avatar"}: ${avatar.problem || ""} | Trigger: ${avatar.trigger || ""} | Lenguaje: ${(avatar.language || []).join("; ")}`).join("\n")}

Pains:
${pains.map((pain) => `- ${pain.pain || ""}: ${pain.desiredOutcome || ""} | Urgencia: ${pain.urgency || ""}`).join("\n")}

Angulos:
${angles.map((angle) => `- ${angle.angle || ""} (${angle.score ?? "pendiente"}/100): ${angle.creativeHook || angle.whyItMayBeUnderused || ""} | Prueba necesaria: ${angle.proofNeeded || ""}`).join("\n")}

Productos hipotesis:
${products.map((item) => `- ${item.product || ""}: ${item.whyItSolves || ""} | Validacion: ${item.validationStep || ""}`).join("\n")}

Creative brief:
- Promesa: ${creative.corePromise || ""}
${(creative.hooks || []).map((item) => `- Hook: ${item}`).join("\n")}
${(creative.contentFormats || []).map((item) => `- Formato: ${item}`).join("\n")}

Siguiente:
${nextSteps.map((item) => `- ${item}`).join("\n")}
`;
}

function buildBrandWhitespaceMarkdown(report) {
  const brand = report.brand || {};
  const brief = report.executiveBrief || {};
  const candidates = Array.isArray(report.candidates) ? report.candidates : [];
  const evidence = report.evidence || {};
  const angleValidator = normalizeAngleWhitespaceValidator(report.angleValidation || report.angleWhitespaceValidator || report.ai?.angleWhitespaceValidator);

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

${buildAngleWhitespaceMarkdown(angleValidator)}

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

function buildToolFactoryMarkdown(report) {
  const requested = report.requestedTool || {};
  const brief = report.executiveBrief || {};
  const strategy = report.buildStrategy || {};
  const replacement = report.appReplacement || {};
  const toolSpec = report.toolSpec || {};
  const mvp = report.mvp || {};
  const savings = report.savings || {};
  const storeContext = commerceContext(report);

  return `# Agent Genia Tool Factory

Fecha: ${report.createdAt || ""}
Solicitud: ${report.naturalRequest || ""}
Herramienta interna: ${toolLabel(report.toolUsed)}
Tienda conectada: ${storeContext.storeId ? `${storeContext.platformLabel} - ${storeContext.label || storeContext.storeId}` : "no conectada"}
Publicacion: ${report.publication?.url || "no publicada"}
Herramienta existente sugerida: ${replacement.existingTool?.title || "ninguna"}

## Decision

${brief.decision || ""}

Tesis: ${brief.valueThesis || ""}
Viabilidad: ${brief.feasibility || requested.feasibility || ""}
Guardrail: ${brief.guardrail || ""}

## Herramienta solicitada

- Nombre: ${requested.name || ""}
- Categoria: ${requested.category || ""}
- Usuario: ${requested.merchantUser || ""}
- Job-to-be-done: ${requested.jobToBeDone || ""}
- Resultado deseado: ${requested.desiredOutcome || ""}
- Runtime: ${replacement.runtimeLabel || requested.runtimeLabel || ""}
- Reemplazabilidad: ${replacement.replaceabilityLevel || ""}

## Build vs buy

${replacement.buildOrBuyDecision || ""}

Primera version: ${replacement.firstVersion || ""}

Ruta si funciona: ${replacement.upgradePath || ""}

Herramientas Agent Genia existentes:
${installedTools.length ? installedTools.map((tool) => `- ${tool.title || tool.requestedTool?.name || tool.id}: ${tool.category || ""} | ${tool.status || ""} | ${tool.url || ""}`).join("\n") : "- Ninguna registrada en el contexto del reporte."}

## Spec ejecutable

Version: ${toolSpec.version || ""}
Surface: ${toolSpec.surface || ""}
Runtime: ${toolSpec.runtime || ""}
Accion principal: ${toolSpec.primaryAction?.label || ""}
Metrica de exito: ${toolSpec.successMetric || ""}
Destino de datos: ${toolSpec.dataDestination || ""}

Campos:
${(toolSpec.fields || []).map((field) => `- ${field.label || field.id}${field.required ? " (requerido)" : ""} | ${field.type || "text"}`).join("\n")}

Bloques:
${(toolSpec.blocks || []).map((block) => `- ${block.type || block.id}: ${block.purpose || ""}`).join("\n")}

Reglas:
${(toolSpec.automationRules || []).map((rule) => `- ${rule}`).join("\n")}

## Arquitectura

App shell: ${strategy.appShell || ""}

Primitivos:
${(strategy.primitives || []).map((item) => `- ${item}`).join("\n")}

Datos:
${(strategy.dataModel || []).map((item) => `- ${item}`).join("\n")}

Eventos:
${(strategy.events || []).map((item) => `- ${item}`).join("\n")}

Acciones:
${(strategy.adminActions || []).map((item) => `- ${item}`).join("\n")}

## MVP

${mvp.name || ""}

Incluye:
${(mvp.included || []).map((item) => `- ${item}`).join("\n")}

No incluye:
${(mvp.notIncluded || []).map((item) => `- ${item}`).join("\n")}

Build:
${(mvp.buildSteps || []).map((item) => `- ${item}`).join("\n")}

Criterios:
${(mvp.acceptanceCriteria || []).map((item) => `- ${item}`).join("\n")}

## Ahorro y limites

Categoria reemplazada: ${savings.replacementCategory || ""}
Ahorro estimado: ${savings.costAvoidedRange || ""}

Cuando una app de terceros sigue ganando:
${(savings.whenThirdPartyStillBetter || []).map((item) => `- ${item}`).join("\n")}

## Riesgos

${(report.risks || []).map((item) => `- ${item}`).join("\n")}

## Validacion

${(report.validationPlan || []).map((item) => `- ${item}`).join("\n")}

${report.publication ? `## Herramienta creada

- URL: ${report.publication.url || ""}
- Admin: ${report.publication.adminUrl || ""}
- Runtime: ${report.publication.mode || ""}
` : ""}
`;
}

function buildShopifyMarkdown(report) {
  const context = commerceContext(report);
  const snapshot = context.snapshot || null;
  const products = context.products || [];
  const productsText = products.length
    ? products
        .slice(0, 20)
        .map((product) => `- ${product.title}: ${product.status || "sin status"} | inventario ${product.totalInventory ?? "--"} | ${product.priceRange || "precio pendiente"}`)
        .join("\n")
    : "- Sin productos leidos.";

  return `
Plataforma: ${context.platformLabel || "tienda ecommerce"}
Tienda: ${context.label || context.storeId || "no conectada"}
Foco: ${context.focus || "no definido"}
Productos leidos: ${products.length}

## Tienda

${productsText}
`;
}

function buildRetailToOnlineMarkdown(report) {
  const economics = report.economics || {};
  const currency = economics.currency || "USD";
  const channel = report.channelRecommendation || {};
  const product = report.productUnderstanding || {};
  const database = report.databaseContext || {};
  const content = report.contentPlan || {};
  const competitors = report.competitorResearchPlan || {};
  const website = report.websitePlan || {};

  return `# Tienda fisica a ecommerce

Fecha: ${report.createdAt}
Solicitud: ${report.naturalRequest}
Producto: ${product.product || report.product || "producto"}
Herramienta interna: ${toolLabel(report.toolUsed)}

## Decision

${report.executiveBrief?.decision || ""}

${report.executiveBrief?.recommendedPath || channel.path || ""}

## Numeros

- Ticket promedio: ${formatMoney(economics.aov || 0, currency)}
- Costo producto: ${formatMoney(economics.cogs || 0, currency)}
- Envio/empaque: ${formatMoney(economics.shipping || 0, currency)}
- Contribucion: ${formatMoney(economics.contribution || 0, currency)}
- Margen: ${formatPercent(economics.margin || 0)}
- CAC sano: ${formatMoney(economics.cacTarget || 0, currency)}
- ROAS objetivo: ${economics.targetRoas ? formatRoas(economics.targetRoas) : "pendiente"}

## Canal

${channel.summary || ""}

Primer test: ${channel.firstTest || ""}

## DB digital

${database.hasDatabase ? database.summary : "No se subio DB digital."}

${database.hasDatabase ? `Archivos: ${(database.files || []).map((file) => file.name).join(", ")}
Columnas: ${(database.detectedColumns || []).slice(0, 30).join(", ")}
Usos: ${(database.recommendedUses || []).map((item) => `\n- ${item}`).join("")}` : "Puede subir CSV, Excel, JSON, SQL o SQLite desde el boton +."}

## Competencia

${(competitors.sources || []).map((source) => `- ${source.source}: ${source.query} | ${source.useFor}`).join("\n")}

## Contenido

${(content.firstContentSprint || []).map((item) => `- ${item}`).join("\n")}

## Web

${website.recommendation || ""}

${website.firstBuild || ""}

${(website.requiredSections || []).map((item) => `- ${item}`).join("\n")}

## Siguiente

${(report.nextSteps || []).map((item) => `- ${item}`).join("\n")}
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
  const executiveBrief = ai.executiveBrief || {};
  const suppliers = Array.isArray(ai.supplierShortlist) ? ai.supplierShortlist : [];
  const outreachQueue = Array.isArray(ai.supplierOutreachQueue) ? ai.supplierOutreachQueue : [];
  const negotiationPlan = ai.negotiationPlan || missingNegotiationPlan();
  const ddpPlan = ai.ddpPlan || missingDdpPlan(report);
  const qualityPlan = ai.qualityPlan || missingQualityPlan();
  const limitations = Array.isArray(ai.limitations) ? ai.limitations : ["limitations no devuelto por el harness"];
  const nextSteps = Array.isArray(ai.beginnerNextSteps) ? ai.beginnerNextSteps : ["beginnerNextSteps no devuelto por el harness"];
  const brandPlanSection = buildBrandPlanMarkdown(ai.brandPlan);
  const websitePlanSection = buildWebsitePlanMarkdown(ai.websitePlan);
  const problemDiscoverySection = buildProblemDiscoveryMarkdown(ai.problemDiscovery);
  const customizationPlanSection = buildCustomizationPlanMarkdown(ai.customizationPlan);
  const shopifySection = ai.shopifyPlan
    ? `
## Tienda

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
${brandPlanSection}
${websitePlanSection}
${problemDiscoverySection}
${customizationPlanSection}

## Decision

${executiveBrief.decision || "decision no devuelta por el harness"}

## Ruta recomendada

${executiveBrief.recommendedPath || "recommendedPath no devuelto por el harness"}

## Proveedores

${suppliers
  .map((item, index) => `${index + 1}. ${item.supplierName} | ${item.alibabaUrl || "sin URL"} | MOQ: ${item.moq} | Precio: ${item.unitPrice} | DDP: ${item.ddpStatus} | Score: ${item.score}`)
  .join("\n") || "supplierShortlist no devuelto por el harness"}

## RFQ

${negotiationPlan.rfqMessage}

## Cola de negociacion

${outreachQueue
  .map((item) => `- ${item.supplierName}: ${item.status} | ${item.waitingFor}`)
  .join("\n") || "supplierOutreachQueue no devuelto por el harness"}

## DDP

${(ddpPlan.ddpQuestions || []).map((item) => `- ${item}`).join("\n") || (ddpPlan.redFlags || []).map((item) => `- ${item}`).join("\n")}

## Calidad

${(qualityPlan.sampleChecklist || []).map((item) => `- ${item}`).join("\n") || (qualityPlan.noGoDefects || []).map((item) => `- ${item}`).join("\n")}

## Limitaciones

${limitations.map((item) => `- ${item}`).join("\n")}

## Siguientes pasos

${nextSteps.map((item) => `- ${item}`).join("\n")}
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
  if (type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(name)) return "video";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (isDatabaseAttachment(file)) return "database";
  if (/\.(docx?|xlsx?|csv|json)$/i.test(name)) return "document";
  if (isTextAttachment(file)) return "text";
  return "file";
}

function attachmentLabel(attachment) {
  if (attachment.kind === "image") return "imagen";
  if (attachment.kind === "video") return "video";
  if (attachment.kind === "pdf") return "PDF";
  if (attachment.kind === "database") return "base de datos";
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
  if (attachment.kind === "video") return "video";
  if (attachment.kind === "pdf") return "file-text";
  if (attachment.kind === "database") return "database";
  if (attachment.contentMode === "text" || attachment.kind === "text") return "file-type";
  if (attachment.kind === "document") return "file-spreadsheet";
  return "paperclip";
}

function isDatabaseAttachment(file) {
  const name = file.name || "";
  return (
    [
      "application/json",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/x-sqlite3",
      "application/vnd.sqlite3",
      "application/sql",
    ].includes(file.type) ||
    /\.(csv|xlsx?|json|sql|sqlite3?|db)$/i.test(name)
  );
}

function isTextAttachment(file) {
  return (
    (file.type && file.type.startsWith("text/")) ||
    ["application/json", "text/csv", "application/sql"].includes(file.type) ||
    /\.(txt|csv|json|md|sql)$/i.test(file.name || "")
  );
}

function fallbackMimeType(name = "") {
  if (/\.mp4$/i.test(name)) return "video/mp4";
  if (/\.mov$/i.test(name)) return "video/quicktime";
  if (/\.webm$/i.test(name)) return "video/webm";
  if (/\.m4v$/i.test(name)) return "video/x-m4v";
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.json$/i.test(name)) return "application/json";
  if (/\.csv$/i.test(name)) return "text/csv";
  if (/\.sql$/i.test(name)) return "application/sql";
  if (/\.(sqlite|sqlite3|db)$/i.test(name)) return "application/vnd.sqlite3";
  if (/\.xlsx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.xls$/i.test(name)) return "application/vnd.ms-excel";
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
  if (value === "shopify-store-audit") return "Store audit";
  if (value === "brand-audit-agent") return "Brand audit";
  if (value === "brand_whitespace_tool") return "Brand whitespace";
  if (value === "agentgenia_tool_factory") return "Tool Factory";
  if (value === "shopify_page_builder") return "Shopify page builder";
  if (value === "product-customization-agent") return "Producto personalizado";
  if (value === "problem-discovery-agent") return "Problem discovery";
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
