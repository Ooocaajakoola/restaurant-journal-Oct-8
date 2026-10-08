import type { BaseRecord, Id, PriceLevel } from './common';

export interface Place extends BaseRecord {
  name: string;
  cityId: Id;
  address: string;
  lat: number;
  lng: number;
  cuisine: string;
  priceLevel: PriceLevel | null;
}
