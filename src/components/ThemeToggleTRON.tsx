import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  /** Etiqueta accesible; se usa como title/aria-label */
  label?: string;
  /** Tamaño del círculo en píxeles (default 44) */
  size?: number;
  /** Clase extra para cuando se quiera envolver en un contenedor */
  className?: string;
}

/**
 * Botón TRON (sol/luna) con animación de cruzado y glow cian al hover.
 * Usa CSS variables del theme-system.css (.tron-toggle) — mismo
 * componente en tienda y en los 4 paneles para consistencia.
 */
const ThemeToggleTRON: React.FC<Props> = ({ label = 'Cambiar tema', size = 42, className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`tron-toggle ${className}`}
      style={{ width: size, height: size }}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      <Sun className="tron-toggle__icon tron-toggle__icon--sun" strokeWidth={1.6} />
      <Moon className="tron-toggle__icon tron-toggle__icon--moon" strokeWidth={1.6} />
    </button>
  );
};

export default ThemeToggleTRON;
