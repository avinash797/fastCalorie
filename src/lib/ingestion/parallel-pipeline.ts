import pLimit from "p-limit";
import { splitPdfIntoPages } from "./pdf-splitter";
import { processPage, type PageResult } from "./page-processor";
import type { ExtractedItem } from "./ai-agent";

const CONCURRENCY_LIMIT = 5; // Process up to 5 pages simultaneously

export interface PipelineProgress {
  totalPages: number;
  completedPages: number;
  currentPage: number;
  status: "splitting" | "processing" | "merging" | "validating" | "complete";
}

export async function runPageByPagePipeline(
  pdfPath: string,
  restaurantName: string,
  onProgress?: (progress: PipelineProgress) => void | Promise<void>
): Promise<{ items: ExtractedItem[]; failedPages: number[] }> {
  // Stage 1: Split PDF into individual pages
  onProgress?.({
    totalPages: 0,
    completedPages: 0,
    currentPage: 0,
    status: "splitting",
  });
  const pages = await splitPdfIntoPages(pdfPath);
  const totalPages = pages.length;

  // Stage 2: Process pages in parallel with concurrency limit
  const limit = pLimit(CONCURRENCY_LIMIT);
  const discoveredCategories: string[] = [];
  let completedPages = 0;

  const pagePromises = pages.map((page) =>
    limit(async (): Promise<PageResult> => {
      await onProgress?.({
        totalPages,
        completedPages,
        currentPage: page.pageNumber,
        status: "processing",
      });

      const result = await processPage(
        page.pdfBase64,
        page.pageNumber,
        restaurantName,
        [...discoveredCategories] // Pass a snapshot to avoid race conditions
      );

      // Track discovered categories for subsequent pages
      for (const item of result.items) {
        if (item.category && !discoveredCategories.includes(item.category)) {
          discoveredCategories.push(item.category);
        }
      }

      completedPages++;
      return result;
    })
  );

  const pageResults = await Promise.all(pagePromises);

  // Stage 3: Merge results and deduplicate
  await onProgress?.({
    totalPages,
    completedPages: totalPages,
    currentPage: 0,
    status: "merging",
  });

  const allItems: ExtractedItem[] = [];
  const seenNames = new Set<string>();
  const failedPages: number[] = [];

  for (const result of pageResults) {
    if (result.error) {
      failedPages.push(result.pageNumber);
      continue;
    }

    for (const item of result.items) {
      // Deduplicate by name (case-insensitive)
      const normalizedName = item.name.toLowerCase().trim();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        allItems.push(item);
      }
    }
  }

  if (failedPages.length > 0) {
    console.warn(
      `[Page-by-page pipeline] Failed to process pages: ${failedPages.join(", ")}`
    );
  }

  return { items: allItems, failedPages };
}
