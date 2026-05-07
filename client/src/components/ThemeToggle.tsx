import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 flex items-center justify-center rounded-full border transition-all active:scale-90 cursor-pointer text-xl
        bg-transparent border-transparent hover:scale-110"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
