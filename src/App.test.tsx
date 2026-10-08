import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach } from 'vitest';
import App from './App';
import { useUiStore } from './store/uiStore';
import { renderApp } from './test/render';

describe('app shell', () => {
  beforeEach(() => {
    useUiStore.getState().setTheme('dark');
  });

  it('shows the main navigation with a link to every top-level screen', () => {
    renderApp(<App />);
    const navs = screen.getAllByRole('navigation', { name: 'Main' });
    expect(navs.length).toBeGreaterThan(0);
    for (const nav of navs) {
      for (const label of ['Log', 'Map', 'Cities', 'Search', 'Settings']) {
        expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
      }
    }
  });

  it('marks the current page in the navigation', () => {
    renderApp(<App />, { route: '/map' });
    for (const nav of screen.getAllByRole('navigation', { name: 'Main' })) {
      expect(within(nav).getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page');
      expect(within(nav).getByRole('link', { name: 'Log' })).not.toHaveAttribute('aria-current');
    }
  });

  it('has a skip link and a main landmark', () => {
    renderApp(<App />);
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('shows a not-found page for unknown routes', () => {
    renderApp(<App />, { route: '/nope' });
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('defaults to dark and toggles the theme class', async () => {
    renderApp(<App />);
    expect(document.documentElement).toHaveClass('dark');
    await userEvent.click(screen.getAllByRole('button', { name: /switch to light theme/i })[0]!);
    expect(document.documentElement).not.toHaveClass('dark');
    expect(useUiStore.getState().theme).toBe('light');
  });
});
