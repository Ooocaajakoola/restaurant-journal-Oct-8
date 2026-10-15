import { distanceKm } from '../../lib/geo';
import type { City, GeoPoint } from '../../types';
import type { CurrentLocation, LocationRepository } from '../repositories';
import { unwrap, type SupabaseContext } from './context';
import { toCity, type CityRow, type PlaceRow } from './rows';

/** Further than this from every catalogue city and we can't tell which city you're in. */
const MAX_CITY_DISTANCE_KM = 150;

function browserPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return reject(new Error('Geolocation is not available'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60_000 },
    );
  });
}

export function createLocationRepository(ctx: SupabaseContext): LocationRepository {
  const { client } = ctx;

  async function allCities(): Promise<City[]> {
    return (unwrap(await client.from('cities').select('*')) as CityRow[]).map(toCity);
  }

  /** Where you last logged a meal: the best guess when the browser won't tell us where you are. */
  async function lastLoggedPlace(): Promise<{ place: PlaceRow; city: CityRow } | null> {
    const uid = await ctx.session.ready();
    const rows = unwrap(
      await client
        .from('entries')
        .select('place:places(*, city:cities(*))')
        .eq('user_id', uid)
        .order('visited_at', { ascending: false })
        .limit(1),
    ) as unknown as Array<{ place: (PlaceRow & { city: CityRow }) | null }>;
    const place = rows[0]?.place;
    return place ? { place, city: place.city } : null;
  }

  return {
    async getCurrentLocation(): Promise<CurrentLocation> {
      const cities = await allCities();
      if (cities.length === 0) throw new Error('No cities are set up yet.');

      try {
        const point = await browserPosition();
        const nearest = cities
          .map((city) => ({ city, km: distanceKm(point, city) }))
          .sort((a, b) => a.km - b.km)[0]!;
        const known = nearest.km <= MAX_CITY_DISTANCE_KM;
        return { point, label: known ? nearest.city.name : 'your location', cityId: known ? nearest.city.id : null };
      } catch {
        const last = await lastLoggedPlace();
        const city = last ? toCity(last.city) : cities[0]!;
        const point = last ? { lat: last.place.lat, lng: last.place.lng } : { lat: city.lat, lng: city.lng };
        return { point, label: `${city.name} (location unavailable)`, cityId: city.id };
      }
    },
  };
}
