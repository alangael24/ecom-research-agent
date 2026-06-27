const state = {
  latest: null,
};

const form = document.querySelector("#researchForm");
const panels = [...document.querySelectorAll("[data-panel]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
const emptyState = document.querySelector("#emptyState");

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
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
  document.querySelector("#copySummary").addEventListener("click", copySummary);
  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  lucide.createIcons();
}

async function handleSubmit(event) {
  event.preventDefault();
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
  return {
    reference: form.reference.value.trim() || "marca de referencia",
    problem: form.problem.value.trim() || "validar una nueva marca ecommerce",
    market: form.market.value,
    language: form.language.value,
    depth: form.depth.value,
    sources: selectedSources.length ? selectedSources : ["meta", "amazon", "tiktok"],
    accessKey: form.accessKey.value.trim(),
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
  document.querySelector("#brief").innerHTML = emptyState.innerHTML;
  lucide.createIcons();
}

function renderReport(report) {
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
  return `Investiga una oportunidad ecommerce basada en ${report.reference}. Problema: ${report.problem}. Mercado: ${report.market}. Categoria inferida: ${report.category.category}. Usa Meta Ads para ofertas/hooks, Amazon Reviews para quejas y requisitos de producto, y TikTok organico para lenguaje real del cliente. Separa ruido, evidencia e hipotesis. Entrega avatar, dolores, objeciones, hooks, requisitos del producto, claims riesgosos y siguientes tests.`;
}

function buildMarkdown(report) {
  if (!report) return "";
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
