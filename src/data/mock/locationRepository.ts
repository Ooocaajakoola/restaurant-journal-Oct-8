import type { LocationRepository } from '../repositories';
import { MOCK_LOCATION } from './seed';

/** Pretends the user is standing in Soho, London. A real impl would use navigator.geolocation. */
export function createLocationRepository(): LocationRepository {
  return {
    async getCurrentLocation() {
      const { lat, lng, label, cityId } = MOCK_LOCATION;
      return { point: { lat, lng }, label, cityId };
    },
  };
}
