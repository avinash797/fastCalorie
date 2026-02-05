import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedItem } from "./ai-agent";
import { AI_PAGE_EXTRACTION_PROMPT } from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface PageResult {
  pageNumber: number;
  items: ExtractedItem[];
  error?: string;
}

export async function processPage(
  pageBase64: string,
  pageNumber: number,
  restaurantName: string,
  existingCategories: string[] = []
): Promise<PageResult> {
  try {
    const prompt = AI_PAGE_EXTRACTION_PROMPT
      .replace("{{RESTAURANT_NAME}}", restaurantName)
      .replace(
        "{{EXISTING_CATEGORIES}}",
        existingCategories.length > 0 ? existingCategories.join(", ") : "None yet"
      );

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const response = await stream.finalMessage();

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Page might have no nutrition data (cover page, legal text, etc.)
      return { pageNumber, items: [] };
    }

    const items: ExtractedItem[] = JSON.parse(jsonMatch[0]);
    return { pageNumber, items };
  } catch (error) {
    return {
      pageNumber,
      items: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
