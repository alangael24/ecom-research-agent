import { createServer } from "node:http";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequestGet, onRequestPost } from "../functions/api/research.js";

const APP_PASSWORD = "test-app-password";
const HARNESS_TOKEN = "test-harness-token";

const directCases = [
  {
    name: "unit economics",
    expectedType: "profitability",
    payload: {
      selectedInternalTool: "unit_economics_filter",
      naturalRequest: "Calcula si una idea de skincare es rentable con precio 68, costo 16, envio 8, CAC objetivo y ROAS.",
      businessStage: "starter",
      product: "skincare serum",
      market: "US",
    },
  },
  {
    name: "unit economics explicit priority",
    expectedType: "profitability",
    payload: {
      selectedInternalTool: "unit_economics_filter",
      naturalRequest: "Aunque luego hagamos avatar research, primero calcula rentabilidad con precio 72, costo 18, envio 9 y CAC objetivo.",
      businessStage: "starter",
      product: "skincare kit",
      market: "US",
    },
  },
  {
    name: "shipping quote",
    expectedType: "shipping_quote",
    payload: {
      selectedInternalTool: "shipping_rate_quote",
      naturalRequest: "Cotiza envio de paquete peso 300 gramos medidas 20x12x8 cm CP origen 99257 Valparaiso Zacatecas a CP destino 45019 Zapopan Jalisco.",
      businessStage: "starter",
      market: "MX",
    },
  },
  {
    name: "retail to online",
    expectedType: "retail_to_online",
    payload: {
      selectedInternalTool: "retail-to-online-agent",
      naturalRequest: "Tengo una tienda fisica boutique y quiero vender online con TikTok organico y una primera pagina web.",
      businessStage: "starter",
      product: "ropa de boutique",
      market: "MX",
      attachments: [
        {
          id: "inventory",
          name: "inventario.csv",
          type: "text/csv",
          kind: "spreadsheet",
          contentMode: "text",
          size: 64,
          content: "sku,producto,precio,inventario\nA1,Blusa,599,12",
        },
      ],
    },
  },
  {
    name: "brand whitespace explicit",
    expectedType: "brand_whitespace",
    payload: {
      selectedInternalTool: "brand_whitespace_tool",
      naturalRequest: "Analiza competencia, posicionamiento y whitespace para encontrar un angulo libre sin caer en sesgo de suplementos.",
      businessStage: "brand",
      product: "skincare",
      market: "US",
      brand: {
        name: "Luma Skin",
        url: "https://example.com",
        channels: "Meta Ads, TikTok",
        goal: "encontrar diferenciacion frente a competidores",
      },
      commerce: {
        platform: "woocommerce",
        platformLabel: "WooCommerce",
        storeId: "example.com",
        label: "Example Store",
        snapshot: {
          platform: "woocommerce",
          platformLabel: "WooCommerce",
          storeId: "example.com",
          store: { name: "Example Store", currencyCode: "USD" },
          products: [
            {
              id: "1",
              title: "Barrier Serum",
              status: "active",
              productType: "serum",
              totalInventory: 20,
              priceRange: "$38.00",
            },
          ],
        },
      },
    },
  },
  {
    name: "tool factory",
    expectedType: "tool_factory",
    payload: {
      selectedInternalTool: "agentgenia_tool_factory",
      naturalRequest: "Quiero reemplazar Judge.me con una herramienta de reviews simple sin pagar otra app.",
      businessStage: "shopify",
      market: "US",
      shopify: { shop: "", focus: "reviews" },
    },
  },
  {
    name: "shopify page builder",
    expectedType: "shopify_page_draft",
    payload: {
      selectedInternalTool: "shopify_page_builder",
      naturalRequest: "Crear una landing page en Shopify para una marca de skincare con beneficios y CTA.",
      businessStage: "shopify",
      product: "skincare starter kit",
      market: "US",
      brand: { name: "Luma Skin" },
      shopify: { shop: "", focus: "conversion" },
    },
  },
];

const harnessCases = [
  {
    name: "problem discovery routes to harness",
    tool: "problem-discovery-agent",
    payload: {
      selectedInternalTool: "problem-discovery-agent",
      naturalRequest: "Busca un problema real en skincare usando Meta Ads, Amazon reviews y TikTok pain points.",
      businessStage: "starter",
      market: "US",
    },
  },
  {
    name: "product customization routes to harness",
    tool: "product-customization-agent",
    payload: {
      selectedInternalTool: "product-customization-agent",
      naturalRequest: "Haz un brief de private label con empaque, caja, insert y variantes de fragancia.",
      businessStage: "starter",
      market: "US",
    },
  },
  {
    name: "alibaba sourcing routes to harness",
    tool: "alibaba-sourcing-agent",
    payload: {
      selectedInternalTool: "alibaba-sourcing-agent",
      naturalRequest: "Busca proveedores Alibaba con MOQ bajo, DDP y muestras para filtros de ducha.",
      businessStage: "starter",
      market: "US",
    },
  },
  {
    name: "brand audit routes to harness",
    tool: "brand-audit-agent",
    payload: {
      selectedInternalTool: "brand-audit-agent",
      naturalRequest: "Audita mi marca existente y dime que mejorar en oferta, conversion y retencion.",
      businessStage: "brand",
      market: "US",
      brand: { name: "Luma Skin", channels: "Meta Ads", goal: "mejorar conversion" },
    },
  },
  {
    name: "store audit routes to harness",
    tool: "shopify-store-audit",
    payload: {
      selectedInternalTool: "shopify-store-audit",
      naturalRequest: "Audita mi tienda conectada y dime oportunidades de catalogo, conversion y acciones prioritarias.",
      businessStage: "shopify",
      market: "US",
      commerce: {
        platform: "shopify",
        platformLabel: "Shopify",
        storeId: "example.myshopify.com",
        label: "Example Shopify",
        snapshot: {
          platform: "shopify",
          platformLabel: "Shopify",
          storeId: "example.myshopify.com",
          store: { name: "Example Shopify", currencyCode: "USD" },
          products: [{ id: "1", title: "Starter Kit", status: "active", totalInventory: 8, priceRange: "$58.00" }],
        },
      },
      shopify: {
        shop: "example.myshopify.com",
        focus: "conversion",
      },
    },
  },
];

const harnessRequests = [];
const harnessJobs = new Map();
const harness = createServer(async (request, response) => {
  if (request.url === "/healthz" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  const jobMatch = request.url.match(/^\/jobs\/([^/]+)$/);
  if (request.method === "GET" && jobMatch) {
    assert.equal(request.headers.authorization, `Bearer ${HARNESS_TOKEN}`);
    const job = harnessJobs.get(jobMatch[1]);
    if (!job) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, code: "job_not_found" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(job));
    return;
  }

  if (request.url !== "/jobs" || request.method !== "POST") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, code: "not_found" }));
    return;
  }
  assert.equal(request.headers.authorization, `Bearer ${HARNESS_TOKEN}`);
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  harnessRequests.push(payload);
  const jobId = `job-${harnessRequests.length}`;
  harnessJobs.set(jobId, {
    ok: true,
    jobId,
    status: "done",
    pending: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
      report: {
        executiveBrief: {
          decision: `Harness executed ${payload.selectedInternalTool}`,
          recommendedPath: "verified",
          topRisks: [],
        },
        agentWorkLog: [
          {
            key: "harness",
            title: "Harness",
            status: "done",
            result: payload.selectedInternalTool,
            nextAction: "none",
          },
        ],
      },
      diagnostics: { fakeHarness: true },
  });
  response.writeHead(202, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: true, jobId, status: "queued", pending: true }));
});

await new Promise((resolve) => harness.listen(0, "127.0.0.1", resolve));
const { port } = harness.address();

try {
  for (const testCase of directCases) {
    const body = await callResearch(testCase.payload, {});
    assert.equal(body.ok, true, testCase.name);
    assert.equal(body.report?.type, testCase.expectedType, testCase.name);
    assert.equal(typeof body.report.createdAt, "string", `${testCase.name} createdAt`);
  }

  for (const testCase of harnessCases) {
    const before = harnessRequests.length;
    const body = await callResearch(testCase.payload, {
      HARNESS_URL: `http://127.0.0.1:${port}`,
      HARNESS_TOKEN,
    }, {
      expectedStatus: 202,
    });
    assert.equal(body.ok, true, testCase.name);
    assert.equal(body.pending, true, `${testCase.name} starts async job`);
    assert.equal(typeof body.jobId, "string", `${testCase.name} job id`);
    assert.equal(harnessRequests.length, before + 1, `${testCase.name} called harness`);
    assert.equal(harnessRequests.at(-1).selectedInternalTool, testCase.tool, `${testCase.name} selected tool`);
    const completed = await callResearchJob(body.jobId, {
      HARNESS_URL: `http://127.0.0.1:${port}`,
      HARNESS_TOKEN,
    });
    assert.equal(completed.ok, true, `${testCase.name} poll ok`);
    assert.equal(completed.pending, false, `${testCase.name} completed`);
    assert.equal(completed.report?.executiveBrief?.decision, `Harness executed ${testCase.tool}`, testCase.name);
  }

  const unauthenticated = await callResearch(
    { naturalRequest: "test sin sesion", businessStage: "starter" },
    {},
    { includeAuth: false, expectedStatus: 401 },
  );
  assert.equal(unauthenticated.ok, false);
  assert.equal(unauthenticated.code, "missing_session");

  const guestBody = await callResearch(
    directCases[0].payload,
    {
      AUTH_REQUIRED: "false",
      ALLOW_GUEST_RESEARCH: "true",
    },
    { includeAuth: false },
  );
  assert.equal(guestBody.ok, true);
  assert.equal(guestBody.report?.type, directCases[0].expectedType, "guest research direct tool");

  const health = await onRequestGet({
    env: {
      HARNESS_URL: `http://127.0.0.1:${port}`,
      HARNESS_TOKEN,
    },
  }).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.harness.configured, true);
  assert.equal(health.harness.reachable, true);
  assert.equal(health.harness.status, "ok");

  await assertHarnessSchemaStrictShape();
  await assertFrontendDoesNotSimulateHarnessReports();

  console.log(`internal tools ok: ${directCases.length} direct, ${harnessCases.length} harness`);
} finally {
  await new Promise((resolve) => harness.close(resolve));
}

async function assertFrontendDoesNotSimulateHarnessReports() {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /const report = buildBackendReportShell\(data\);/, "live harness responses use backend shell");
  assert.match(app, /const report = buildBackendReportShell\(\{[\s\S]*run\.natural_request/, "history uses backend shell");
  assert.match(app, /isBackendHarnessReport\(report\) \? null : report\?\.problemDiscovery/, "no local problemDiscovery fallback for harness");
  assert.match(app, /isBackendHarnessReport\(report\) \? null : report\?\.customizationPlan/, "no local customization fallback for harness");
  assert.match(app, /backendMode \? \[\] : report\.supplierProfiles/, "no local supplier fallback for harness");
  assert.match(app, /missingNegotiationPlan\(\)/, "missing harness negotiation is explicit");
  assert.match(app, /function clearContextSelection\(\)/, "active context can be cleared");
  assert.match(app, /const selectedStore = businessStage === "shopify" \? selectedCommerceStore\(\) : null;/, "store context only sent in shopify mode");
  assert.match(app, /const brand = businessStage === "brand"/, "brand context only sent in brand mode");
}

async function assertHarnessSchemaStrictShape() {
  const schema = JSON.parse(await readFile(new URL("../server/research-schema.json", import.meta.url), "utf8"));
  const propertyKeys = Object.keys(schema.properties || {});
  assert.deepEqual([...schema.required].sort(), propertyKeys.sort(), "top-level schema requires every property");
  for (const key of [
    "shopifyPlan",
    "brandPlan",
    "websitePlan",
    "problemDiscovery",
    "angleWhitespaceValidator",
    "creativePerformance",
    "avatarResearch",
    "customizationPlan",
  ]) {
    assert.deepEqual(schema.properties[key].type, ["object", "null"], `${key} is nullable`);
  }
}

async function callResearch(payload, envOverrides = {}, options = {}) {
  const headers = { "content-type": "application/json" };
  if (options.includeAuth !== false) headers["x-app-password"] = APP_PASSWORD;
  const response = await onRequestPost({
    request: new Request("https://agentgenia.test/api/research", {
      method: "POST",
      headers,
      body: JSON.stringify({
        businessStage: "starter",
        market: "US",
        ...payload,
      }),
    }),
    env: {
      APP_PASSWORD,
      AUTH_SECRET: "test-auth-secret",
      ...envOverrides,
    },
  });
  assert.equal(response.status, options.expectedStatus || 200, `${payload.selectedInternalTool || payload.naturalRequest} status`);
  return response.json();
}

async function callResearchJob(jobId, envOverrides = {}, options = {}) {
  const headers = {};
  if (options.includeAuth !== false) headers["x-app-password"] = APP_PASSWORD;
  const response = await onRequestGet({
    request: new Request(`https://agentgenia.test/api/research?jobId=${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers,
    }),
    env: {
      APP_PASSWORD,
      AUTH_SECRET: "test-auth-secret",
      ...envOverrides,
    },
  });
  assert.equal(response.status, options.expectedStatus || 200, `${jobId} poll status`);
  return response.json();
}
