import { handleError, json, optionsResponse, requireActiveUser, supabaseRest } from "../../_shared/supabase.js";

export async function onRequestGet(context) {
  try {
    const { accessToken, config, user } = await requireActiveUser(context.request, context.env);
    const runId = context.params.id;

    const runRows = await supabaseRest(
      config,
      `research_runs?id=eq.${encodeURIComponent(runId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`,
      { accessToken },
    );
    if (!runRows[0]) {
      return json({ ok: false, code: "not_found", message: "Research no encontrado." }, 404);
    }

    const [attachments, events, suppliers, messages] = await Promise.all([
      supabaseRest(
        config,
        `research_attachments?research_run_id=eq.${encodeURIComponent(runId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,file_name,file_type,file_size,storage_bucket,storage_path,content_mode,metadata,created_at&order=created_at.asc`,
        { accessToken },
      ),
      supabaseRest(
        config,
        `agent_events?research_run_id=eq.${encodeURIComponent(runId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.asc`,
        { accessToken },
      ),
      supabaseRest(
        config,
        `suppliers?research_run_id=eq.${encodeURIComponent(runId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.asc`,
        { accessToken },
      ),
      supabaseRest(
        config,
        `negotiation_messages?research_run_id=eq.${encodeURIComponent(runId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.asc`,
        { accessToken },
      ),
    ]);

    return json({
      ok: true,
      run: {
        ...runRows[0],
        attachments,
        events,
        suppliers,
        negotiation_messages: messages,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestOptions() {
  return optionsResponse();
}
