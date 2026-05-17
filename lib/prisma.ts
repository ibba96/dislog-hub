import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { pathToFileURL } from "url";

declare global {
  var _prisma: PrismaClient | undefined;
}

function createPrisma() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  // Production: Turso remote
  if (url && url.startsWith("libsql://")) {
    const adapter = new PrismaLibSql({ url, authToken });
    return new PrismaClient({ adapter } as any);
  }

  // Dev: local SQLite file
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const dbUrl = process.env.DATABASE_URL ?? pathToFileURL(dbPath).toString();
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter } as any);
}

export const prisma = global._prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") global._prisma = prisma;
