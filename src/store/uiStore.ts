import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface UiState {
  theme: Theme;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
}

/** Reflect the theme on <html> (Tailwind's dark variant keys off the `dark` class). */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f6f7fb');
}

/**
 * UI-only preferences, persisted by Zustand's middleware (not by components).
 * Journal data never lives here; it goes through the repository layer.
 * The storage key is mirrored in index.html so the right theme paints before React loads.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'food-tower:ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => applyTheme(state?.theme ?? 'dark'),
    },
  ),
);
