import { formatDistance } from '../../lib/format';
import type { NearbyPlace, PlaceWithCity } from '../../data/repositories';
import { Icon } from '../ui/Icon';

/** What the user picked: an existing place, or a name to create. */
export type PlaceChoice = { kind: 'existing'; place: PlaceWithCity } | { kind: 'new'; name: string };

export function choiceKey(c: PlaceChoice): string {
  return c.kind === 'existing' ? `place:${c.place.id}` : `new:${c.name.toLowerCase()}`;
}

interface PlaceSuggestionListProps {
  legend: string;
  suggestions: Array<PlaceWithCity | NearbyPlace>;
  /** When set, offers "Add <name> as a new place". */
  newPlaceName?: string;
  newPlaceWhere?: string;
  selected: PlaceChoice | null;
  onSelect(choice: PlaceChoice): void;
}

function Option({ checked, onSelect, title, subtitle, trailing }: {
  checked: boolean;
  onSelect(): void;
  title: string;
  subtitle: string;
  trailing?: string;
}) {
  return (
    <li>
      <label className="block">
        <input type="radio" name="place" checked={checked} onChange={onSelect} className="peer sr-only" />
        <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 hover:bg-surface-2 peer-checked:border-accent peer-checked:bg-surface-2 peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
          <span className="text-muted">
            <Icon name="pin" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{title}</span>
            <span className="block truncate text-sm text-muted">{subtitle}</span>
          </span>
          {trailing && <span className="shrink-0 text-sm text-muted">{trailing}</span>}
          {checked && (
            <span className="shrink-0 text-accent">
              <Icon name="check" />
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

export function PlaceSuggestionList({ legend, suggestions, newPlaceName, newPlaceWhere, selected, onSelect }: PlaceSuggestionListProps) {
  const selectedKey = selected ? choiceKey(selected) : null;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-muted">{legend}</legend>
      <ul className="space-y-2">
        {suggestions.map((p) => {
          const choice: PlaceChoice = { kind: 'existing', place: p };
          return (
            <Option
              key={p.id}
              checked={selectedKey === choiceKey(choice)}
              onSelect={() => onSelect(choice)}
              title={p.name}
              subtitle={`${p.cuisine} · ${p.city.name}`}
              trailing={'distanceKm' in p ? formatDistance(p.distanceKm) : undefined}
            />
          );
        })}
        {newPlaceName && (
          <Option
            checked={selectedKey === choiceKey({ kind: 'new', name: newPlaceName })}
            onSelect={() => onSelect({ kind: 'new', name: newPlaceName })}
            title={`Add “${newPlaceName}” as a new place`}
            subtitle={newPlaceWhere ?? 'At your current location'}
          />
        )}
      </ul>
      {suggestions.length === 0 && !newPlaceName && <p className="text-muted">No places nearby. Type a name to add one.</p>}
    </fieldset>
  );
}
