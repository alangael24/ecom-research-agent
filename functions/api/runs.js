import { handleError, json, optionsResponse, requireActiveUser, supabaseRest } from "../_shared/supabase.js";

export async function onRequestGet(context) {
  try {
    const { accessToken, config, user } = await requireActiveUser(context.request, context.env);
    const path = `research_runs?user_id=eq.${encodeURIComponent(user.id)}&select=id,natural_request,status,selected_tool,product,destination,error_message,created_at,completed_at&order=created_at.desc&limit=25`;
    const runs = await supabaseRest(config, path, { accessToken });
    return json({ ok: true, runs });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestOptions() {
  return optionsResponse();
}
