import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestionJobs, restaurants } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const restaurantId = searchParams.get("restaurantId");

    let query = db
      .select({
        id: ingestionJobs.id,
        restaurantId: ingestionJobs.restaurantId,
        status: ingestionJobs.status,
        itemsExtracted: ingestionJobs.itemsExtracted,
        itemsApproved: ingestionJobs.itemsApproved,
        errorLog: ingestionJobs.errorLog,
        createdAt: ingestionJobs.createdAt,
        restaurantName: restaurants.name,
      })
      .from(ingestionJobs)
      .leftJoin(restaurants, eq(ingestionJobs.restaurantId, restaurants.id))
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(limit)
      .$dynamic();

    if (restaurantId) {
      query = query.where(eq(ingestionJobs.restaurantId, restaurantId));
    }

    const jobs = await query;

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to fetch ingestion jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingestion jobs" },
      { status: 500 },
    );
  }
}
