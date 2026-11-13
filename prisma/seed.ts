import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { applyDbEnv } from "../src/lib/dbEnv";

applyDbEnv();

const db = new PrismaClient();

const DEFAULT_CATEGORIES = ["Decoration", "Food", "Sound and lights", "Rituals", "Stage and tent", "Printing", "Transport", "Other"];

async function main() {
  for (const name of DEFAULT_CATEGORIES) await db.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });

  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) return console.log(`Admin "${username}" already exists.`);
  await db.user.create({
    data: { name: "Administrator", username, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" },
  });
  console.log(`Created admin "${username}". Change the password after first login.`);
}

main().finally(() => db.$disconnect());
