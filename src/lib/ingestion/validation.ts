import type { ExtractedItem } from "./ai-agent";

export interface ValidationCheck {
  name: string;
  status: "pass" | "warning" | "error";
  message: string;
}

export interface ValidationResult {
  itemIndex: number;
  itemName: string;
  status: "pass" | "warning" | "error";
  checks: ValidationCheck[];
}

function worstStatus(
  a: "pass" | "warning" | "error",
  b: "pass" | "warning" | "error"
): "pass" | "warning" | "error" {
  const severity = { pass: 0, warning: 1, error: 2 };
  return severity[a] >= severity[b] ? a : b;
}

function checkRequiredFields(item: ExtractedItem): ValidationCheck {
  const missing: string[] = [];
  if (!item.name) missing.push("name");
  if (item.calories == null) missing.push("calories");
  if (item.proteinG == null) missing.push("proteinG");
  if (item.totalCarbsG == null) missing.push("totalCarbsG");
  if (item.totalFatG == null) missing.push("totalFatG");

  if (missing.length > 0) {
    return {
      name: "required_fields",
      status: "error",
      message: `Missing required fields: ${missing.join(", ")}`,
    };
  }
  return { name: "required_fields", status: "pass", message: "All required fields present" };
}

function checkCalorieRange(item: ExtractedItem): ValidationCheck {
  if (item.calories == null) {
    return { name: "calorie_range", status: "error", message: "Calories is missing" };
  }
  if (item.calories < 1 || item.calories > 5000) {
    return {
      name: "calorie_range",
      status: "error",
      message: `Calories ${item.calories} is outside valid range (1-5000)`,
    };
  }
  return { name: "calorie_range", status: "pass", message: "Calories within valid range" };
}

function checkMacroMath(item: ExtractedItem): ValidationCheck {
  if (
    item.calories == null ||
    item.proteinG == null ||
    item.totalCarbsG == null ||
    item.totalFatG == null
  ) {
    return { name: "macro_math", status: "pass", message: "Skipped (missing macro values)" };
  }

  const calculated = item.proteinG * 4 + item.totalCarbsG * 4 + item.totalFatG * 9;
  const ratio = Math.abs(calculated - item.calories) / item.calories;

  if (ratio > 0.2) {
    return {
      name: "macro_math",
      status: "warning",
      message: `Macro-calculated calories (${Math.round(calculated)}) differs from stated (${item.calories}) by ${Math.round(ratio * 100)}%`,
    };
  }
  return { name: "macro_math", status: "pass", message: "Macro math within 20% tolerance" };
}

function checkServingSizePresent(item: ExtractedItem): ValidationCheck {
  if (!item.servingSize || item.servingSize.trim() === "") {
    return {
      name: "serving_size_present",
      status: "warning",
      message: "Serving size is missing",
    };
  }
  return { name: "serving_size_present", status: "pass", message: "Serving size present" };
}

function checkCategoryAssigned(item: ExtractedItem): ValidationCheck {
  if (!item.category || item.category.trim() === "") {
    return {
      name: "category_assigned",
      status: "error",
      message: "Category is missing",
    };
  }
  return { name: "category_assigned", status: "pass", message: "Category assigned" };
}

function checkNegativeValues(item: ExtractedItem): ValidationCheck {
  const fields: { name: string; value: number | null }[] = [
    { name: "calories", value: item.calories },
    { name: "totalFatG", value: item.totalFatG },
    { name: "saturatedFatG", value: item.saturatedFatG },
    { name: "transFatG", value: item.transFatG },
    { name: "cholesterolMg", value: item.cholesterolMg },
    { name: "sodiumMg", value: item.sodiumMg },
    { name: "totalCarbsG", value: item.totalCarbsG },
    { name: "dietaryFiberG", value: item.dietaryFiberG },
    { name: "sugarsG", value: item.sugarsG },
    { name: "proteinG", value: item.proteinG },
  ];

  const negative = fields.filter((f) => f.value != null && f.value < 0);
  if (negative.length > 0) {
    return {
      name: "negative_values",
      status: "error",
      message: `Negative values found: ${negative.map((f) => f.name).join(", ")}`,
    };
  }
  return { name: "negative_values", status: "pass", message: "No negative values" };
}

function checkSodiumRange(item: ExtractedItem): ValidationCheck {
  if (item.sodiumMg != null && item.sodiumMg > 10000) {
    return {
      name: "sodium_range",
      status: "warning",
      message: `Sodium ${item.sodiumMg}mg exceeds 10000mg — likely an error`,
    };
  }
  return { name: "sodium_range", status: "pass", message: "Sodium within expected range" };
}

function checkConfidence(item: ExtractedItem): ValidationCheck {
  if (item.confidence === "low") {
    return {
      name: "confidence_check",
      status: "warning",
      message: `AI confidence is low${item.notes ? `: ${item.notes}` : ""}`,
    };
  }
  return { name: "confidence_check", status: "pass", message: "AI confidence acceptable" };
}

function validateItem(
  item: ExtractedItem,
  index: number,
  duplicateNames: Set<string>
): ValidationResult {
  const checks: ValidationCheck[] = [
    checkRequiredFields(item),
    checkCalorieRange(item),
    checkMacroMath(item),
    // Duplicate name check
    duplicateNames.has(item.name)
      ? {
          name: "duplicate_name",
          status: "warning" as const,
          message: `Duplicate item name: "${item.name}"`,
        }
      : {
          name: "duplicate_name",
          status: "pass" as const,
          message: "No duplicate names",
        },
    checkServingSizePresent(item),
    checkCategoryAssigned(item),
    checkNegativeValues(item),
    checkSodiumRange(item),
    checkConfidence(item),
  ];

  const overallStatus = checks.reduce<"pass" | "warning" | "error">(
    (worst, check) => worstStatus(worst, check.status),
    "pass"
  );

  return {
    itemIndex: index,
    itemName: item.name,
    status: overallStatus,
    checks,
  };
}

export function runValidation(items: ExtractedItem[]): ValidationResult[] {
  // Build duplicate name set
  const nameCounts = new Map<string, number>();
  for (const item of items) {
    nameCounts.set(item.name, (nameCounts.get(item.name) ?? 0) + 1);
  }
  const duplicateNames = new Set(
    [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
  );

  return items.map((item, index) => validateItem(item, index, duplicateNames));
}

export function validateSingleItem(
  item: ExtractedItem,
  index: number,
  allItems: ExtractedItem[]
): ValidationResult {
  const nameCounts = new Map<string, number>();
  for (const i of allItems) {
    nameCounts.set(i.name, (nameCounts.get(i.name) ?? 0) + 1);
  }
  const duplicateNames = new Set(
    [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
  );

  return validateItem(item, index, duplicateNames);
}
