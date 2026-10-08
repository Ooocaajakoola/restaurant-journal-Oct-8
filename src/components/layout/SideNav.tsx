import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NAV_ITEMS } from './navItems';

/** Desktop navigation. Hidden below md, where BottomTabBar takes over. */
export function SideNav() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
        <span className="text-accent">
          <Icon name="tower" size={26} />
        </span>
        Food Tower
      </div>
      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 text-base font-medium ${
                    isActive ? 'bg-surface-2 text-accent' : 'text-fg hover:bg-surface-2'
                  }`
                }
              >
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center justify-between px-2 text-sm text-muted">
        <span>Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
