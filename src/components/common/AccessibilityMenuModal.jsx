import { useAccessibility } from '../../context/AccessibilityContext';

const FONT_OPTIONS = [
  { id: 'default', label: 'Default', description: '100%' },
  { id: 'large',   label: 'Large',   description: '112.5%' },
  { id: 'huge',    label: 'Huge',    description: '125%' },
];

export default function AccessibilityMenuModal({ onClose }) {
  const { prefs, setDarkMode, setFontScale, setHighContrast } = useAccessibility();

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Ease of Use accessibility settings"
    >
      {/* Semi-transparent overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel — slides up on mobile, centred on desktop */}
      <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#1E1E1E] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Ease of Use</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Adjust for your comfort</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close accessibility menu"
            className="w-9 h-9 min-h-0 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── Section 1: Text Size ────────────────────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
              </svg>
              Text Size
            </legend>
            <div className="flex gap-2">
              {FONT_OPTIONS.map(({ id, label, description }) => (
                <button
                  key={id}
                  id={`font-size-${id}`}
                  role="radio"
                  aria-checked={prefs.fontScale === id}
                  onClick={() => setFontScale(id)}
                  className={`flex-1 py-3 px-2 rounded-2xl border-2 text-center transition-all duration-200 min-h-0 flex flex-col items-center gap-1 ${
                    prefs.fontScale === id
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600'
                  }`}
                >
                  <span className={`font-bold text-gray-800 dark:text-gray-100 leading-none ${
                    id === 'default' ? 'text-sm' : id === 'large' ? 'text-base' : 'text-xl'
                  }`}>A</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">{label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-gray-700" />

          {/* ── Section 2: Visual Support ───────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Visual Support
            </p>
            <button
              id="toggle-high-contrast"
              role="switch"
              aria-checked={prefs.highContrast}
              onClick={() => setHighContrast(!prefs.highContrast)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 min-h-0 ${
                prefs.highContrast
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-yellow-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black leading-none ${
                  prefs.highContrast ? 'bg-black text-yellow-400' : 'bg-gray-800 text-white dark:bg-gray-600'
                }`}>
                  Aa
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Stark Contrast AAA</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Black background · Yellow text</p>
                </div>
              </div>
              {/* Toggle pill */}
              <TogglePill on={prefs.highContrast} colour="yellow" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-gray-700" />

          {/* ── Section 3: Appearance / Night Mode ─────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Appearance
            </p>
            <button
              id="toggle-dark-mode"
              role="switch"
              aria-checked={prefs.darkMode}
              onClick={() => setDarkMode(!prefs.darkMode)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 min-h-0 ${
                prefs.darkMode
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  prefs.darkMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  {prefs.darkMode ? (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Night Mode</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{prefs.darkMode ? 'Dark theme active' : 'Light theme active'}</p>
                </div>
              </div>
              <TogglePill on={prefs.darkMode} colour="indigo" />
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Settings are saved automatically and persist across sessions.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Reusable toggle-pill sub-component ──────────────────────────────────── */
function TogglePill({ on, colour }) {
  const trackOn  = colour === 'yellow' ? 'bg-yellow-400' : 'bg-indigo-500';
  const trackOff = 'bg-gray-200 dark:bg-gray-600';
  return (
    <div
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${on ? trackOn : trackOff}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </div>
  );
}
