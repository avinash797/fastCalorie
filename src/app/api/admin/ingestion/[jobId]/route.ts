import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/auth/auth-middleware";
import { db } from "@/lib/db";
import { ingestionJobs } from "@/lib/db/schema";

export const GET = withAuth(async (_request: NextRequest, _admin, context) => {
  try {
    const { jobId } = await context!.params;

    const [job] = await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { error: "Ingestion job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(job, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingestion job" },
      { status: 500 },
    );
  }
});
