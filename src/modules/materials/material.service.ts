import { prisma } from "../../lib/prisma.js";

export interface CreateMaterialGroupInput {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  classId?: string;
  className: string;
  stream?: string;
  board: string;
  displayOrder?: number;
  isPublished?: boolean;
}

export interface CreateMaterialBookInput {
  groupId: string;
  title: string;
  medium?: "English" | "Hindi" | string;
  displayOrder?: number;
}

export interface CreateMaterialInput {
  groupId?: string;
  bookId?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  classId?: string;
  className: string;
  stream?: string;
  board: string;
  medium?: string;
  subject?: string;
  type?: string;
  isPublished?: boolean;
}

export interface MaterialFilter {
  groupId?: string;
  bookId?: string;
  className?: string;
  stream?: string;
  board?: string;
  medium?: string;
  type?: string;
  search?: string;
}

// ======================== BOOK GROUPS ========================

export async function createMaterialGroup(data: CreateMaterialGroupInput) {
  return prisma.materialGroup.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      thumbnailUrl: data.thumbnailUrl?.trim() || null,
      classId: data.classId || null,
      className: data.className.trim(),
      stream: data.stream && data.stream !== "General" ? data.stream.trim() : null,
      board: data.board.trim(),
      displayOrder: data.displayOrder ?? 0,
      isPublished: data.isPublished ?? true,
    },
    include: {
      books: {
        include: {
          materials: true,
        },
      },
      materials: true,
    },
  });
}

export async function getAllMaterialGroups(filter: {
  className?: string;
  stream?: string;
  board?: string;
  search?: string;
}) {
  const where: any = {};

  if (filter.className) {
    where.className = filter.className;
  }
  if (filter.stream) {
    where.stream = filter.stream;
  }
  if (filter.board && filter.board !== "All") {
    where.board = filter.board;
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { description: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  return prisma.materialGroup.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    include: {
      books: {
        include: {
          materials: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      },
      materials: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getMaterialGroupById(id: string) {
  return prisma.materialGroup.findUnique({
    where: { id },
    include: {
      books: {
        include: {
          materials: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      },
      materials: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function deleteMaterialGroup(id: string) {
  const existing = await prisma.materialGroup.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("GROUP_NOT_FOUND");
  }

  return prisma.materialGroup.delete({
    where: { id },
  });
}

// ======================== BOOKS ========================

export async function createMaterialBook(data: CreateMaterialBookInput) {
  const medium = data.medium && data.medium.toLowerCase().includes("h") ? "Hindi" : "English";
  return prisma.materialBook.create({
    data: {
      groupId: data.groupId,
      title: data.title.trim(),
      medium,
      displayOrder: data.displayOrder ?? 0,
    },
    include: {
      materials: true,
    },
  });
}

export async function getMaterialBooksByGroupId(groupId: string, medium?: string) {
  const where: any = { groupId };
  if (medium) {
    const isHindi = medium.toLowerCase().includes("h");
    where.medium = isHindi ? "Hindi" : "English";
  }

  return prisma.materialBook.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: {
      materials: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getMaterialBookById(id: string) {
  return prisma.materialBook.findUnique({
    where: { id },
    include: {
      group: true,
      materials: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function deleteMaterialBook(id: string) {
  const existing = await prisma.materialBook.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("BOOK_NOT_FOUND");
  }

  return prisma.materialBook.delete({
    where: { id },
  });
}

// ======================== MATERIALS (PDFs) ========================

export async function createMaterial(data: CreateMaterialInput) {
  return prisma.studyMaterial.create({
    data: {
      groupId: data.groupId || null,
      bookId: data.bookId || null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      fileUrl: data.fileUrl.trim(),
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      classId: data.classId || null,
      className: data.className.trim(),
      stream: data.stream && data.stream !== "General" ? data.stream.trim() : null,
      board: data.board.trim(),
      medium: data.medium ? data.medium.trim() : "English",
      subject: data.subject?.trim() || null,
      type: data.type || "Notes",
      isPublished: data.isPublished ?? true,
    },
    include: {
      group: true,
      book: true,
    },
  });
}

export async function getAllMaterials(filter: MaterialFilter = {}) {
  const where: any = {};

  if (filter.groupId) {
    where.groupId = filter.groupId;
  }
  if (filter.bookId) {
    where.bookId = filter.bookId;
  }
  if (filter.className) {
    where.className = filter.className;
  }
  if (filter.stream) {
    where.stream = filter.stream;
  }
  if (filter.board) {
    where.board = filter.board;
  }
  if (filter.medium) {
    where.medium = filter.medium;
  }
  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { subject: { contains: filter.search, mode: "insensitive" } },
      { description: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  return prisma.studyMaterial.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      group: true,
      book: true,
    },
  });
}

export async function getMaterialById(id: string) {
  return prisma.studyMaterial.findUnique({
    where: { id },
    include: {
      group: true,
      book: true,
    },
  });
}

export async function deleteMaterial(id: string) {
  const existing = await prisma.studyMaterial.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("MATERIAL_NOT_FOUND");
  }

  return prisma.studyMaterial.delete({
    where: { id },
  });
}
