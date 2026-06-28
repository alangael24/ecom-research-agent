import { json, optionsResponse, publicSupabaseConfig } from "../_shared/supabase.js";

export async function onRequestGet(context) {
  const { supabaseUrl, supabaseAnonKey } = publicSupabaseConfig(context.env);
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(
      {
        ok: false,
        code: "supabase_public_config_missing",
        message: "SUPABASE_URL and SUPABASE_ANON_KEY are required.",
      },
      503,
    );
  }

  return json({
    ok: true,
    supabaseUrl,
    supabaseAnonKey,
    authRequired: true,
  });
}

export async function onRequestOptions() {
  return optionsResponse();
}
