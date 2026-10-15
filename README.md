# Food Tower

A mobile-first restaurant journal for pilots and other frequent travellers. Log a meal in about three taps, find it again by city, and share favourites by link.

**Status: connected to Supabase.** Data is stored in a Supabase Postgres database behind a repository layer. With no Supabase settings the app falls back to localStorage demo data (see [Backend](#backend-supabase)). There are no payments and no analytics, and no login screen: each browser gets its own private identity through Supabase anonymous sign-in.

## Stack

React 19 · TypeScript · Vite · React Router · Tailwind CSS v4 · Leaflet + OpenStreetMap tiles · Zustand · Vitest + React Testing Library

## Run it

Requires Node 20+.

```bash
npm install
cp .env.example .env   # then fill in the two Supabase values (see Backend)
npm run dev            # http://localhost:5173
```

Without a `.env` (or with the placeholder values) the app runs on localStorage demo data, so it works offline out of the box.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run all tests once |
| `npm run test:watch` | Tests in watch mode |

**Demo mode (no Supabase settings):** on first load the app seeds sample data: 10 cities, 27 places, 40 entries and a few lists. To start over, delete `food-tower:db` under Application → Local Storage and reload. The mocked "current location" is Soho, London, and you can open `/l/list-ana-lisbon` to try the shared-list page.

**Supabase mode:** your journal starts empty, with the 10 cities and 27 places as a shared catalogue. Quick Log uses your browser's real location and picks the nearest catalogue city.

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
    index.ts          ★ The ONE file that chooses the implementation (by env).
    mock/             localStorage implementation + seed data (demo mode and tests)
    supabase/         Supabase implementation (what runs when configured)
    entryFilter.ts    Shared definition of what an entry filter means
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

## Backend (Supabase)

The database schema, security policies, photo bucket and catalogue seed live in `supabase/migrations/` (already applied to the project). The app code is in `src/data/supabase/`, one file per repository interface, and `src/data/index.ts` picks it.

**How it picks a back end.** `src/data/index.ts` uses Supabase when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, and the localStorage mock otherwise. Set `VITE_DATA_SOURCE=mock` to force the mock. Nothing outside `src/data/` knows which one it got.

**One manual step in the Supabase dashboard.** Turn on *Authentication → Sign In / Providers → Allow anonymous sign-ins*. Until you do, the app shows "Can't connect to your journal" with this instruction.

**Identity and privacy.** On first load each browser signs in anonymously and gets its own `auth.uid()`. Row-level security means:

| Data | Who can read | Who can write |
| --- | --- | --- |
| Cities, places | Everyone | Signed-in users may add places; cities are managed in SQL |
| Entries, dishes, photos, tags, profile | Only the owner | Only the owner |
| Lists | The owner, and anyone with the link while `share_enabled` | Only the owner |
| Photo files (`entry-photos` bucket) | Anyone with the file's unguessable URL | Only the owner, in their own folder |

Because there is no login, an anonymous identity lives in that browser. Clearing site data or switching browsers starts a fresh, empty journal, and the old data stays in the database but is unreachable. Adding real sign-in later (and linking the anonymous user to it) is the natural next step for cross-device sync.

**Schema notes.** Ids are client-generated UUIDs, and every table has `created_at`/`updated_at`. A shared list copies each entry's rating onto the list item, so viewers see the rating without ever getting access to the entry. A list also stores a snapshot of its owner's name.

**Changing the schema.** Add a new file in `supabase/migrations/` and apply it (Supabase CLI, or the dashboard SQL editor). Don't edit applied files.

### Tests

- `npm test` runs everything that doesn't need the network, including unit tests for the Supabase layer (row mapping, session handling, query helpers) and the shared repository contract against the mock.
- `src/data/supabase/supabase.e2e.test.ts` runs the real Supabase repositories against your live project with two anonymous users: CRUD, photo upload, filters, per-user privacy, shared lists. It is skipped by default because it creates (and then deletes) data:
  ```bash
  SUPABASE_E2E=1 npm test -- supabase.e2e
  ```
  Each run leaves a couple of empty anonymous users in Authentication → Users; delete them in the dashboard if you like.

## Notes and limits

- **Map tiles** come from the public OpenStreetMap tile server, which is fine for development and light use. For production traffic use a tile provider (and update the attribution) in `src/components/map/EntryMap.tsx`.
- **Photos** are downsized to ~1024px JPEG before saving. In Supabase mode they're uploaded to Storage (5 MB limit per file); in demo mode they're stored in localStorage (about 5 MB total), and a full store shows a clear error.
- **Cities are a fixed catalogue** (10 for now). If you're more than ~150 km from all of them, Quick Log can still log at an existing place but can't add a new one. Growing the catalogue (or letting users add cities) is future work.
- **Multi-step saves aren't one database transaction.** Saving an entry writes the entry, then its dishes, tags and photos. If a later step fails, the app deletes the half-saved entry. A Postgres function (RPC) would make it atomic.
- **Filtering and search run in the browser** over your own entries (fine for a personal journal; Supabase returns up to 1,000 rows per request by default). Move them into SQL if journals get large.
- Tag chips and place search are client-side and unpaginated, which is fine for a personal journal.
