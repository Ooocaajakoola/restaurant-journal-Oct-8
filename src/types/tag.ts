import type { BaseRecord } from './common';

/** Normalised: lowercase, hyphenated, no leading '#'. */
export interface Tag extends BaseRecord {
  name: string;
}
