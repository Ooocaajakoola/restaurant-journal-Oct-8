import type { Entry, EntryView } from '../types';

type DetailFields = Pick<EntryView, 'dishes' | 'note' | 'price'>;

/** True when the entry has any detail beyond the place and rating. */
export function hasDetails(e: DetailFields): boolean {
  return e.dishes.length > 0 || e.note.trim().length > 0 || e.price !== null;
}

/** Drives the "to finish" badge. */
export function needsFinishing(e: Pick<Entry, 'status'> & DetailFields): boolean {
  return e.status === 'quick' && !hasDetails(e);
}
