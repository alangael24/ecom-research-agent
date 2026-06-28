import { json, readSession } from "../_auth.js";

export async function onRequestGet({ request, env }) {
  const user = await readSession(request, env);
  return json({
    ok: true,
    authenticated: Boolean(user),
    user: user
      ? {
          provider: user.provider,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          shop: user.shop,
        }
      : null,
  });
}
