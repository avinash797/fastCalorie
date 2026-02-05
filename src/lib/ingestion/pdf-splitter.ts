import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";

export interface PdfPage {
  pageNumber: number;
  pdfBase64: string; // Single-page PDF as base64
}

export async function splitPdfIntoPages(pdfPath: string): Promise<PdfPage[]> {
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();

  const pages: PdfPage[] = [];

  for (let i = 0; i < totalPages; i++) {
    // Create a new document with just this page
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
    singlePageDoc.addPage(copiedPage);

    const singlePageBytes = await singlePageDoc.save();
    const base64 = Buffer.from(singlePageBytes).toString("base64");

    pages.push({
      pageNumber: i + 1,
      pdfBase64: base64,
    });
  }

  return pages;
}
