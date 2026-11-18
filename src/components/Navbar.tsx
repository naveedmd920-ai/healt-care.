import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Globe, LogOut } from 'lucide-react';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const { lang, t, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  const handleSectionLink = (hash: string) => {
    setMobileOpen(false);
    if (isHome) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${hash}`);
    }
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-950/10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Wordmark */}
        <Link
          to="/"
          className="text-lg font-display font-bold tracking-tight text-emerald-900 whitespace-nowrap shrink-0"
        >
          {t('brand')}
        </Link>

        {/* Zone 2: Concise navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link
            to="/doctors"
            className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            {t('nav.doctors')}
          </Link>
          <Link
            to="/hospitals"
            className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            {t('nav.hospitals')}
          </Link>
          <Link
            to="/health-tips"
            className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            {t('nav.healthTips')}
          </Link>
          <button
            type="button"
            onClick={() => handleSectionLink('how-it-works')}
            className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('nav.howItWorks')}
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('contact')}
            className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('nav.contact')}
          </button>
        </nav>

        {/* Zone 3: Language Switcher + Primary Action */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 border border-emerald-950/10 rounded-lg px-2 py-1 bg-[#F8FAF9]">
            <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
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

          {user ? (
            <>
              <Link
                to={getDashboardPathForRole(user.role)}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {t('nav.dashboard')}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 border border-emerald-950/15 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('nav.logout')}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 text-sm font-semibold text-emerald-900 border border-emerald-700/25 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={t('common.toggleMenu')}
          className="lg:hidden p-2.5 rounded-lg border border-emerald-950/10 text-slate-700 hover:bg-emerald-50"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-emerald-950/10 bg-white px-4 py-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10">
            <span className="text-xs font-medium text-slate-500">{t('auth.preferredLanguage')}</span>
            <div className="flex gap-1">
              {(['en', 'te', 'hi'] as SupportedLanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                    lang === code
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-emerald-950/15'
                  }`}
                >
                  {code === 'en' ? 'EN' : code === 'te' ? 'తెలుగు' : 'हिन्दी'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50"
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/doctors"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50"
            >
              {t('nav.doctors')}
            </Link>
            <Link
              to="/hospitals"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50"
            >
              {t('nav.hospitals')}
            </Link>
            <Link
              to="/health-tips"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50"
            >
              {t('nav.healthTips')}
            </Link>
            <button
              type="button"
              onClick={() => handleSectionLink('how-it-works')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50"
            >
              {t('nav.howItWorks')}
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('contact')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50"
            >
              {t('nav.contact')}
            </button>
          </div>

          <div className="pt-2 border-t border-emerald-950/10 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to={getDashboardPathForRole(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg"
                >
                  {t('nav.dashboard')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-center px-4 py-2.5 text-sm font-medium text-slate-700 border border-emerald-950/15 rounded-lg"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 text-sm font-semibold text-emerald-800 border border-emerald-700 rounded-lg"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
