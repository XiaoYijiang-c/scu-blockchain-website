import type { AdminEnv } from "./env.ts";

const encoder = new TextEncoder();
export const cookieName = "scu_admin";
export const sessionSeconds = 8 * 60 * 60;
export const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function digest(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
export function configured(env: AdminEnv) {
  return Boolean(
    env.ADMIN_USERNAME &&
    /^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(
      env.ADMIN_PASSWORD_HASH ?? "",
    ),
  );
}
export async function verifyPassword(password: string, stored: string) {
  if (!/^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored))
    return false;
  const [, , salt, expected] = stored.split(":");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: 100000,
        salt: Uint8Array.from(salt.match(/../g)!, (h) => parseInt(h, 16)),
      },
      key,
      256,
    ),
  );
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++)
    mismatch |= expected.charCodeAt(i) ^ derived.charCodeAt(i);
  return mismatch === 0;
}
export function sessionToken(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) ?? ""
  );
}
export async function authenticated(request: Request, env: AdminEnv) {
  if (!configured(env)) return false;
  const token = sessionToken(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  return Boolean(
    await env.DB.prepare(
      "SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>? AND credential_version=?",
    )
      .bind(
        await digest(token),
        Math.floor(Date.now() / 1000),
        await digest(env.ADMIN_USERNAME! + env.ADMIN_PASSWORD_HASH!),
      )
      .first(),
  );
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export function sessionCookie(
  request: Request,
  token: string,
  maxAge = sessionSeconds,
) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
