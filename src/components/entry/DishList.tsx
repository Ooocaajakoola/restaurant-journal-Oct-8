import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { inputClass } from '../ui/Field';

export interface DishDraft {
  /** Local React key. */
  key: string;
  /** Present for dishes that already exist, so editing keeps their identity. */
  id?: string;
  name: string;
}

interface DishListProps {
  dishes: DishDraft[];
  onChange(next: DishDraft[]): void;
  newKey(): string;
}

export function DishList({ dishes, onChange, newKey }: DishListProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-muted">Dishes</legend>
      <ul className="space-y-2">
        {dishes.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2">
            <input
              aria-label={`Dish ${i + 1}`}
              className={inputClass}
              value={d.name}
              placeholder="e.g. Sticky toffee pudding"
              onChange={(e) => onChange(dishes.map((x) => (x.key === d.key ? { ...x, name: e.target.value } : x)))}
            />
            <Button
              variant="ghost"
              aria-label={`Remove dish ${i + 1}`}
              className="shrink-0 px-0"
              onClick={() => onChange(dishes.filter((x) => x.key !== d.key))}
            >
              <Icon name="close" />
            </Button>
          </li>
        ))}
      </ul>
      <Button className="mt-2" onClick={() => onChange([...dishes, { key: newKey(), name: '' }])}>
        <Icon name="plus" size={18} />
        Add a dish
      </Button>
    </fieldset>
  );
}
