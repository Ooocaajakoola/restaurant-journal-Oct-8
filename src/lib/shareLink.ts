/** Public, read-only page for a shared list. */
export function listSharePath(listId: string): string {
  return `/l/${listId}`;
}

export function listShareUrl(listId: string, origin: string = window.location.origin): string {
  return `${origin}${listSharePath(listId)}`;
}
