import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface DashboardShellProps {
  portalLabel: string;
  items: SidebarNavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  children: React.ReactNode;
  extraLinks?: Array<{ to: string; label: string }>;
}

export function DashboardShell({
  portalLabel,
  items,
  activeTab,
  onSelectTab,
  children,
  extraLinks = [],
}: DashboardShellProps) {
  const { user, logout } = useAuth();
  const { lang, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        <div className="px-2 pt-1">
          <Link to="/" className="text-base font-display font-bold text-emerald-900 block">
            {t('brand')}
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">{portalLabel}</p>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span
                    className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                      active ? 'bg-emerald-800 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {extraLinks.length > 0 && (
          <div className="pt-4 border-t border-emerald-950/10 space-y-1">
            {extraLinks.map((lnk) => (
              <Link
                key={lnk.to}
                to={lnk.to}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
              >
                {lnk.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-emerald-950/10 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-emerald-950/10">
        <div className="sticky top-0 h-screen overflow-y-auto">{navContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white h-full z-10 shadow-xl overflow-y-auto">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-2 text-slate-500 hover:text-slate-900"
              aria-label={t('common.closeSidebar')}
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-emerald-950/10 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-emerald-950/10 text-slate-700"
              aria-label={t('common.openMenu')}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span>{t('brand')}</span>
              <span className="mx-2" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900">{portalLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 border border-emerald-950/10 rounded-lg px-2.5 py-1.5 bg-[#F8FAF9]">
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <select
                aria-label={t('common.selectLanguage')}
                value={lang}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="text-xs font-medium bg-transparent text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="te">తెలుగు</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
            <Link
              to="/"
              className="hidden sm:inline-block text-xs font-medium text-emerald-800 hover:underline whitespace-nowrap shrink-0"
            >
              {t('common.backToHome')}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
