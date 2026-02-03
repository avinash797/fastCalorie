import { z } from "zod/v4";

const nutritionalField = z.number().min(0).max(99999).optional();

export const createMenuItemSchema = z.object({
  restaurantId: z.uuid(),
  name: z.string().min(1).max(500),
  category: z.string().min(1).max(255),
  servingSize: z.string().max(255).optional(),
  calories: z.int().min(0).max(10000),
  totalFatG: nutritionalField,
  saturatedFatG: nutritionalField,
  transFatG: nutritionalField,
  cholesterolMg: nutritionalField,
  sodiumMg: nutritionalField,
  totalCarbsG: nutritionalField,
  dietaryFiberG: nutritionalField,
  sugarsG: nutritionalField,
  proteinG: nutritionalField,
  isAvailable: z.boolean().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().omit({
  restaurantId: true,
});
