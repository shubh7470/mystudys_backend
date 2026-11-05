import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  createMaterialGroup,
  getAllMaterialGroups,
  getMaterialGroupById,
  deleteMaterialGroup,
  createMaterialBook,
  getMaterialBooksByGroupId,
  getMaterialBookById,
  deleteMaterialBook,
  createMaterial,
  getAllMaterials,
  getMaterialById,
  deleteMaterial,
} from "./material.service.js";
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

const createBookSchema = z.object({
  groupId: z.string().uuid("Valid groupId is required"),
  title: z.string().min(1, "Book title is required"),
  medium: z.enum(["English", "Hindi"]).default("English"),
  displayOrder: z.coerce.number().optional(),
});

const createMaterialSchema = z.object({
  groupId: z.string().uuid().optional(),
  bookId: z.string().uuid().optional(),
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

// ======================== BOOK GROUPS ENDPOINTS ========================

// POST /api/v1/materials/groups (Create a new Book Group)
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
      message: "Book group created successfully",
      data: group,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/groups (List Book Groups with filters)
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

// GET /api/v1/materials/groups/:id (Get single group with its books & materials)
router.get("/groups/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const group = await getMaterialGroupById(id);

    if (!group) {
      res.status(404).json({
        success: false,
        message: "Book group not found",
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

// DELETE /api/v1/materials/groups/:id (Delete a Book Group)
router.delete("/groups/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteMaterialGroup(id);

    res.status(200).json({
      success: true,
      message: "Book group deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "GROUP_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Book group not found",
      });
      return;
    }
    next(error);
  }
});

// ======================== BOOKS ENDPOINTS ========================

// POST /api/v1/materials/books (Create a Book inside a Group)
router.post("/books", async (req, res, next) => {
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid book data",
    });
    return;
  }

  try {
    const book = await createMaterialBook(parsed.data);
    res.status(201).json({
      success: true,
      message: "Book created successfully",
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/groups/:groupId/books (List books inside a group)
router.get("/groups/:groupId/books", async (req, res, next) => {
  try {
    const groupId = req.params.groupId as string;
    const { medium } = req.query;
    const books = await getMaterialBooksByGroupId(groupId, medium as string | undefined);

    res.status(200).json({
      success: true,
      data: books,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/materials/books/:id (Get single book with its PDFs)
router.get("/books/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const book = await getMaterialBookById(id);

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/materials/books/:id (Delete a book)
router.delete("/books/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await deleteMaterialBook(id);

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "BOOK_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }
    next(error);
  }
});

// ======================== MATERIALS (PDFs) UPLOAD & CRUD ========================

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
    const { groupId, bookId, className, stream, board, medium, type, search } = req.query;

    const materials = await getAllMaterials({
      groupId: groupId as string | undefined,
      bookId: bookId as string | undefined,
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

export default router;
