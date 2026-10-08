/** Repositories hand out copies so UI code can never mutate the stored records. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function touch<T extends { updatedAt: string }>(record: T, now: Date): T {
  record.updatedAt = now.toISOString();
  return record;
}
