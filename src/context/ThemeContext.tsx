import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'lilu-theme-v2';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage no disponible */
  }
  // Por defecto: oscuro TRON lujoso (consistencia con la paleta actual).
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Mirroring: clase legacy `.dark` (Tailwind dark:) + atributo `[data-theme]`
  // para los nuevos tokens TRON. Siempre en sincronía, una sola fuente de verdad.
  // TODO(tron): once nothing but Tailwind dark: relies on .dark, migrate to [data-theme] only.
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
  // theme-color meta (color de barra de navegador en móvil)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#07070F' : '#F5F4FC');
  // Dev-only invariant: los dos atributos nunca deben desincronizarse.
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const classDark = root.classList.contains('dark');
    const attr = root.getAttribute('data-theme');
    // eslint-disable-next-line no-console
    console.assert(
      (classDark && attr === 'dark') || (!classDark && attr === 'light'),
      `[ThemeContext] desincronización class/attr: class="${classDark}" attr="${attr}"`
    );
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // Sincroniza la clase inicial con el estado leído del almacenamiento.
  // Esto también cubre el caso en que el script inline de index.html
  // ya aplicó la clase antes del montaje.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
      applyTheme(next);
      return next;
    });
  }, []);

  // Escucha cambios de pestaña (si el usuario cambia el tema en otra pestaña).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
