import type { City } from './city';
import type { BaseRecord, Id, IsoDateTime, Rating, Visibility } from './common';
import type { Dish } from './dish';
import type { Photo } from './photo';
import type { Place } from './place';
import type { Tag } from './tag';

export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'snack' | 'drinks';

export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'drinks'];

/** quick = logged in a few taps, details may be missing; complete = filled in. */
export type EntryStatus = 'quick' | 'complete';

export interface Entry extends BaseRecord {
  userId: Id;
  placeId: Id;
  visitedAt: IsoDateTime;
  rating: Rating;
  wouldReturn: boolean | null;
  note: string;
  /** Amount in major units (24.5 = 24.50). */
  price: number | null;
  /** ISO 4217 */
  currency: string;
  mealType: MealType;
  status: EntryStatus;
  visibility: Visibility;
  tagIds: Id[];
}

/** An entry with everything the UI needs joined in. Repositories return this. */
export interface EntryView extends Entry {
  place: Place;
  city: City;
  dishes: Dish[];
  photos: Photo[];
  tags: Tag[];
}
