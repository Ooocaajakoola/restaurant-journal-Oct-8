import type { BaseRecord } from './common';

export interface City extends BaseRecord {
  name: string;
  country: string;
  countryCode: string;
  /** IATA codes, e.g. ['LHR', 'LGW'] */
  airportCodes: string[];
  lat: number;
  lng: number;
  /** ISO 4217, used as the default currency when logging here. */
  currencyCode: string;
}
