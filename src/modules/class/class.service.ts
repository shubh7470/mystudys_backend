import { prisma } from "../../lib/prisma.js";

export interface CreateClassInput {
  name: string;
  code?: string;
  slug?: string;
  displayOrder?: number;
  stream?: string;
  boards?: string[];
  description?: string;
  isActive?: boolean;
}

export interface UpdateClassInput {
  name?: string;
  code?: string;
  slug?: string;
  displayOrder?: number;
  stream?: string;
  boards?: string[];
  description?: string;
  isActive?: boolean;
}

function generateSlug(name: string, stream?: string): string {
  const base = stream && stream !== "General" ? `${name}-${stream}` : name;
  return base
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getAllClasses(onlyActive: boolean = false) {
  return prisma.academicClass.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [
      { displayOrder: "asc" },
      { name: "asc" },
    ],
  });
}

export async function getClassById(id: string) {
  return prisma.academicClass.findUnique({
    where: { id },
  });
}

export async function createClass(data: CreateClassInput) {
  const trimmedName = data.name.trim();
  const slug = data.slug?.trim() || generateSlug(trimmedName, data.stream);

  // Check if name or slug already exists
  const existing = await prisma.academicClass.findFirst({
    where: {
      OR: [{ name: trimmedName }, { slug }],
    },
  });

  if (existing) {
    throw new Error("CLASS_ALREADY_EXISTS");
  }

  return prisma.academicClass.create({
    data: {
      name: trimmedName,
      code: data.code?.trim() || null,
      slug,
      displayOrder: data.displayOrder ?? 0,
      stream: data.stream?.trim() || "General",
      boards: data.boards || [],
      description: data.description?.trim() || null,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateClass(id: string, data: UpdateClassInput) {
  const existing = await prisma.academicClass.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("CLASS_NOT_FOUND");
  }

  let slug = data.slug?.trim();
  if (!slug && data.name && data.name !== existing.name) {
    slug = generateSlug(data.name.trim(), data.stream || existing.stream || undefined);
  }

  if (data.name || slug) {
    const collision = await prisma.academicClass.findFirst({
      where: {
        id: { not: id },
        OR: [
          data.name ? { name: data.name.trim() } : {},
          slug ? { slug } : {},
        ],
      },
    });

    if (collision) {
      throw new Error("CLASS_ALREADY_EXISTS");
    }
  }

  return prisma.academicClass.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.code !== undefined && { code: data.code.trim() || null }),
      ...(slug !== undefined && { slug }),
      ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      ...(data.stream !== undefined && { stream: data.stream.trim() || "General" }),
      ...(data.boards !== undefined && { boards: data.boards }),
      ...(data.description !== undefined && { description: data.description.trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteClass(id: string) {
  const existing = await prisma.academicClass.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("CLASS_NOT_FOUND");
  }

  return prisma.academicClass.delete({
    where: { id },
  });
}

export async function seedStandardClasses() {
  const standardPresets = [
    { name: "Class 6", code: "C06", displayOrder: 1, stream: "General", boards: ["CBSE", "ICSE", "State Boards", "UP Board", "Bihar Board"] },
    { name: "Class 7", code: "C07", displayOrder: 2, stream: "General", boards: ["CBSE", "ICSE", "State Boards", "UP Board", "Bihar Board"] },
    { name: "Class 8", code: "C08", displayOrder: 3, stream: "General", boards: ["CBSE", "ICSE", "State Boards", "UP Board", "Bihar Board"] },
    { name: "Class 9", code: "C09", displayOrder: 4, stream: "General", boards: ["CBSE", "ICSE", "UP Board", "Bihar Board", "Maharashtra Board"] },
    { name: "Class 10", code: "C10", displayOrder: 5, stream: "General", boards: ["CBSE", "ICSE", "UP Board", "Bihar Board", "Maharashtra Board", "Rajasthan Board"] },
    { name: "Class 11 (Science)", code: "C11-SCI", displayOrder: 6, stream: "Science", boards: ["CBSE", "ISC", "UP Board", "Bihar Board", "Maharashtra Board"] },
    { name: "Class 11 (Commerce)", code: "C11-COM", displayOrder: 7, stream: "Commerce", boards: ["CBSE", "ISC", "UP Board", "Bihar Board"] },
    { name: "Class 11 (Arts)", code: "C11-ART", displayOrder: 8, stream: "Arts", boards: ["CBSE", "ISC", "UP Board", "Bihar Board"] },
    { name: "Class 12 (Science)", code: "C12-SCI", displayOrder: 9, stream: "Science", boards: ["CBSE", "ISC", "UP Board", "Bihar Board", "Maharashtra Board", "Rajasthan Board"] },
    { name: "Class 12 (Commerce)", code: "C12-COM", displayOrder: 10, stream: "Commerce", boards: ["CBSE", "ISC", "UP Board", "Bihar Board"] },
    { name: "Class 12 (Arts)", code: "C12-ART", displayOrder: 11, stream: "Arts", boards: ["CBSE", "ISC", "UP Board", "Bihar Board"] },
  ];

  const results = [];
  for (const item of standardPresets) {
    const slug = generateSlug(item.name, item.stream);
    const existing = await prisma.academicClass.findFirst({
      where: {
        OR: [{ name: item.name }, { slug }],
      },
    });

    if (!existing) {
      const created = await prisma.academicClass.create({
        data: {
          name: item.name,
          code: item.code,
          slug,
          displayOrder: item.displayOrder,
          stream: item.stream,
          boards: item.boards,
          isActive: true,
        },
      });
      results.push(created);
    } else if (existing.boards.length === 0) {
      const updated = await prisma.academicClass.update({
        where: { id: existing.id },
        data: { boards: item.boards },
      });
      results.push(updated);
    }
  }

  return {
    totalSeeded: results.length,
    classes: results,
  };
}
