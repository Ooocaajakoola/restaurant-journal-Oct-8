/**
 * The data-access contract. Pages and components depend ONLY on these interfaces
 * (via useRepositories()). Implementations live in data/mock (localStorage) and,
 * later, data/supabase. src/data/index.ts is the single place that picks one.
 *
 * Everything is async so a network implementation drops in without changing callers.
 */
import type {
  City,
  EntryStatus,
  EntryView,
  GeoPoint,
  Id,
  IsoDateTime,
  ListView,
  MealType,
  Place,
  PriceLevel,
  Rating,
  Tag,
  User,
  Visibility,
} from '../types';

// ---------- Users ----------

export type UserSettingsPatch = Partial<Pick<User, 'displayName' | 'homeAirport' | 'defaultVisibility'>>;

export interface UserRepository {
  getCurrent(): Promise<User>;
  updateCurrent(patch: UserSettingsPatch): Promise<User>;
}

// ---------- Cities ----------

export interface CityWithStats extends City {
  entryCount: number;
  lastVisitedAt: IsoDateTime | null;
}

export interface CityRepository {
  list(): Promise<City[]>;
  get(id: Id): Promise<City | null>;
  /** Cities that have at least one entry, most recently visited first. */
  listVisited(): Promise<CityWithStats[]>;
}

// ---------- Places ----------

export interface PlaceWithCity extends Place {
  city: City;
}

export interface NearbyPlace extends PlaceWithCity {
  distanceKm: number;
}

export interface PlaceInput {
  name: string;
  cityId: Id;
  lat: number;
  lng: number;
  cuisine?: string;
  address?: string;
  priceLevel?: PriceLevel | null;
}

export interface PlaceRepository {
  get(id: Id): Promise<PlaceWithCity | null>;
  /** Nearest first. */
  listNearby(point: GeoPoint, opts?: { radiusKm?: number; limit?: number }): Promise<NearbyPlace[]>;
  /** Case-insensitive match on place name, cuisine or city. Empty query returns []. */
  search(query: string, opts?: { cityId?: Id; limit?: number }): Promise<PlaceWithCity[]>;
  create(input: PlaceInput): Promise<PlaceWithCity>;
}

// ---------- Entries ----------

export interface DishInput {
  /** Pass the existing id to keep a dish's identity when editing. */
  id?: Id;
  name: string;
  note?: string;
}

export interface PhotoInput {
  id?: Id;
  url: string;
  caption?: string;
}

export interface EntryInput {
  placeId: Id;
  rating: Rating;
  /** Defaults to now. */
  visitedAt?: IsoDateTime;
  wouldReturn?: boolean | null;
  note?: string;
  price?: number | null;
  /** Defaults to the place's city currency. */
  currency?: string;
  /** Defaults to a guess from visitedAt. */
  mealType?: MealType;
  /** Defaults to 'quick' on create. */
  status?: EntryStatus;
  /** Defaults to the user's default visibility. */
  visibility?: Visibility;
  /** Tag names; created on demand. */
  tags?: string[];
  dishes?: DishInput[];
  photos?: PhotoInput[];
}

export interface EntryFilter {
  cityId?: Id;
  placeId?: Id;
  /** Exact cuisine match. */
  cuisine?: string;
  /** Rating >= this. */
  minRating?: Rating;
  priceLevel?: PriceLevel;
  /** Exact tag name. */
  tag?: string;
  status?: EntryStatus;
  /** Free text across place, cuisine, city, airport, dishes, tags and note. */
  text?: string;
  /** Substring match on dish names. */
  dish?: string;
  /** Substring match on city name, country or airport code. */
  city?: string;
  /** Substring match on tag names. */
  tagQuery?: string;
  /** Inclusive, YYYY-MM-DD, compared against the visit date. */
  dateFrom?: string;
  dateTo?: string;
}

export interface EntryRepository {
  /** Newest visit first. */
  list(filter?: EntryFilter): Promise<EntryView[]>;
  get(id: Id): Promise<EntryView | null>;
  create(input: EntryInput): Promise<EntryView>;
  /** Fields left undefined are unchanged. Passing tags/dishes/photos replaces that whole set. */
  update(id: Id, patch: Partial<EntryInput>): Promise<EntryView>;
  delete(id: Id): Promise<void>;
}

// ---------- Tags ----------

export interface TagWithCount extends Tag {
  entryCount: number;
}

export interface TagRepository {
  /** Tags in use by the current user, most used first. */
  list(): Promise<TagWithCount[]>;
}

// ---------- Lists ----------

export interface ListItemInput {
  placeId: Id;
  entryId?: Id | null;
  note?: string;
}

export interface ListInput {
  title: string;
  description?: string;
  cityId?: Id | null;
  visibility?: Visibility;
  /** Turn on the public-by-link view. */
  shareEnabled?: boolean;
  items: ListItemInput[];
}

export interface ListRepository {
  /** Lists owned by the current user, newest first. */
  listMine(): Promise<ListView[]>;
  get(id: Id): Promise<ListView | null>;
  /** Read-only public view; null unless shareEnabled. */
  getShared(id: Id): Promise<ListView | null>;
  create(input: ListInput): Promise<ListView>;
  /** Copies someone's shared list into the current user's lists. */
  saveCopyToMyJournal(id: Id): Promise<ListView>;
  delete(id: Id): Promise<void>;
}

// ---------- Location ----------

export interface CurrentLocation {
  point: GeoPoint;
  /** Human label, e.g. "Soho, London". */
  label: string;
  /** Nearest known city, if any. */
  cityId: Id | null;
}

export interface LocationRepository {
  getCurrentLocation(): Promise<CurrentLocation>;
}

// ---------- Bundle ----------

export interface Repositories {
  /**
   * Resolves when the data layer can serve requests (e.g. a Supabase session exists) and rejects with a
   * readable message if it can't. The app waits on this before rendering. The mock resolves immediately.
   */
  ready(): Promise<void>;
  users: UserRepository;
  cities: CityRepository;
  places: PlaceRepository;
  entries: EntryRepository;
  tags: TagRepository;
  lists: ListRepository;
  location: LocationRepository;
}
