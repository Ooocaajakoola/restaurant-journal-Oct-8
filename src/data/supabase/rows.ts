/**
 * Database row shapes (snake_case, as stored in Postgres) and the mappers that turn them into the
 * app's domain types (camelCase, src/types). Nothing outside src/data/supabase sees these.
 */
import type { City, Dish, EntryView, ListItemView, ListView, Photo, Place, Rating, Tag, User, Visibility } from '../../types';
import type { EntryStatus, MealType } from '../../types';
import type { PriceLevel } from '../../types';

interface Stamped {
  created_at: string;
  updated_at: string;
}

export interface ProfileRow extends Stamped {
  id: string;
  display_name: string;
  home_airport: string | null;
  default_visibility: string;
}

export interface CityRow extends Stamped {
  id: string;
  name: string;
  country: string;
  country_code: string;
  airport_codes: string[];
  lat: number;
  lng: number;
  currency_code: string;
}

export interface PlaceRow extends Stamped {
  id: string;
  city_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisine: string;
  price_level: number | null;
}

export interface PlaceWithCityRow extends PlaceRow {
  city: CityRow;
}

export interface EntryRow extends Stamped {
  id: string;
  user_id: string;
  place_id: string;
  visited_at: string;
  rating: number;
  would_return: boolean | null;
  note: string;
  price: number | string | null;
  currency: string;
  meal_type: string;
  status: string;
  visibility: string;
}

export interface DishRow extends Stamped {
  id: string;
  entry_id: string;
  name: string;
  note: string;
  position: number;
}

export interface PhotoRow extends Stamped {
  id: string;
  entry_id: string;
  url: string;
  storage_path: string | null;
  caption: string;
  position: number;
}

export interface TagRow extends Stamped {
  id: string;
  user_id: string;
  name: string;
}

export interface EntryJoinRow extends EntryRow {
  place: PlaceWithCityRow;
  dishes: DishRow[];
  photos: PhotoRow[];
  entry_tags: Array<{ tag: TagRow }>;
}

export interface ListRow extends Stamped {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  city_id: string | null;
  visibility: string;
  share_enabled: boolean;
  source_list_id: string | null;
}

export interface ListItemRow extends Stamped {
  id: string;
  list_id: string;
  place_id: string;
  entry_id: string | null;
  position: number;
  note: string;
  rating: number | null;
}

export interface ListJoinRow extends ListRow {
  items: Array<ListItemRow & { place: PlaceWithCityRow }>;
}

const base = (r: Stamped & { id: string }) => ({ id: r.id, createdAt: r.created_at, updatedAt: r.updated_at });

export function toUser(r: ProfileRow): User {
  return {
    ...base(r),
    displayName: r.display_name,
    homeAirport: r.home_airport,
    defaultVisibility: r.default_visibility as Visibility,
  };
}

export function toCity(r: CityRow): City {
  return {
    ...base(r),
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    airportCodes: r.airport_codes,
    lat: r.lat,
    lng: r.lng,
    currencyCode: r.currency_code,
  };
}

export function toPlace(r: PlaceRow): Place {
  return {
    ...base(r),
    name: r.name,
    cityId: r.city_id,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    cuisine: r.cuisine,
    priceLevel: r.price_level as PriceLevel | null,
  };
}

export function toDish(r: DishRow): Dish {
  return { ...base(r), entryId: r.entry_id, name: r.name, note: r.note };
}

export function toPhoto(r: PhotoRow): Photo {
  return { ...base(r), entryId: r.entry_id, url: r.url, caption: r.caption };
}

export function toTag(r: TagRow): Tag {
  return { ...base(r), name: r.name };
}

const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at);

export function toEntryView(r: EntryJoinRow): EntryView {
  const tags = r.entry_tags.map((et) => toTag(et.tag));
  return {
    ...base(r),
    userId: r.user_id,
    placeId: r.place_id,
    visitedAt: r.visited_at,
    rating: r.rating as Rating,
    wouldReturn: r.would_return,
    note: r.note,
    price: r.price === null ? null : Number(r.price),
    currency: r.currency,
    mealType: r.meal_type as MealType,
    status: r.status as EntryStatus,
    visibility: r.visibility as Visibility,
    tagIds: tags.map((t) => t.id),
    place: toPlace(r.place),
    city: toCity(r.place.city),
    dishes: [...r.dishes].sort(byPosition).map(toDish),
    photos: [...r.photos].sort(byPosition).map(toPhoto),
    tags,
  };
}

export function toListView(r: ListJoinRow): ListView {
  const items: ListItemView[] = [...r.items].sort(byPosition).map((i) => ({
    ...base(i),
    listId: i.list_id,
    placeId: i.place_id,
    entryId: i.entry_id,
    position: i.position,
    note: i.note,
    place: toPlace(i.place),
    city: toCity(i.place.city),
    rating: i.rating as Rating | null,
  }));
  return {
    ...base(r),
    ownerId: r.owner_id,
    title: r.title,
    description: r.description,
    cityId: r.city_id,
    visibility: r.visibility as Visibility,
    shareEnabled: r.share_enabled,
    sourceListId: r.source_list_id,
    owner: { id: r.owner_id, displayName: r.owner_name || 'Someone' },
    items,
  };
}
