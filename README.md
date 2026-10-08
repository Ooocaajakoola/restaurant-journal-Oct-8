# Food Tower

A mobile-first restaurant journal for pilots and other frequent travellers. Log a meal in about three taps, find it again by city, and share favourites by link.

**Status: front end only.** There is no back end, no auth, no payments and no analytics. Data lives in your browser (localStorage) behind a repository layer, so a Supabase back end can be added by changing one file. See [Plugging in Supabase](#plugging-in-supabase).

## Stack

React 19 · TypeScript · Vite · React Router · Tailwind CSS v4 · Leaflet + OpenStreetMap tiles · Zustand · Vitest + React Testing Library

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run all tests once |
| `npm run test:watch` | Tests in watch mode |

On first load the app seeds sample data: 10 cities, 27 places and 40 entries, plus a few lists. To start over, clear this site's data in your browser's dev tools (Application → Local Storage → delete `food-tower:db`) and reload.

The mocked "current location" is Soho, London, so Quick Log suggests London places. Open a shared list at `/l/list-ana-lisbon` to try the read-only page and **Save to my journal**.

## Screens

| Route | Screen |
| --- | --- |
| `/` | **Quick Log**: nearby suggestions, search/type a place, 1-5 rating, optional photo, Save |
| `/entry/:id` | **Entry Detail**: photo, rating, dishes, notes, tags, price, date; edit, delete, share, directions |
| `/entry/:id/edit` | Edit / finish an entry |
| `/map` | **Map**: one pin per place, coloured and numbered by rating |
| `/cities` | **Cities**: entry counts and last visit; your lists |
| `/cities/:cityId` | **City View**: list/map toggle, cuisine/rating/tag/price filters (kept in the URL), Share |
| `/search` | **Search** by dish, city (name, country or airport code), tag or date range |
| `/l/:listId` | **Shared list**: read-only, with "Save to my journal" |
| `/settings` | **Settings**: theme, profile, default visibility, placeholder sync status |

Quick entries that still have no dishes, note or price show a **To finish** badge. Adding any detail through Edit marks the entry complete.

## Design notes

- Mobile first (designed at 375px). Bottom tab bar on phones, side navigation from `md` up.
- Every tappable control is at least 44px, on all screen sizes.
- Dark by default, with a light toggle (header or Settings). The saved theme is applied before first paint.
- Semantic landmarks, a skip link, labelled controls, native radio groups for ratings, visible focus rings, and colour is never the only cue (pins and badges carry the rating number).
- Share creates a list and uses the OS share sheet where available, otherwise copies the link.

## Architecture

```
src/
  types/        Domain types: User, Place, City, Entry, Dish, Photo, Tag, List, ListItem
  data/
    repositories.ts   ★ The interfaces (EntryRepository, PlaceRepository, ...). The contract.
    index.ts          ★ The ONE file that chooses the implementation.
    mock/             localStorage implementation + seed data (what runs today)
    supabase/         Empty placeholder for the Supabase implementation
    contract/         Behaviour tests any implementation must pass
  hooks/        useRepositories (context), useAsyncData, useShare
  store/        Zustand: theme preference (persisted) and a refetch counter
  components/   layout/, ui/, entry/, city/, map/
  pages/        One file per screen
  lib/          Pure helpers (formatting, geo, pins, tags, ...)
```

Rules the code follows (ESLint enforces the first two inside `components/`, `pages/` and `hooks/`):

1. Components, pages and hooks never touch `localStorage`/`sessionStorage`.
2. They never import from `data/mock`. They get repositories from `useRepositories()`.
3. All records have a client-generated `id` plus `createdAt`/`updatedAt`, so offline sync can be added later. The mock bumps `updatedAt` on every write.
4. Repositories are async and return copies, so UI code can't mutate stored records.

The only other `localStorage` use is the **theme preference** (Zustand's `persist` in `src/store/uiStore.ts`, mirrored by a tiny boot script in `index.html`). It's a UI preference, not journal data.

### State

- Journal data is read through the repositories by `useAsyncData`. After any write, call `useJournalStore().invalidate()` and every mounted screen refetches.
- Form state is local to each form.
- Zustand holds only the theme and that refetch counter.

## Plugging in Supabase

Nothing Supabase-related is installed yet. When you're ready:

1. **Install the client and set env vars**
   ```bash
   npm install @supabase/supabase-js
   cp .env.example .env     # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

2. **Implement the interfaces** in `src/data/supabase/`, one file per repository, mirroring `src/data/mock/`:
   `UserRepository`, `CityRepository`, `PlaceRepository`, `EntryRepository`, `TagRepository`, `ListRepository`, `LocationRepository` (all in `src/data/repositories.ts`). Export one function:
   ```ts
   export function createSupabaseRepositories(client: SupabaseClient): Repositories
   ```
   Things to handle in that layer (the UI already expects them):
   - **Joins**: `EntryView` and `ListView` are joined shapes (place + city + dishes + photos + tags). Build them with Supabase's nested selects.
   - **Naming**: map `snake_case` columns to the camelCase fields in `src/types/`.
   - **Photos**: upload to Supabase Storage and store the URL in `Photo.url` (the mock stores a downsized data URL).
   - **Current user**: the mock has a fixed current user. Take it from the Supabase session instead (`UserRepository.getCurrent`), and filter entries and lists by it (or use row-level security).
   - **Shared lists**: `ListRepository.getShared(id)` must work for people who aren't the owner. Use an RLS policy on `shareEnabled = true` or a small RPC. `saveCopyToMyJournal` copies the list and its items into the caller's account.
   - **Location**: replace the mock `LocationRepository` with `navigator.geolocation` plus nearest-city lookup.
   - **Nearby and search**: `listNearby` and `search` run client-side in the mock. Use PostGIS or a `RETURNS TABLE` function when the catalogue grows.
   - **Ids and sync**: ids are client-generated UUIDs. Use them as primary keys and upsert on `updatedAt` for offline sync.

3. **Switch over: change one file.** Edit `src/data/index.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js';
   import { createSupabaseRepositories } from './supabase';

   export const repositories: Repositories = createSupabaseRepositories(
     createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY),
   );
   ```
   Nothing in `components/`, `pages/`, `hooks/` or `store/` changes. If you'd like to keep the mock for demos, pick the implementation from an env flag in that same file.

4. **Prove it behaves the same**: run the shared contract against the new implementation.
   ```ts
   // src/data/supabase/supabase.test.ts
   import { runRepositoryContract } from '../contract/repositoryContract';
   runRepositoryContract('supabase', async () => ({ repos: await makeSeededTestRepositories() }));
   ```
   The contract assumes the seed data (10 cities, the London places, `list-ana-lisbon`, etc.), so point it at a test project loaded with the same seed (`src/data/mock/seed.ts` is the reference).

## Notes and limits

- **Map tiles** come from the public OpenStreetMap tile server, which is fine for development and light use. For production traffic use a tile provider (and update the attribution) in `src/components/map/EntryMap.tsx`.
- **localStorage is small** (about 5 MB). Photos are downsized to ~1024px JPEG before saving. If storage fills up, saving shows a clear error instead of failing silently.
- Sharing is mock-only: a share link works inside the same browser, because the data lives there. It will work for other people once Supabase is connected.
- Tag chips and place search are client-side and unpaginated, which is fine for a personal journal.
