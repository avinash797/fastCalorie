import { eq } from "drizzle-orm";
import path from "path";
import { db } from "@/lib/db";
import { ingestionJobs, restaurants } from "@/lib/db/schema";
import {
  runPageByPagePipeline,
  type PipelineProgress,
} from "./parallel-pipeline";
import { runValidation } from "./validation";

async function updateJobStatus(
  jobId: string,
  status: "pending" | "processing" | "review" | "approved" | "failed"
) {
  await db
    .update(ingestionJobs)
    .set({ status })
    .where(eq(ingestionJobs.id, jobId));
}

async function updateJobProgress(jobId: string, progress: PipelineProgress) {
  await db
    .update(ingestionJobs)
    .set({ processingProgress: progress })
    .where(eq(ingestionJobs.id, jobId));
}

async function saveStructuredData(
  jobId: string,
  structuredData: unknown[],
  itemsExtracted: number
) {
  await db
    .update(ingestionJobs)
    .set({ structuredData, itemsExtracted })
    .where(eq(ingestionJobs.id, jobId));
}

async function saveValidationReport(jobId: string, validationReport: unknown[]) {
  await db
    .update(ingestionJobs)
    .set({ validationReport })
    .where(eq(ingestionJobs.id, jobId));
}

async function failJob(jobId: string, error: unknown) {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  await db
    .update(ingestionJobs)
    .set({
      status: "failed",
      errorLog: errorMessage,
    })
    .where(eq(ingestionJobs.id, jobId));
}

export async function runIngestionPipeline(jobId: string): Promise<void> {
  try {
    // Fetch job to get PDF path and restaurant info
    const [job] = await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error(`Ingestion job ${jobId} not found`);
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, job.restaurantId))
      .limit(1);

    if (!restaurant) {
      throw new Error(`Restaurant ${job.restaurantId} not found`);
    }

    // Stage 1: Update status to "processing"
    await updateJobStatus(jobId, "processing");

    // Stage 2: Run page-by-page pipeline (split → process pages in parallel → merge → deduplicate)
    const pdfPath = path.join(process.cwd(), "public", job.pdfUrl);

    const { items: structuredData, failedPages } =
      await runPageByPagePipeline(
        pdfPath,
        restaurant.name,
        async (progress) => {
          await updateJobProgress(jobId, progress);
        }
      );

    // Save extraction metadata
    const rawTextNote = failedPages.length > 0
      ? `Page-by-page extraction complete. Failed pages: ${failedPages.join(", ")}`
      : "Page-by-page extraction complete. All pages processed successfully.";

    await db
      .update(ingestionJobs)
      .set({ rawText: rawTextNote })
      .where(eq(ingestionJobs.id, jobId));

    await saveStructuredData(jobId, structuredData, structuredData.length);

    // Stage 3: Run validation
    await updateJobProgress(jobId, {
      totalPages: 0,
      completedPages: 0,
      currentPage: 0,
      status: "validating",
    });

    const validationReport = runValidation(structuredData);
    await saveValidationReport(jobId, validationReport);

    // Stage 4: Update status to "review" (await admin approval)
    await updateJobProgress(jobId, {
      totalPages: 0,
      completedPages: 0,
      currentPage: 0,
      status: "complete",
    });
    await updateJobStatus(jobId, "review");
  } catch (error) {
    await failJob(jobId, error);
  }
}
