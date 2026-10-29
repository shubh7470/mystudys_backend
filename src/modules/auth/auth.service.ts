import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function createAccessToken(userId: string, sessionId: string) {
  return jwt.sign(
    { sid: sessionId, type: "access" },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"]
    }
  );
}

function createRefreshToken(userId: string, sessionId: string) {
  return jwt.sign(
    { sid: sessionId, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      expiresIn: `${env.REFRESH_TOKEN_DAYS}d`
    }
  );
}

function publicUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified
  };
}

export async function googleLogin(
  idToken: string,
  deviceId?: string
) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new Error("GOOGLE_TOKEN_INVALID");
  }

  let user;

  try {
    user = await prisma.user.upsert({
      where: { googleSub: payload.sub },
      update: {
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email,
        avatarUrl: payload.picture || null,
        emailVerified: true,
        lastLoginAt: new Date()
      },
      create: {
        googleSub: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email,
        avatarUrl: payload.picture || null,
        emailVerified: true,
        lastLoginAt: new Date()
      }
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("ACCOUNT_CONFLICT");
    }
    throw error;
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_BLOCKED");
  }

  const sessionId = randomUUID();
  const refreshToken = createRefreshToken(user.id, sessionId);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);

  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      deviceId,
      expiresAt
    }
  });

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user.id, sessionId),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.ACCESS_TOKEN_TTL
  };
}

export async function refreshSession(refreshToken: string) {
  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET
    ) as jwt.JwtPayload;
  } catch {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  if (
    payload.type !== "refresh" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  const session = await prisma.userSession.findUnique({
    where: { id: payload.sid },
    include: { user: true }
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  ) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  const matches = await bcrypt.compare(
    refreshToken,
    session.refreshTokenHash
  );

  if (!matches) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  // Rotate the refresh token each time it is used.
  const newRefreshToken = createRefreshToken(
    session.userId,
    session.id
  );

  const newHash = await bcrypt.hash(newRefreshToken, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);

  // Conditional update prevents two concurrent refreshes
  // from both successfully rotating the same session.
  const updated = await prisma.userSession.updateMany({
    where: {
      id: session.id,
      refreshTokenHash: session.refreshTokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: {
      refreshTokenHash: newHash,
      expiresAt
    }
  });

  if (updated.count !== 1) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  return {
    accessToken: createAccessToken(session.userId, session.id),
    refreshToken: newRefreshToken,
    tokenType: "Bearer",
    expiresIn: env.ACCESS_TOKEN_TTL
  };
}

export async function logoutSession(refreshToken: string) {
  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET
    ) as jwt.JwtPayload;
  } catch {
    return;
  }

  if (
    payload.type !== "refresh" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    return;
  }

  const session = await prisma.userSession.findUnique({
    where: { id: payload.sid }
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt
  ) {
    return;
  }

  const matches = await bcrypt.compare(
    refreshToken,
    session.refreshTokenHash
  );

  if (matches) {
    await prisma.userSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }
}