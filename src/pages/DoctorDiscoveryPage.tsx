import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Info } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SafeImage } from '../components/SafeImage';
import { useLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum, translateLanguagesList } from '../utils/i18nHelpers';

const SPECIALIZATIONS = ['General Physician', 'Pediatrician', 'Gynecologist', 'Preventive Care'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DoctorDiscoveryPage() {
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('all');
  const [language, setLanguage] = useState('all');
  const [day, setDay] = useState('all');
  const [maxFee, setMaxFee] = useState('');
  const [sort, setSort] = useState('fee_asc');
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    specialization !== 'all' ||
    language !== 'all' ||
    day !== 'all' ||
    Boolean(maxFee.trim());

  const resetFilters = () => {
    setSearch('');
    setSpecialization('all');
    setLanguage('all');
    setDay('all');
    setMaxFee('');
    setSort('fee_asc');
  };

  const fetchDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { sort };
      if (search.trim()) params.search = search.trim();
      if (specialization !== 'all') params.specialization = specialization;
      if (language !== 'all') params.language = language;
      if (day !== 'all') params.day = day;
      if (maxFee.trim()) params.maxFee = maxFee.trim();

      const res = await api.get('/doctors', { params });
      setDoctors(res.data.doctors || []);
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 180);
    return () => clearTimeout(timer);
  }, [search, specialization, language, day, maxFee, sort]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-slate-950">{t('discovery.title')}</h1>
          <p className="text-sm text-slate-600 max-w-2xl">{t('discovery.subtitle')}</p>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('discovery.searchPlaceholder')}
                aria-label={t('discovery.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
              />
            </div>

            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              aria-label={t('discovery.allSpecializations')}
              className="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            >
              <option value="all">{t('discovery.allSpecializations')}</option>
              {SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {translateEnum(t, 'specialization', spec)}
                </option>
              ))}
            </select>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t('discovery.allLanguages')}
              className="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            >
              <option value="all">{t('discovery.allLanguages')}</option>
              <option value="english">{translateEnum(t, 'language', 'english')}</option>
              <option value="telugu">{translateEnum(t, 'language', 'telugu')}</option>
              <option value="hindi">{translateEnum(t, 'language', 'hindi')}</option>
            </select>

            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label={t('discovery.anyDay')}
              className="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            >
              <option value="all">{t('discovery.anyDay')}</option>
              <option value="available_only">{t('discovery.availableOnly')}</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {translateEnum(t, 'day', d)}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label={t('discovery.sortFeeLow')}
              className="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            >
              <option value="fee_asc">{t('discovery.sortFeeLow')}</option>
              <option value="fee_desc">{t('discovery.sortFeeHigh')}</option>
              <option value="experience_desc">{t('discovery.sortExp')}</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <label htmlFor="maxFee">{t('discovery.maxFeeLabel')}:</label>
              <input
                id="maxFee"
                type="number"
                min={0}
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
                placeholder={t('discovery.maxFeePlaceholder')}
                className="w-28 px-2.5 py-1.5 text-xs rounded-md border border-emerald-950/15 bg-[#F8FAF9]"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {doctors.length}{' '}
                {doctors.length === 1 ? t('common.doctorSingular') : t('common.doctorPlural')}
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-emerald-950/10 rounded-lg cursor-pointer"
              >
                {t('discovery.reset')}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchDoctors}
              className="text-xs font-semibold underline cursor-pointer shrink-0"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-white border border-emerald-950/10 animate-pulse"
              />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white border border-emerald-950/10 rounded-xl p-8 sm:p-10 text-center space-y-3 max-w-xl mx-auto">
            {hasActiveFilters ? (
              <>
                <p className="text-sm text-slate-700 font-medium">{t('discovery.emptyFiltered')}</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 text-xs font-semibold text-emerald-800 border border-emerald-700/20 rounded-lg cursor-pointer"
                >
                  {t('discovery.reset')}
                </button>
              </>
            ) : (
              <>
                <Info className="w-6 h-6 text-emerald-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-900">
                  {t('discovery.emptyDatabaseTitle')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('discovery.emptyDatabaseHint')}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <article
                key={doc.id}
                className="bg-white border border-emerald-950/10 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <SafeImage
                      src={doc.avatar_url}
                      alt={doc.full_name}
                      className="w-16 h-16 rounded-lg object-cover border border-emerald-950/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-900 truncate">
                        {doc.full_name}
                      </h2>
                      <p className="text-xs text-slate-600 truncate">{doc.qualification}</p>
                      <div className="text-xs text-emerald-800 mt-1">
                        <span>{translateEnum(t, 'specialization', doc.specialization)}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="tabular-nums">
                          {doc.experience_years} {t('common.yrs')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-3">{doc.bio}</p>

                  <div className="space-y-1 text-xs text-slate-500">
                    <div>
                      {t('discovery.languagesLabel')}:{' '}
                      <span className="text-slate-700">
                        {translateLanguagesList(t, doc.languages_spoken)}
                      </span>
                    </div>
                    <div>
                      {t('discovery.statusLabel')}:{' '}
                      <span className="text-emerald-800 font-medium">
                        {doc.verification_status === 'verified'
                          ? doc.is_sample
                            ? t('common.sampleLabel')
                            : t('common.verifiedLabel')
                          : t('common.pendingLabel')}
                      </span>
                    </div>
                    <div>
                      {t('discovery.availableLabel')}:{' '}
                      <span className="text-slate-700">
                        {(doc.availability || [])
                          .map((a: any) => translateEnum(t, 'dayShort', a.day_of_week))
                          .join(' · ') || t('discovery.bySchedule')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#F8FAF9] border-t border-emerald-950/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      ₹{doc.consultation_fee}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{t('common.feePerSession')}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-emerald-950/15 hover:border-emerald-700 rounded-lg cursor-pointer"
                    >
                      {t('discovery.viewProfile')}
                    </button>
                    <Link
                      to={`/doctors/${doc.id}`}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
                    >
                      {t('discovery.bookAppointment')}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Doctor Profile Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-emerald-950/10 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <SafeImage
                  src={previewDoc.avatar_url}
                  alt={previewDoc.full_name}
                  className="w-16 h-16 rounded-lg object-cover border border-emerald-950/10 shrink-0"
                />
                <div>
                  <h2 className="text-lg font-display font-bold text-slate-950">
                    {previewDoc.full_name}
                  </h2>
                  <p className="text-xs text-slate-600">{previewDoc.qualification}</p>
                  <p className="text-xs font-medium text-emerald-800 mt-0.5">
                    {translateEnum(t, 'specialization', previewDoc.specialization)} ·{' '}
                    {previewDoc.experience_years} {t('common.yearsExp')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label={t('common.closeModal')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{previewDoc.bio}</p>

            <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 text-xs space-y-1.5 text-slate-700">
              <div>
                <strong>{t('discovery.modal.clinicDesk')}:</strong>{' '}
                {previewDoc.clinic_location || t('common.telemedicine')}
              </div>
              <div>
                <strong>{t('discovery.modal.languagesSpoken')}:</strong>{' '}
                {translateLanguagesList(t, previewDoc.languages_spoken)}
              </div>
              <div>
                <strong>{t('discovery.modal.consultationFee')}:</strong>{' '}
                <span className="font-mono font-bold">₹{previewDoc.consultation_fee}</span>
              </div>
              <div>
                <strong>{t('discovery.modal.weeklyHours')}:</strong>{' '}
                {(previewDoc.availability || [])
                  .map(
                    (a: any) =>
                      `${translateEnum(t, 'dayShort', a.day_of_week)} (${a.start_time}-${a.end_time})`
                  )
                  .join(', ') || t('discovery.modal.seeBookingPage')}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-emerald-950/15 rounded-lg cursor-pointer"
              >
                {t('common.close')}
              </button>
              <Link
                to={`/doctors/${previewDoc.id}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                {t('discovery.bookAppointment')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
