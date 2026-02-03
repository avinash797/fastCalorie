import fs from "fs/promises";

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const buffer = await fs.readFile(pdfPath);

  // Dynamic import to avoid build-time DOMMatrix errors
  // pdf-parse v2+ uses pdfjs-dist which requires DOM polyfills
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();

  const text = result.text;

  if (!text || text.trim().length < 100) {
    throw new Error(
      "PDF appears to be scanned/image-based. Text-based PDFs are required for MVP. OCR support coming in Phase 2."
    );
  }

  return text;
}
