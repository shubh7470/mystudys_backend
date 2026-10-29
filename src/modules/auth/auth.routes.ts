import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import {
  googleLogin,
  refreshSession,
  logoutSession
} from "./auth.service.js";
import { requireAuth } from "./auth.middleware.js";
import { prisma } from "../../lib/prisma.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Try again later."
  }
});

const googleSchema = z.object({
  idToken: z.string().min(1),
  deviceId: z.string().max(200).optional()
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

router.post("/google", authLimiter, async (req, res, next) => {
  const parsed = googleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Valid idToken is required"
    });
    return;
  }

  try {
    const result = await googleLogin(
      parsed.data.idToken,
      parsed.data.deviceId
    );

    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "GOOGLE_TOKEN_INVALID") {
        res.status(401).json({
          success: false,
          message: "Google token is invalid or email is not verified"
        });
        return;
      }

      if (error.message === "ACCOUNT_CONFLICT") {
        res.status(409).json({
          success: false,
          message: "This email is already linked to another account"
        });
        return;
      }

      if (error.message === "ACCOUNT_BLOCKED") {
        res.status(403).json({
          success: false,
          message: "This account has been blocked"
        });
        return;
      }
    }

    next(error);
  }
});

router.post("/refresh", authLimiter, async (req, res, next) => {
  const parsed = refreshSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "refreshToken is required"
    });
    return;
  }

  try {
    const data = await refreshSession(parsed.data.refreshToken);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "REFRESH_TOKEN_INVALID"
    ) {
      res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired. Please sign in again."
      });
      return;
    }

    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  const parsed = refreshSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "refreshToken is required"
    });
    return;
  }

  try {
    await logoutSession(parsed.data.refreshToken);

    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const auth = req as typeof req & {
      auth?: { userId: string; sessionId: string };
    };

    if (!auth.auth) {
      res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
      return;
    }

    const session = await prisma.userSession.findFirst({
      where: {
        id: auth.auth.sessionId,
        userId: auth.auth.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: "ACTIVE" }
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Session expired or revoked"
      });
      return;
    }

    res.json({
      success: true,
      data: { user: session.user }
    });
  } catch (error) {
    next(error);
  }
});

export default router;