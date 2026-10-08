import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { NAV_ITEMS } from './navItems';

/** Phone navigation. Hidden from md up, where SideNav takes over. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium ${
                  isActive ? 'text-accent' : 'text-muted hover:text-fg'
                }`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
