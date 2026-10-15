/** Escape user text for use inside a SQL LIKE / ILIKE pattern. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}
