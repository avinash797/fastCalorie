import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { ingestionJobs } from "@/lib/db/schema";
import type { ExtractedItem } from "@/lib/ingestion/ai-agent";
import { validateSingleItem } from "@/lib/ingestion/validation";
import type { ValidationResult } from "@/lib/ingestion/validation";

export const PUT = withAuth(
  async (
    request: NextRequest,
    _admin,
    context
  ) => {
    try {
      const { jobId, itemIndex: itemIndexStr } = await context!.params;
      const itemIndex = parseInt(itemIndexStr, 10);

      if (isNaN(itemIndex) || itemIndex < 0) {
        return NextResponse.json(
          { error: "Invalid item index" },
          { status: 400 }
        );
      }

      const [job] = await db
        .select()
        .from(ingestionJobs)
        .where(eq(ingestionJobs.id, jobId))
        .limit(1);

      if (!job) {
        return NextResponse.json(
          { error: "Ingestion job not found" },
          { status: 404 }
        );
      }

      if (job.status !== "review") {
        return NextResponse.json(
          { error: "Job is not in review status" },
          { status: 400 }
        );
      }

      const structuredData = job.structuredData as ExtractedItem[] | null;
      if (!structuredData || itemIndex >= structuredData.length) {
        return NextResponse.json(
          { error: "Item index out of range" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Update the item at the given index with partial fields
      const updatedItem: ExtractedItem = { ...structuredData[itemIndex], ...body };
      const updatedData = [...structuredData];
      updatedData[itemIndex] = updatedItem;

      // Re-run validation on the modified item
      const updatedValidation = validateSingleItem(
        updatedItem,
        itemIndex,
        updatedData
      );

      // Update the validation report
      const validationReport = (job.validationReport as ValidationResult[]) || [];
      const updatedReport = [...validationReport];
      updatedReport[itemIndex] = updatedValidation;

      await db
        .update(ingestionJobs)
        .set({
          structuredData: updatedData,
          validationReport: updatedReport,
        })
        .where(eq(ingestionJobs.id, jobId));

      return NextResponse.json({
        item: updatedItem,
        validation: updatedValidation,
      });
    } catch (error) {
      console.error("Edit item error:", error);
      return NextResponse.json(
        { error: "Failed to update item" },
        { status: 500 }
      );
    }
  }
);
