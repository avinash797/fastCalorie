import Anthropic from "@anthropic-ai/sdk";
import { AI_SYSTEM_PROMPT, getChunkContinuationPrompt } from "./prompts";

const anthropic = new Anthropic();

const CHUNK_THRESHOLD = 100_000;
const CHUNK_SIZE = 80_000;

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

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_THRESHOLD) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }

    // Find a double-newline boundary near the chunk size
    let splitPoint = remaining.lastIndexOf("\n\n", CHUNK_SIZE);
    if (splitPoint === -1 || splitPoint < CHUNK_SIZE * 0.5) {
      // Fall back to single newline
      splitPoint = remaining.lastIndexOf("\n", CHUNK_SIZE);
    }
    if (splitPoint === -1 || splitPoint < CHUNK_SIZE * 0.5) {
      // Hard split as last resort
      splitPoint = CHUNK_SIZE;
    }

    chunks.push(remaining.slice(0, splitPoint));
    remaining = remaining.slice(splitPoint).trimStart();
  }

  return chunks;
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

async function extractChunk(
  chunk: string,
  restaurantName: string,
  continuationPrompt?: string
): Promise<ExtractedItem[]> {
  const userContent = continuationPrompt
    ? `${continuationPrompt}\n\nRestaurant: ${restaurantName}\n\nNutrition guide text:\n\n${chunk}`
    : `Restaurant: ${restaurantName}\n\nNutrition guide text:\n\n${chunk}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: AI_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userContent,
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
  rawText: string,
  restaurantName: string
): Promise<ExtractedItem[]> {
  const chunks = splitIntoChunks(rawText);

  if (chunks.length === 1) {
    return extractChunk(chunks[0], restaurantName);
  }

  // Multi-chunk processing
  let allItems: ExtractedItem[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < chunks.length; i++) {
    const continuationPrompt =
      i === 0
        ? undefined
        : getChunkContinuationPrompt(
            [...new Set(allItems.map((item) => item.category))],
            allItems.length
          );

    const chunkItems = await extractChunk(
      chunks[i],
      restaurantName,
      continuationPrompt
    );

    // Deduplicate by name
    for (const item of chunkItems) {
      if (!seenNames.has(item.name)) {
        seenNames.add(item.name);
        allItems.push(item);
      }
    }
  }

  return allItems;
}
