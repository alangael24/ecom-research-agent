const state = {
  latest: null,
  shopifyStores: [],
  pendingShopifyShop: "",
};

const form = document.querySelector("#researchForm");
const panels = [...document.querySelectorAll("[data-panel]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
const emptyState = document.querySelector("#emptyState");
const shopifyFields = document.querySelector("#shopifyFields");

const stageConfig = {
  starter: {
    label: "Empezar desde cero",
    shortLabel: "Starter",
    icon: "compass",
  },
  shopify: {
    label: "Tienda / Shopify",
    shortLabel: "Shopify",
    icon: "shopping-bag",
  },
};

const sourceConfig = {
  meta: {
    label: "Meta Ads",
    icon: "megaphone",
    className: "meta",
  },
  amazon: {
    label: "Amazon Reviews",
    icon: "star",
    className: "amazon",
  },
  tiktok: {
    label: "TikTok organico",
    icon: "message-circle",
    className: "tiktok",
  },
};

const categoryMap = [
  {
    match: ["skin", "skincare", "piel", "beauty", "belleza", "acne", "jolie", "serum"],
    category: "skincare / belleza",
    pains: [
      "piel irritada o sensible",
      "resultados visibles sin rutina complicada",
      "desconfianza por claims exagerados",
      "textura, olor, residuo o empaque que arruina la experiencia",
    ],
    hooks: [
      "Rutina simple para piel sensible",
      "Antes de comprar otro serum: revisa esto",
      "Lo que nadie dice de los productos virales de skincare",
    ],
    searches: {
      amazon: ["sensitive skin serum", "skincare for sensitive skin", "hydrating face serum"],
      tiktok: ["sensitive skin routine", "skincare irritated skin", "serum did not work"],
    },
    requirements: [
      "claims conservadores y comprobables",
      "ingredientes faciles de entender",
      "pruebas sociales con contexto real",
      "empaque que se vea premium sin prometer resultados medicos",
    ],
  },
  {
    match: ["hair", "cabello", "pelo", "shampoo", "scalp", "cuero"],
    category: "haircare",
    pains: [
      "caida o quiebre percibido",
      "picazon, resequedad o cuero cabelludo sensible",
      "malos resultados con productos caros",
      "miedo a ingredientes agresivos",
    ],
    hooks: [
      "Tu problema no es solo shampoo",
      "La rutina de cabello que evita residuos pesados",
      "Clientes comparan esto despues de 30 dias",
    ],
    searches: {
      amazon: ["hair growth shampoo", "scalp serum sensitive scalp", "hair repair treatment"],
      tiktok: ["hair falling out shampoo", "sensitive scalp routine", "hair product did not work"],
    },
    requirements: [
      "evitar promesas de crecimiento garantizado",
      "pruebas de compatibilidad por tipo de cabello",
      "instrucciones claras de uso",
      "packaging resistente a fugas",
    ],
  },
  {
    match: ["filter", "water", "agua", "ducha", "shower", "hard"],
    category: "filtros / agua",
    pains: [
      "agua dura en ducha",
      "piel seca despues de banarse",
      "cabello opaco o con residuo",
      "duda sobre si el filtro realmente funciona",
    ],
    hooks: [
      "Si te mudaste a USA y tu piel cambio",
      "La prueba simple para sospechar agua dura",
      "Antes de culpar a tu shampoo",
    ],
    searches: {
      amazon: ["shower filter hard water", "water filter for shower skin hair", "hard water shower head"],
      tiktok: ["hard water hair usa", "shower filter skin", "water in usa hair loss"],
    },
    requirements: [
      "explicar reemplazo de cartuchos",
      "compatibilidad con regaderas comunes",
      "no prometer curas dermatologicas",
      "mostrar evidencia de filtracion o certificaciones",
    ],
  },
];

function init() {
  renderEmptyState();
  form.accessKey.value = localStorage.getItem("ecomResearchAccessKey") || "";
  form.addEventListener("submit", handleSubmit);
  form.querySelectorAll("input[name='businessStage']").forEach((input) => {
    input.addEventListener("change", updateBusinessStage);
  });
  document.querySelector("#connectShopify").addEventListener("click", connectShopifyStore);
  document.querySelector("#refreshShopifyStores").addEventListener("click", () => loadShopifyStores(true));
  document.querySelector("#disconnectShopify").addEventListener("click", disconnectSelectedShopifyStore);
  form.shopifyStore.addEventListener("change", syncSelectedShopifyStore);
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
  document.querySelector("#copySummary").addEventListener("click", copySummary);
  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  applyShopifyCallbackState();
  updateBusinessStage();
  loadShopifyStores(false);
  lucide.createIcons();
}

async function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  setLoading(true);

  if (data.businessStage === "shopify") {
    if (data.shopify.shop) {
      try {
        const snapshot = await requestShopifySnapshot(data.shopify.shop);
        if (snapshot?.ok) {
          data.shopify.snapshot = snapshot.shopify;
        } else {
          data.shopify.error = snapshot?.message || "No se pudo leer la tienda Shopify.";
        }
      } catch {
        data.shopify.error = "No se pudo leer la tienda conectada desde Shopify.";
      }
    } else {
      data.shopify.error = "Conecta o selecciona una tienda Shopify antes de auditar catalogo.";
    }
  }

  const report = buildReport(data);

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
    report.backendError = "Modo guiado activo. El harness privado no respondio.";
  }

  state.latest = report;
  renderReport(report);
  activateTab("brief");
  saveState(report);
  setLoading(false);
  showToast(report.ai ? "Research generado con Codex" : "Research guiado generado");
}

function readForm() {
  const selectedSources = [...form.querySelectorAll("input[name='source']:checked")].map(
    (input) => input.value,
  );
  const businessStage = form.elements.businessStage.value || "starter";
  const shopifyDomain = form.shopifyDomain.value.trim();
  const selectedShop = form.shopifyStore.value.trim();
  return {
    businessStage,
    reference:
      form.reference.value.trim() ||
      shopifyDomain ||
      (businessStage === "shopify" ? "tienda Shopify" : "marca de referencia"),
    problem:
      form.problem.value.trim() ||
      (businessStage === "shopify"
        ? "auditar una tienda ecommerce y priorizar acciones para vender"
        : "quiero vender online pero no se que producto elegir"),
    market: form.market.value,
    language: form.language.value,
    depth: form.depth.value,
    sources: selectedSources.length ? selectedSources : ["meta", "amazon", "tiktok"],
    accessKey: form.accessKey.value.trim(),
    shopify: {
      domain: shopifyDomain,
      shop: selectedShop || normalizeShopifyDomain(shopifyDomain),
      focus: form.shopifyFocus.value.trim(),
      connected: Boolean(selectedShop),
    },
  };
}

function buildReport(data) {
  const text = `${data.reference} ${data.problem}`.toLowerCase();
  const category =
    categoryMap.find((item) => item.match.some((word) => text.includes(word))) ||
    genericCategory(data.problem);
  const query = cleanQuery(data.reference, data.problem, category.category);
  const sourceLinks = buildSourceLinks(query, data.market, data.sources, category);
  const rows = buildEvidenceRows(data, category);
  const shopifySnapshot = data.shopify?.snapshot || null;
  const stageGuidance = buildStageGuidance(data, category, shopifySnapshot);

  return {
    ...data,
    category,
    query,
    sourceLinks,
    rows,
    shopify: {
      domain: data.shopify?.domain || "",
      shop: data.shopify?.shop || "",
      focus: data.shopify?.focus || "",
      connected: Boolean(shopifySnapshot),
      snapshot: shopifySnapshot,
      error: data.shopify?.error || "",
    },
    stageGuidance,
    createdAt: new Date().toLocaleString("es-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
}

async function requestBackendReport(data) {
  if (data.accessKey) {
    localStorage.setItem("ecomResearchAccessKey", data.accessKey);
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
    body: JSON.stringify(toBackendPayload(data)),
  });

  if (response.status === 404) {
    throw new Error("Backend not deployed");
  }

  return response.json();
}

async function requestShopifySnapshot(shop) {
  const response = await fetch("./api/shopify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      shop,
    }),
  });

  if (response.status === 404 || response.status === 501) {
    return {
      ok: false,
      message: "La tienda no esta conectada o el endpoint Shopify no esta desplegado.",
    };
  }

  return response.json();
}

async function loadShopifyStores(showFeedback) {
  const status = document.querySelector("#shopifyConnectionStatus");
  try {
    const response = await fetch("./api/shopify");
    if (!response.ok) throw new Error("Shopify API unavailable");
    const body = await response.json();
    state.shopifyStores = body.stores || [];
    renderShopifyStoreOptions();
    status.textContent = state.shopifyStores.length
      ? `${state.shopifyStores.length} tienda(s) conectada(s).`
      : "No hay tiendas conectadas todavia.";
    if (showFeedback) showToast("Tiendas actualizadas");
  } catch {
    state.shopifyStores = [];
    renderShopifyStoreOptions();
    status.textContent = "Para conectar tiendas, despliega en Cloudflare Pages con OAuth configurado.";
  }
}

function renderShopifyStoreOptions() {
  const current = state.pendingShopifyShop || form.shopifyStore.value;
  form.shopifyStore.innerHTML = state.shopifyStores.length
    ? state.shopifyStores
        .map((store) => {
          const label = store.shopInfo?.name ? `${store.shopInfo.name} (${store.shop})` : store.shop;
          return `<option value="${escapeHtml(store.shop)}">${escapeHtml(label)}</option>`;
        })
        .join("")
    : '<option value="">Sin tiendas conectadas</option>';

  if (state.shopifyStores.some((store) => store.shop === current)) {
    form.shopifyStore.value = current;
    state.pendingShopifyShop = "";
  }
  syncSelectedShopifyStore();
}

function syncSelectedShopifyStore() {
  const shop = form.shopifyStore.value;
  if (shop) {
    form.shopifyDomain.value = shop;
  }
}

function connectShopifyStore() {
  const shop = normalizeShopifyDomain(form.shopifyDomain.value || form.shopifyStore.value);
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    showToast("Usa el dominio .myshopify.com de la tienda");
    return;
  }
  window.location.href = `./api/shopify/connect?shop=${encodeURIComponent(shop)}`;
}

async function disconnectSelectedShopifyStore() {
  const shop = form.shopifyStore.value;
  if (!shop) {
    showToast("Selecciona una tienda conectada");
    return;
  }

  try {
    const response = await fetch("./api/shopify", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shop }),
    });
    if (!response.ok) throw new Error("Disconnect failed");
    showToast("Tienda desconectada");
    await loadShopifyStores(false);
  } catch {
    showToast("No se pudo desconectar la tienda");
  }
}

function applyShopifyCallbackState() {
  const params = new URLSearchParams(window.location.search);
  const connectedShop = params.get("shopify_connected");
  if (!connectedShop) return;

  form.elements.businessStage.value = "shopify";
  form.shopifyDomain.value = connectedShop;
  state.pendingShopifyShop = connectedShop;
  showToast("Tienda Shopify conectada");
  window.history.replaceState({}, document.title, window.location.pathname);
}

function toBackendPayload(data) {
  return {
    businessStage: data.businessStage,
    reference: data.reference,
    problem: data.problem,
    market: data.market,
    language: data.language,
    depth: data.depth,
    sources: data.sources,
    shopify: {
      domain: data.shopify?.domain || "",
      shop: data.shopify?.shop || "",
      focus: data.shopify?.focus || "",
      connected: Boolean(data.shopify?.snapshot),
      snapshot: data.shopify?.snapshot || null,
      error: data.shopify?.error || "",
    },
  };
}

function updateBusinessStage() {
  const businessStage = form.elements.businessStage.value || "starter";
  const isShopify = businessStage === "shopify";
  shopifyFields.hidden = !isShopify;
  form.problem.placeholder = isShopify
    ? "Quiero mejorar conversion, catalogo y oferta de mi tienda"
    : "Quiero vender online pero no se que producto elegir";
  form.reference.placeholder = isShopify
    ? "tienda Shopify o competidor"
    : "Marca, URL de competidor o categoria que te llama la atencion";
}

function buildStageGuidance(data, category, shopifySnapshot) {
  if (data.businessStage === "shopify") {
    const products = shopifySnapshot?.products || [];
    const productNames = products.slice(0, 5).map((product) => product.title);
    return {
      decision:
        "Primero audita catalogo, paginas de producto y oferta antes de invertir mas en ads. La investigacion externa debe explicar que promesa probar; Shopify debe mostrar que producto, precio y pagina tienen mayor prioridad.",
      focusTitle: "Prioridades Shopify",
      focusItems: [
        data.shopify?.focus || "definir producto ganador y mejorar conversion",
        products.length
          ? `revisar ${products.length} productos leidos desde Shopify`
          : "conectar catalogo para cruzar productos con dolores reales",
        "convertir quejas de reviews en mejoras de pagina, bundle, garantia y FAQ",
        "separar acciones de catalogo, acciones de landing y acciones de research",
      ],
      antiNoise: [
        "No decidir solo con sesiones o ventas: cruzar productos con dolores repetidos del mercado.",
        "No instalar apps antes de saber si la oferta y la pagina explican el valor.",
        "No cambiar todo el catalogo al mismo tiempo; priorizar 1 a 3 productos.",
        "No usar claims de competidores sin evidencia o permiso de uso.",
      ],
      shopifyActions: [
        productNames.length
          ? `Elegir 1 producto para auditar primero: ${productNames[0]}.`
          : "Conectar Shopify para detectar productos activos, estado y precios.",
        "Crear checklist por producto: promesa, objeciones, prueba social, precio, bundle, garantia y FAQ.",
        "Mapear cada hook ganador a una seccion concreta de la pagina de producto.",
        "Preparar un test simple: misma pagina, una promesa primaria y una objecion resuelta.",
      ],
    };
  }

  return {
    decision:
      "No empieces comprando inventario ni abriendo tienda a ciegas. Primero convierte tus gustos en 3 nichos posibles, valida dolores reales, revisa si hay disposicion a pagar y termina con un producto candidato simple.",
    focusTitle: "Primeros pasos",
    focusItems: [
      "convertir intereses personales en categorias vendibles",
      "encontrar dolores repetidos en reviews y comentarios organicos",
      "comparar competidores sin copiar claims ni productos al azar",
      "elegir una idea con avatar, dolor, oferta y siguiente test",
    ],
    antiNoise: [
      "No confundir productos virales con problemas urgentes.",
      "No comprar curso, inventario o logo antes de validar el dolor.",
      "No mezclar opiniones personales con evidencia de clientes.",
      "No elegir proveedor hasta tener requisitos claros de producto.",
    ],
    shopifyActions: [
      "Cuando exista una idea validada, crear Shopify solo con el producto candidato y una oferta simple.",
      "Usar el research para escribir pagina, FAQs, bundles y mensajes de anuncios.",
      "Medir interes con una landing o preorder antes de comprar volumen.",
    ],
  };
}

function genericCategory(problem) {
  const base = problem.split(/\s+/).slice(0, 4).join(" ") || "producto ecommerce";
  return {
    category: base,
    pains: [
      "dolor repetido con soluciones actuales",
      "objeciones antes de comprar",
      "decepcion despues de usar productos similares",
      "falta de confianza en claims de marcas",
    ],
    hooks: [
      "Antes de comprar otra solucion, revisa esto",
      "El problema que las marcas no explican bien",
      "La version simple para resolver el dolor principal",
    ],
    searches: {
      amazon: [`${base} reviews`, `${base} best seller`, `${base} complaints`],
      tiktok: [`${base} problem`, `${base} review`, `${base} did not work`],
    },
    requirements: [
      "beneficio central facil de comprobar",
      "calidad consistente",
      "prueba social especifica",
      "garantia o reduccion de riesgo",
    ],
  };
}

function cleanQuery(reference, problem, category) {
  let value = reference.replace(/^https?:\/\//, "").replace(/^www\./, "");
  value = value.split(/[/?#]/)[0].replace(/\.(com|co|net|io|store)$/i, "");
  value = value.replace(/[-_]/g, " ").trim();
  if (!value || value === "marca de referencia") {
    value = `${category} ${problem}`.trim();
  }
  return value.replace(/\s+/g, " ").slice(0, 80);
}

function normalizeShopifyDomain(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

function buildSourceLinks(query, market, sources, category) {
  const country = market === "MX" ? "MX" : "US";
  const metaQuery = encodeURIComponent(query);
  const amazonQuery = encodeURIComponent(category.searches.amazon[0]);
  const tiktokQuery = encodeURIComponent(category.searches.tiktok[0]);
  const links = [];
  if (sources.includes("meta")) {
    links.push({
      key: "meta",
      title: "Buscar anuncios activos",
      note: "Mirar copy, landing page, oferta, fechas, creativos y claims repetidos.",
      query,
      href: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${metaQuery}&search_type=keyword_unordered&media_type=all`,
    });
  }
  if (sources.includes("amazon")) {
    links.push({
      key: "amazon",
      title: "Buscar productos y reviews",
      note: "Separar ratings globales de reviews escritas. Priorizar 1 a 3 estrellas para problemas reales.",
      query: category.searches.amazon[0],
      href: `https://www.amazon.com/s?k=${amazonQuery}`,
    });
  }
  if (sources.includes("tiktok")) {
    links.push({
      key: "tiktok",
      title: "Buscar voz organica",
      note: "Separar contenido organico de afiliados, tiendas y TikTok Shop.",
      query: category.searches.tiktok[0],
      href: `https://www.tiktok.com/search?q=${tiktokQuery}`,
    });
  }
  return links;
}

function buildEvidenceRows(data, category) {
  if (data.businessStage === "shopify") {
    return [
      {
        insight: "Shopify muestra que productos existen; el research explica por que alguien compraria.",
        decision: "Priorizar productos que conecten con dolores repetidos en reviews o comentarios organicos.",
        source: "Shopify + Amazon + TikTok",
        confidence: "media",
      },
      {
        insight: "La pagina de producto debe responder objeciones antes de pedir trafico pagado.",
        decision: "Actualizar promesa, pruebas, FAQ, bundle y garantia antes de escalar anuncios.",
        source: "Product page audit",
        confidence: "alta",
      },
      {
        insight: "Meta Ads ayuda a encontrar hooks y oferta, pero no reemplaza datos de conversion.",
        decision: "Usar hooks externos como tests concretos dentro de Shopify, no como verdad final.",
        source: "Meta Ads",
        confidence: "alta",
      },
      {
        insight: `Las reviews negativas deben traducirse en cambios de pagina o producto: ${category.requirements[0]}.`,
        decision: "Crear un backlog por producto con fixes de copy, calidad, empaque y claims.",
        source: "Amazon Reviews",
        confidence: "alta",
      },
    ];
  }

  return [
    {
      insight: `El research debe validar si "${category.pains[0]}" aparece fuera de anuncios.`,
      decision: "No comprar inventario hasta ver dolor repetido en reviews o comentarios organicos.",
      source: "TikTok + Amazon",
      confidence: "media",
    },
    {
      insight: "Los anuncios sirven para detectar ofertas y hooks, no para probar que el dolor existe.",
      decision: "Usar Meta para copiar estructura de tests, no claims sin substanciacion.",
      source: "Meta Ads",
      confidence: "alta",
    },
    {
      insight: `Las reviews negativas deben convertirse en requisitos del producto: ${category.requirements[0]}.`,
      decision: "Crear checklist de calidad antes de elegir proveedor.",
      source: "Amazon Reviews",
      confidence: "alta",
    },
    {
      insight: "Si la categoria toca piel, cabello o cuerpo, los claims deben ser conservadores.",
      decision: "Evitar promesas medicas, curas o resultados garantizados.",
      source: "Claim safety",
      confidence: "alta",
    },
  ];
}

function renderEmptyState() {
  document.querySelector("#brief").innerHTML = emptyState.innerHTML;
  lucide.createIcons();
}

function renderReport(report) {
  const sourceLabels = report.sources.map((key) => sourceConfig[key].label).join(", ");
  const ai = report.ai || null;
  const stage = stageConfig[report.businessStage] || stageConfig.starter;
  const shopifyProductCount = report.shopify?.snapshot?.products?.length || 0;
  const decisionText =
    ai?.executiveBrief?.decision ||
    report.stageGuidance.decision;
  const problemPains = ai?.problemAvatarMap?.painLanguage?.length
    ? ai.problemAvatarMap.painLanguage
    : report.stageGuidance.focusItems;
  const evidenceRows = ai?.evidenceMatrix?.length
    ? ai.evidenceMatrix.map((row) => ({
        confidence: row.confidence,
        insight: row.insight,
        decision: row.businessDecision,
      }))
    : report.rows;
  const backendNotice = report.backendError
    ? `<article class="report-card full-span notice-card">
        <h3>Backend privado</h3>
        <p>${escapeHtml(report.backendError)}</p>
      </article>`
    : "";

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${escapeHtml(stage.shortLabel)}</strong><p>camino elegido</p></article>
      <article class="metric-card"><strong>${ai ? "IA" : report.depth === "profundo" ? "12+" : "6+"}</strong><p>${ai ? "codex harness" : "senales a validar"}</p></article>
      <article class="metric-card"><strong>${report.businessStage === "shopify" ? shopifyProductCount || "0" : report.sources.length}</strong><p>${report.businessStage === "shopify" ? "productos Shopify" : "fuentes activas"}</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Decision inicial</h3>
        <p>${escapeHtml(decisionText)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="${stage.icon}"></i>${escapeHtml(stage.label)}</span>
          <span class="pill"><i data-lucide="target"></i>${escapeHtml(report.category.category)}</span>
          <span class="pill"><i data-lucide="map-pin"></i>${escapeHtml(report.market)}</span>
          <span class="pill"><i data-lucide="database"></i>${escapeHtml(sourceLabels)}</span>
          ${report.shopify?.connected ? '<span class="pill"><i data-lucide="plug"></i>Shopify conectado</span>' : ""}
          ${ai ? '<span class="pill"><i data-lucide="cpu"></i>Codex harness</span>' : ""}
        </div>
      </article>
      ${ai?.executiveBrief?.opportunity ? `<article class="report-card full-span">
        <h3>Oportunidad</h3>
        <p>${escapeHtml(ai.executiveBrief.opportunity)}</p>
      </article>` : ""}
      <article class="report-card">
        <h3>${escapeHtml(report.stageGuidance.focusTitle)}</h3>
        <ul>${problemPains.map((pain) => `<li>${escapeHtml(pain)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Criterios anti-ruido</h3>
        <ul>${report.stageGuidance.antiNoise.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      ${ai?.executiveBrief?.bestAvatar ? `<article class="report-card full-span">
        <h3>Mejor avatar</h3>
        <p>${escapeHtml(ai.executiveBrief.bestAvatar)}</p>
      </article>` : ""}
      <article class="report-card full-span">
        <h3>Matriz de evidencia</h3>
        <ul>${evidenceRows
          .map(
            (row) =>
              `<li><strong>${escapeHtml(row.confidence.toUpperCase())}</strong> - ${escapeHtml(
                row.insight,
              )} <span>${escapeHtml(row.decision)}</span></li>`,
          )
          .join("")}</ul>
      </article>
      ${backendNotice}
    </div>`;

  document.querySelector("#sources").innerHTML = `
    <div class="source-list">
      ${report.sourceLinks
        .map((source) => {
          const config = sourceConfig[source.key];
          return `<article class="source-item">
            <div class="source-icon ${config.className}"><i data-lucide="${config.icon}"></i></div>
            <div>
              <h3>${escapeHtml(source.title)}</h3>
              <p>${escapeHtml(source.note)}</p>
              <div class="pill-row"><span class="pill"><i data-lucide="search"></i>${escapeHtml(
                source.query,
              )}</span></div>
            </div>
            <a href="${source.href}" target="_blank" rel="noreferrer">Abrir</a>
          </article>`;
        })
        .join("")}
      <article class="report-card">
        <h3>Queries sugeridas</h3>
        <ul>
          <li>${escapeHtml(report.query)} reviews problemas</li>
          ${report.category.searches.amazon
            .map((item) => `<li>Amazon: ${escapeHtml(item)}</li>`)
            .join("")}
          ${report.category.searches.tiktok
            .map((item) => `<li>TikTok: ${escapeHtml(item)}</li>`)
            .join("")}
        </ul>
      </article>
      ${ai?.sourcePlan ? `<article class="report-card">
        <h3>Plan del harness</h3>
        ${renderCompactSections([
          ["Meta Ads", ai.sourcePlan.metaAds],
          ["Amazon Reviews", ai.sourcePlan.amazonReviews],
          ["TikTok organico", ai.sourcePlan.tiktokOrganic],
          ["Queries", ai.sourcePlan.searchQueries],
        ])}
      </article>` : ""}
    </div>`;

  const hookTests = ai?.offerHookTests?.length ? ai.offerHookTests : null;
  document.querySelector("#hooks").innerHTML = `
    <div class="report-grid">
      ${(hookTests || report.category.hooks)
        .map(
          (hook, index) => `<article class="report-card">
          <h3>Hook ${index + 1}</h3>
          <p>${escapeHtml(typeof hook === "string" ? hook : hook.hook)}</p>
          ${typeof hook === "string" ? "" : `<p>${escapeHtml(hook.sourceEvidence)}</p>`}
          <div class="pill-row">
            <span class="pill"><i data-lucide="megaphone"></i>${escapeHtml(typeof hook === "string" ? "Ad test" : hook.offerMechanic)}</span>
            <span class="pill"><i data-lucide="clipboard-check"></i>${escapeHtml(typeof hook === "string" ? "Validar evidencia" : hook.confidence)}</span>
          </div>
        </article>`,
        )
        .join("")}
      <article class="report-card full-span">
        <h3>Oferta inicial</h3>
        <p>${escapeHtml(ai?.executiveBrief?.whatToBuildTest?.join(" ") || "Probar una promesa especifica, una garantia de bajo riesgo y una landing page que compare problemas reales encontrados en reviews. Evitar descuentos agresivos hasta saber que dolor mueve la compra.")}</p>
      </article>
    </div>`;

  const product = ai?.productRequirements || null;
  document.querySelector("#product").innerHTML = `
    <div class="report-grid">
      <article class="report-card">
        <h3>Requisitos del producto</h3>
        <ul>${(product?.mustHave?.length ? product.mustHave : report.category.requirements).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Preguntas para proveedor</h3>
        <ul>${(product?.supplierQuestions?.length
          ? product.supplierQuestions
          : [
              "Que evidencia tecnica respalda el beneficio principal?",
              "Que fallas aparecen con devoluciones o reviews negativas?",
              "Como se mantiene calidad lote a lote?",
              "Que claims NO deberiamos usar?",
            ]
        )
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>
      </article>
      ${product ? `<article class="report-card full-span">
        <h3>Claims y riesgos</h3>
        ${renderCompactSections([
          ["Evitar", product.mustAvoid],
          ["Prueba necesaria", product.qualityProofNeeded],
          ["Limites de claim", product.claimSafetyBoundaries],
        ])}
      </article>` : ""}
      <article class="report-card full-span">
        <h3>Prompt para research profundo</h3>
        <p>${escapeHtml(buildPrompt(report))}</p>
      </article>
    </div>`;

  renderShopifyPanel(report, ai);

  lucide.createIcons();
}

function renderShopifyPanel(report, ai) {
  const panel = document.querySelector("#shopify");
  const snapshot = report.shopify?.snapshot || null;
  const products = snapshot?.products || [];
  const errorNotice = report.shopify?.error
    ? `<article class="report-card full-span notice-card">
        <h3>Conexion Shopify</h3>
        <p>${escapeHtml(report.shopify.error)}</p>
      </article>`
    : "";
  const aiShopifyPlan = ai?.shopifyPlan
    ? `<article class="report-card full-span">
        <h3>Plan Shopify del harness</h3>
        ${renderCompactSections([
          ["Hallazgos de tienda", ai.shopifyPlan.storeFindings],
          ["Acciones de catalogo", ai.shopifyPlan.catalogActions],
          ["Paginas de producto", ai.shopifyPlan.productPageActions],
          ["Siguientes tareas", ai.shopifyPlan.nextShopifyTasks],
          ["Gaps de integracion", ai.shopifyPlan.integrationGaps],
        ])}
      </article>`
    : "";

  if (report.businessStage !== "shopify") {
    panel.innerHTML = `
      <div class="report-grid">
        <article class="report-card full-span">
          <h3>Despues de validar</h3>
          <p>Este camino todavia esta en investigacion. Cuando la idea tenga avatar, dolor y oferta, Shopify se usa para lanzar una pagina simple y medir interes real.</p>
        </article>
        <article class="report-card">
          <h3>Preparar Shopify</h3>
          <ul>${report.stageGuidance.shopifyActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <article class="report-card">
          <h3>Datos que necesitaras</h3>
          <ul>
            <li>producto candidato y promesa principal</li>
            <li>precio, bundle o garantia a probar</li>
            <li>objeciones frecuentes para FAQ</li>
            <li>requisitos de proveedor antes de comprar inventario</li>
          </ul>
        </article>
      </div>`;
    return;
  }

  panel.innerHTML = `
    <div class="metric-row">
      <article class="metric-card"><strong>${snapshot ? "Si" : "No"}</strong><p>conexion activa</p></article>
      <article class="metric-card"><strong>${products.length}</strong><p>productos leidos</p></article>
      <article class="metric-card"><strong>${escapeHtml(snapshot?.shop?.currencyCode || report.market)}</strong><p>moneda / mercado</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>${snapshot?.shop?.name ? escapeHtml(snapshot.shop.name) : "Auditoria Shopify"}</h3>
        <p>${escapeHtml(report.stageGuidance.decision)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="shopping-bag"></i>${escapeHtml(report.shopify?.shop || report.shopify?.domain || "Shopify")}</span>
          <span class="pill"><i data-lucide="target"></i>${escapeHtml(report.shopify?.focus || "priorizar acciones")}</span>
        </div>
      </article>
      ${errorNotice}
      <article class="report-card">
        <h3>Acciones inmediatas</h3>
        <ul>${report.stageGuidance.shopifyActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Checklist de pagina</h3>
        <ul>
          <li>promesa primaria visible y especifica</li>
          <li>objeciones resueltas antes del boton de compra</li>
          <li>prueba social con contexto real</li>
          <li>FAQ basada en reviews negativas y dudas de TikTok</li>
        </ul>
      </article>
      ${
        products.length
          ? `<article class="report-card full-span">
              <h3>Catalogo leido</h3>
              <div class="shopify-product-list">
                ${products
                  .map(
                    (product) => `<div class="shopify-product">
                      <div>
                        <h4>${escapeHtml(product.title)}</h4>
                        <p>${escapeHtml(formatShopifyProductDetails(product))}</p>
                      </div>
                      ${
                        product.onlineStoreUrl
                          ? `<a href="${escapeHtml(product.onlineStoreUrl)}" target="_blank" rel="noreferrer">Abrir</a>`
                          : ""
                      }
                    </div>`,
                  )
                  .join("")}
              </div>
            </article>`
          : `<article class="report-card full-span">
              <h3>Conexion pendiente</h3>
              <p>Conecta una tienda con OAuth de Shopify para leer productos activos, precios y estado del catalogo sin pedir tokens manuales.</p>
            </article>`
      }
      ${aiShopifyPlan}
    </div>`;
}

function formatShopifyProductDetails(product) {
  const pieces = [
    product.status,
    product.productType,
    product.vendor,
    product.priceRange,
    Number.isFinite(product.totalInventory) ? `${product.totalInventory} en inventario` : "",
    product.variantsCount ? `${product.variantsCount} variantes` : "",
  ].filter(Boolean);
  return pieces.join(" | ") || "sin detalles de catalogo";
}

function activateTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
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
  button.innerHTML = isLoading
    ? '<i data-lucide="loader-circle"></i>Generando...'
    : '<i data-lucide="sparkles"></i>Generar research';
  lucide.createIcons();
}

function buildPrompt(report) {
  const stageLine =
    report.businessStage === "shopify"
      ? `Camino: tienda / Shopify. Tienda conectada: ${report.shopify?.shop || report.shopify?.domain || "sin tienda conectada"}. Foco: ${report.shopify?.focus || "priorizar conversion, catalogo y oferta"}. Snapshot Shopify: ${summarizeShopifySnapshot(report.shopify?.snapshot)}.`
      : "Camino: empezar desde cero. La persona quiere vender online pero necesita descubrir nicho, producto, avatar, dolor y primeros pasos.";
  return `Investiga una oportunidad ecommerce basada en ${report.reference}. Problema: ${report.problem}. Mercado: ${report.market}. Categoria inferida: ${report.category.category}. ${stageLine} Usa Meta Ads para ofertas/hooks, Amazon Reviews para quejas y requisitos de producto, y TikTok organico para lenguaje real del cliente. Separa ruido, evidencia e hipotesis. Entrega avatar, dolores, objeciones, hooks, requisitos del producto, claims riesgosos, siguientes tests y acciones Shopify cuando aplique.`;
}

function summarizeShopifySnapshot(snapshot) {
  if (!snapshot) return "no conectado";
  const names = (snapshot.products || []).slice(0, 5).map((product) => product.title).join(", ");
  return `${snapshot.shop?.name || "tienda"} con ${(snapshot.products || []).length} productos leidos${names ? `: ${names}` : ""}`;
}

function buildMarkdown(report) {
  if (!report) return "";
  if (report.ai) {
    return buildAiMarkdown(report);
  }
  return `# Ecom Research Brief

Fecha: ${report.createdAt}
Camino: ${(stageConfig[report.businessStage] || stageConfig.starter).label}
Referencia: ${report.reference}
Problema: ${report.problem}
Mercado: ${report.market}
Categoria: ${report.category.category}

## Decision inicial

${report.stageGuidance.decision}

## ${(report.stageGuidance.focusTitle || "Problemas a validar")}

${report.stageGuidance.focusItems.map((item) => `- ${item}`).join("\n")}

## Fuentes

${report.sourceLinks.map((source) => `- ${source.title}: ${source.href}`).join("\n")}

## Hooks

${report.category.hooks.map((hook) => `- ${hook}`).join("\n")}

## Requisitos de producto

${report.category.requirements.map((item) => `- ${item}`).join("\n")}

## Shopify

${report.stageGuidance.shopifyActions.map((item) => `- ${item}`).join("\n")}

## Prompt profundo

${buildPrompt(report)}
`;
}

function buildAiMarkdown(report) {
  const ai = report.ai;
  return `# Ecom Research Brief

Fecha: ${report.createdAt}
Camino: ${(stageConfig[report.businessStage] || stageConfig.starter).label}
Referencia: ${report.reference}
Problema: ${report.problem}
Mercado: ${report.market}
Modo: Codex harness

## Decision

${ai.executiveBrief.decision}

## Oportunidad

${ai.executiveBrief.opportunity}

## Mejor avatar

${ai.executiveBrief.bestAvatar}

## Problema y lenguaje

${ai.problemAvatarMap.painLanguage.map((item) => `- ${item}`).join("\n")}

## Hooks y ofertas

${ai.offerHookTests
  .map((item) => `- ${item.hook} | ${item.offerMechanic} | ${item.confidence}`)
  .join("\n")}

## Requisitos de producto

${ai.productRequirements.mustHave.map((item) => `- ${item}`).join("\n")}

## Claims y riesgos

${ai.productRequirements.claimSafetyBoundaries.map((item) => `- ${item}`).join("\n")}

## Limitaciones

${ai.limitations.map((item) => `- ${item}`).join("\n")}

## Siguientes pasos

${ai.nextSteps.map((item) => `- ${item}`).join("\n")}

${ai.shopifyPlan ? `## Shopify

${[
  ...(ai.shopifyPlan.storeFindings || []),
  ...(ai.shopifyPlan.catalogActions || []),
  ...(ai.shopifyPlan.productPageActions || []),
  ...(ai.shopifyPlan.nextShopifyTasks || []),
].map((item) => `- ${item}`).join("\n")}
` : ""}
`;
}

function downloadBrief() {
  if (!state.latest) {
    showToast("Genera un research primero");
    return;
  }
  const blob = new Blob([buildMarkdown(state.latest)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ecom-research-${Date.now()}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copySummary() {
  if (!state.latest) {
    showToast("Genera un research primero");
    return;
  }
  await navigator.clipboard.writeText(buildMarkdown(state.latest));
  showToast("Resumen copiado");
}

function saveState(report) {
  localStorage.setItem("ecomResearchLatest", JSON.stringify(report));
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
