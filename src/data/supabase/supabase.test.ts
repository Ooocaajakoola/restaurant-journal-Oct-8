import type { SupabaseClient } from '@supabase/supabase-js';
import { boundingBox } from '../../lib/geo';
import { escapeLike } from '../../lib/like';
import { explainAuthError, createAuthRepository } from './authRepository';
import { createSessionManager, NotSignedInError } from './session';
import { toEntryView, toListView, type EntryJoinRow, type ListJoinRow, type CityRow, type PlaceWithCityRow } from './rows';

const stamps = { created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z' };
const city: CityRow = { id: 'c1', name: 'London', country: 'United Kingdom', country_code: 'GB', airport_codes: ['LHR'], lat: 51.5, lng: -0.12, currency_code: 'GBP', ...stamps };
const place: PlaceWithCityRow = { id: 'p1', city_id: 'c1', name: 'Bao Alley', address: '8 Lexington St', lat: 51.51, lng: -0.13, cuisine: 'Taiwanese', price_level: 2, city, ...stamps };

describe('row mappers', () => {
  const row: EntryJoinRow = {
    id: 'e1', user_id: 'u1', place_id: 'p1', visited_at: '2026-10-01T19:00:00Z', rating: 4, would_return: null, note: 'Great',
    price: '12.50', currency: 'GBP', meal_type: 'dinner', status: 'complete', visibility: 'crew', ...stamps, place,
    dishes: [
      { id: 'd2', entry_id: 'e1', name: 'Second', note: '', position: 1, ...stamps },
      { id: 'd1', entry_id: 'e1', name: 'First', note: '', position: 0, ...stamps },
    ],
    photos: [{ id: 'ph1', entry_id: 'e1', url: 'https://x/y.jpg', storage_path: 'u1/ph1.jpg', caption: '', position: 0, ...stamps }],
    entry_tags: [{ tag: { id: 't1', user_id: 'u1', name: 'late-night', ...stamps } }],
  };

  it('maps a joined entry row into an EntryView (camelCase, numeric price, ordered dishes, tag ids)', () => {
    const e = toEntryView(row);
    expect(e).toMatchObject({
      id: 'e1', userId: 'u1', placeId: 'p1', visitedAt: row.visited_at, rating: 4, wouldReturn: null, price: 12.5,
      mealType: 'dinner', visibility: 'crew', tagIds: ['t1'], createdAt: stamps.created_at, updatedAt: stamps.updated_at,
    });
    expect(e.dishes.map((d) => d.name)).toEqual(['First', 'Second']);
    expect(e.place).toMatchObject({ name: 'Bao Alley', cityId: 'c1', priceLevel: 2 });
    expect(e.city).toMatchObject({ name: 'London', airportCodes: ['LHR'], currencyCode: 'GBP' });
    expect(e.photos[0]!.url).toBe('https://x/y.jpg');
    expect(e.tags[0]!.name).toBe('late-night');
  });

  it('keeps a missing price as null', () => {
    expect(toEntryView({ ...row, price: null }).price).toBeNull();
  });

  it('maps a joined list row, ordering items and falling back for a missing owner name', () => {
    const list: ListJoinRow = {
      id: 'l1', owner_id: 'u2', owner_name: '', title: 'Lisbon', description: '', city_id: null, visibility: 'friends',
      share_enabled: true, source_list_id: null, ...stamps,
      items: [
        { id: 'i2', list_id: 'l1', place_id: 'p1', entry_id: null, position: 1, note: 'b', rating: null, ...stamps, place },
        { id: 'i1', list_id: 'l1', place_id: 'p1', entry_id: 'e1', position: 0, note: 'a', rating: 5, ...stamps, place },
      ],
    };
    const v = toListView(list);
    expect(v.owner).toEqual({ id: 'u2', displayName: 'Someone' });
    expect(v.shareEnabled).toBe(true);
    expect(v.items.map((i) => i.note)).toEqual(['a', 'b']);
    expect(v.items[0]).toMatchObject({ rating: 5, entryId: 'e1' });
    expect(v.items[0]!.city.name).toBe('London');
  });
});

describe('query helpers', () => {
  it('escapes LIKE wildcards so user text is matched literally', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(escapeLike('plain')).toBe('plain');
  });

  it('builds a bounding box that contains the radius', () => {
    const box = boundingBox({ lat: 51.5, lng: -0.12 }, 5);
    expect(box.latMin).toBeLessThan(51.5 - 0.04);
    expect(box.latMax).toBeGreaterThan(51.5 + 0.04);
    expect(box.lngMin).toBeLessThan(-0.12);
    expect(box.lngMax).toBeGreaterThan(-0.12);
  });

  it('drops the longitude limit when the box would cross the date line', () => {
    const box = boundingBox({ lat: -17.7, lng: 179.9 }, 50);
    expect(box.lngMin).toBeNull();
    expect(box.lngMax).toBeNull();
  });
});

const userObj = (over: Record<string, unknown> = {}) => ({ id: 'u1', email: 'sam@example.com', user_metadata: { display_name: 'Sam' }, ...over });

function fakeClient(opts: { session?: ReturnType<typeof userObj> | null } = {}) {
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: opts.session ? { user: opts.session } : null }, error: null })),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
    resend: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn(),
  };
  return { client: { auth } as unknown as SupabaseClient, auth };
}

describe('session manager', () => {
  it('returns the signed-in user and their sign-up name', async () => {
    const { client } = fakeClient({ session: userObj() });
    const s = createSessionManager(client);
    expect(await s.ready()).toBe('u1');
    expect(await s.current()).toEqual({ id: 'u1', email: 'sam@example.com', displayName: 'Sam' });
  });

  it('treats a leftover anonymous session as signed out', async () => {
    const { client } = fakeClient({ session: userObj({ is_anonymous: true, email: '' }) });
    const s = createSessionManager(client);
    expect(await s.current()).toBeNull();
    await expect(s.ready()).rejects.toBeInstanceOf(NotSignedInError);
  });

  it('throws NotSignedInError (and never signs in by itself) when there is no session', async () => {
    const { client, auth } = fakeClient();
    const s = createSessionManager(client);
    expect(await s.current()).toBeNull();
    await expect(s.ready()).rejects.toBeInstanceOf(NotSignedInError);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('auth repository', () => {
  const make = (opts?: Parameters<typeof fakeClient>[0]) => {
    const f = fakeClient(opts);
    return { ...f, repo: createAuthRepository(f.client, createSessionManager(f.client)) };
  };

  it('signs up and signs in straight away when email confirmation is off', async () => {
    const { repo, auth } = make();
    auth.signUp.mockResolvedValue({ data: { user: userObj({ identities: [{}] }), session: { access_token: 'x' } }, error: null });
    const res = await repo.signUp({ email: ' sam@example.com ', password: 'password1', displayName: ' Sam ' });
    expect(res).toEqual({ status: 'signed-in', user: { id: 'u1', email: 'sam@example.com', displayName: 'Sam' } });
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sam@example.com', password: 'password1', options: expect.objectContaining({ data: { display_name: 'Sam' } }) }),
    );
  });

  it('asks the user to confirm their email when there is no session yet', async () => {
    const { repo, auth } = make();
    auth.signUp.mockResolvedValue({ data: { user: userObj({ identities: [{}] }), session: null }, error: null });
    expect(await repo.signUp({ email: 'sam@example.com', password: 'password1', displayName: 'Sam' })).toEqual({
      status: 'confirm-email',
      email: 'sam@example.com',
    });
  });

  it('reports an address that is already registered (Supabase returns no identities)', async () => {
    const { repo, auth } = make();
    auth.signUp.mockResolvedValue({ data: { user: userObj({ identities: [] }), session: null }, error: null });
    await expect(repo.signUp({ email: 'sam@example.com', password: 'password1', displayName: 'Sam' })).rejects.toThrow(/already exists/);
  });

  it('signs in, and explains a wrong password in plain words', async () => {
    const { repo, auth } = make();
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user: userObj() }, error: null });
    expect((await repo.signIn('sam@example.com', 'password1')).email).toBe('sam@example.com');
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
    await expect(repo.signIn('sam@example.com', 'nope')).rejects.toThrow('Incorrect email or password.');
  });

  it('signs out, resends confirmation, and reports auth changes until unsubscribed', async () => {
    const { repo, auth } = make();
    await repo.signOut();
    expect(auth.signOut).toHaveBeenCalled();
    await repo.resendConfirmation(' sam@example.com ');
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'sam@example.com' }));

    const unsubscribe = vi.fn();
    let emit: (event: string, session: { user: ReturnType<typeof userObj> } | null) => void = () => undefined;
    auth.onAuthStateChange.mockImplementation((cb) => {
      emit = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const seen: unknown[] = [];
    const off = repo.onChange((u) => seen.push(u?.email ?? null));
    emit('SIGNED_IN', { user: userObj() });
    emit('SIGNED_OUT', null);
    expect(seen).toEqual(['sam@example.com', null]);
    off();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('is an account-based repository (the mock is not)', () => {
    expect(make().repo.accounts).toBe(true);
  });
});

describe('explainAuthError', () => {
  it.each([
    ['invalid_credentials', /incorrect email or password/i],
    ['email_not_confirmed', /confirm your email/i],
    ['weak_password', /too weak/i],
    ['over_email_send_rate_limit', /too many emails/i],
    ['signup_disabled', /turned off/i],
  ])('explains %s', (code, expected) => {
    expect(explainAuthError({ code, message: 'raw' })).toMatch(expected);
  });

  it('falls back to the server message for anything else', () => {
    expect(explainAuthError({ code: 'weird', message: 'Something odd' })).toBe('Something odd');
  });
});
