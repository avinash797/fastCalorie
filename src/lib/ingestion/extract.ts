import { pdf } from "pdf-to-img";

export interface PdfPageImage {
  pageNumber: number;
  base64: string;
  mimeType: "image/png";
}

export async function extractImagesFromPdf(pdfPath: string): Promise<PdfPageImage[]> {
  const pages: PdfPageImage[] = [];

  // pdf-to-img returns an async generator of Uint8Array buffers
  const document = await pdf(pdfPath, { scale: 2.0 }); // Scale 2.0 for better quality

  let pageNumber = 1;
  for await (const imageBuffer of document) {
    const base64 = Buffer.from(imageBuffer).toString("base64");
    pages.push({
      pageNumber,
      base64,
      mimeType: "image/png",
    });
    pageNumber++;
  }

  if (pages.length === 0) {
    throw new Error("PDF contains no pages or could not be converted to images");
  }

  return pages;
}
