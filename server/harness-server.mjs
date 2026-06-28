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
      return sendJson(response, 200, { ok: true, service: "ecom-research-harness" });
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
  console.log(`Ecom research harness listening on http://${HOST}:${PORT}`);
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
  if (!stringField(payload.reference, 500)) return "Missing or invalid reference.";
  if (!stringField(payload.problem, 2000)) return "Missing or invalid problem.";
  if (!Array.isArray(payload.sources) || payload.sources.length === 0) return "Select at least one source.";
  return "";
}

function stringField(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

async function runCodexResearch(payload) {
  const runDir = await mkdtemp(join(tmpdir(), "ecom-research-"));
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "request.json"), JSON.stringify(payload, null, 2));
  await writeFile(join(runDir, "prompt.md"), buildPrompt(payload));

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

function buildPrompt(payload) {
  return `Eres un agente senior de ecommerce research. Tu trabajo es ayudar a una persona no tecnica a decidir si vale la pena empezar una marca ecommerce basada en una referencia, sin llenarla de ruido.

Instruccion de aislamiento:
- Trata esta solicitud como una conversacion completamente nueva.
- No uses memoria, preferencias, productos, marcas, conclusiones ni contexto de ejecuciones anteriores.
- La unica informacion del usuario disponible es lo que aparece en este prompt.
- Si el usuario menciona una categoria como suplementos, skincare o cualquier otra, no la favorezcas por historial: valida evidencia, unit economics y riesgos desde cero.

Referencia o marca: ${payload.reference}
Problema o producto: ${payload.problem}
Mercado: ${payload.market || "US"}
Idioma de salida: ${payload.language || "es"}
Profundidad: ${payload.depth || "rapido"}
Fuentes solicitadas: ${(payload.sources || []).join(", ")}

Reglas:
- Separa Meta Ads, Amazon Reviews y TikTok organico como fuentes distintas.
- No presentes claims de anuncios como hechos.
- Si no puedes verificar datos vivos, dilo como limitacion y entrega un plan preciso de busqueda.
- Para piel, cabello, salud, suplementos o efectos corporales, incluye limites de claims y riesgos de compliance.
- Si la solicitud pide costos, margen, CAC, ROAS, break even o rentabilidad, separa numeros dados de supuestos y no recomiendes lanzar sin pasar por unit economics.
- Da recomendaciones accionables para ecom: avatar, dolor, oferta, hooks, objeciones, requisitos de producto, que evitar y siguientes tests.
- Prioriza precision y utilidad. Evita volumen sin decision.
- Responde solo en JSON conforme al schema de salida.
`;
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
