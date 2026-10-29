import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
}

type AccessPayload = jwt.JwtPayload & {
  sub: string;
  sid: string;
  type: "access";
};

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Access token is required"
    });
    return;
  }

  try {
    const payload = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as AccessPayload;

    if (
      payload.type !== "access" ||
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
      return;
    }

    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Access token is invalid or expired"
    });
  }
}