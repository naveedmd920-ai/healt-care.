import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SafeImage } from '../components/SafeImage';
import { useLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum } from '../utils/i18nHelpers';

const ARTICLE_CATEGORIES = [
  'all',
  'General health',
  'Nutrition',
  'Hygiene',
  'Preventive healthcare',
  "Women's health",
  'Child healthcare',
  'Elderly care',
];

export function HealthTipsPage() {
  const { lang, t } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('all');
  const [articleLang, setArticleLang] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeArticle, setActiveArticle] = useState<any>(null);

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (category !== 'all') params.category = category;
      if (articleLang !== 'all') params.language = articleLang;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/articles', { params });
      setArticles(res.data.articles || []);
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [category, articleLang]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold text-slate-950">
              {t('healthTipsPage.title')}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">{t('healthTipsPage.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setArticleLang(lang)}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-950/15 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('healthTipsPage.matchLanguage')} ({lang.toUpperCase()})
          </button>
        </div>

        {/* Search & Language Filter */}
        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
                placeholder={t('healthTipsPage.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
              />
            </div>

            <select
              value={articleLang}
              onChange={(e) => setArticleLang(e.target.value)}
              className="md:col-span-3 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            >
              <option value="all">{t('common.all')}</option>
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>

            <button
              type="button"
              onClick={fetchArticles}
              className="md:col-span-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              {t('common.search')}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ARTICLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-[#F8FAF9] text-slate-700 border-emerald-950/10 hover:border-emerald-700/40'
                }`}
              >
                {cat === 'all'
                  ? t('healthTipsPage.allCategories')
                  : translateEnum(t, 'articleCategory', cat)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-white border border-emerald-950/10 animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="p-10 bg-white border border-emerald-950/10 rounded-xl text-center text-sm text-slate-600">
            {t('healthTipsPage.noMatch')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((art) => (
              <article
                key={art.id}
                className="bg-white border border-emerald-950/10 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-emerald-50 overflow-hidden">
                    <SafeImage
                      src={art.image_url}
                      alt={art.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="text-xs text-slate-500">
                      <span className="text-emerald-800 font-medium">
                        {translateEnum(t, 'articleCategory', art.category)}
                      </span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="uppercase">{art.language}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono tabular-nums">{art.published_date}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{art.title}</h2>
                    <p className="text-sm text-slate-600 line-clamp-3">{art.short_description}</p>
                  </div>
                </div>
                <div className="px-5 py-3.5 border-t border-emerald-950/10 bg-[#F8FAF9]">
                  <button
                    type="button"
                    onClick={() => setActiveArticle(art)}
                    className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                  >
                    {t('healthTipsPage.readFullGuide')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-emerald-950/10 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">
                  <span className="text-emerald-800 font-semibold">
                    {translateEnum(t, 'articleCategory', activeArticle.category)}
                  </span>
                  <span className="mx-1.5">·</span>
                  <span>
                    {t('healthTipsPage.published')} {activeArticle.published_date}
                  </span>
                  <span className="mx-1.5">·</span>
                  <span>{t('healthTipsPage.reviewedGuide')}</span>
                </div>
                <h2 className="text-xl font-display font-bold text-slate-950 mt-1">
                  {activeArticle.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label={t('healthTipsPage.closeArticle')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-emerald-50">
              <SafeImage
                src={activeArticle.image_url}
                alt={activeArticle.title}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-sm font-medium text-slate-700">{activeArticle.short_description}</p>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {activeArticle.content}
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {t('healthTipsPage.medicalDisclaimer')}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
