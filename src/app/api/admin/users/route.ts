import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/db/audit";

const createAdminSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(100),
});

export const GET = withAuth(async () => {
  try {
    const results = await db
      .select({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        isActive: admins.isActive,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .orderBy(desc(admins.createdAt));

    return NextResponse.json(results, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request, currentAdmin) => {
  try {
    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, name, password } = parsed.data;

    // Check if email already exists
    const existing = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const [created] = await db
      .insert(admins)
      .values({
        email,
        name,
        passwordHash,
      })
      .returning({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        isActive: admins.isActive,
        createdAt: admins.createdAt,
      });

    await logAudit({
      adminId: currentAdmin.id,
      entityType: "admin",
      entityId: created.id,
      action: "create",
      afterData: { email: created.email, name: created.name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 },
    );
  }
});
