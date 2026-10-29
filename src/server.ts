import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

async function startServer() {
  try {
    await prisma.$connect();

    const server = app.listen(env.PORT, () => {
      console.log(`StudyNest API: http://localhost:${env.PORT}`);
      console.log(`Health check: http://localhost:${env.PORT}/api/v1/health`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    const shutdown = async () => {
      console.log("Shutting down StudyNest API...");

      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start StudyNest API:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void startServer();