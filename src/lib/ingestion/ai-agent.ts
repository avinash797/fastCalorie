import Anthropic from "@anthropic-ai/sdk";
import { AI_SYSTEM_PROMPT } from "./prompts";
import type { PdfDocument } from "./extract";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

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
  restaurantName: string,
): Promise<ExtractedItem[]> {
  // Use streaming to handle long-running requests (>10 minutes)
  // See: https://github.com/anthropics/anthropic-sdk-typescript#long-requests
  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64000,
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

  // Wait for the stream to complete and get the final message
  const response = await stream.finalMessage();

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const fs = await import("fs/promises");
  const path = await import("path");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${timestamp}.txt`;
  const outputDir = path.join(process.cwd(), "public", "response");

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, fileName), text);

  return parseJsonFromResponse(text);
}
