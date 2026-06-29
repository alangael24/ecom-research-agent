import { json, optionsResponse, publicSupabaseConfig } from "../_shared/supabase.js";

export async function onRequestGet(context) {
  const { supabaseUrl, supabaseAnonKey } = publicSupabaseConfig(context.env);
  const authRequired = String(context.env.AUTH_REQUIRED || "").toLowerCase() === "true";

  if (authRequired && (!supabaseUrl || !supabaseAnonKey)) {
    return json(
      {
        ok: false,
        code: "supabase_public_config_missing",
        message: "SUPABASE_URL and SUPABASE_ANON_KEY are required when AUTH_REQUIRED=true.",
      },
      503,
    );
  }

  return json({
    ok: true,
    supabaseUrl,
    supabaseAnonKey,
    authRequired,
    mvpMode: !authRequired,
  });
}

export async function onRequestOptions() {
  return optionsResponse();
}
