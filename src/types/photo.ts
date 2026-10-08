import type { BaseRecord, Id } from './common';

export interface Photo extends BaseRecord {
  entryId: Id;
  /** Mock: a (downsized) data URL. Supabase: a Storage URL. */
  url: string;
  caption: string;
}
