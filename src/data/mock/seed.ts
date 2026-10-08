import { normalizeTag } from '../../lib/tags';
import { guessMealType } from '../../lib/meal';
import type {
  City,
  Dish,
  Entry,
  EntryStatus,
  List,
  ListItem,
  MealType,
  Photo,
  Place,
  PriceLevel,
  Rating,
  Tag,
  User,
  Visibility,
} from '../../types';
import type { MockData } from './db';
import { DB_VERSION } from './db';

export const ME = 'user-me';
export const ANA = 'user-ana';

/** Where the mocked "current location" is: Soho, London. */
export const MOCK_LOCATION = { lat: 51.5136, lng: -0.1365, label: 'Soho, London', cityId: 'city-london' };

const DAY = 86_400_000;

/** Tiny inline SVG "photo" so the sample data needs no image assets or network. */
function foodPhoto(emoji: string, hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},60%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},65%,22%)"/>` +
    `</linearGradient></defs><rect width="800" height="600" fill="url(#g)"/>` +
    `<text x="400" y="360" font-size="220" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type CitySeed = [slug: string, name: string, country: string, cc: string, airports: string[], lat: number, lng: number, currency: string];

const CITIES: CitySeed[] = [
  ['london', 'London', 'United Kingdom', 'GB', ['LHR', 'LGW', 'LCY', 'STN'], 51.5074, -0.1278, 'GBP'],
  ['new-york', 'New York', 'United States', 'US', ['JFK', 'LGA', 'EWR'], 40.7128, -74.006, 'USD'],
  ['tokyo', 'Tokyo', 'Japan', 'JP', ['HND', 'NRT'], 35.6762, 139.6503, 'JPY'],
  ['dubai', 'Dubai', 'United Arab Emirates', 'AE', ['DXB', 'DWC'], 25.2048, 55.2708, 'AED'],
  ['singapore', 'Singapore', 'Singapore', 'SG', ['SIN'], 1.3521, 103.8198, 'SGD'],
  ['paris', 'Paris', 'France', 'FR', ['CDG', 'ORY'], 48.8566, 2.3522, 'EUR'],
  ['frankfurt', 'Frankfurt', 'Germany', 'DE', ['FRA'], 50.1109, 8.6821, 'EUR'],
  ['sydney', 'Sydney', 'Australia', 'AU', ['SYD'], -33.8688, 151.2093, 'AUD'],
  ['lisbon', 'Lisbon', 'Portugal', 'PT', ['LIS'], 38.7223, -9.1393, 'EUR'],
  ['los-angeles', 'Los Angeles', 'United States', 'US', ['LAX'], 34.0522, -118.2437, 'USD'],
];

type PlaceSeed = [slug: string, name: string, city: string, cuisine: string, price: PriceLevel, lat: number, lng: number, address: string];

const PLACES: PlaceSeed[] = [
  ['lon-copper-pot', 'The Copper Pot', 'london', 'British', 3, 51.5142, -0.134, '12 Greek St, Soho'],
  ['lon-sunrise', 'Sunrise Café', 'london', 'Café', 1, 51.5128, -0.1389, '3 Berwick St, Soho'],
  ['lon-bao-alley', 'Bao Alley', 'london', 'Taiwanese', 2, 51.5131, -0.1355, '8 Lexington St, Soho'],
  ['lon-tandoor-lane', 'Tandoor Lane', 'london', 'Indian', 2, 51.516, -0.1301, '41 Charing Cross Rd'],
  ['lon-hangar', 'Hangar Bar & Grill', 'london', 'Steakhouse', 3, 51.47, -0.4543, 'Terminal 5 Approach, Heathrow'],
  ['nyc-marlowes', "Marlowe's Diner", 'new-york', 'American', 1, 40.758, -73.9855, '220 W 44th St'],
  ['nyc-little-naples', 'Little Naples Slice', 'new-york', 'Pizza', 1, 40.7306, -73.9866, '95 E 10th St'],
  ['nyc-hudson-oyster', 'Hudson Oyster House', 'new-york', 'Seafood', 3, 40.7061, -74.0087, '18 Stone St'],
  ['tyo-daiwaya', 'Sushi Daiwa-ya', 'tokyo', 'Sushi', 4, 35.6654, 139.7707, '5-2 Toyosu, Koto City'],
  ['tyo-kazan', 'Ramen Kazan', 'tokyo', 'Ramen', 1, 35.6938, 139.7034, '1-14 Nishishinjuku'],
  ['tyo-torii', 'Izakaya Torii', 'tokyo', 'Izakaya', 2, 35.6595, 139.7005, '2-21 Dogenzaka, Shibuya'],
  ['dxb-al-bahar', 'Al Bahar Grill', 'dubai', 'Middle Eastern', 3, 25.2285, 55.2808, 'Creek Road, Deira'],
  ['dxb-spice-souk', 'Spice Souk Kitchen', 'dubai', 'Indian', 2, 25.2697, 55.2962, 'Al Ras, Deira'],
  ['sin-lau-pa-sat', 'Lau Pa Hawker Stall 14', 'singapore', 'Hawker', 1, 1.2806, 103.8504, '18 Raffles Quay'],
  ['sin-chilli-crab', 'Chilli Crab House', 'singapore', 'Seafood', 3, 1.2915, 103.859, '1 Esplanade Dr'],
  ['sin-kopi-kaya', 'Kopi & Kaya', 'singapore', 'Café', 1, 1.283, 103.846, '7 Tanjong Pagar Rd'],
  ['par-petit-comptoir', 'Le Petit Comptoir', 'paris', 'French', 3, 48.8606, 2.3376, '14 Rue de Rivoli'],
  ['par-margaux', 'Boulangerie Margaux', 'paris', 'Bakery', 1, 48.853, 2.3499, '27 Rue Saint-Jacques'],
  ['par-chez-amina', 'Chez Amina', 'paris', 'Moroccan', 2, 48.8651, 2.3631, '5 Rue Oberkampf'],
  ['fra-apfelwein', 'Apfelwein Haus', 'frankfurt', 'German', 2, 50.1067, 8.6805, 'Sachsenhausen, Schweizer Str. 11'],
  ['fra-currywurst', 'Terminal Currywurst', 'frankfurt', 'Street food', 1, 50.0379, 8.5622, 'Terminal 1, Level 2'],
  ['syd-harbour-fish', 'Harbour Fish Shack', 'sydney', 'Seafood', 2, -33.8587, 151.214, '2 Circular Quay W'],
  ['syd-flat-white', 'Flat White Society', 'sydney', 'Café', 1, -33.88, 151.215, '44 Crown St, Surry Hills'],
  ['lis-pasteis', 'Pastéis do Largo', 'lisbon', 'Bakery', 1, 38.71, -9.137, 'Largo do Chiado 8'],
  ['lis-marinheiro', 'Tasca do Marinheiro', 'lisbon', 'Portuguese', 2, 38.7139, -9.1334, 'Rua da Madalena 91'],
  ['lax-el-vuelo', 'Taqueria El Vuelo', 'los-angeles', 'Mexican', 1, 33.95, -118.39, 'Sepulveda Blvd, near LAX'],
  ['lax-venice-poke', 'Venice Poke Co.', 'los-angeles', 'Hawaiian', 2, 33.985, -118.4695, '1305 Abbot Kinney Blvd'],
];

interface EntrySeed {
  place: string;
  daysAgo: number;
  hour: number;
  rating: Rating;
  again?: boolean | null;
  meal?: MealType;
  price?: number;
  note?: string;
  dishes?: string[];
  tags?: string[];
  photo?: [emoji: string, hue: number];
  vis?: Visibility;
  quick?: boolean;
}

const q = (place: string, daysAgo: number, hour: number, rating: Rating, extra: Partial<EntrySeed> = {}): EntrySeed => ({
  place,
  daysAgo,
  hour,
  rating,
  quick: true,
  ...extra,
});

const ENTRIES: EntrySeed[] = [
  // London
  { place: 'lon-copper-pot', daysAgo: 3, hour: 20, rating: 5, again: true, price: 62, note: 'Sunday roast on a Wednesday. The crew ate here after the late arrival, and the gravy is unreal.', dishes: ['Roast sirloin', 'Yorkshire pudding', 'Sticky toffee pudding'], tags: ['crew-favourite', 'worth-the-trip'], photo: ['🥩', 12], vis: 'crew' },
  { place: 'lon-sunrise', daysAgo: 3, hour: 8, rating: 4, again: true, price: 9.5, note: 'Flat white and a bacon roll before the airport run.', dishes: ['Bacon roll'], tags: ['breakfast', 'quick-bite', 'coffee'], photo: ['☕', 30] },
  { place: 'lon-bao-alley', daysAgo: 35, hour: 13, rating: 4, again: true, price: 14, note: 'Queue moves fast, perfect for a short turnaround.', dishes: ['Classic gua bao', 'Fried chicken bao'], tags: ['quick-bite', 'layover'] },
  { place: 'lon-tandoor-lane', daysAgo: 90, hour: 21, rating: 3, again: false, price: 28, note: 'Fine, but the naan arrived cold.', dishes: ['Lamb rogan josh'], tags: ['late-night'] },
  q('lon-hangar', 12, 15, 3),
  { place: 'lon-sunrise', daysAgo: 60, hour: 8, rating: 5, again: true, price: 8, note: 'Best flat white near Soho.', dishes: ['Flat white', 'Almond croissant'], tags: ['coffee', 'breakfast'] },
  { place: 'lon-copper-pot', daysAgo: 150, hour: 19, rating: 4, again: true, price: 55, note: 'Booked for six, no fuss.', dishes: ['Fish pie'], tags: ['good-for-groups', 'crew-favourite'], vis: 'crew' },
  q('lon-bao-alley', 200, 12, 4),
  { place: 'lon-tandoor-lane', daysAgo: 300, hour: 20, rating: 4, again: true, price: 31, dishes: ['Butter chicken', 'Garlic naan'], tags: ['vegetarian-friendly'] },
  // New York
  { place: 'nyc-marlowes', daysAgo: 20, hour: 7, rating: 4, again: true, price: 16.75, note: 'Classic diner breakfast after the red-eye.', dishes: ['Two eggs any style', 'Hash browns'], tags: ['breakfast', 'layover'], photo: ['🍳', 45] },
  { place: 'nyc-little-naples', daysAgo: 20, hour: 23, rating: 5, again: true, price: 5.5, note: 'Thin, foldable, perfect. Cash only.', dishes: ['Plain slice'], tags: ['late-night', 'quick-bite'], photo: ['🍕', 8] },
  { place: 'nyc-hudson-oyster', daysAgo: 120, hour: 19, rating: 4, again: null, price: 96, note: 'Oyster happy hour is the move.', dishes: ['Oysters (dozen)', 'Clam chowder'], tags: ['date-night'] },
  q('nyc-marlowes', 230, 9, 3),
  // Tokyo
  { place: 'tyo-daiwaya', daysAgo: 45, hour: 6, rating: 5, again: true, price: 11000, note: 'Omakase at dawn near the market. Worth the early alarm.', dishes: ['Omakase set', 'Tamago'], tags: ['worth-the-trip', 'breakfast'], photo: ['🍣', 200], vis: 'friends' },
  { place: 'tyo-kazan', daysAgo: 45, hour: 22, rating: 5, again: true, price: 1200, note: 'Rich tonkotsu, ticket machine at the door.', dishes: ['Tonkotsu ramen', 'Extra chashu'], tags: ['late-night', 'quick-bite'], photo: ['🍜', 25] },
  { place: 'tyo-torii', daysAgo: 160, hour: 20, rating: 4, again: true, price: 4800, dishes: ['Yakitori set', 'Highball'], tags: ['good-for-groups'] },
  q('tyo-kazan', 170, 21, 4),
  q('tyo-torii', 330, 20, 3),
  // Dubai
  { place: 'dxb-al-bahar', daysAgo: 28, hour: 20, rating: 4, again: true, price: 185, note: 'Grilled hammour with a view over the creek.', dishes: ['Grilled hammour', 'Hummus'], tags: ['view', 'date-night'], photo: ['🐟', 190] },
  { place: 'dxb-spice-souk', daysAgo: 28, hour: 13, rating: 3, again: null, price: 45, note: 'Hot, busy, very good biryani.', dishes: ['Chicken biryani'], tags: ['quick-bite'] },
  q('dxb-al-bahar', 210, 21, 4),
  // Singapore
  { place: 'sin-lau-pa-sat', daysAgo: 10, hour: 19, rating: 5, again: true, price: 12, note: 'Satay street comes alive after 7pm.', dishes: ['Chicken satay (10)', 'Sugarcane juice'], tags: ['street-food', 'worth-the-trip', 'crew-favourite'], photo: ['🍢', 18], vis: 'crew' },
  { place: 'sin-chilli-crab', daysAgo: 10, hour: 20, rating: 4, again: true, price: 140, note: 'Messy, loud and brilliant. Order the mantou buns.', dishes: ['Chilli crab', 'Mantou buns'], tags: ['good-for-groups'], photo: ['🦀', 5] },
  { place: 'sin-kopi-kaya', daysAgo: 75, hour: 7, rating: 4, again: true, price: 6.2, dishes: ['Kaya toast set'], tags: ['breakfast', 'coffee', 'quick-bite'] },
  q('sin-lau-pa-sat', 240, 20, 5),
  // Paris
  { place: 'par-petit-comptoir', daysAgo: 55, hour: 20, rating: 4, again: true, price: 78, note: 'Steak-frites done properly.', dishes: ['Steak-frites', 'Crème brûlée'], tags: ['date-night'], photo: ['🥩', 350] },
  { place: 'par-margaux', daysAgo: 55, hour: 8, rating: 5, again: true, price: 7.8, note: 'The croissant is the reason to nap on the morning flight.', dishes: ['Croissant', 'Pain au chocolat'], tags: ['breakfast', 'quick-bite'], photo: ['🥐', 40] },
  { place: 'par-chez-amina', daysAgo: 180, hour: 20, rating: 3, again: null, price: 34, dishes: ['Chicken tagine'], tags: ['vegetarian-friendly'] },
  q('par-margaux', 260, 8, 4),
  // Frankfurt
  { place: 'fra-apfelwein', daysAgo: 8, hour: 19, rating: 4, again: true, price: 29, note: 'Schnitzel and apple wine. Layover dinner done right.', dishes: ['Schnitzel', 'Grüne Soße'], tags: ['layover'] },
  { place: 'fra-currywurst', daysAgo: 8, hour: 12, rating: 3, again: true, price: 7.5, note: 'Fast, in-terminal.', dishes: ['Currywurst'], tags: ['quick-bite', 'layover'] },
  q('fra-currywurst', 100, 10, 3),
  // Sydney
  { place: 'syd-harbour-fish', daysAgo: 65, hour: 13, rating: 4, again: true, price: 38, note: 'Fish and chips on the water, mind the gulls.', dishes: ['Barramundi and chips'], tags: ['view', 'quick-bite'], photo: ['🐟', 205] },
  { place: 'syd-flat-white', daysAgo: 65, hour: 9, rating: 5, again: true, price: 11.5, note: 'The flat white that started the debate.', dishes: ['Flat white', 'Banana bread'], tags: ['coffee', 'breakfast'] },
  q('syd-flat-white', 285, 9, 5),
  // Lisbon
  { place: 'lis-pasteis', daysAgo: 40, hour: 10, rating: 5, again: true, price: 3.2, note: 'Eat them warm, with cinnamon.', dishes: ['Pastel de nata x2', 'Bica'], tags: ['coffee', 'quick-bite', 'worth-the-trip'], photo: ['🥧', 38] },
  { place: 'lis-marinheiro', daysAgo: 40, hour: 21, rating: 4, again: true, price: 42, note: 'Grilled sardines and vinho verde.', dishes: ['Grilled sardines', 'Caldo verde'], tags: ['date-night'] },
  q('lis-marinheiro', 190, 20, 4),
  // Los Angeles
  { place: 'lax-el-vuelo', daysAgo: 18, hour: 22, rating: 4, again: true, price: 13, note: 'Post-landing al pastor, no regrets.', dishes: ['Al pastor tacos (3)'], tags: ['late-night', 'quick-bite', 'crew-favourite'], vis: 'crew', photo: ['🌮', 28] },
  { place: 'lax-venice-poke', daysAgo: 220, hour: 13, rating: 3, again: null, price: 19, dishes: ['Ahi poke bowl'], tags: ['vegetarian-friendly'] },
];

export function createSeedData(now: Date = new Date()): MockData {
  const stamp = now.toISOString();
  const cityId = (slug: string) => `city-${slug}`;
  const placeId = (slug: string) => `place-${slug}`;

  const cities: City[] = CITIES.map(([slug, name, country, countryCode, airportCodes, lat, lng, currencyCode]) => ({
    id: cityId(slug), createdAt: stamp, updatedAt: stamp, name, country, countryCode, airportCodes, lat, lng, currencyCode,
  }));

  const places: Place[] = PLACES.map(([slug, name, city, cuisine, priceLevel, lat, lng, address]) => ({
    id: placeId(slug), createdAt: stamp, updatedAt: stamp, name, cityId: cityId(city), cuisine, priceLevel, lat, lng, address,
  }));

  const users: User[] = [
    { id: ME, createdAt: stamp, updatedAt: stamp, displayName: 'Sam Carter', homeAirport: 'LHR', defaultVisibility: 'crew' },
    { id: ANA, createdAt: stamp, updatedAt: stamp, displayName: 'Ana Costa', homeAirport: 'LIS', defaultVisibility: 'friends' },
  ];

  const tagMap = new Map<string, Tag>();
  const tagFor = (raw: string): Tag => {
    const name = normalizeTag(raw);
    let tag = tagMap.get(name);
    if (!tag) {
      tag = { id: `tag-${name}`, createdAt: stamp, updatedAt: stamp, name };
      tagMap.set(name, tag);
    }
    return tag;
  };

  const entries: Entry[] = [];
  const dishes: Dish[] = [];
  const photos: Photo[] = [];

  ENTRIES.forEach((s, i) => {
    const place = PLACES.find((p) => p[0] === s.place);
    if (!place) throw new Error(`Seed: unknown place ${s.place}`);
    const city = CITIES.find((c) => c[0] === place[2])!;
    const visited = new Date(now.getTime() - s.daysAgo * DAY);
    visited.setHours(s.hour, 15, 0, 0);
    const visitedAt = visited.toISOString();
    const id = `entry-${String(i + 1).padStart(2, '0')}`;
    const status: EntryStatus = s.quick ? 'quick' : 'complete';

    entries.push({
      id, createdAt: visitedAt, updatedAt: visitedAt, userId: ME, placeId: placeId(s.place), visitedAt,
      rating: s.rating, wouldReturn: s.again ?? null, note: s.note ?? '', price: s.price ?? null,
      currency: city[7], mealType: s.meal ?? guessMealType(visited), status, visibility: s.vis ?? 'private',
      tagIds: (s.tags ?? []).map((t) => tagFor(t).id),
    });
    (s.dishes ?? []).forEach((name, d) =>
      dishes.push({ id: `${id}-dish-${d + 1}`, createdAt: visitedAt, updatedAt: visitedAt, entryId: id, name, note: '' }),
    );
    if (s.photo) {
      photos.push({ id: `${id}-photo-1`, createdAt: visitedAt, updatedAt: visitedAt, entryId: id, url: foodPhoto(s.photo[0], s.photo[1]), caption: '' });
    }
  });

  const entryIdFor = (placeSlug: string) => entries.find((e) => e.placeId === placeId(placeSlug))?.id ?? null;

  const lists: List[] = [
    { id: 'list-my-london', createdAt: stamp, updatedAt: stamp, ownerId: ME, title: 'London layover favourites', description: 'Quick, good, close to the hotel.', cityId: cityId('london'), visibility: 'crew', shareEnabled: true, sourceListId: null },
    { id: 'list-ana-lisbon', createdAt: stamp, updatedAt: stamp, ownerId: ANA, title: "Ana's Lisbon essentials", description: 'Where I send every crew member with a 24-hour layover.', cityId: cityId('lisbon'), visibility: 'friends', shareEnabled: true, sourceListId: null },
    { id: 'list-ana-private', createdAt: stamp, updatedAt: stamp, ownerId: ANA, title: 'Ana: still deciding', description: '', cityId: null, visibility: 'private', shareEnabled: false, sourceListId: null },
  ];

  const item = (listId: string, position: number, placeSlug: string, note = ''): ListItem => ({
    id: `${listId}-item-${position + 1}`, createdAt: stamp, updatedAt: stamp, listId, placeId: placeId(placeSlug), entryId: entryIdFor(placeSlug), position, note,
  });
  const listItems: ListItem[] = [
    item('list-my-london', 0, 'lon-sunrise', 'Coffee first.'),
    item('list-my-london', 1, 'lon-bao-alley'),
    item('list-my-london', 2, 'lon-copper-pot', 'Book ahead.'),
    { ...item('list-ana-lisbon', 0, 'lis-pasteis', 'Eat them warm.'), entryId: null },
    { ...item('list-ana-lisbon', 1, 'lis-marinheiro'), entryId: null },
    { ...item('list-ana-private', 0, 'par-margaux'), entryId: null },
  ];

  return {
    version: DB_VERSION,
    currentUserId: ME,
    users, cities, places, entries, dishes, photos,
    tags: [...tagMap.values()],
    lists, listItems,
  };
}
