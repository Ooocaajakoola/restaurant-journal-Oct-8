import type { GeoPoint } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Rough lat/lng box around a point, used to narrow a database query before the exact distance check. */
export function boundingBox(point: GeoPoint, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.01, Math.cos((point.lat * Math.PI) / 180)));
  const lngMin = point.lng - dLng;
  const lngMax = point.lng + dLng;
  return {
    latMin: point.lat - dLat,
    latMax: point.lat + dLat,
    // Near the date line the box wraps; skip the longitude limit and let the exact distance decide.
    lngMin: lngMin < -180 || lngMax > 180 ? null : lngMin,
    lngMax: lngMin < -180 || lngMax > 180 ? null : lngMax,
  };
}
