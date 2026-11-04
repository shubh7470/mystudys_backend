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

export function getStreamsForClass(name: string): string[] {
  const lower = name.toLowerCase();
  if (lower.includes("12") || lower.includes("11")) {
    return ["Science", "Commerce", "Arts"];
  }
  if (lower.includes("dropper")) {
    return ["JEE (Engineering)", "NEET (Medical)", "Govt & Defence Exams"];
  }
  return [];
}

export async function getAllClasses(onlyActive: boolean = false) {
  const classes = await prisma.academicClass.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [
      { displayOrder: "asc" },
      { name: "asc" },
    ],
  });

  // Strict deduplication by normalized standard name (e.g. "Class 10" and "Class 10th" become single canonical "Class 10th")
  const seen = new Set<string>();
  const uniqueClasses: any[] = [];

  for (const item of classes) {
    // Extract standard number or keyword
    const match = item.name.match(/\d+/);
    const key = match ? `class_${match[0]}` : item.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const streams = getStreamsForClass(item.name);
    uniqueClasses.push({
      ...item,
      hasStream: streams.length > 0,
      streams,
    });
  }

  // Ensure descending educational hierarchy: 12th, 11th, 10th, 9th, 8th, 7th, 6th, Dropper
  uniqueClasses.sort((a, b) => a.displayOrder - b.displayOrder);

  return uniqueClasses;
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
  if (!slug && data.name) {
    slug = generateSlug(data.name.trim(), data.stream || existing.stream || undefined);
  }

  if (slug && slug !== existing.slug) {
    const slugExists = await prisma.academicClass.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (slugExists) {
      throw new Error("SLUG_ALREADY_EXISTS");
    }
  }

  if (data.name && data.name.trim() !== existing.name) {
    const nameExists = await prisma.academicClass.findFirst({
      where: {
        name: data.name.trim(),
        id: { not: id },
      },
    });

    if (nameExists) {
      throw new Error("CLASS_NAME_ALREADY_EXISTS");
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

export const STANDARD_EDUCATION_BOARDS = [
  {
    id: "cbse",
    name: "CBSE",
    fullName: "Central Board of Secondary Education",
    code: "CBSE",
    state: "National / All India",
    icon: "flag",
  },
  {
    id: "icse",
    name: "ICSE / ISC",
    fullName: "Council for Indian School Certificate Examinations",
    code: "CISCE",
    state: "National",
    icon: "library",
  },
  {
    id: "up_board",
    name: "UP Board",
    fullName: "Uttar Pradesh Madhyamik Shiksha Parishad",
    code: "UPMSP",
    state: "Uttar Pradesh",
    icon: "earth",
  },
  {
    id: "bihar_board",
    name: "Bihar Board",
    fullName: "Bihar School Examination Board",
    code: "BSEB",
    state: "Bihar",
    icon: "earth",
  },
  {
    id: "maharashtra_board",
    name: "Maharashtra Board",
    fullName: "Maharashtra State Board (MSBSHSE)",
    code: "MSBSHSE",
    state: "Maharashtra",
    icon: "earth",
  },
  {
    id: "rajasthan_board",
    name: "Rajasthan Board",
    fullName: "Board of Secondary Education Rajasthan",
    code: "RBSE",
    state: "Rajasthan",
    icon: "earth",
  },
  {
    id: "mp_board",
    name: "MP Board",
    fullName: "Madhya Pradesh Board of Secondary Education",
    code: "MPBSE",
    state: "Madhya Pradesh",
    icon: "earth",
  },
  {
    id: "west_bengal_board",
    name: "West Bengal Board",
    fullName: "West Bengal Board of Secondary Education",
    code: "WBBSE",
    state: "West Bengal",
    icon: "earth",
  },
  {
    id: "karnataka_board",
    name: "Karnataka Board",
    fullName: "Karnataka School Examination and Assessment Board",
    code: "KSEEB",
    state: "Karnataka",
    icon: "earth",
  },
  {
    id: "tamilnadu_board",
    name: "Tamil Nadu Board",
    fullName: "Tamil Nadu State Board",
    code: "TNSB",
    state: "Tamil Nadu",
    icon: "earth",
  },
  {
    id: "other_board",
    name: "Other State Board",
    fullName: "State Education Board / General Curriculum",
    code: "STATE",
    state: "All States",
    icon: "globe",
  },
];

export async function getAllBoards() {
  return STANDARD_EDUCATION_BOARDS;
}

export async function seedStandardClasses() {
  // 1. Remove obsolete / unstandardized legacy names so they never duplicate
  try {
    await prisma.academicClass.deleteMany({
      where: {
        name: {
          in: [
            "Class 6",
            "Class 7",
            "Class 8",
            "Class 9",
            "Class 10",
            "Class 11 (Science)",
            "Class 11 (Commerce)",
            "Class 11 (Arts)",
            "Class 12 (Science)",
            "Class 12 (Commerce)",
            "Class 12 (Arts)",
          ],
        },
      },
    });
  } catch {
    // Ignore cleanup errors
  }

  // 2. Canonical class presets
  const standardPresets = [
    {
      name: "Class 12th",
      code: "C12",
      displayOrder: 1,
      stream: "Higher Secondary & Board Exam",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Maharashtra Board", "Rajasthan Board", "MP Board", "Other State Board"],
      description: "Higher Secondary & Board Exam",
    },
    {
      name: "Class 11th",
      code: "C11",
      displayOrder: 2,
      stream: "Higher Secondary Foundation",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Maharashtra Board", "Rajasthan Board", "MP Board", "Other State Board"],
      description: "Higher Secondary Foundation",
    },
    {
      name: "Class 10th",
      code: "C10",
      displayOrder: 3,
      stream: "Secondary Board Examination",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Maharashtra Board", "Rajasthan Board", "MP Board", "Other State Board"],
      description: "Secondary Board Examination",
    },
    {
      name: "Class 9th",
      code: "C09",
      displayOrder: 4,
      stream: "Secondary School",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Maharashtra Board", "Other State Board"],
      description: "Secondary School",
    },
    {
      name: "Class 8th",
      code: "C08",
      displayOrder: 5,
      stream: "Middle School",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Other State Board"],
      description: "Middle School",
    },
    {
      name: "Class 7th",
      code: "C07",
      displayOrder: 6,
      stream: "Middle School",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Other State Board"],
      description: "Middle School",
    },
    {
      name: "Class 6th",
      code: "C06",
      displayOrder: 7,
      stream: "Middle School",
      boards: ["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "Other State Board"],
      description: "Middle School",
    },
    {
      name: "Dropper / Target Year",
      code: "DROPPER",
      displayOrder: 8,
      stream: "Dedicated Entrance & Govt Exam",
      boards: ["CBSE", "ICSE / ISC", "State Boards", "Other State Board"],
      description: "Dedicated Entrance & Govt Exam",
    },
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
          description: item.description,
          isActive: true,
        },
      });
      results.push(created);
    } else {
      const updated = await prisma.academicClass.update({
        where: { id: existing.id },
        data: {
          displayOrder: item.displayOrder,
          boards: item.boards,
          description: item.description || existing.description,
        },
      });
      results.push(updated);
    }
  }

  return {
    totalSeeded: results.length,
    classes: results,
  };
}
