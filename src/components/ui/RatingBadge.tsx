import { RATING_COLORS, RATING_TEXT } from '../../lib/ratingColors';
import type { Rating } from '../../types';
import { Icon } from './Icon';

export function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <span
      className="inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-sm font-bold"
      style={{ backgroundColor: RATING_COLORS[rating], color: RATING_TEXT[rating] }}
      aria-label={`Rated ${rating} out of 5`}
    >
      <Icon name="star" size={14} filled aria-hidden />
      {rating}
    </span>
  );
}
