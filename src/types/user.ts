import type { BaseRecord, Visibility } from './common';

export interface User extends BaseRecord {
  displayName: string;
  homeAirport: string | null;
  defaultVisibility: Visibility;
}
