import type { Rating } from '../types';

/** Rating -> pin/badge colour (red to green). Always paired with the number, never colour alone. */
export const RATING_COLORS: Record<Rating, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

/** Text colour that stays readable on each rating colour. */
export const RATING_TEXT: Record<Rating, string> = {
  1: '#ffffff',
  2: '#1a0f00',
  3: '#1a1400',
  4: '#0f1a00',
  5: '#04200d',
};
