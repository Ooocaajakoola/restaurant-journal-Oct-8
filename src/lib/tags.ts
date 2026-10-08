/** 'Crew Favourite', '#crew-favourite ' -> 'crew-favourite' */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().toLowerCase().replace(/\s+/g, '-');
}
