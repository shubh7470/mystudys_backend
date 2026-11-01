import { Request, Response, NextFunction } from "express";
import { verifyAdminSession } from "./admin.service.js";

export interface AuthenticatedAdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    avatarUrl: string | null;
    lastLoginAt: Date | null;
  };
  adminSessionId?: string;
  adminToken?: string;
}

export async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Bearer token missing.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const { admin, sessionId } = await verifyAdminSession(token);
    req.admin = admin;
    req.adminSessionId = sessionId;
    req.adminToken = token;
    next();
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "SESSION_EXPIRED") {
      res.status(401).json({
        success: false,
        message: "Your admin session has expired. Please log in again.",
      });
      return;
    }

    if (err.message === "ACCOUNT_BLOCKED") {
      res.status(403).json({
        success: false,
        message: "Your admin account is blocked. Contact administrator.",
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Invalid or expired admin session token.",
    });
  }
}

