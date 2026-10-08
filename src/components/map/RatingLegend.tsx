import { RATING_COLORS, RATING_TEXT } from '../../lib/ratingColors';
import type { Rating } from '../../types';

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

/** Explains the pin colours. Each swatch also carries its number, so colour is never the only cue. */
export function RatingLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted" aria-label="Pin colours by rating">
      {RATINGS.map((r) => (
        <li key={r} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex size-6 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: RATING_COLORS[r], color: RATING_TEXT[r] }}
          >
            {r}
          </span>
          <span>{r} {r === 1 ? 'star' : 'stars'}</span>
        </li>
      ))}
    </ul>
  );
}
