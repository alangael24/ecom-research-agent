export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-app-password",
  };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function publicSupabaseConfig(env) {
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || "";
  return { supabaseUrl, supabaseAnonKey };
}

export function privateSupabaseConfig(env) {
  const config = publicSupabaseConfig(env);
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw httpError(503, "supabase_not_configured", "Supabase environment variables are not configured.");
  }
  return { ...config, supabaseServiceRoleKey };
}

export async function requireActiveUser(request, env) {
  const config = privateSupabaseConfig(env);
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    throw httpError(401, "missing_session", "Inicia sesion para usar Agent Genia.");
  }

  const userResponse = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok) {
    throw httpError(401, "invalid_session", "Tu sesion expiro. Inicia sesion otra vez.");
  }

  const authBody = await userResponse.json();
  const user = authBody.user || authBody;
  if (!user?.id) {
    throw httpError(401, "invalid_session", "No se pudo validar el usuario.");
  }

  const profile = await getOrCreateInactiveProfile(config, user, accessToken);
  if (!profile.is_active) {
    throw httpError(
      403,
      "profile_inactive",
      "Tu cuenta existe, pero todavia no esta activada. Pide acceso a Alan para usar el agente.",
    );
  }

  return { config, accessToken, user, profile };
}

export async function getOrCreateInactiveProfile(config, user, accessToken) {
  const path = `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,email,display_name,is_active&limit=1`;
  const rows = await supabaseRest(config, path, { accessToken });
  if (rows[0]) return rows[0];

  if (!config.supabaseServiceRoleKey) {
    throw httpError(
      403,
      "profile_missing",
      "Tu usuario existe, pero todavia no esta activado en Agent Genia.",
    );
  }

  const created = await supabaseRest(config, "profiles?select=id,email,display_name,is_active", {
    method: "POST",
    prefer: "return=representation",
    body: {
      id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.name || user.email || "",
      is_active: false,
    },
  });
  return created[0];
}

export async function supabaseRest(config, path, options = {}) {
  const method = options.method || "GET";
  const bearer = options.accessToken || config.supabaseServiceRoleKey;
  const apikey = options.accessToken ? config.supabaseAnonKey : config.supabaseServiceRoleKey || config.supabaseAnonKey;
  if (!bearer) {
    throw httpError(503, "supabase_auth_missing", "Supabase server credentials are missing.");
  }
  const headers = {
    apikey,
    authorization: `Bearer ${bearer}`,
    "content-type": "application/json",
    ...(options.prefer ? { prefer: options.prefer } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const body = text ? parseJson(text) : null;

  if (!response.ok) {
    const message = body?.message || body?.error || text || `Supabase REST error ${response.status}`;
    throw httpError(response.status, "supabase_rest_error", message, body);
  }
  return body;
}

export function readBearerToken(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export function handleError(error) {
  if (error?.status && error?.code) {
    return json({ ok: false, code: error.code, message: error.message, details: error.details || null }, error.status);
  }
  return json(
    {
      ok: false,
      code: "server_error",
      message: error instanceof Error ? error.message : String(error),
    },
    500,
  );
}

export function httpError(status, code, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function safeFileName(value) {
  const cleaned = String(value || "attachment")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return cleaned || "attachment";
}
