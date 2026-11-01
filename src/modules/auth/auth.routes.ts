import { Router } from "express";

const router = Router();

// Student auth routes (Placeholder while focused on Admin portal)
router.post("/google", (_req, res) => {
  res.status(501).json({
    success: false,
    message: "Student auth is currently undergoing migration.",
  });
});

router.post("/refresh", (_req, res) => {
  res.status(501).json({
    success: false,
    message: "Student auth is currently undergoing migration.",
  });
});

router.post("/logout", (_req, res) => {
  res.json({
    success: true,
    message: "Logged out.",
  });
});

router.get("/me", (_req, res) => {
  res.status(401).json({
    success: false,
    message: "Unauthorized.",
  });
});

export default router;
