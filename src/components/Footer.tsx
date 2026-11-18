import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white border-t border-emerald-950/10 mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-emerald-950/10">
          <div className="md:col-span-2 space-y-2">
            <h3 className="text-base font-display font-bold text-emerald-900">{t('brand')}</h3>
            <p className="text-sm text-slate-600 max-w-md">{t('tagline')}</p>
            <p className="text-xs text-slate-500 pt-1">{t('footer.developedBy')}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">{t('footer.platformHeading')}</h4>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>
                <Link to="/doctors" className="hover:text-emerald-800">
                  {t('nav.doctors')}
                </Link>
              </li>
              <li>
                <Link to="/hospitals" className="hover:text-emerald-800">
                  {t('nav.hospitals')}
                </Link>
              </li>
              <li>
                <Link to="/health-tips" className="hover:text-emerald-800">
                  {t('nav.healthTips')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">{t('footer.portalsHeading')}</h4>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>
                <Link to="/login" className="hover:text-emerald-800">
                  {t('nav.login')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-800">
                  {t('nav.register')}
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-emerald-800">
                  {t('auth.forgotLink')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs text-slate-500">
          <p className="max-w-3xl">{t('disclaimer')}</p>
          <span className="whitespace-nowrap shrink-0">{t('footer.copyright')}</span>
        </div>
      </div>
    </footer>
  );
}
