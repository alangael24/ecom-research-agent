import { clearSessionCookie, redirect } from "../_auth.js";

export async function onRequestGet() {
  return redirect("/", [clearSessionCookie()]);
}

export async function onRequestPost() {
  return redirect("/", [clearSessionCookie()]);
}
