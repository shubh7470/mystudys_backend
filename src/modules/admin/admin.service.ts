import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

interface LoginParams {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export function generateAdminToken(adminId: string, role: string, sessionId: string) {
  return jwt.sign(
    {
      sub: adminId,
      role,
      sid: sessionId,
      type: "admin",
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

export async function loginAdmin({ email, password, userAgent, ipAddress }: LoginParams) {
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  });

  if (!admin) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (admin.status !== "ACTIVE") {
    throw new Error("ACCOUNT_BLOCKED");
  }

  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const sessionId = randomUUID();
  const token = generateAdminToken(admin.id, admin.role, sessionId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days session

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      adminId: admin.id,
      token,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      avatarUrl: admin.avatarUrl,
      lastLoginAt: admin.lastLoginAt,
    },
    token,
  };
}

export async function verifyAdminSession(token: string) {
  let decoded: jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  } catch {
    throw new Error("INVALID_TOKEN");
  }

  if (decoded.type !== "admin" || !decoded.sub || !decoded.sid) {
    throw new Error("INVALID_TOKEN");
  }

  const session = await prisma.adminSession.findUnique({
    where: { id: decoded.sid },
    include: { admin: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw new Error("SESSION_EXPIRED");
  }

  if (session.admin.status !== "ACTIVE") {
    throw new Error("ACCOUNT_BLOCKED");
  }

  return {
    admin: {
      id: session.admin.id,
      email: session.admin.email,
      name: session.admin.name,
      role: session.admin.role,
      status: session.admin.status,
      avatarUrl: session.admin.avatarUrl,
      lastLoginAt: session.admin.lastLoginAt,
    },
    sessionId: session.id,
  };
}

export async function logoutAdmin(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    if (decoded?.sid) {
      await prisma.adminSession.deleteMany({
        where: { id: decoded.sid },
      });
      return;
    }
  } catch {
    // If JWT cannot be parsed, try deleting by token directly
  }

  await prisma.adminSession.deleteMany({
    where: { token },
  });
}

export async function seedDefaultAdmin() {
  const existingCount = await prisma.admin.count();
  if (existingCount > 0) {
    return { created: false, message: "Admin account already exists" };
  }

  const defaultPassword = "Admin@123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const defaultAdmin = await prisma.admin.create({
    data: {
      email: "admin@mystudys.com",
      name: "Super Administrator",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`[SEED] Created default admin account: ${defaultAdmin.email} with password: ${defaultPassword}`);

  return {
    created: true,
    message: "Default admin account created successfully",
    admin: {
      email: defaultAdmin.email,
      name: defaultAdmin.name,
      role: defaultAdmin.role,
    },
  };
}

