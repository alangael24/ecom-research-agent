const state = {
  latest: null,
};

const form = document.querySelector("#researchForm");
const resultPanel = document.querySelector(".result-panel");
const panels = [...document.querySelectorAll("[data-panel]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
const emptyState = document.querySelector("#emptyState");
const problemInput = document.querySelector("#problem");
const referenceInput = document.querySelector("#reference");
const advancedOptions = document.querySelector("#advancedOptions");
const toggleOptions = document.querySelector("#toggleOptions");
const suggestionButtons = [...document.querySelectorAll("[data-suggestion]")];

const tabLabelSets = {
  research: ["Resumen", "Fuentes", "Hooks", "Producto"],
  profitability: ["Resumen", "Números", "Alertas", "Siguiente"],
  shipping: ["Resumen", "Tarifas", "Detalles", "Siguiente"],
};

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
  clearLegacyLocalState();
  restoreSkillFromUrl();
  renderEmptyState();
  form.addEventListener("submit", handleSubmit);
  problemInput.addEventListener("input", autoResizePrompt);
  toggleOptions.addEventListener("click", () => {
    advancedOptions.open = !advancedOptions.open;
  });
  suggestionButtons.forEach((button) => {
    button.addEventListener("click", () => applySuggestion(button));
  });
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
  document.querySelector("#copySummary").addEventListener("click", copySummary);
  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  autoResizePrompt();
  lucide.createIcons();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!problemInput.value.trim() && !referenceInput.value.trim()) {
    showToast("Escribe una marca, producto o problema");
    problemInput.focus();
    return;
  }
  const data = readForm();
  const report = buildReport(data);
  setLoading(true);

  try {
    const backend = await requestBackendReport(data);
    if (backend?.ok && backend.report) {
      if (backend.report.type === "profitability") {
        state.latest = backend.report;
        renderProfitabilityReport(backend.report);
        activateTab("brief");
        setLoading(false);
        document.querySelector(".result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("Análisis de rentabilidad listo");
        return;
      }
      if (backend.report.type === "shipping_quote") {
        state.latest = backend.report;
        renderShippingQuoteReport(backend.report);
        activateTab("brief");
        setLoading(false);
        document.querySelector(".result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("Cotización de envío lista");
        return;
      }
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
  setLoading(false);
  document.querySelector(".result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(report.ai ? "Research generado con Codex" : "Research guiado generado");
}

function readForm() {
  const selectedSources = [...form.querySelectorAll("input[name='source']:checked")].map(
    (input) => input.value,
  );
  const problem = problemInput.value.trim();
  const inferredReference = inferReference(problem);
  return {
    reference: form.elements.reference.value.trim() || inferredReference || "marca de referencia",
    problem: problem || "validar una nueva marca ecommerce",
    market: form.elements.market.value,
    language: form.elements.language.value,
    depth: form.elements.depth.value,
    sources: selectedSources.length ? selectedSources : ["meta", "amazon", "tiktok"],
    accessKey: form.elements.accessKey.value.trim(),
  };
}

function applySuggestion(button) {
  referenceInput.value = button.dataset.reference || "";
  problemInput.value = button.dataset.problem || button.textContent.trim();
  autoResizePrompt();
  problemInput.focus();
  showToast("Sugerencia lista para investigar");
}

function autoResizePrompt() {
  problemInput.style.height = "auto";
  problemInput.style.height = `${Math.min(problemInput.scrollHeight, 220)}px`;
}

function inferReference(text) {
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) return urlMatch[0].replace(/[),.]+$/, "");
  const domainMatch = text.match(/\b[a-z0-9][a-z0-9-]*\.(com|co|net|io|store|mx|org)\b/i);
  return domainMatch ? domainMatch[0] : "";
}

function restoreSkillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("skill") === "rentabilidad" || params.get("skill") === "profitability") {
    problemInput.value =
      "Quiero saber si esta idea puede dejar dinero. Ayúdame a calcular costos, margen y cuánto podría pagar por cliente.";
  }
}

function buildReport(data) {
  const text = `${data.reference} ${data.problem}`.toLowerCase();
  const category =
    categoryMap.find((item) => item.match.some((word) => text.includes(word))) ||
    genericCategory(data.problem);
  const query = cleanQuery(data.reference, data.problem, category.category);
  const sourceLinks = buildSourceLinks(query, data.market, data.sources, category);
  const rows = buildEvidenceRows(data, category);

  return {
    ...data,
    category,
    query,
    sourceLinks,
    rows,
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
  resultPanel.hidden = true;
  resultPanel.classList.remove("ready");
  setTabLabels(tabLabelSets.research);
  document.querySelector("#brief").innerHTML = emptyState.innerHTML;
  lucide.createIcons();
}

function renderProfitabilityReport(report) {
  const data = report.profitability;
  const scoreClass = report.verdict.level === "pass" ? "" : report.verdict.level;
  resultPanel.hidden = false;
  resultPanel.classList.add("ready");
  setTabLabels(tabLabelSets.profitability);

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card ${report.verdict.level === "fail" ? "danger" : report.verdict.level === "watch" ? "warning" : ""}">
        <strong>${escapeHtml(report.verdict.label)}</strong>
        <p>veredicto</p>
      </article>
      <article class="metric-card">
        <strong>${report.score}/100</strong>
        <p>calificación</p>
      </article>
      <article class="metric-card">
        <strong>${formatMoney(data.cacTarget, data.currency)}</strong>
        <p>meta sana por cliente</p>
      </article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>${escapeHtml(report.verdict.title)}</h3>
        <p>${escapeHtml(report.verdict.copy)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="calculator"></i>Análisis de rentabilidad</span>
          <span class="pill"><i data-lucide="shopping-bag"></i>${formatMoney(data.aov, data.currency)} por pedido</span>
          <span class="pill"><i data-lucide="megaphone"></i>${escapeHtml(channelLabels[data.channel])}</span>
        </div>
      </article>
      <article class="report-card">
        <h3>Dinero disponible antes de anuncios</h3>
        <p>${formatMoney(data.contribution, data.currency)} por pedido, equivalente a ${formatPercent(data.margin)}.</p>
      </article>
      <article class="report-card">
        <h3>Ventas necesarias</h3>
        <p>Para no perder, necesitas vender ${formatRoas(data.breakEvenRoas)} por cada $1 gastado en anuncios.</p>
      </article>
      <article class="report-card full-span">
        <h3>Calificación</h3>
        <div class="score-track"><span class="${scoreClass}" style="width: ${report.score}%"></span></div>
      </article>
      <article class="report-card full-span">
        <h3>Supuestos usados</h3>
        <ul>${data.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#sources").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Números usados</h3>
        <dl class="calculation-list">
          <div><dt>Venta por pedido</dt><dd>${formatMoney(data.aov, data.currency)}</dd></div>
          <div><dt>Producto</dt><dd>${formatMoney(data.cogs, data.currency)}</dd></div>
          <div><dt>Envío</dt><dd>${formatMoney(data.shipping, data.currency)}</dd></div>
          <div><dt>Cobros de plataforma</dt><dd>${formatMoney(data.fees, data.currency)}</dd></div>
          <div><dt>Reserva por devoluciones</dt><dd>${formatMoney(data.returnsReserve, data.currency)}</dd></div>
          <div><dt>Máximo para conseguir cliente</dt><dd>${formatMoney(data.cacMax, data.currency)}</dd></div>
          <div><dt>Meta sana por cliente</dt><dd>${formatMoney(data.cacTarget, data.currency)}</dd></div>
          <div><dt>Meta sana de ventas por $1 en anuncios</dt><dd>${formatRoas(data.targetRoas)}</dd></div>
          <div><dt>Valor si compra otra vez</dt><dd>${formatMoney(data.ltvContribution, data.currency)}</dd></div>
        </dl>
      </article>
      ${renderShippingQuoteDetails(data.shippingQuote)}
    </div>`;

  document.querySelector("#hooks").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Alertas importantes</h3>
        <ul>${report.risks.map((risk) => `<li>${risk}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#product").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Qué haría después</h3>
        <ul>${report.steps.map((step) => `<li>${step}</li>`).join("")}</ul>
      </article>
      <article class="report-card full-span">
        <h3>Si faltan números</h3>
        <p>Este resultado usa supuestos. Para reemplazarlos, escribe precio, costo del producto, CP origen, CP destino, peso, medidas del paquete y devoluciones.</p>
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
    estimated_no_envia_token: "Estimado para México",
    estimated_missing_mx_details: "Estimado para México",
    estimated_after_envia_error: "Estimado para México",
    estimated_no_api_key: "Estimado",
    estimated_unsupported_currency: "Estimado",
    estimated_missing_details: "Estimado",
    estimated_after_quote_error: "Estimado",
  }[shippingQuote.mode] || "Estimado";
  const profile = shippingQuote.profile || {};
  const packageText =
    shippingQuote.currency === "MXN"
      ? `${formatNumber(profile.weightOz / 35.274)} kg, ${formatNumber(profile.lengthIn * 2.54)} x ${formatNumber(profile.widthIn * 2.54)} x ${formatNumber(profile.heightIn * 2.54)} cm`
      : `${formatNumber(profile.weightOz)} oz, ${formatNumber(profile.lengthIn)} x ${formatNumber(profile.widthIn)} x ${formatNumber(profile.heightIn)} in`;
  const routeText =
    shippingQuote.currency === "MXN"
      ? `${profile.originZip || "origen pendiente"} -> ${profile.destinationZip || "destino pendiente"}`
      : `${profile.originZip || "origin pending"} -> ${profile.destinationZip || "destination pending"}`;
  const rateRows = Array.isArray(shippingQuote.rates) && shippingQuote.rates.length
    ? `<dl class="calculation-list mini-list">${shippingQuote.rates
        .map(
          (rate) => `<div><dt>${escapeHtml(rate.carrier)} ${escapeHtml(rate.service)}</dt><dd>${formatMoney(rate.amount, rate.currency || shippingQuote.currency)}</dd></div>`,
        )
        .join("")}</dl>`
    : "";

  return `<article class="report-card full-span">
    <h3>Cómo se calculó el envío</h3>
    <p><strong>${escapeHtml(status)}:</strong> ${formatMoney(shippingQuote.amount, shippingQuote.currency || "USD")} por pedido.</p>
    <div class="pill-row">
      <span class="pill"><i data-lucide="map-pinned"></i>${escapeHtml(routeText)}</span>
      <span class="pill"><i data-lucide="package"></i>${escapeHtml(packageText)}</span>
    </div>
    ${rateRows}
  </article>`;
}

function renderShippingQuoteReport(report) {
  const quote = report.shippingQuote;
  const profile = quote.profile || {};
  const route = `${profile.originZip || "origen pendiente"} -> ${profile.destinationZip || "destino pendiente"}`;
  const live = quote.mode === "live_envia_mx" || quote.mode === "live_easypost";
  const status = live ? "Cotización viva" : quote.mode === "user_provided" ? "Envío escrito" : "Estimación";
  resultPanel.hidden = false;
  resultPanel.classList.add("ready");
  setTabLabels(tabLabelSets.shipping);

  document.querySelector("#brief").innerHTML = `
    <div class="metric-row">
      <article class="metric-card ${live ? "" : "warning"}">
        <strong>${formatMoney(quote.amount, quote.currency)}</strong>
        <p>costo de envío</p>
      </article>
      <article class="metric-card">
        <strong>${escapeHtml(status)}</strong>
        <p>tipo de cálculo</p>
      </article>
      <article class="metric-card">
        <strong>${escapeHtml(quote.carrier || (quote.currency === "MXN" ? "Envia" : "API"))}</strong>
        <p>proveedor</p>
      </article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Ruta cotizada</h3>
        <p>${escapeHtml(route)}${profile.originCity || profile.destinationCity ? ` · ${escapeHtml([profile.originCity, profile.destinationCity].filter(Boolean).join(" a "))}` : ""}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="truck"></i>Solo cotización</span>
          <span class="pill"><i data-lucide="package"></i>${escapeHtml(packageSummary(report.package, quote.currency))}</span>
          <span class="pill"><i data-lucide="shield-check"></i>No compra guía</span>
        </div>
      </article>
      <article class="report-card full-span">
        <h3>Notas</h3>
        <ul>${quote.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
      </article>
    </div>`;

  document.querySelector("#sources").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Tarifas disponibles</h3>
        ${renderShippingRates(quote)}
      </article>
    </div>`;

  document.querySelector("#hooks").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Detalles usados</h3>
        <dl class="calculation-list">
          <div><dt>Origen</dt><dd>${escapeHtml(profile.originZip || "pendiente")}</dd></div>
          <div><dt>Destino</dt><dd>${escapeHtml(profile.destinationZip || "pendiente")}</dd></div>
          <div><dt>Peso</dt><dd>${formatNumber(report.package.weightKg)} kg</dd></div>
          <div><dt>Medidas</dt><dd>${formatNumber(report.package.lengthCm)} x ${formatNumber(report.package.widthCm)} x ${formatNumber(report.package.heightCm)} cm</dd></div>
          <div><dt>Valor declarado</dt><dd>${formatMoney(profile.declaredValue || 0, quote.currency)}</dd></div>
        </dl>
      </article>
      ${report.warnings.length ? `<article class="report-card full-span notice-card">
        <h3>Alertas</h3>
        <ul>${report.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
      </article>` : ""}
    </div>`;

  document.querySelector("#product").innerHTML = `
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Qué haría después</h3>
        <ul>${report.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
      </article>
    </div>`;

  lucide.createIcons();
}

function renderShippingRates(quote) {
  if (!Array.isArray(quote.rates) || !quote.rates.length) {
    return `<p>${escapeHtml(quote.notes.join(" "))}</p>`;
  }
  return `<dl class="calculation-list mini-list">${quote.rates
    .map(
      (rate) => `<div><dt>${escapeHtml(rate.carrier)} ${escapeHtml(rate.service)}</dt><dd>${formatMoney(rate.amount, rate.currency || quote.currency)}</dd></div>`,
    )
    .join("")}</dl>`;
}

function packageSummary(packageInfo, currency) {
  if (!packageInfo) return "paquete";
  if (currency === "MXN") {
    return `${formatNumber(packageInfo.weightKg)} kg · ${formatNumber(packageInfo.lengthCm)} x ${formatNumber(packageInfo.widthCm)} x ${formatNumber(packageInfo.heightCm)} cm`;
  }
  return `${formatNumber(packageInfo.weightKg)} kg`;
}

function renderReport(report) {
  resultPanel.hidden = false;
  resultPanel.classList.add("ready");
  setTabLabels(tabLabelSets.research);
  const sourceLabels = report.sources.map((key) => sourceConfig[key].label).join(", ");
  const ai = report.ai || null;
  const decisionText =
    ai?.executiveBrief?.decision ||
    "No tomar esto como validacion final todavia. Primero hay que confirmar si el problema aparece en al menos dos fuentes: reviews/comentarios organicos y senales comerciales en anuncios. Si solo aparece en anuncios, es hype; si solo aparece en quejas, falta probar disposicion a pagar.";
  const problemPains = ai?.problemAvatarMap?.painLanguage?.length
    ? ai.problemAvatarMap.painLanguage
    : report.category.pains;
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
      <article class="metric-card"><strong>${report.sources.length}</strong><p>fuentes activas</p></article>
      <article class="metric-card"><strong>${ai ? "IA" : report.depth === "profundo" ? "12+" : "6+"}</strong><p>${ai ? "codex harness" : "senales a validar"}</p></article>
      <article class="metric-card"><strong>${report.market}</strong><p>mercado objetivo</p></article>
    </div>
    <div class="report-grid">
      <article class="report-card full-span">
        <h3>Decision inicial</h3>
        <p>${escapeHtml(decisionText)}</p>
        <div class="pill-row">
          <span class="pill"><i data-lucide="target"></i>${escapeHtml(report.category.category)}</span>
          <span class="pill"><i data-lucide="map-pin"></i>${escapeHtml(report.market)}</span>
          <span class="pill"><i data-lucide="database"></i>${escapeHtml(sourceLabels)}</span>
          ${ai ? '<span class="pill"><i data-lucide="cpu"></i>Codex harness</span>' : ""}
        </div>
      </article>
      ${ai?.executiveBrief?.opportunity ? `<article class="report-card full-span">
        <h3>Oportunidad</h3>
        <p>${escapeHtml(ai.executiveBrief.opportunity)}</p>
      </article>` : ""}
      <article class="report-card">
        <h3>Problema a validar</h3>
        <ul>${problemPains.map((pain) => `<li>${escapeHtml(pain)}</li>`).join("")}</ul>
      </article>
      <article class="report-card">
        <h3>Criterios anti-ruido</h3>
        <ul>
          <li>Separar afiliados, tiendas y anuncios de voz organica.</li>
          <li>No mezclar ratings globales con reviews escritas.</li>
          <li>No convertir claims de competidores en hechos.</li>
          <li>Guardar fuente, URL, fecha y motivo de inclusion.</li>
        </ul>
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

  lucide.createIcons();
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
  button.innerHTML = isLoading
    ? '<i data-lucide="loader-circle"></i>'
    : '<i data-lucide="arrow-up"></i>';
  button.setAttribute("aria-label", isLoading ? "Generando research" : "Generar research");
  lucide.createIcons();
}

function buildPrompt(report) {
  return `Investiga una oportunidad ecommerce basada en ${report.reference}. Problema: ${report.problem}. Mercado: ${report.market}. Categoria inferida: ${report.category.category}. Usa Meta Ads para ofertas/hooks, Amazon Reviews para quejas y requisitos de producto, y TikTok organico para lenguaje real del cliente. Separa ruido, evidencia e hipotesis. Entrega avatar, dolores, objeciones, hooks, requisitos del producto, claims riesgosos y siguientes tests.`;
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
  return `# Ecom Research Brief

Fecha: ${report.createdAt}
Referencia: ${report.reference}
Problema: ${report.problem}
Mercado: ${report.market}
Categoria: ${report.category.category}

## Decision inicial

No comprar inventario todavia. Validar que el dolor aparece en voz organica o reviews y que Meta Ads muestra senales comerciales aprovechables.

## Problemas a validar

${report.category.pains.map((pain) => `- ${pain}`).join("\n")}

## Fuentes

${report.sourceLinks.map((source) => `- ${source.title}: ${source.href}`).join("\n")}

## Hooks

${report.category.hooks.map((hook) => `- ${hook}`).join("\n")}

## Requisitos de producto

${report.category.requirements.map((item) => `- ${item}`).join("\n")}

## Prompt profundo

${buildPrompt(report)}
`;
}

function buildShippingQuoteMarkdown(report) {
  const quote = report.shippingQuote;
  const profile = quote.profile || {};
  return `# Cotización de envío

Fecha: ${report.createdAt}
Modo: ${quote.mode}
Proveedor: ${report.provider}
Solo cotización: ${report.rateOnly ? "sí" : "no"}

## Ruta
- Origen: ${profile.originZip || "pendiente"} ${profile.originCity || ""}
- Destino: ${profile.destinationZip || "pendiente"} ${profile.destinationCity || ""}

## Paquete
- Peso: ${formatNumber(report.package.weightKg)} kg
- Medidas: ${formatNumber(report.package.lengthCm)} x ${formatNumber(report.package.widthCm)} x ${formatNumber(report.package.heightCm)} cm
- Valor declarado: ${formatMoney(profile.declaredValue || 0, quote.currency)}

## Resultado
- Costo usado: ${formatMoney(quote.amount, quote.currency)}
- Carrier: ${quote.carrier || "No disponible"}
- Servicio: ${quote.service || "No disponible"}

## Tarifas
${Array.isArray(quote.rates) && quote.rates.length ? quote.rates.map((rate) => `- ${rate.carrier} ${rate.service}: ${formatMoney(rate.amount, rate.currency || quote.currency)}`).join("\n") : "- Sin tarifas vivas; se usó estimación."}

## Alertas
${report.warnings.map((warning) => `- ${warning}`).join("\n")}

## Siguiente
${report.nextSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function buildProfitabilityMarkdown(report) {
  const data = report.profitability;
  return `# Análisis de rentabilidad

Idea: ${data.ideaName}
Veredicto: ${report.verdict.label}
Calificación: ${report.score}/100

## Preguntas
- Venta promedio por pedido: ${formatMoney(data.aov, data.currency)}
- Costo del producto: ${formatMoney(data.cogs, data.currency)}
- Costo de envío: ${formatMoney(data.shipping, data.currency)}
- Fuente del envío: ${shippingQuoteSummary(data.shippingQuote)}
- Cobros de plataforma/tarjeta: ${formatMoney(data.fees, data.currency)}
- Devoluciones estimadas: ${formatPercent(data.returnRate / 100)}
- Recompra posible: ${repurchaseLabels[data.repurchaseMultiplier]}
- Diferencia: ${differentiationLabels[data.differentiation]}
- Dónde conseguir clientes: ${channelLabels[data.channel]}

## Resultado
- Dinero que queda antes de anuncios: ${formatPercent(data.margin)}
- Máximo para conseguir un cliente: ${formatMoney(data.cacMax, data.currency)}
- Meta sana para conseguir un cliente: ${formatMoney(data.cacTarget, data.currency)}
- Ventas necesarias por cada $1 en anuncios: ${formatRoas(data.breakEvenRoas)}
- Meta sana de ventas por cada $1 en anuncios: ${formatRoas(data.targetRoas)}
- Valor si compra otra vez: ${formatMoney(data.ltvContribution, data.currency)}

## Supuestos
${data.assumptions.map((item) => `- ${item}`).join("\n")}

## Alertas
${report.risks.map((item) => `- ${stripHtml(item)}`).join("\n")}

## Siguiente
${report.steps.map((item) => `- ${stripHtml(item)}`).join("\n")}
`;
}

function shippingQuoteSummary(shippingQuote) {
  if (!shippingQuote) return "No disponible";
  if (shippingQuote.mode === "live_envia_mx") {
    return `Cotizado con Envia.com (${shippingQuote.carrier} ${shippingQuote.service})`;
  }
  if (shippingQuote.mode === "live_easypost") {
    return `Cotizado en vivo (${shippingQuote.carrier} ${shippingQuote.service})`;
  }
  if (shippingQuote.mode === "user_provided") return "Número escrito por el usuario";
  return "Estimación por falta de datos o API key";
}

function buildAiMarkdown(report) {
  const ai = report.ai;
  return `# Ecom Research Brief

Fecha: ${report.createdAt}
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

function clearLegacyLocalState() {
  try {
    localStorage.removeItem("ecomResearchAccessKey");
    localStorage.removeItem("ecomResearchLatest");
  } catch {
    // Ignore privacy cleanup failures in restricted browser modes.
  }
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
  node.innerHTML = value;
  return node.textContent || node.innerText || "";
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

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

init();
