import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../hooks/useOffline';
import { useLanguage, type Language } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'zu', flag: '🇿🇦', label: 'ZU' },
  { code: 'af', flag: '🇿🇦', label: 'AF' },
  { code: 'st', flag: '🇿🇦', label: 'ST' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOffline = useOffline();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const navItems = [
    { to: '/dashboard',     icon: '🏠', label: t.navDashboard },
    { to: '/advisories',    icon: '📋', label: t.navAdvisories },
    { to: '/weather',       icon: '⛅', label: t.navWeather },
    { to: '/chatbot',       icon: '🤖', label: t.navChatbot },
    { to: '/calendar',      icon: '📅', label: 'Crop Calendar' },
    { to: '/yields',        icon: '🌾', label: 'Yield Reports' },
    { to: '/fields',        icon: '🗺️', label: 'My Fields' },
    { to: '/subsidies',     icon: '📦', label: 'Resource Requests' },
    { to: '/community',     icon: '💬', label: 'Community' },
    { to: '/outbreaks',     icon: '🦠', label: 'Pest Outbreaks' },
    { to: '/notifications', icon: '🔔', label: t.navNotifications },
    { to: '/profile',       icon: '👤', label: t.navProfile },
  ];

  const adminItems = [
    { to: '/publish',   icon: '✏️', label: t.navPublish },
    { to: '/farmers',   icon: '👥', label: t.navFarmers },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/export',    icon: '📤', label: 'Export Reports' },
    { to: '/admin',     icon: '🛡️', label: t.navAdmin },
  ];

  // Bottom nav items (mobile — most used 5)
  const bottomNav = [
    { to: '/dashboard',     icon: '🏠', label: 'Home' },
    { to: '/advisories',    icon: '📋', label: 'Advisories' },
    { to: '/chatbot',       icon: '🤖', label: 'AI Chat' },
    { to: '/weather',       icon: '⛅', label: 'Weather' },
    { to: '/notifications', icon: '🔔', label: 'Alerts' },
  ];

  const { isDark } = useTheme();
  const handleLogout = () => { logout(); navigate('/'); };
  const currentLang = LANGUAGES.find(l => l.code === language)!;

  return (
    <div className={`flex h-screen overflow-hidden overscroll-none touch-pan-y ${isDark ? 'bg-night-bg' : 'bg-cream'}`} style={{ overscrollBehavior: 'none' }}>

      {/* ── Offline banner ── */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-center py-2 text-xs font-semibold flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Offline — showing cached data
        </div>
      )}

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-forest text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        ${isOffline ? 'top-8' : 'top-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-moss rounded-xl flex items-center justify-center text-lg shadow-sm">🌿</div>
          <div>
            <span className="font-serif text-base text-white leading-none block">RurAgriConnect</span>
            <span className="text-white/40 text-xs">KwaZulu-Natal</span>
          </div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-moss/30 border border-moss/40 flex items-center justify-center text-base flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
          <span className="mt-2 inline-block bg-earth/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
            {user?.role}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-bold">{t.navMain}</p>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150
                 ${isActive
                   ? 'bg-white/15 text-white border-r-2 border-mint'
                   : 'text-white/65 hover:bg-white/8 hover:text-white'}`
              }>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <p className="px-5 pt-4 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-bold">{t.navAdminTools}</p>
              {adminItems.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150
                     ${isActive
                       ? 'bg-white/15 text-white border-r-2 border-earth'
                       : 'text-white/65 hover:bg-white/8 hover:text-white'}`
                  }>
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-4 border-t border-white/10 safe-bottom">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOffline ? 'bg-amber-400' : 'bg-moss animate-pulse-ring'}`} />
            <span className="text-xs text-white/40">{isOffline ? 'Offline' : t.synced}</span>
          </div>
          <button onClick={handleLogout}
            className="w-full py-2.5 text-sm bg-white/8 border border-white/10 rounded-xl
                       hover:bg-red-600/50 hover:border-red-500/50 transition-all text-white/70 hover:text-white">
            {t.signOut}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className={`border-b px-3 md:px-6 flex items-center justify-between sticky z-10 transition-all ${isOffline ? 'top-8' : 'top-0'} ${isDark ? 'bg-night-surface border-night-border' : 'bg-white border-sand'}`}
                style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.75rem)`, paddingBottom: '0.75rem' }}>
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`md:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-lg transition-colors active:scale-95 border ${isDark ? 'bg-night-card border-night-border text-night-primary hover:bg-night-surface' : 'bg-cream border-sand text-forest hover:bg-sand'}`}>
              {sidebarOpen ? '✕' : '☰'}
            </button>
            {/* Logo text — desktop */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-7 h-7 bg-forest rounded-lg flex items-center justify-center text-sm">🌿</div>
              <span className={`font-serif text-base font-bold ${isDark ? 'text-night-primary' : 'text-forest'}`}>RurAgriConnect</span>
            </div>
            <span className={`md:hidden font-serif text-sm font-bold truncate ${isDark ? 'text-night-primary' : 'text-forest'}`}>RurAgriConnect</span>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            {/* ── Day / Night toggle ── */}
            <ThemeToggle />

            {/* Language switcher */}
            <div className="relative" ref={langRef}>
              <button onClick={() => setLangOpen(o => !o)}
                className={`flex items-center gap-1 md:gap-1.5 rounded-full px-2 md:px-3 py-1.5 md:py-2 text-sm font-medium hover:border-moss transition-colors active:scale-95 border ${isDark ? 'bg-night-card border-night-border text-night-muted' : 'bg-cream border-sand text-muted'}`}>
                <span className="text-base">{currentLang.flag}</span>
                <span className="text-xs hidden sm:block">{currentLang.label}</span>
                <span className="text-xs">▾</span>
              </button>
              {langOpen && (
                <div className={`absolute right-0 top-full mt-2 rounded-2xl shadow-xl z-50 overflow-hidden min-w-40 animate-scale-in border ${isDark ? 'bg-night-card border-night-border' : 'bg-white border-sand'}`}>
                  <p className={`px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.language}</p>
                  {LANGUAGES.map(lang => (
                    <button key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${isDark ? 'hover:bg-night-surface' : 'hover:bg-cream'} ${language === lang.code ? 'font-semibold text-forest' : isDark ? 'text-night-text' : 'text-dark'}`}>
                      <span>{lang.flag}</span>
                      <span>{t[`lang${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}` as keyof typeof t]}</span>
                      {language === lang.code && <span className="ml-auto text-moss text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Weather shortcut — desktop only */}
            <NavLink to="/weather"
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium hover:border-moss transition-colors border ${isDark ? 'bg-night-card border-night-border text-night-muted hover:text-night-primary' : 'bg-cream border-sand text-muted hover:text-forest'}`}>
              ⛅ <span className="hidden md:block text-xs">{t.navWeather}</span>
            </NavLink>

            {/* Notifications bell */}
            <NavLink to="/notifications"
              className={`relative w-9 h-9 flex items-center justify-center rounded-full hover:border-moss transition-colors text-xl active:scale-95 border ${isDark ? 'bg-night-card border-night-border' : 'bg-cream border-sand'}`}>
              🔔
              <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 ${isDark ? 'border-night-surface' : 'border-white'}`} />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0 overscroll-none ${isDark ? 'bg-night-bg' : 'bg-cream'}`}>
          <Outlet />
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className={`md:hidden fixed bottom-0 inset-x-0 z-20 border-t ${isDark ? 'bg-night-surface border-night-border' : 'bg-white border-sand'}`}
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
            {bottomNav.map(item => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink key={item.to} to={item.to}
                  className={`mobile-nav-item flex-1 min-w-0 ${isActive ? 'active' : ''}`}>
                  <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] truncate w-full text-center ${isActive ? (isDark ? 'text-night-primary font-bold' : 'text-forest font-bold') : (isDark ? 'text-night-muted' : 'text-muted')}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
