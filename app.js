const state = {
  latest: null,
  shopifyStores: [],
  pendingShopifyShop: "",
};

const form = document.querySelector("#researchForm");
const resultPanel = document.querySelector(".result-panel");
const panels = [...document.querySelectorAll("[data-panel]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
const emptyState = document.querySelector("#emptyState");
const shopifyFields = document.querySelector("#shopifyFields");
const shopifyDomainInput = document.querySelector("#shopifyDomain");
const shopifyStoreSelect = document.querySelector("#shopifyStore");
const shopifyFocusInput = document.querySelector("#shopifyFocus");
const shopifyConnectionStatus = document.querySelector("#shopifyConnectionStatus");

const tabLabelSets = {
  sourcing: ["Resumen", "Herramientas", "Proveedores", "Negociacion", "DDP", "Calidad"],
  shopify: ["Resumen", "Shopify", "Catalogo", "Acciones", "DDP", "Calidad"],
  profitability: ["Resumen", "Numeros", "Alertas", "Siguiente", "Supuestos", "Notas"],
  shipping: ["Resumen", "Tarifas", "Detalles", "Alertas", "Siguiente", "Notas"],
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

function init() {
  renderEmptyState();
  form.accessKey.value = localStorage.getItem("alibabaSourcingAccessKey") || "";
  setupStageControls();
  handleShopifyCallbackParams();
  loadShopifyStores();
  form.addEventListener("submit", handleSubmit);
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
  document.querySelector("#copySummary").addEventListener("click", copySummary);
  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  lucide.createIcons();
}

function setupStageControls() {
  form.querySelectorAll("input[name='businessStage']").forEach((input) => {
    input.addEventListener("change", updateStageUI);
  });
  document.querySelector("#connectShopify")?.addEventListener("click", connectShopifyStore);
  document.querySelector("#refreshShopifyStores")?.addEventListener("click", loadShopifyStores);
  document.querySelector("#disconnectShopify")?.addEventListener("click", disconnectSelectedShopifyStore);
  updateStageUI();
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

function selectedBusinessStage() {
  return form.businessStage?.value || "starter";
}

function updateStageUI() {
  const isShopify = selectedBusinessStage() === "shopify";
  if (shopifyFields) shopifyFields.hidden = !isShopify;
  document.body.classList.toggle("shopify-mode", isShopify);
}

async function loadShopifyStores() {
  if (!shopifyStoreSelect) return;
  try {
    const response = await fetch("./api/shopify");
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
      shopifyConnectionStatus.textContent =
        error instanceof Error ? error.message : "Shopify no esta disponible en este entorno.";
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
    showToast("Usa un dominio .myshopify.com valido");
    return;
  }
  window.location.href = `./api/shopify/connect?shop=${encodeURIComponent(shop)}`;
}

async function disconnectSelectedShopifyStore() {
  const shop = shopifyStoreSelect?.value || "";
  if (!shop) {
    showToast("Selecciona una tienda conectada");
    return;
  }

  const response = await fetch("./api/shopify", {
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
  const response = await fetch("./api/shopify", {
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
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

function isValidShopifyDomain(shop) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

async function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  setLoading(true);

  if (data.businessStage === "shopify" && data.shopify.shop) {
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
      if (backend.report.type === "profitability") {
        state.latest = backend.report;
        document.body.classList.add("report-ready");
        renderProfitabilityReport(backend.report);
        activateTab("brief");
        saveState(backend.report);
        setLoading(false);
        resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("Analisis de rentabilidad listo");
        return;
      }
      if (backend.report.type === "shipping_quote") {
        state.latest = backend.report;
        document.body.classList.add("report-ready");
        renderShippingQuoteReport(backend.report);
        activateTab("brief");
        saveState(backend.report);
        setLoading(false);
        resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("Cotizacion de envio lista");
        return;
      }
      report.ai = backend.report;
      report.backendMode = "codex-harness";
      report.diagnostics = backend.diagnostics || null;
    } else if (backend?.message) {
      report.backendError = backend.message;
    }
  } catch (error) {
    report.backendError =
      "Preview local sin harness conectado. En produccion, el agente ejecuta busqueda, comparacion y cola de negociacion desde esta misma pagina.";
  }

  state.latest = report;
  document.body.classList.add("report-ready");
  resultPanel.hidden = false;
  renderReport(report);
  activateTab("brief");
  saveState(report);
  setLoading(false);
  showToast(report.ai ? "Sourcing generado con Codex" : "Plan guiado generado");
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
      : shopifyIntent
        ? ["interpret", "shopify", "quality"]
        : ["interpret"],
    selectedInternalTool: sourcingIntent
      ? "alibaba-sourcing-agent"
      : shopifyIntent
        ? "shopify-store-audit"
        : "ecom-research-agent",
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
  if (data.accessKey) {
    localStorage.setItem("alibabaSourcingAccessKey", data.accessKey);
  }

  const headers = {
    "content-type": "application/json",
  };
  if (data.accessKey) {
    headers["x-app-password"] = data.accessKey;
  }

  const response = await fetch("./api/research", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...data, accessKey: undefined }),
  });

  if (response.status === 404) {
    throw new Error("Backend not deployed");
  }

  return response.json();
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

function renderReport(report) {
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
  button.disabled = isLoading;
  button.title = isLoading ? "Trabajando" : "Ejecutar agente";
  button.innerHTML = isLoading
    ? '<i data-lucide="loader-circle"></i>'
    : '<i data-lucide="arrow-up"></i>';
  lucide.createIcons();
}

function buildPrompt(report) {
  return `Actua como Agent Genia. El usuario escribio: "${report.naturalRequest}". Decide que herramienta interna usar. Si hay intencion de Alibaba/proveedores/MOQ/DDP/negociacion, usa $alibaba-sourcing-agent sin sacar al usuario de la main page. Entrega bitacora de tool calls, shortlist, score, cola de mensajes de negociacion, plan DDP, checklist de calidad y siguientes pasos.`;
}

function buildMarkdown(report) {
  if (!report) return "";
  if (report.type === "profitability") {
    return buildProfitabilityMarkdown(report);
  }
  if (report.type === "shipping_quote") {
    return buildShippingQuoteMarkdown(report);
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
  localStorage.setItem("alibabaSourcingLatest", JSON.stringify(report));
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

function toolLabel(value) {
  if (value === "alibaba-sourcing-agent") return "Alibaba sourcing";
  if (value === "shopify-store-audit") return "Shopify audit";
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
