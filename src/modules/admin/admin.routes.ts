import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import {
  loginAdmin,
  logoutAdmin,
  seedDefaultAdmin,
} from "./admin.service.js";
import {
  requireAdminAuth,
  AuthenticatedAdminRequest,
} from "./admin.middleware.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// POST /api/v1/admin/auth/login
router.post("/login", loginLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid email or password",
    });
    return;
  }

  try {
    const userAgent = req.headers["user-agent"] as string | undefined;
    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string | undefined);

    const result = await loginAdmin({
      email: parsed.data.email,
      password: parsed.data.password,
      userAgent,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: "Admin logged in successfully",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "INVALID_CREDENTIALS") {
      res.status(401).json({
        success: false,
        message: "Invalid admin email or password",
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

    next(error);
  }
});

// GET /api/v1/admin/auth/me (Verify session)
router.get("/me", requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
  res.status(200).json({
    success: true,
    message: "Admin session is active",
    data: {
      admin: req.admin,
    },
  });
});

// POST /api/v1/admin/auth/logout
router.post("/logout", async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.body?.token;

  if (token) {
    try {
      await logoutAdmin(token);
    } catch {
      // Ignore logout errors
    }
  }

  res.status(200).json({
    success: true,
    message: "Admin logged out successfully",
  });
});

// POST /api/v1/admin/auth/seed (Seed initial admin if none exists)
router.post("/seed", async (_req, res, next) => {
  try {
    const result = await seedDefaultAdmin();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

