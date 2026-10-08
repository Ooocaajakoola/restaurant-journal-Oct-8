import { Outlet } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { BottomTabBar } from './BottomTabBar';
import { SideNav } from './SideNav';

export function AppShell() {
  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>
      <SideNav />
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="text-accent">
              <Icon name="tower" size={24} />
            </span>
            Food Tower
          </span>
          <ThemeToggle />
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5 outline-none md:max-w-5xl md:px-8 md:pb-12 md:pt-8">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
