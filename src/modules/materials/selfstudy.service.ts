import { prisma } from "../../lib/prisma.js";

export const DEFAULT_SELFSTUDY_CATEGORIES = [
  "NCERT TextBooks 2026-27",
  "NCERT TextBooks 2025-26",
  "NCERT Solution",
  "NCERT Exemplar Books",
  "NCERT Exemplar Solution",
  "NCERT Notes",
  "CBSE Sample Paper",
  "Previous Year Paper",
  "CBSE Additional Practice Questions",
  "CBSE Syllabus",
  "CBSE Important Question",
  "Topper Answer Sheets",
  "Competitive Exam",
  "MCQ Test",
  "Revision Notes - (New)",
  "Revision Notes - (Old)",
  "Hot Questions",
  "CBSE Assertion & Reasoning",
];

// Seed standard categories for a class & board if not exists
export async function seedCategoriesIfEmpty(className: string, board: string, stream?: string) {
  try {
    const existing = await prisma.materialCategory.count({
      where: {
        className,
        board,
      },
    });

    if (existing === 0) {
      const data = DEFAULT_SELFSTUDY_CATEGORIES.map((cat, idx) => ({
        title: cat,
        className,
        board,
        stream: stream || null,
        displayOrder: idx + 1,
      }));

      await prisma.materialCategory.createMany({
        data,
        skipDuplicates: true,
      });
    }
  } catch (seedErr) {
    console.warn("Auto-seed notice (ignored):", seedErr);
  }
}

// ---------------- CATEGORIES ----------------
export async function getCategories(filter: { className?: string; board?: string; stream?: string }) {
  const where: any = {};
  if (filter.className) where.className = filter.className;
  if (filter.board && filter.board !== "All") where.board = filter.board;
  if (filter.stream) where.stream = filter.stream;

  // Auto-seed if empty for this class & board
  if (filter.className && filter.board) {
    await seedCategoriesIfEmpty(filter.className, filter.board, filter.stream);
  }

  return prisma.materialCategory.findMany({
    where,
    orderBy: { displayOrder: "asc" },
    include: {
      books: {
        select: {
          id: true,
          title: true,
          medium: true,
        },
      },
    },
  });
}

export async function createCategory(data: {
  title: string;
  className: string;
  board: string;
  stream?: string;
  icon?: string;
}) {
  return prisma.materialCategory.create({
    data: {
      title: data.title.trim(),
      className: data.className.trim(),
      board: data.board.trim(),
      stream: data.stream?.trim() || null,
      icon: data.icon || null,
    },
  });
}

export async function deleteCategory(id: string) {
  return prisma.materialCategory.delete({
    where: { id },
  });
}

// ---------------- BOOKS ----------------
export async function getBooks(categoryId: string, medium?: string) {
  const where: any = { categoryId };
  if (medium) {
    // E.M or H.M or English or Hindi
    const isHindi = medium.toLowerCase().includes("h");
    where.medium = isHindi ? "Hindi" : "English";
  }

  return prisma.materialBook.findMany({
    where,
    orderBy: { displayOrder: "asc" },
    include: {
      chapters: {
        include: {
          materials: true,
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

export async function createBook(data: {
  categoryId: string;
  title: string;
  medium?: string;
  displayOrder?: number;
}) {
  const medium = (data.medium?.toLowerCase().includes("h") ? "Hindi" : "English");
  return prisma.materialBook.create({
    data: {
      categoryId: data.categoryId,
      title: data.title.trim(),
      medium,
      displayOrder: data.displayOrder ?? 0,
    },
  });
}

export async function deleteBook(id: string) {
  return prisma.materialBook.delete({
    where: { id },
  });
}

// ---------------- CHAPTERS ----------------
export async function getChapters(bookId: string) {
  return prisma.materialChapter.findMany({
    where: { bookId },
    orderBy: { displayOrder: "asc" },
    include: {
      materials: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createChapter(data: {
  bookId: string;
  title: string;
  displayOrder?: number;
}) {
  return prisma.materialChapter.create({
    data: {
      bookId: data.bookId,
      title: data.title.trim(),
      displayOrder: data.displayOrder ?? 0,
    },
    include: {
      materials: true,
    },
  });
}

export async function deleteChapter(id: string) {
  return prisma.materialChapter.delete({
    where: { id },
  });
}

// ---------------- PDF MATERIALS ----------------
export async function createChapterMaterial(data: {
  chapterId: string;
  title: string; // e.g. "Basic PDF" or "Advance PDF"
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  badgeColor?: string; // "red" | "blue"
  className: string;
  board: string;
  stream?: string;
  medium?: string;
}) {
  return prisma.studyMaterial.create({
    data: {
      chapterId: data.chapterId,
      title: data.title.trim(),
      fileUrl: data.fileUrl.trim(),
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      badgeColor: data.badgeColor || (data.title.toLowerCase().includes("advance") ? "blue" : "red"),
      className: data.className,
      board: data.board,
      stream: data.stream || null,
      medium: data.medium || "English",
    },
  });
}

