const pad = (n: number) => String(n).padStart(2, '0');

/** ISO date-time -> 'YYYY-MM-DD' in the user's local time, for <input type="date">. */
export function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Move an ISO date-time to a new local calendar day, keeping the time of day. */
export function applyDateInput(iso: string, value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const prev = new Date(iso);
  return new Date(y, m - 1, d, prev.getHours(), prev.getMinutes(), prev.getSeconds()).toISOString();
}
