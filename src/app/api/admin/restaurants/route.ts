import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import slugify from "slugify";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";
import { logAudit } from "@/lib/db/audit";
import { createRestaurantSchema } from "@/lib/validators/restaurant";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const whereClause =
      statusFilter &&
      ["active", "draft", "archived"].includes(statusFilter)
        ? eq(
            restaurants.status,
            statusFilter as "active" | "draft" | "archived"
          )
        : undefined;

    const results = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        status: restaurants.status,
        itemCount: restaurants.itemCount,
        lastIngestionAt: restaurants.lastIngestionAt,
      })
      .from(restaurants)
      .where(whereClause)
      .orderBy(asc(restaurants.name));

    return NextResponse.json(results, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, admin) => {
  try {
    const body = await request.json();
    const parsed = createRestaurantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Auto-generate slug if not provided
    const slug =
      data.slug ||
      slugify(data.name, { lower: true, strict: true });

    // Check slug uniqueness
    const existing = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A restaurant with this slug already exists" },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(restaurants)
      .values({
        name: data.name,
        slug,
        logoUrl: data.logoUrl,
        websiteUrl: data.websiteUrl,
        description: data.description,
        status: data.status,
      })
      .returning();

    await logAudit({
      adminId: admin.id,
      entityType: "restaurant",
      entityId: created.id,
      action: "create",
      afterData: created,
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
