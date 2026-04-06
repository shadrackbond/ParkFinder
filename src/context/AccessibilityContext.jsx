import { createContext, useContext, useEffect, useState } from 'react';

const AccessibilityContext = createContext(null);

const STORAGE_KEY = 'parkease_a11y';

const FONT_SCALES = {
  default: 1,
  large: 1.125,
  huge: 1.25,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { darkMode: false, fontScale: 'default', highContrast: false };
}

export function AccessibilityProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  // ── apply preferences to DOM ────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;

    // Dark mode – drives Tailwind dark: variants
    if (prefs.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // High contrast – WCAG AAA override
    if (prefs.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // Font scale – CSS custom property consumed by index.css
    root.style.setProperty('--font-scale', FONT_SCALES[prefs.fontScale] ?? 1);

    // Persist
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setDarkMode = (val) => setPrefs((p) => ({ ...p, darkMode: val }));
  const setFontScale = (val) => setPrefs((p) => ({ ...p, fontScale: val }));
  const setHighContrast = (val) => setPrefs((p) => ({ ...p, highContrast: val }));

  return (
    <AccessibilityContext.Provider value={{ prefs, setDarkMode, setFontScale, setHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider');
  return ctx;
}
