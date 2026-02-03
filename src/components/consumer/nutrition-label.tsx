import { ConsumerItemDetail } from "@/types/consumer";

interface NutritionLabelProps {
  item: ConsumerItemDetail;
}

export function NutritionLabel({ item }: NutritionLabelProps) {
  return (
    <div className="border-2 border-foreground p-4 max-w-sm bg-background font-sans text-foreground shadow-sm">
      <h3 className="text-3xl font-black border-b-[10px] border-foreground pb-1 mb-2 leading-none">
        Nutrition Facts
      </h3>

      {item.servingSize && (
        <div className="flex justify-between border-b border-foreground pb-1 font-bold text-sm">
          <span>Serving Size</span>
          <span>{item.servingSize}</span>
        </div>
      )}

      <div className="flex justify-between items-end border-b-[4px] border-foreground pt-2 pb-1">
        <div>
          <span className="block font-bold text-sm">Amount Per Serving</span>
          <span className="text-2xl font-black">Calories</span>
        </div>
        <span className="text-3xl font-black leading-none">
          {item.calories}
        </span>
      </div>

      <div className="text-xs border-b border-muted-foreground/30 py-1">
        <span className="font-bold">Total Fat</span> {item.totalFatG || 0}g
      </div>
      {(item.saturatedFatG || item.transFatG) && (
        <>
          <div className="text-xs border-b border-muted-foreground/30 py-1 pl-4">
            Saturated Fat {item.saturatedFatG || 0}g
          </div>
          <div className="text-xs border-b border-muted-foreground/30 py-1 pl-4">
            Trans Fat {item.transFatG || 0}g
          </div>
        </>
      )}

      <div className="text-xs border-b border-muted-foreground/30 py-1">
        <span className="font-bold">Cholesterol</span> {item.cholesterolMg || 0}
        mg
      </div>

      <div className="text-xs border-b border-muted-foreground/30 py-1">
        <span className="font-bold">Sodium</span> {item.sodiumMg || 0}mg
      </div>

      <div className="text-xs border-b border-muted-foreground/30 py-1">
        <span className="font-bold">Total Carbohydrate</span>{" "}
        {item.totalCarbsG || 0}g
      </div>

      {(item.dietaryFiberG || item.sugarsG) && (
        <>
          <div className="text-xs border-b border-muted-foreground/30 py-1 pl-4">
            Dietary Fiber {item.dietaryFiberG || 0}g
          </div>
          <div className="text-xs border-b border-muted-foreground/30 py-1 pl-4">
            Sugars {item.sugarsG || 0}g
          </div>
        </>
      )}

      <div className="text-xs border-b-[4px] border-foreground py-1">
        <span className="font-bold">Protein</span> {item.proteinG || 0}g
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground leading-tight">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for
        general nutrition advice.
      </p>
    </div>
  );
}
