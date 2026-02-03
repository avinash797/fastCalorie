import { eq } from "drizzle-orm";
import path from "path";
import { db } from "@/lib/db";
import { ingestionJobs, restaurants } from "@/lib/db/schema";
import { extractPdfAsBase64 } from "./extract";
import { aiExtractNutritionData } from "./ai-agent";
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

async function saveExtractionMetadata(jobId: string) {
  // Store metadata about the extraction in rawText field
  await db
    .update(ingestionJobs)
    .set({ rawText: "PDF document sent directly to Claude for vision-based extraction" })
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

    // Stage 2: Read PDF as base64 for Claude's document input
    const pdfPath = path.join(process.cwd(), "public", job.pdfUrl);
    const pdfDocument = await extractPdfAsBase64(pdfPath);
    await saveExtractionMetadata(jobId);

    // Stage 3: Send PDF directly to Claude for vision-based extraction
    const structuredData = await aiExtractNutritionData(
      pdfDocument,
      restaurant.name
    );
    await saveStructuredData(jobId, structuredData, structuredData.length);

    // Stage 4: Run validation
    const validationReport = runValidation(structuredData);
    await saveValidationReport(jobId, validationReport);

    // Stage 5: Update status to "review" (await admin approval)
    await updateJobStatus(jobId, "review");
  } catch (error) {
    await failJob(jobId, error);
  }
}
