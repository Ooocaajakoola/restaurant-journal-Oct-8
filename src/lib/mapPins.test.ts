import { createTestRepositories } from '../test/mockRepos';
import { buildPins } from './mapPins';

describe('buildPins', () => {
  it('makes one pin per place, with the average rating rounded', async () => {
    const repos = createTestRepositories();
    const entries = await repos.entries.list();
    const pins = buildPins(entries);

    expect(pins.length).toBe(new Set(entries.map((e) => e.placeId)).size);
    expect(pins.reduce((n, p) => n + p.visits, 0)).toBe(entries.length);

    const sunrise = pins.find((p) => p.name === 'Sunrise Café')!;
    const ratings = entries.filter((e) => e.place.name === 'Sunrise Café').map((e) => e.rating);
    expect(sunrise.visits).toBe(ratings.length);
    expect(sunrise.rating).toBe(Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length));
    expect(sunrise.entries[0]!.visitedAt >= sunrise.entries.at(-1)!.visitedAt).toBe(true);
  });

  it('returns nothing for no entries', () => {
    expect(buildPins([])).toEqual([]);
  });
});
