import Anthropic from "@anthropic-ai/sdk";
import { AI_SYSTEM_PROMPT } from "./prompts";
import type { PdfDocument } from "./extract";

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

export async function aiExtractNutritionData(
  pdfDocument: PdfDocument,
  restaurantName: string
): Promise<ExtractedItem[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: AI_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: pdfDocument.mediaType,
              data: pdfDocument.base64,
            },
          },
          {
            type: "text",
            text: `Restaurant: ${restaurantName}\n\nPlease extract all menu items with their nutrition data from this PDF document. Process ALL pages and extract EVERY menu item you can find.`,
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
