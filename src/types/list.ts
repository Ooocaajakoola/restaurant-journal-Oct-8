import type { City } from './city';
import type { BaseRecord, Id, Rating, Visibility } from './common';
import type { Place } from './place';
import type { User } from './user';

export interface List extends BaseRecord {
  ownerId: Id;
  title: string;
  description: string;
  cityId: Id | null;
  visibility: Visibility;
  /** When true, anyone with the link can view it read-only. */
  shareEnabled: boolean;
  /** Set when this list was saved from someone else's shared list. */
  sourceListId: Id | null;
}

export interface ListItem extends BaseRecord {
  listId: Id;
  placeId: Id;
  entryId: Id | null;
  position: number;
  note: string;
}

export interface ListItemView extends ListItem {
  place: Place;
  city: City;
  /** Rating from the linked entry, if any. */
  rating: Rating | null;
}

export interface ListView extends List {
  owner: Pick<User, 'id' | 'displayName'>;
  items: ListItemView[];
}
