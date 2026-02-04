import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/auth-middleware";
import { logAudit } from "@/lib/db/audit";

const updateAdminSchema = z.object({
  isActive: z.boolean().optional(),
});

export const GET = withAuth(async (_request: NextRequest, _admin, context) => {
  try {
    const { id } = await context!.params;

    const [admin] = await db
      .select({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        isActive: admins.isActive,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json(admin, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch admin" },
      { status: 500 },
    );
  }
});

export const PUT = withAuth(
  async (request: NextRequest, currentAdmin, context) => {
    try {
      const { id } = await context!.params;
      const body = await request.json();
      const parsed = updateAdminSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.issues },
          { status: 400 },
        );
      }

      // Don't allow deactivating yourself
      if (parsed.data.isActive === false && id === currentAdmin.id) {
        return NextResponse.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 },
        );
      }

      // Get admin before update
      const [before] = await db
        .select({
          id: admins.id,
          email: admins.email,
          name: admins.name,
          isActive: admins.isActive,
        })
        .from(admins)
        .where(eq(admins.id, id))
        .limit(1);

      if (!before) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      const [updated] = await db
        .update(admins)
        .set({
          isActive: parsed.data.isActive ?? before.isActive,
        })
        .where(eq(admins.id, id))
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
        entityId: id,
        action: "update",
        beforeData: { isActive: before.isActive },
        afterData: { isActive: updated.isActive },
      });

      return NextResponse.json(updated);
    } catch {
      return NextResponse.json(
        { error: "Failed to update admin" },
        { status: 500 },
      );
    }
  },
);
