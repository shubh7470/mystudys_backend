import { Router } from "express";
import { z } from "zod";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  seedStandardClasses,
} from "./class.service.js";
import { requireAdminAuth } from "../admin/admin.middleware.js";

const router = Router();

const classSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100),
  code: z.string().max(20).optional(),
  slug: z.string().max(120).optional(),
  displayOrder: z.coerce.number().int().default(0),
  stream: z.string().max(50).default("General"),
  boards: z.array(z.string()).default([]),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

const updateClassSchema = classSchema.partial();

// GET /api/v1/classes (List all classes)
router.get("/", async (req, res, next) => {
  try {
    const onlyActive = req.query.includeInactive !== "true";
    const classes = await getAllClasses(onlyActive);

    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/classes/:id (Get single class)
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const academicClass = await getClassById(id);

    if (!academicClass) {
      res.status(404).json({
        success: false,
        message: "Academic class not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: academicClass,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/classes (Create a new class - Protected by Admin Auth)
router.post("/", requireAdminAuth, async (req, res, next) => {
  const parsed = classSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid class data",
    });
    return;
  }

  try {
    const newClass = await createClass(parsed.data);

    res.status(201).json({
      success: true,
      message: "Academic class created successfully and saved in database",
      data: newClass,
    });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "CLASS_ALREADY_EXISTS") {
      res.status(409).json({
        success: false,
        message: "A class with this name or slug already exists in database.",
      });
      return;
    }

    next(error);
  }
});

// PUT /api/v1/classes/:id (Update class - Protected by Admin Auth)
router.put("/:id", requireAdminAuth, async (req, res, next) => {
  const parsed = updateClassSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid class data",
    });
    return;
  }

  try {
    const id = req.params.id as string;
    const updated = await updateClass(id, parsed.data);

    res.status(200).json({
      success: true,
      message: "Academic class updated successfully in database",
      data: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "CLASS_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Academic class not found",
      });
      return;
    }

    if (err.message === "CLASS_ALREADY_EXISTS") {
      res.status(409).json({
        success: false,
        message: "Another class with this name or slug already exists.",
      });
      return;
    }

    next(error);
  }
});

// DELETE /api/v1/classes/:id (Delete class - Protected by Admin Auth)
router.delete("/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteClass(id);

    res.status(200).json({
      success: true,
      message: "Academic class deleted successfully from database",
    });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "CLASS_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Academic class not found",
      });
      return;
    }

    next(error);
  }
});

// POST /api/v1/classes/seed (Seed standard classes - Protected by Admin Auth)
router.post("/seed", requireAdminAuth, async (_req, res, next) => {
  try {
    const result = await seedStandardClasses();

    res.status(200).json({
      success: true,
      message: `Successfully seeded ${result.totalSeeded} standard classes.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
