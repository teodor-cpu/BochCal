
export interface Ingredient {
  name: string;
  weightValue: number; // current grams
  calories: number;    // current calories
  protein: number;     // current protein
  carbs: number;       // current carbs
  fat: number;         // current fat
  // Reference values per 1 gram (calculated once upon AI response)
  refCalories: number;
  refProtein: number;
  refCarbs: number;
  refFat: number;
}

export interface CalorieResult {
  totalCalories: number;
  totalWeight: string;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
  explanation: string;
}

export interface AnalysisState {
  loading: boolean;
  result: CalorieResult | null;
  error: string | null;
}
