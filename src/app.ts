import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminAuthRoutes from "./modules/admin/admin.routes.js";
import classRoutes from "./modules/class/class.routes.js";
import materialRoutes from "./modules/materials/material.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "50kb" }));

// Static file hosting for uploaded materials (PDFs, thumbnails)
app.use("/uploads", express.static(path.resolve("uploads")));

// Health Check
app.get("/api/v1/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "StudyNest API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "API is running but database is unavailable",
      database: "disconnected",
    });
  }
});

// Admin Auth Routes
app.use("/api/v1/admin/auth", adminAuthRoutes);

// Academic Classes Routes
app.use("/api/v1/classes", classRoutes);

// Study Materials & PDF Routes
app.use("/api/v1/materials", materialRoutes);

// Public / User Auth Routes
app.use("/api/v1/auth", authRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

export default app;
