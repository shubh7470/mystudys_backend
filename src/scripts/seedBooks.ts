import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const sampleGroups = [
  // 1-7: NCERT Textbooks
  {
    title: "NCERT Physics Part-1",
    description: "Complete Class 12 Physics theory, formulas, and textbook numericals",
    subject: "Physics",
    category: "NCERT",
    books: [
      { title: "NCERT Physics Part-1 (English)", medium: "English" },
      { title: "NCERT Bhautiki Bhag-1 (Hindi)", medium: "Hindi" },
    ],
  },
  {
    title: "NCERT Physics Part-2",
    description: "Optics, Modern Physics, Semiconductor Electronics with derivations",
    subject: "Physics",
    category: "NCERT",
    books: [
      { title: "NCERT Physics Part-2 (English)", medium: "English" },
      { title: "NCERT Bhautiki Bhag-2 (Hindi)", medium: "Hindi" },
    ],
  },
  {
    title: "NCERT Chemistry Part-1",
    description: "Solutions, Electrochemistry, Chemical Kinetics & Coordination Compounds",
    subject: "Chemistry",
    category: "NCERT",
    books: [
      { title: "NCERT Chemistry Part-1 (English)", medium: "English" },
      { title: "NCERT Rasayan Bhag-1 (Hindi)", medium: "Hindi" },
    ],
  },
  {
    title: "NCERT Chemistry Part-2",
    description: "Haloalkanes, Alcohols, Aldehydes, Amines and Biomolecules",
    subject: "Chemistry",
    category: "NCERT",
    books: [
      { title: "NCERT Chemistry Part-2 (English)", medium: "English" },
      { title: "NCERT Rasayan Bhag-2 (Hindi)", medium: "Hindi" },
    ],
  },
  {
    title: "NCERT Mathematics Part-1",
    description: "Relations & Functions, Matrices, Determinants, Calculus",
    subject: "Mathematics",
    category: "NCERT",
    books: [
      { title: "NCERT Mathematics Part-1 (English)", medium: "English" },
      { title: "NCERT Ganit Bhag-1 (Hindi)", medium: "Hindi" },
    ],
  },
  {
    title: "NCERT Mathematics Part-2",
    description: "Integrals, Differential Equations, Vector Algebra, 3D Geometry, Probability",
    subject: "Mathematics",
    category: "NCERT",
    books: [
      { title: "NCERT Mathematics Part-2 (English)", medium: "English" },
      { title: "NCERT Ganit Bhag-2 (Hindi)", medium: "Hindi" },
    ],
  },
  {
    title: "NCERT Biology Textbook",
    description: "Reproduction, Genetics, Evolution, Biotechnology and Ecology",
    subject: "Biology",
    category: "NCERT",
    books: [
      { title: "NCERT Biology (English)", medium: "English" },
      { title: "NCERT Jeev Vigyan (Hindi)", medium: "Hindi" },
    ],
  },

  // 8-11: NCERT Exemplar Problems
  {
    title: "NCERT Exemplar Physics",
    description: "High-order thinking skills (HOTS) questions and detailed solutions",
    subject: "Physics",
    category: "Exemplar",
    books: [
      { title: "Physics Exemplar Problems", medium: "English" },
    ],
  },
  {
    title: "NCERT Exemplar Chemistry",
    description: "Advanced conceptual MCQs, assertion-reasoning, and numericals",
    subject: "Chemistry",
    category: "Exemplar",
    books: [
      { title: "Chemistry Exemplar Problems", medium: "English" },
    ],
  },
  {
    title: "NCERT Exemplar Mathematics",
    description: "Challenging calculus, algebra, and geometry problems with proofs",
    subject: "Mathematics",
    category: "Exemplar",
    books: [
      { title: "Mathematics Exemplar Problems", medium: "English" },
    ],
  },
  {
    title: "NCERT Exemplar Biology",
    description: "Objective and subjective analytical questions for board & NEET",
    subject: "Biology",
    category: "Exemplar",
    books: [
      { title: "Biology Exemplar Problems", medium: "English" },
    ],
  },

  // 12-17: Popular Reference Books
  {
    title: "HC Verma - Concepts of Physics Vol 1",
    description: "Classic physics reference covering mechanics, waves, and thermodynamics",
    subject: "Physics",
    category: "Reference",
    books: [
      { title: "Concepts of Physics Vol 1 - Theory & Questions", medium: "English" },
    ],
  },
  {
    title: "HC Verma - Concepts of Physics Vol 2",
    description: "Electromagnetism, Optics, Modern Physics problem-solving guide",
    subject: "Physics",
    category: "Reference",
    books: [
      { title: "Concepts of Physics Vol 2 - Full Guide", medium: "English" },
    ],
  },
  {
    title: "SL Arora - Simplified Physics",
    description: "Comprehensive board examination textbook with solved NCERT questions",
    subject: "Physics",
    category: "Reference",
    books: [
      { title: "New Simplified Physics Vol 1", medium: "English" },
      { title: "New Simplified Physics Vol 2", medium: "English" },
    ],
  },
  {
    title: "RD Sharma Mathematics Vol 1",
    description: "Exhaustive theory and practice exercises for CBSE Class 12th Board",
    subject: "Mathematics",
    category: "Reference",
    books: [
      { title: "RD Sharma Mathematics Volume 1", medium: "English" },
    ],
  },
  {
    title: "RD Sharma Mathematics Vol 2",
    description: "Integrals, Differential Equations, 3D Geometry and Vectors practice",
    subject: "Mathematics",
    category: "Reference",
    books: [
      { title: "RD Sharma Mathematics Volume 2", medium: "English" },
    ],
  },
  {
    title: "Pradeep's Fundamental Physics",
    description: "Deep conceptual coverage with step-by-step solved derivations",
    subject: "Physics",
    category: "Reference",
    books: [
      { title: "Pradeep Physics Vol 1", medium: "English" },
      { title: "Pradeep Physics Vol 2", medium: "English" },
    ],
  },

  // 18-22: Chemistry & Biology References
  {
    title: "OP Tandon - Physical Chemistry",
    description: "In-depth thermodynamic, kinetics, and electrochemistry problem bank",
    subject: "Chemistry",
    category: "Reference",
    books: [
      { title: "Physical Chemistry for Class 12", medium: "English" },
    ],
  },
  {
    title: "OP Tandon - Organic Chemistry",
    description: "Named reactions, reaction mechanisms, synthesis pathways, conversions",
    subject: "Chemistry",
    category: "Reference",
    books: [
      { title: "Organic Chemistry Handbook", medium: "English" },
    ],
  },
  {
    title: "Pradeep's New Course Chemistry",
    description: "Complete inorganic, organic, and physical chemistry board textbook",
    subject: "Chemistry",
    category: "Reference",
    books: [
      { title: "Pradeep Chemistry Vol 1 & 2", medium: "English" },
    ],
  },
  {
    title: "Trueman's Elementary Biology Vol 1",
    description: "Standard reference for Class 12 Botany, genetics and biotechnology",
    subject: "Biology",
    category: "Reference",
    books: [
      { title: "Elementary Biology Vol 1", medium: "English" },
    ],
  },
  {
    title: "Trueman's Elementary Biology Vol 2",
    description: "Human physiology, reproduction, evolution, ecology and environment",
    subject: "Biology",
    category: "Reference",
    books: [
      { title: "Elementary Biology Vol 2", medium: "English" },
    ],
  },

  // 23-26: Question Banks & Solved Papers
  {
    title: "Oswaal CBSE Question Bank Physics",
    description: "Chapterwise & Topicwise questions, mind maps & previous year papers",
    subject: "Physics",
    category: "Question Bank",
    books: [
      { title: "Oswaal Physics Question Bank 2025", medium: "English" },
    ],
  },
  {
    title: "Oswaal CBSE Question Bank Chemistry",
    description: "Assertion reasoning, case-based questions, and board marking scheme",
    subject: "Chemistry",
    category: "Question Bank",
    books: [
      { title: "Oswaal Chemistry Question Bank 2025", medium: "English" },
    ],
  },
  {
    title: "Oswaal CBSE Question Bank Mathematics",
    description: "Self-assessment papers, toppers answer sheets, and rapid revisions",
    subject: "Mathematics",
    category: "Question Bank",
    books: [
      { title: "Oswaal Mathematics Question Bank 2025", medium: "English" },
    ],
  },
  {
    title: "Arihant All In One Physics",
    description: "Complete study, practice and assessment with NCERT folder",
    subject: "Physics",
    category: "Question Bank",
    books: [
      { title: "All In One Physics Class 12", medium: "English" },
    ],
  },
  {
    title: "Arihant All In One Chemistry",
    description: "Summary notes, exam pattern questions, and sample papers",
    subject: "Chemistry",
    category: "Question Bank",
    books: [
      { title: "All In One Chemistry Class 12", medium: "English" },
    ],
  },
  {
    title: "CBSE 10 Years Solved Papers",
    description: "Solved board papers from 2015 to 2024 with detailed step marking",
    subject: "General",
    category: "PYQ",
    books: [
      { title: "Physics 10 Years Solved Papers", medium: "English" },
      { title: "Chemistry 10 Years Solved Papers", medium: "English" },
      { title: "Mathematics 10 Years Solved Papers", medium: "English" },
    ],
  },

  // 29-32: Notes & Formula Books
  {
    title: "Topper Handwritten Physics Notes",
    description: "Clear colorful handwritten notes for quick revision before exams",
    subject: "Physics",
    category: "Notes",
    books: [
      { title: "Physics Complete Handwritten Notes", medium: "English" },
    ],
  },
  {
    title: "Organic Chemistry Reaction Roadmap",
    description: "All named reactions, mechanisms, tests, and conversion charts",
    subject: "Chemistry",
    category: "Notes",
    books: [
      { title: "Organic Reactions & Conversions Chart", medium: "English" },
    ],
  },
  {
    title: "Mathematics Formulas & Shortcuts",
    description: "Quick formula handbook with trigonometric identities and calculus rules",
    subject: "Mathematics",
    category: "Notes",
    books: [
      { title: "Class 12 Maths Formula Handbook", medium: "English" },
    ],
  },
  {
    title: "Biology Diagram & Mind Maps Collection",
    description: "High-resolution labeled diagrams and one-page chapter mind maps",
    subject: "Biology",
    category: "Notes",
    books: [
      { title: "Biology Diagram Guide & Mind Maps", medium: "English" },
    ],
  },
];

async function seed() {
  console.log("Starting book groups seed...");

  for (let i = 0; i < sampleGroups.length; i++) {
    const item = sampleGroups[i];

    // Check if group already exists by title
    let group = await prisma.materialGroup.findFirst({
      where: {
        title: item.title,
        className: "Class 12th",
      },
    });

    if (!group) {
      group = await prisma.materialGroup.create({
        data: {
          title: item.title,
          description: item.description,
          className: "Class 12th",
          stream: "Science",
          board: "CBSE",
          displayOrder: i + 1,
          isPublished: true,
        },
      });
      console.log(`Created group: ${group.title}`);
    } else {
      console.log(`Group already exists: ${group.title}`);
    }

    // Seed books for this group
    for (let bIndex = 0; bIndex < item.books.length; bIndex++) {
      const bInfo = item.books[bIndex];
      let book = await prisma.materialBook.findFirst({
        where: {
          groupId: group.id,
          title: bInfo.title,
        },
      });

      if (!book) {
        book = await prisma.materialBook.create({
          data: {
            groupId: group.id,
            title: bInfo.title,
            medium: bInfo.medium,
            displayOrder: bIndex + 1,
          },
        });
        console.log(`  Added book: ${book.title}`);
      }

      // Add 1 sample study material / PDF to this book if none exists
      const existingMaterial = await prisma.studyMaterial.findFirst({
        where: { bookId: book.id },
      });

      if (!existingMaterial) {
        await prisma.studyMaterial.create({
          data: {
            groupId: group.id,
            bookId: book.id,
            title: `${item.subject} Chapter 1 & Overview`,
            description: `Full introductory chapter and notes for ${item.title}`,
            fileUrl: "https://pub-9767653ba78742758eac98d8ac022012.r2.dev/materials/sample.pdf",
            fileName: `${item.title.replace(/[^a-zA-Z0-9]/g, "_")}_Ch1.pdf`,
            fileSize: 2450000, // ~2.4 MB
            className: "Class 12th",
            stream: "Science",
            board: "CBSE",
            medium: bInfo.medium,
            subject: item.subject,
            type: "Notes",
            isPublished: true,
          },
        });
        console.log(`    Added sample material for ${book.title}`);
      }
    }
  }

  console.log("Seeding finished successfully! Total groups:", sampleGroups.length);
}

seed()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

