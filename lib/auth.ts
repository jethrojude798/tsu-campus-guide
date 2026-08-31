import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "tsu_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  sub: string;
  exp: number;
  demo?: boolean;
  username?: string;
  fullName?: string;
  role?: string;
};

type AdminUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
};

function sessionSecret() {
  return process.env.SESSION_SECRET ?? "tsu-campus-guide-dev-secret";
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

function createSessionToken(payload: SessionPayload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

function verifySessionToken(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const received = Buffer.from(signature);
  const actual = Buffer.from(expected);

  if (received.length !== actual.length || !crypto.timingSafeEqual(received, actual)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}

export async function getAdminSessionUser(): Promise<AdminUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  if (payload.demo && payload.username && payload.fullName && payload.role) {
    return {
      id: payload.sub,
      username: payload.username,
      fullName: payload.fullName,
      role: payload.role
    };
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true
    }
  });

  return user;
}

export async function authenticateAdmin(username: string, password: string) {
  try {
    const user = await prisma.adminUser.findUnique({ where: { username } });

    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  } catch {
    if (
      process.env.NODE_ENV !== "production" &&
      username === (process.env.DEMO_ADMIN_USERNAME ?? "demo-admin") &&
      password === (process.env.DEMO_ADMIN_PASSWORD ?? "demo-password")
    ) {
      return {
        id: "demo-admin-local",
        username,
        fullName: "TSU Demo Admin",
        role: "admin",
        passwordHash: ""
      };
    }
    return null;
  }
}

export function setAdminSessionCookie(userId: string) {
  const payload: SessionPayload = {
    sub: userId,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  return createSessionToken(payload);
}

export function setDemoAdminSessionCookie(user: { id: string; username: string; fullName: string; role: string }) {
  return createSessionToken({
    sub: user.id,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    demo: true,
    username: user.username,
    fullName: user.fullName,
    role: user.role
  });
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS, cookieOptions };
