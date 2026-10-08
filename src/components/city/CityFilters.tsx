import type { PriceLevel, Rating } from '../../types';
import { Field, inputClass } from '../ui/Field';

export interface CityFilterValues {
  cuisine?: string;
  minRating?: Rating;
  tag?: string;
  priceLevel?: PriceLevel;
}

interface CityFiltersProps {
  values: CityFilterValues;
  onChange(next: CityFilterValues): void;
  cuisines: string[];
  tags: string[];
}

const PRICE_LABELS: Record<PriceLevel, string> = { 1: '$ · Cheap', 2: '$$ · Moderate', 3: '$$$ · Pricey', 4: '$$$$ · Splurge' };

export function CityFilters({ values, onChange, cuisines, tags }: CityFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Cuisine">
        {(id) => (
          <select id={id} className={inputClass} value={values.cuisine ?? ''} onChange={(e) => onChange({ ...values, cuisine: e.target.value || undefined })}>
            <option value="">Any cuisine</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Rating">
        {(id) => (
          <select
            id={id}
            className={inputClass}
            value={values.minRating ?? ''}
            onChange={(e) => onChange({ ...values, minRating: e.target.value ? (Number(e.target.value) as Rating) : undefined })}
          >
            <option value="">Any rating</option>
            {[5, 4, 3, 2].map((r) => (
              <option key={r} value={r}>
                {r}+ stars
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Tag">
        {(id) => (
          <select id={id} className={inputClass} value={values.tag ?? ''} onChange={(e) => onChange({ ...values, tag: e.target.value || undefined })}>
            <option value="">Any tag</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Price">
        {(id) => (
          <select
            id={id}
            className={inputClass}
            value={values.priceLevel ?? ''}
            onChange={(e) => onChange({ ...values, priceLevel: e.target.value ? (Number(e.target.value) as PriceLevel) : undefined })}
          >
            <option value="">Any price</option>
            {([1, 2, 3, 4] as const).map((p) => (
              <option key={p} value={p}>
                {PRICE_LABELS[p]}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );
}
