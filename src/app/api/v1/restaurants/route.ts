import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";

export async function GET() {
  try {
    const results = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        logoUrl: restaurants.logoUrl,
        description: restaurants.description,
        itemCount: restaurants.itemCount,
        lastIngestionAt: restaurants.lastIngestionAt,
      })
      .from(restaurants)
      .where(eq(restaurants.status, "active"))
      .orderBy(asc(restaurants.name));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
