import Anthropic from "@anthropic-ai/sdk";
import { AI_SYSTEM_PROMPT, getPageContinuationPrompt } from "./prompts";
import type { PdfPageImage } from "./extract";

const anthropic = new Anthropic();

export interface ExtractedItem {
  name: string;
  category: string;
  servingSize: string | null;
  calories: number;
  totalFatG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbsG: number | null;
  dietaryFiberG: number | null;
  sugarsG: number | null;
  proteinG: number | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

function parseJsonFromResponse(text: string): ExtractedItem[] {
  // Try to extract JSON array from the response (handle code fences)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain a valid JSON array");
  }

  const items: ExtractedItem[] = JSON.parse(jsonMatch[0]);
  return items;
}

async function extractFromPage(
  pageImage: PdfPageImage,
  restaurantName: string,
  continuationPrompt?: string
): Promise<ExtractedItem[]> {
  const textContent = continuationPrompt
    ? `${continuationPrompt}\n\nRestaurant: ${restaurantName}`
    : `Restaurant: ${restaurantName}\n\nPlease extract all menu items with their nutrition data from this page.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: AI_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: pageImage.mimeType,
              data: pageImage.base64,
            },
          },
          {
            type: "text",
            text: textContent,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return parseJsonFromResponse(text);
}

export async function aiExtractNutritionData(
  pageImages: PdfPageImage[],
  restaurantName: string
): Promise<ExtractedItem[]> {
  if (pageImages.length === 1) {
    return extractFromPage(pageImages[0], restaurantName);
  }

  // Multi-page processing
  const allItems: ExtractedItem[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < pageImages.length; i++) {
    const continuationPrompt =
      i === 0
        ? undefined
        : getPageContinuationPrompt(
            [...new Set(allItems.map((item) => item.category))],
            allItems.length,
            i + 1
          );

    const pageItems = await extractFromPage(
      pageImages[i],
      restaurantName,
      continuationPrompt
    );

    // Deduplicate by name
    for (const item of pageItems) {
      if (!seenNames.has(item.name)) {
        seenNames.add(item.name);
        allItems.push(item);
      }
    }
  }

  return allItems;
}
