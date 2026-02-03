import { z } from "zod/v4";

export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  logoUrl: z.url().max(512).optional(),
  websiteUrl: z.url().max(512).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();
