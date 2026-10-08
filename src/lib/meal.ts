import type { MealType } from '../types';

/** Best guess at the meal from the local hour, so the user doesn't have to pick one. */
export function guessMealType(date: Date): MealType {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 12) return 'brunch';
  if (h >= 12 && h < 16) return 'lunch';
  if (h >= 16 && h < 18) return 'snack';
  if (h >= 18 && h < 23) return 'dinner';
  return 'drinks';
}
