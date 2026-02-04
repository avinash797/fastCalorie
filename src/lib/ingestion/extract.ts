import fs from "fs/promises";

export interface PdfDocument {
  base64: string;
  mediaType: "application/pdf";
}

export async function extractPdfAsBase64(pdfPath: string): Promise<PdfDocument> {
  const buffer = await fs.readFile(pdfPath);
  const base64 = buffer.toString("base64");

  return {
    base64,
    mediaType: "application/pdf",
  };
}
