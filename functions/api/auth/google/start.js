import { createStateCookie, getOrigin, GOOGLE_STATE_COOKIE, redirect, sanitizeRelativePath } from "../../../_auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return redirect("/login?error=google_config");
  }

  const requestUrl = new URL(request.url);
  const state = crypto.randomUUID();
  const next = sanitizeRelativePath(requestUrl.searchParams.get("next"), "/");
  const redirectUri = `${getOrigin(request)}/api/auth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", `${state}:${encodeURIComponent(next)}`);
  authUrl.searchParams.set("prompt", "select_account");

  return redirect(authUrl.toString(), [createStateCookie(GOOGLE_STATE_COOKIE, state)]);
}
