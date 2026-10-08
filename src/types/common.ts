/** Client-generated id (crypto.randomUUID in production, slugs in seed data). */
export type Id = string;

/** ISO-8601 date-time string, e.g. 2026-10-08T19:30:00.000Z */
export type IsoDateTime = string;

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Visibility = 'private' | 'friends' | 'crew';

export const VISIBILITIES: readonly Visibility[] = ['private', 'friends', 'crew'];

export type PriceLevel = 1 | 2 | 3 | 4;

/**
 * Every persisted record has a client-generated id and createdAt/updatedAt,
 * so offline sync (last-write-wins by updatedAt) can be added later.
 */
export interface BaseRecord {
  id: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}
