import { normalizeTag } from '../lib/tags';
import type { EntryView } from '../types';
import type { EntryFilter } from './repositories';

const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.trim().toLowerCase());

/**
 * The one definition of what an EntryFilter means. Every repository implementation (mock, Supabase)
 * uses it, so filtering behaves identically whichever back end is plugged in.
 */
export function matchesEntryFilter(e: EntryView, f: EntryFilter): boolean {
  if (f.cityId && e.city.id !== f.cityId) return false;
  if (f.placeId && e.placeId !== f.placeId) return false;
  if (f.cuisine && e.place.cuisine !== f.cuisine) return false;
  if (f.minRating && e.rating < f.minRating) return false;
  if (f.priceLevel && e.place.priceLevel !== f.priceLevel) return false;
  if (f.status && e.status !== f.status) return false;
  if (f.tag && !e.tags.some((t) => t.name === normalizeTag(f.tag!))) return false;
  if (f.tagQuery?.trim() && !e.tags.some((t) => includes(t.name, normalizeTag(f.tagQuery!)))) return false;
  if (f.dish?.trim() && !e.dishes.some((x) => includes(x.name, f.dish!))) return false;
  if (f.city?.trim()) {
    const hay = [e.city.name, e.city.country, ...e.city.airportCodes].join(' ');
    if (!includes(hay, f.city)) return false;
  }
  const day = e.visitedAt.slice(0, 10);
  if (f.dateFrom && day < f.dateFrom) return false;
  if (f.dateTo && day > f.dateTo) return false;
  if (f.text?.trim()) {
    const hay = [
      e.place.name, e.place.cuisine, e.city.name, e.city.country, ...e.city.airportCodes, e.note,
      ...e.dishes.map((x) => x.name), ...e.tags.map((t) => t.name),
    ].join(' ');
    if (!includes(hay, f.text)) return false;
  }
  return true;
}
