import { newId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('returns a v4 UUID', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('still works where crypto.randomUUID is unavailable (http on a LAN address)', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, newId));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
