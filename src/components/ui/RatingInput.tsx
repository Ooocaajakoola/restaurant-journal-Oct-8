import { RATING_COLORS, RATING_TEXT } from '../../lib/ratingColors';
import type { Rating } from '../../types';
import { Icon } from './Icon';

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

interface RatingInputProps {
  value: Rating | null;
  onChange(value: Rating): void;
  /** Unique per form on the page. */
  name: string;
  legend?: string;
}

/** Five big radio buttons (a native radio group, so arrow keys and screen readers just work). */
export function RatingInput({ value, onChange, name, legend = 'Rating' }: RatingInputProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-muted">{legend}</legend>
      <div className="flex gap-2">
        {RATINGS.map((r) => {
          const selected = value === r;
          return (
            <label key={r} className="flex-1">
              <input
                type="radio"
                name={name}
                value={r}
                checked={selected}
                onChange={() => onChange(r)}
                aria-label={`${r} ${r === 1 ? 'star' : 'stars'}`}
                className="peer sr-only"
              />
              <span
                className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-line bg-surface-2 text-lg font-bold text-fg peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]"
                style={selected ? { backgroundColor: RATING_COLORS[r], color: RATING_TEXT[r], borderColor: RATING_COLORS[r] } : undefined}
              >
                <Icon name="star" size={16} filled={selected} />
                {r}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
