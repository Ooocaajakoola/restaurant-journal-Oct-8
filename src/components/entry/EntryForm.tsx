import { useRef, useState, type FormEvent } from 'react';
import type { EntryInput } from '../../data/repositories';
import { currencyOptions } from '../../lib/currency';
import { applyDateInput, toDateInputValue } from '../../lib/date';
import { hasDetails } from '../../lib/entry';
import { capitalize } from '../../lib/format';
import { MEAL_TYPES, VISIBILITIES, type EntryView, type MealType, type Rating, type Visibility } from '../../types';
import { Button } from '../ui/Button';
import { Field, inputClass } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { RatingInput } from '../ui/RatingInput';
import { DishList, type DishDraft } from './DishList';
import { PhotoPicker } from './PhotoPicker';
import { TagInput } from './TagInput';

interface EntryFormProps {
  entry: EntryView;
  knownTags: string[];
  saving: boolean;
  error: string | null;
  onSubmit(patch: Partial<EntryInput>): void;
  onCancel(): void;
}

type WouldReturn = 'yes' | 'no' | 'unsure';

const toWouldReturn = (v: boolean | null): WouldReturn => (v === true ? 'yes' : v === false ? 'no' : 'unsure');
const fromWouldReturn = (v: WouldReturn): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

export function EntryForm({ entry, knownTags, saving, error, onSubmit, onCancel }: EntryFormProps) {
  const keyCounter = useRef(0);
  const newKey = () => `new-${++keyCounter.current}`;

  const [rating, setRating] = useState<Rating>(entry.rating);
  const [visitedAt, setVisitedAt] = useState(entry.visitedAt);
  const [mealType, setMealType] = useState<MealType>(entry.mealType);
  const [wouldReturn, setWouldReturn] = useState<WouldReturn>(toWouldReturn(entry.wouldReturn));
  const [price, setPrice] = useState(entry.price === null ? '' : String(entry.price));
  const [currency, setCurrency] = useState(entry.currency);
  const [dishes, setDishes] = useState<DishDraft[]>(entry.dishes.map((d) => ({ key: d.id, id: d.id, name: d.name })));
  const [note, setNote] = useState(entry.note);
  const [tags, setTags] = useState(entry.tags.map((t) => t.name));
  const [photos, setPhotos] = useState(entry.photos.map((p) => ({ id: p.id as string | undefined, url: p.url })));
  const [visibility, setVisibility] = useState<Visibility>(entry.visibility);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanDishes = dishes.filter((d) => d.name.trim()).map((d) => ({ id: d.id, name: d.name.trim() }));
    const parsedPrice = price.trim() === '' ? null : Number(price);
    const cleanPrice = parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null;
    const complete = hasDetails({ dishes: cleanDishes, note, price: cleanPrice });
    onSubmit({
      rating,
      visitedAt,
      mealType,
      wouldReturn: fromWouldReturn(wouldReturn),
      price: cleanPrice,
      currency,
      dishes: cleanDishes,
      note: note.trim(),
      tags,
      photos,
      visibility,
      // Adding any detail finishes a quick entry; otherwise leave the status alone.
      status: complete ? 'complete' : entry.status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RatingInput name="edit-rating" value={rating} onChange={setRating} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date visited">
          {(id) => (
            <input
              id={id}
              type="date"
              required
              className={inputClass}
              value={toDateInputValue(visitedAt)}
              onChange={(e) => e.target.value && setVisitedAt(applyDateInput(visitedAt, e.target.value))}
            />
          )}
        </Field>
        <Field label="Meal">
          {(id) => (
            <select id={id} className={inputClass} value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {capitalize(m)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-muted">Would you go back?</legend>
        <div className="flex gap-2">
          {(['yes', 'no', 'unsure'] as const).map((v) => (
            <label key={v} className="flex-1">
              <input
                type="radio"
                name="would-return"
                value={v}
                checked={wouldReturn === v}
                onChange={() => setWouldReturn(v)}
                className="peer sr-only"
              />
              <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 font-medium peer-checked:border-accent peer-checked:text-accent peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
                {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Price">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className={inputClass}
              value={price}
              placeholder="0.00"
              onChange={(e) => setPrice(e.target.value)}
            />
          )}
        </Field>
        <Field label="Currency">
          {(id) => (
            <select id={id} className={`${inputClass} w-28`} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencyOptions(entry.currency).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <DishList dishes={dishes} onChange={setDishes} newKey={newKey} />

      <Field label="Notes">
        {(id) => (
          <textarea
            id={id}
            rows={4}
            className={`${inputClass} py-2`}
            value={note}
            placeholder="What was good? Who was with you? Anything to remember?"
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>

      <TagInput tags={tags} onChange={setTags} suggestions={knownTags} />

      <div>
        <p className="mb-1.5 text-sm font-semibold text-muted">Photos</p>
        {photos.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <li key={p.id ?? p.url.slice(-24) + i} className="relative">
                <img src={p.url} alt={`Photo ${i + 1}`} className="size-24 rounded-xl object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg shadow"
                >
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <PhotoPicker value={null} onChange={(url) => url && setPhotos([...photos, { id: undefined, url }])} />
      </div>

      <Field label="Who can see this?">
        {(id) => (
          <select id={id} className={inputClass} value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {capitalize(v)}
              </option>
            ))}
          </select>
        )}
      </Field>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/60 p-3 text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
