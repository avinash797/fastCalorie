import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db";
import { admins } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.error(
      "Missing required env vars: SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD"
    );
    process.exit(1);
  }

  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin with email ${email} already exists (id: ${existing[0].id}). Skipping.`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  const [admin] = await db
    .insert(admins)
    .values({ email, name, passwordHash })
    .returning({ id: admins.id, email: admins.email, name: admins.name });

  console.log(`Admin seeded successfully:`);
  console.log(`  ID:    ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Name:  ${admin.name}`);

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
