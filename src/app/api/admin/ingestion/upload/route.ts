import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { ingestionJobs, restaurants } from "@/lib/db/schema";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";

// PDF magic bytes: %PDF
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const POST = withAuth(async (request: NextRequest, admin) => {
  try {
    const formData = await request.formData();
    const restaurantId = formData.get("restaurantId");
    const file = formData.get("file");

    if (!restaurantId || typeof restaurantId !== "string") {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Validate restaurant exists
    const [restaurant] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Read file buffer and validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
      return NextResponse.json(
        { error: "File does not appear to be a valid PDF" },
        { status: 400 }
      );
    }

    // Save PDF to disk
    const fileId = randomUUID();
    const fileName = `${fileId}.pdf`;
    const relativePath = `/uploads/pdfs/${fileName}`;
    const absolutePath = path.join(process.cwd(), "public", relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    // Create ingestion job record
    const [job] = await db
      .insert(ingestionJobs)
      .values({
        restaurantId,
        adminId: admin.id,
        pdfUrl: relativePath,
        status: "pending",
      })
      .returning({ id: ingestionJobs.id });

    // Fire-and-forget pipeline execution
    runIngestionPipeline(job.id).catch((err) => {
      console.error(`Pipeline failed for job ${job.id}:`, err);
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
});
