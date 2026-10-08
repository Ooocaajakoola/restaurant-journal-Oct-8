import type { IconName } from '../ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Match only the exact path (needed for "/"). */
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Log', icon: 'plus', end: true },
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/cities', label: 'Cities', icon: 'city' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];
