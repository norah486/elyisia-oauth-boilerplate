import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import type { User, Session } from "@prisma/client";
import { sha256 } from "@oslojs/crypto/sha2";
import { db } from "./db";
import { Cookie } from "elysia";

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: string
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };
  await db.session.create({
    data: session,
  });
  return session;
}

export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await db.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    },
  });
  if (result === null) {
    return { session: null, user: null };
  }
  const { user, ...session } = result;
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.session.delete({ where: { id: sessionId } });
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        expiresAt: session.expiresAt,
      },
    });
  }
  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.session.delete({ where: { id: sessionId } });
}

function handleRequest(request: Request, response: Response): void | Response {
  if (request.method !== "GET") {
    const origin = request.headers.get("Origin");
    // You can also compare it against the Host or X-Forwarded-Host header.
    if (origin === null || origin !== "http://localhost:3000") {
      return new Response(null, {
        status: 403,
      });
    }
  }
}

export function setSessionTokenCookie(
  session: Cookie<string | undefined>,
  token: string,
  expiresAt: Date
): void {
  if (Bun.env.NODE_ENV === "production") {
    session.set({
      value: token,
      httpOnly: true,
      sameSite: "lax",
      expires: new Date(expiresAt.toUTCString()),
      path: "/",
      secure: true,
    });
  } else {
    // When deployed over HTTP (localhost)
    session.set({
      value: token,
      httpOnly: true,
      sameSite: "lax",
      expires: new Date(expiresAt.toUTCString()),
      path: "/",
    });
  }
}

export function deleteSessionTokenCookie(
  session: Cookie<string | undefined>
): void {
  if (Bun.env.NODE_ENV === "production") {
    // When deployed over HTTPS
    session.set({
      value: "",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      secure: true,
    });
  } else {
    // When deployed over HTTP (localhost)
    session.set({
      value: "",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };
