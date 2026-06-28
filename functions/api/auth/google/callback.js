import {
  clearStateCookie,
  createSessionCookie,
  getOrigin,
  GOOGLE_STATE_COOKIE,
  readCookie,
  redirect,
  sanitizeRelativePath,
} from "../../../_auth.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state") || "";
  const [state, encodedNext = "%2F"] = rawState.split(":");
  const expectedState = readCookie(request, GOOGLE_STATE_COOKIE);
  const next = sanitizeRelativePath(decodeURIComponent(encodedNext), "/");
  const clearState = clearStateCookie(GOOGLE_STATE_COOKIE);

  if (!code || !state || state !== expectedState) {
    return redirect("/login?error=google_state", [clearState]);
  }

  try {
    const redirectUri = `${getOrigin(request)}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) return redirect("/login?error=google_token", [clearState]);
    const tokenData = await tokenResponse.json();
    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) return redirect("/login?error=google_profile", [clearState]);
    const profile = await userResponse.json();
    if (!profile.email) return redirect("/login?error=google_email", [clearState]);

    const sessionCookie = await createSessionCookie(
      {
        provider: "google",
        email: profile.email,
        name: profile.name || profile.email,
        avatar: profile.picture || "",
      },
      env,
    );

    const nextUrl = new URL(next, getOrigin(request));
    nextUrl.searchParams.set("auth", "success");
    return redirect(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, [clearState, sessionCookie]);
  } catch {
    return redirect("/login?error=google_unknown", [clearState]);
  }
}
