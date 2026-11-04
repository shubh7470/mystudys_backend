import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  createMaterialGroup,
  getAllMaterialGroups,
  getMaterialGroupById,
  deleteMaterialGroup,
  createMaterialHeading,
  deleteMaterialHeading,
  createMaterial,
  getAllMaterials,
  getMaterialById,
  deleteMaterial,
} from "./material.service.js";
import {
  getCategories,
  createCategory,
  deleteCategory,
  getBooks,
  createBook,
  deleteBook,
  getChapters,
  createChapter,
  deleteChapter,
  createChapterMaterial,
} from "./selfstudy.service.js";
import { uploadToR2, deleteFromR2 } from "../../lib/r2.js";

const router = Router();

// Multer memory storage (direct stream to Cloudflare R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// ZOD Schemas
const createGroupSchema = z.object({
  title: z.string().min(1, "Group title is required"),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  classId: z.string().uuid().optional(),
  className: z.string().min(1, "Class is required"),
  stream: z.string().optional(),
  board: z.string().min(1, "Board is required"),
  displayOrder: z.coerce.number().optional(),
  isPublished: z.boolean().default(true),
});

const createHeadingSchema = z.object({
  groupId: z.string().uuid("Valid groupId is required"),
  title: z.string().min(1, "Heading title is required"),
  medium: z.enum(["English", "Hindi"]).default("English"),
  displayOrder: z.coerce.number().optional(),
});

const createMaterialSchema = z.object({
  groupId: z.string().uuid().optional(),
  headingId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  fileUrl: z.string().min(1, "File URL is required"),
  fileName: z.string().optional(),
  fileSize: z.coerce.number().optional(),
  classId: z.string().uuid().optional(),
  className: z.string().min(1, "Class is required"),
  stream: z.string().optional(),
  board: z.string().min(1, "Board is required"),
  medium: z.string().default("English"),
  subject: z.string().optional(),
  type: z.string().default("Notes"),
  isPublished: z.boolean().default(true),
});

// ======================== GROUPS ENDPOINTS ========================

// POST /api/v1/materials/groups (Create a new Group)
router.post("/groups", async (req, res, next) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid group data",
    });
    return;
  }

  try {
    const group = await createMaterialGroup(parsed.data);
    res.status(201).json({
      success: true,
      message: "Material group created successfully",
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/groups (List Groups with filters)
router.get("/groups", async (req, res, next) => {
  try {
    const { className, stream, board, search } = req.query;
    const groups = await getAllMaterialGroups({
      className: className as string | undefined,
      stream: stream as string | undefined,
      board: board as string | undefined,
      search: search as string | undefined,
    });

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/groups/:id (Get single group with headings & materials)
router.get("/groups/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const group = await getMaterialGroupById(id);

    if (!group) {
      res.status(404).json({
        success: false,
        message: "Material group not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/groups/:id (Delete a group)
router.delete("/groups/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteMaterialGroup(id);

    res.status(200).json({
      success: true,
      message: "Material group deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "GROUP_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Material group not found",
      });
      return;
    }
    next(error);
  }
});

// ======================== HEADINGS ENDPOINTS ========================

// POST /api/v1/materials/headings (Create a Heading under a Group)
router.post("/headings", async (req, res, next) => {
  const parsed = createHeadingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid heading data",
    });
    return;
  }

  try {
    const heading = await createMaterialHeading(parsed.data);
    res.status(201).json({
      success: true,
      message: "Heading created successfully",
      data: heading,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/headings/:id (Delete a heading)
router.delete("/headings/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteMaterialHeading(id);

    res.status(200).json({
      success: true,
      message: "Heading deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "HEADING_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Heading not found",
      });
      return;
    }
    next(error);
  }
});

// ======================== MATERIALS UPLOAD & CRUD ========================

// POST /api/v1/materials/upload (Upload single PDF file directly to Cloudflare R2)
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: "No PDF file was provided",
    });
    return;
  }

  try {
    const uploaded = await uploadToR2({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      contentType: req.file.mimetype || "application/pdf",
      folder: "materials",
    });

    res.status(200).json({
      success: true,
      message: "PDF uploaded to Cloudflare R2 successfully",
      data: {
        fileUrl: uploaded.fileUrl,
        key: uploaded.key,
        fileName: req.file.originalname,
        fileSize: uploaded.fileSize,
      },
    });
  } catch (error: unknown) {
    console.error("Cloudflare R2 Upload Error:", error);
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: `Failed to upload to Cloudflare R2: ${err.message}`,
    });
  }
});

// GET /api/v1/materials (List materials with filters)
router.get("/", async (req, res, next) => {
  try {
    const { groupId, headingId, className, stream, board, medium, type, search } = req.query;

    const materials = await getAllMaterials({
      groupId: groupId as string | undefined,
      headingId: headingId as string | undefined,
      className: className as string | undefined,
      stream: stream as string | undefined,
      board: board as string | undefined,
      medium: medium as string | undefined,
      type: type as string | undefined,
      search: search as string | undefined,
    });

    res.status(200).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/:id (Get single material)
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const material = await getMaterialById(id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: "Study material not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/materials (Save new material metadata)
router.post("/", async (req, res, next) => {
  const parsed = createMaterialSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid material data",
    });
    return;
  }

  try {
    const created = await createMaterial(parsed.data);

    res.status(201).json({
      success: true,
      message: "Study material created successfully",
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/:id (Delete material)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const existing = await getMaterialById(id);
    if (existing?.fileUrl) {
      try {
        const url = new URL(existing.fileUrl);
        const key = url.pathname.replace(/^\//, "");
        if (key.startsWith("materials/")) {
          await deleteFromR2(key);
        }
      } catch (e) {
        console.warn("Could not delete from R2 (ignoring):", e);
      }
    }

    await deleteMaterial(id);

    res.status(200).json({
      success: true,
      message: "Study material deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "MATERIAL_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Study material not found",
      });
      return;
    }

    next(error);
  }
});

// ======================== SELFSTUDY HIERARCHY ENDPOINTS ========================

// GET /api/v1/materials/categories (Categories for Class & Board)
router.get("/categories", async (req, res, next) => {
  try {
    const { className, board, stream } = req.query;
    const categories = await getCategories({
      className: className as string | undefined,
      board: board as string | undefined,
      stream: stream as string | undefined,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/materials/categories (Create custom category)
router.post("/categories", async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/categories/:id
router.delete("/categories/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteCategory(id);
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/categories/:categoryId/books (Books under category with E.M / H.M filtering)
router.get("/categories/:categoryId/books", async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId as string;
    const { medium } = req.query;
    const books = await getBooks(categoryId, medium as string | undefined);

    res.status(200).json({
      success: true,
      data: books,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/materials/categories/:categoryId/books (Create book under category)
router.post("/categories/:categoryId/books", async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId as string;
    const book = await createBook({
      categoryId,
      title: req.body.title,
      medium: req.body.medium,
      displayOrder: req.body.displayOrder,
    });

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/books/:id
router.delete("/books/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteBook(id);
    res.status(200).json({ success: true, message: "Book deleted" });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/books/:bookId/chapters (Chapters & PDFs under book)
router.get("/books/:bookId/chapters", async (req, res, next) => {
  try {
    const bookId = req.params.bookId as string;
    const chapters = await getChapters(bookId);

    res.status(200).json({
      success: true,
      data: chapters,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/materials/books/:bookId/chapters (Create chapter)
router.post("/books/:bookId/chapters", async (req, res, next) => {
  try {
    const bookId = req.params.bookId as string;
    const chapter = await createChapter({
      bookId,
      title: req.body.title,
      displayOrder: req.body.displayOrder,
    });

    res.status(201).json({
      success: true,
      data: chapter,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/chapters/:id
router.delete("/chapters/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteChapter(id);
    res.status(200).json({ success: true, message: "Chapter deleted" });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/materials/chapters/:chapterId/materials (Add PDF to chapter)
router.post("/chapters/:chapterId/materials", async (req, res, next) => {
  try {
    const chapterId = req.params.chapterId as string;
    const material = await createChapterMaterial({
      chapterId,
      title: req.body.title || "Basic PDF",
      fileUrl: req.body.fileUrl,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize,
      badgeColor: req.body.badgeColor,
      className: req.body.className || "Class 12th",
      board: req.body.board || "CBSE",
      stream: req.body.stream,
      medium: req.body.medium,
    });

    res.status(201).json({
      success: true,
      data: material,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
