import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (dark: boolean) => {
    if (dark !== isDark) toggle();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Theme settings"
        className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors cursor-pointer text-lg active:scale-95 ${
          isDark
            ? 'bg-night-card border-night-border text-night-primary hover:bg-night-surface'
            : 'bg-cream border-sand text-forest hover:bg-sand'
        }`}
      >
        ⚙️
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in border ${
          isDark ? 'bg-night-card border-night-border' : 'bg-white border-sand'
        }`}>
          {/* Light option */}
          <button
            onClick={() => select(false)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors cursor-pointer border-0 ${
              !isDark
                ? isDark ? 'bg-night-surface' : 'bg-cream'
                : isDark ? 'hover:bg-night-surface' : 'hover:bg-cream'
            }`}
          >
            <span className={`w-8 h-8 flex items-center justify-center rounded-full text-base flex-shrink-0 ${
              !isDark ? 'bg-forest text-white' : isDark ? 'bg-night-surface text-night-muted' : 'bg-sand text-muted'
            }`}>☀️</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold leading-tight ${isDark ? 'text-night-text' : 'text-dark'}`}>Light</p>
              <p className={`text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>Always light theme</p>
            </div>
            {!isDark && <span className="text-moss text-base">✓</span>}
          </button>

          <div className={`mx-4 h-px ${isDark ? 'bg-night-border' : 'bg-sand'}`} />

          {/* Dark option */}
          <button
            onClick={() => select(true)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors cursor-pointer border-0 ${
              isDark
                ? 'bg-night-surface'
                : 'hover:bg-cream'
            } ${!isDark && 'hover:bg-cream'}`}
          >
            <span className={`w-8 h-8 flex items-center justify-center rounded-full text-base flex-shrink-0 ${
              isDark ? 'bg-night-primary/20 text-night-primary' : 'bg-sand text-muted'
            }`}>🌙</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold leading-tight ${isDark ? 'text-night-text' : 'text-dark'}`}>Dark</p>
              <p className={`text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>Always dark theme</p>
            </div>
            {isDark && <span className="text-night-primary text-base">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
