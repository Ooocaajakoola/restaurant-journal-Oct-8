import type { BaseRecord, Id } from './common';

export interface Dish extends BaseRecord {
  entryId: Id;
  name: string;
  note: string;
}
