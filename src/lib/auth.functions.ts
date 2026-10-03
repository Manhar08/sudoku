import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE = "sudoku_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : "",
  );
}

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(d);
}

// Constant-time compare of SHA-256 digests (avoids length + timing leaks).
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function config() {
  const username = process.env["APP_USERNAME"] || "manhar08";
  const password = process.env["APP_PASSWORD"];
  const secret = process.env["SESSION_SECRET"];
  if (!password || !secret) throw new Error("Server auth is not configured.");
  return { username, password, secret };
}

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(COOKIE);
  if (!token) return { user: null as string | null };
  const secret = process.env["SESSION_SECRET"];
  if (!secret) return { user: null };
  const [user, exp, sig] = token.split(".");
  if (!user || !exp || !sig || Number(exp) < Date.now() / 1000) return { user: null };
  const expected = await hmac(secret, `${user}.${exp}`);
  if (!(await safeEqual(sig, expected))) return { user: null };
  return { user: decodeURIComponent(user) };
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => ({
    username: String(input?.username ?? "").trim().slice(0, 64),
    password: String(input?.password ?? "").slice(0, 256),
  }))
  .handler(async ({ data }) => {
    const { username, password, secret } = config();
    const okUser = await safeEqual(data.username.toLowerCase(), username.toLowerCase());
    const okPass = await safeEqual(data.password, password);
    if (!okUser || !okPass) {
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const, error: "Incorrect username or password." };
    }
    const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
    const u = encodeURIComponent(username);
    const sig = await hmac(secret, `${u}.${exp}`);
    setCookie(COOKIE, `${u}.${exp}.${sig}`, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true };
});
