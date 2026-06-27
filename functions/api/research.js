const DEFAULT_TIMEOUT_MS = 900000;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.HARNESS_URL || !env.HARNESS_TOKEN) {
    return json(
      {
        ok: false,
        code: "harness_not_configured",
        message: "Cloudflare backend is live, but HARNESS_URL/HARNESS_TOKEN are not configured.",
      },
      503,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_json", message: "Request body must be JSON." }, 400);
  }

  if (env.APP_PASSWORD && request.headers.get("x-app-password") !== env.APP_PASSWORD) {
    return json(
      {
        ok: false,
        code: "forbidden",
        message: "Clave de acceso incorrecta.",
      },
      403,
    );
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return json({ ok: false, code: "invalid_payload", message: validationError }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(env.HARNESS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(new URL("/research", env.HARNESS_URL).toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.HARNESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await upstream.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { ok: false, code: "invalid_harness_response", raw: text.slice(0, 1000) };
    }

    return json(body, upstream.status);
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    return json(
      {
        ok: false,
        code: timedOut ? "harness_timeout" : "harness_unreachable",
        message: timedOut ? "The research harness took too long." : "Could not reach the private research harness.",
      },
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestGet() {
  return json({ ok: true, service: "ecom-research-cloudflare-proxy" });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  };
}
