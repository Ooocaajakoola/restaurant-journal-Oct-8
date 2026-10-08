import type { EntryView, Rating } from '../types';

export interface Pin {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  /** Average rating across visits, rounded: drives the pin colour and number. */
  rating: Rating;
  visits: number;
  /** Newest first. */
  entries: EntryView[];
}

/** One pin per place (several visits to the same place would otherwise stack on top of each other). */
export function buildPins(entries: EntryView[]): Pin[] {
  const byPlace = new Map<string, EntryView[]>();
  for (const e of entries) {
    const list = byPlace.get(e.placeId);
    if (list) list.push(e);
    else byPlace.set(e.placeId, [e]);
  }
  return [...byPlace.values()].map((list) => {
    const sorted = [...list].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    const first = sorted[0]!;
    const avg = sorted.reduce((sum, e) => sum + e.rating, 0) / sorted.length;
    return {
      placeId: first.placeId,
      name: first.place.name,
      lat: first.place.lat,
      lng: first.place.lng,
      rating: Math.min(5, Math.max(1, Math.round(avg))) as Rating,
      visits: sorted.length,
      entries: sorted,
    };
  });
}
