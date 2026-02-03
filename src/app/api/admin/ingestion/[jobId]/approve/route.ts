import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { withAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { ingestionJobs, menuItems, restaurants } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/audit";
import type { ExtractedItem } from "@/lib/ingestion/ai-agent";
import type { ValidationResult } from "@/lib/ingestion/validation";

export const POST = withAuth(
  async (
    request: NextRequest,
    admin,
    context
  ) => {
    try {
      const { jobId } = await context!.params;
      const body = await request.json();
      const { itemIndexes } = body as { itemIndexes: number[] };

      if (!Array.isArray(itemIndexes) || itemIndexes.length === 0) {
        return NextResponse.json(
          { error: "itemIndexes must be a non-empty array of numbers" },
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
      const validationReport = job.validationReport as ValidationResult[] | null;

      if (!structuredData || !validationReport) {
        return NextResponse.json(
          { error: "Job has no structured data or validation report" },
          { status: 400 }
        );
      }

      // Validate all indexes are in range
      for (const idx of itemIndexes) {
        if (idx < 0 || idx >= structuredData.length) {
          return NextResponse.json(
            { error: `Item index ${idx} is out of range` },
            { status: 400 }
          );
        }
      }

      // Check that none of the selected items have error status
      const errorItems = itemIndexes.filter(
        (idx) => validationReport[idx]?.status === "error"
      );
      if (errorItems.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot approve items with validation errors",
            details: { errorIndexes: errorItems },
          },
          { status: 400 }
        );
      }

      // Create menu_items records for each approved item
      const createdItems: string[] = [];
      for (const idx of itemIndexes) {
        const item = structuredData[idx];
        const [created] = await db
          .insert(menuItems)
          .values({
            restaurantId: job.restaurantId,
            name: item.name,
            category: item.category,
            servingSize: item.servingSize,
            calories: item.calories,
            totalFatG: item.totalFatG?.toString() ?? null,
            saturatedFatG: item.saturatedFatG?.toString() ?? null,
            transFatG: item.transFatG?.toString() ?? null,
            cholesterolMg: item.cholesterolMg?.toString() ?? null,
            sodiumMg: item.sodiumMg?.toString() ?? null,
            totalCarbsG: item.totalCarbsG?.toString() ?? null,
            dietaryFiberG: item.dietaryFiberG?.toString() ?? null,
            sugarsG: item.sugarsG?.toString() ?? null,
            proteinG: item.proteinG?.toString() ?? null,
            isAvailable: true,
            sourcePdfUrl: job.pdfUrl,
            ingestionId: job.id,
          })
          .returning({ id: menuItems.id });

        createdItems.push(created.id);

        await logAudit({
          adminId: admin.id,
          entityType: "menu_item",
          entityId: created.id,
          action: "create",
          afterData: item,
        });
      }

      // Update restaurant: increment itemCount, set lastIngestionAt, activate if draft
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, job.restaurantId))
        .limit(1);

      if (restaurant) {
        const updates: Record<string, unknown> = {
          itemCount: sql`${restaurants.itemCount} + ${itemIndexes.length}`,
          lastIngestionAt: new Date(),
        };

        if (restaurant.status === "draft") {
          updates.status = "active";
        }

        await db
          .update(restaurants)
          .set(updates)
          .where(eq(restaurants.id, job.restaurantId));
      }

      // Update ingestion job
      const newApprovedCount = (job.itemsApproved ?? 0) + itemIndexes.length;
      const allApproved = newApprovedCount >= structuredData.length;

      await db
        .update(ingestionJobs)
        .set({
          itemsApproved: newApprovedCount,
          status: allApproved ? "approved" : "review",
          completedAt: allApproved ? new Date() : undefined,
        })
        .where(eq(ingestionJobs.id, jobId));

      await logAudit({
        adminId: admin.id,
        entityType: "ingestion_job",
        entityId: jobId,
        action: "approve",
        afterData: {
          approvedIndexes: itemIndexes,
          approvedCount: itemIndexes.length,
          totalApproved: newApprovedCount,
        },
      });

      return NextResponse.json({
        approved: itemIndexes.length,
        totalApproved: newApprovedCount,
        totalItems: structuredData.length,
        status: allApproved ? "approved" : "review",
        createdItemIds: createdItems,
      });
    } catch (error) {
      console.error("Approve error:", error);
      return NextResponse.json(
        { error: "Failed to approve items" },
        { status: 500 }
      );
    }
  }
);
