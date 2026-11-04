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

export interface CreateMaterialHeadingInput {
  groupId: string;
  title: string;
  medium: "English" | "Hindi" | string;
  displayOrder?: number;
}

export interface CreateMaterialInput {
  groupId?: string;
  headingId?: string;
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
  headingId?: string;
  className?: string;
  stream?: string;
  board?: string;
  medium?: string;
  type?: string;
  search?: string;
}

// ----------------- GROUPS -----------------

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
      headings: {
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
      headings: {
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
      headings: {
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
    include: { materials: true },
  });

  if (!existing) {
    throw new Error("GROUP_NOT_FOUND");
  }

  return prisma.materialGroup.delete({
    where: { id },
  });
}

// ----------------- HEADINGS -----------------

export async function createMaterialHeading(data: CreateMaterialHeadingInput) {
  return prisma.materialHeading.create({
    data: {
      groupId: data.groupId,
      title: data.title.trim(),
      medium: data.medium ? data.medium.trim() : "English",
      displayOrder: data.displayOrder ?? 0,
    },
    include: {
      materials: true,
    },
  });
}

export async function deleteMaterialHeading(id: string) {
  const existing = await prisma.materialHeading.findUnique({
    where: { id },
    include: { materials: true },
  });

  if (!existing) {
    throw new Error("HEADING_NOT_FOUND");
  }

  return prisma.materialHeading.delete({
    where: { id },
  });
}

// ----------------- MATERIALS -----------------

export async function createMaterial(data: CreateMaterialInput) {
  return prisma.studyMaterial.create({
    data: {
      groupId: data.groupId || null,
      headingId: data.headingId || null,
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
      heading: true,
    },
  });
}

export async function getAllMaterials(filter: MaterialFilter = {}) {
  const where: any = {};

  if (filter.groupId) {
    where.groupId = filter.groupId;
  }
  if (filter.headingId) {
    where.headingId = filter.headingId;
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
      heading: true,
    },
  });
}

export async function getMaterialById(id: string) {
  return prisma.studyMaterial.findUnique({
    where: { id },
    include: {
      group: true,
      heading: true,
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
