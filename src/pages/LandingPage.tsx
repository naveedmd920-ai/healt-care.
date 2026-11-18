import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  Stethoscope,
  CheckCircle2,
  Languages,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SafeImage } from '../components/SafeImage';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum, translateLanguagesList } from '../utils/i18nHelpers';

const HERO_IMAGE = '/src/assets/images/hero_rural_telemedicine_1795011401901.jpg';

export function LandingPage() {
  const { lang, t, setLanguage } = useLanguage();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [contactForm, setContactForm] = useState({
    name: '',
    emailOrPhone: '',
    village: '',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [submittingContact, setSubmittingContact] = useState(false);

  useEffect(() => {
    api
      .get('/doctors')
      .then((res) => setDoctors((res.data.doctors || []).slice(0, 3)))
      .catch(() => {});
    api
      .get('/hospitals')
      .then((res) => setHospitals((res.data.hospitals || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus(null);
    setSubmittingContact(true);
    try {
      const res = await api.post('/contact', contactForm);
      setContactStatus({ type: 'success', text: res.data.message });
      setContactForm({ name: '', emailOrPhone: '', village: '', message: '' });
    } catch (err) {
      setContactStatus({
        type: 'error',
        text: getApiErrorMessage(err, t('common.genericError')),
      });
    } finally {
      setSubmittingContact(false);
    }
  };

  const challenges = t('landing.challenges', { returnObjects: true }) as Array<{
    num: string;
    title: string;
    desc: string;
  }>;
  const solutionPoints = t('landing.solutionPoints', { returnObjects: true }) as string[];
  const steps = t('landing.steps', { returnObjects: true }) as Array<{
    step: string;
    detail: string;
  }>;
  const benefits = t('landing.benefits', { returnObjects: true }) as Array<{
    title: string;
    desc: string;
  }>;
  const faqs = t('landing.faqs', { returnObjects: true }) as Array<{
    q: string;
    a: string;
  }>;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="bg-white border-b border-emerald-950/10">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="text-sm font-medium text-emerald-800">
                  <span>{t('tagline')}</span>
                  <span className="mx-2 text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums">{t('hero.feeHighlight')}</span>
                </div>

                <h1 className="text-[clamp(2.15rem,4vw,3.35rem)] leading-[1.12] font-display font-bold tracking-tight text-slate-950 [text-wrap:balance]">
                  {t('hero.heading')}
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  {t('hero.subtitle')}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to="/doctors"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>{t('hero.ctaPrimary')}</span>
                  </Link>

                  <Link
                    to="/hospitals"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-700/20 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{t('hero.ctaHospitals')}</span>
                  </Link>

                  {user ? (
                    <Link
                      to={getDashboardPathForRole(user.role)}
                      className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-slate-700 hover:text-emerald-800 underline underline-offset-4 whitespace-nowrap shrink-0"
                    >
                      <span>{t('nav.dashboard')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 pl-1">
                      <Link
                        to="/login"
                        className="px-4 py-3 text-sm font-semibold text-slate-800 hover:text-emerald-800 border border-emerald-950/15 bg-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {t('hero.ctaLogin')}
                      </Link>
                      <Link
                        to="/register"
                        className="px-4 py-3 text-sm font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-4 whitespace-nowrap shrink-0"
                      >
                        {t('hero.ctaRegister')}
                      </Link>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 pt-1">{t('hero.costTransparency')}</p>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-emerald-950/10 bg-emerald-950/5">
                  <SafeImage
                    src={HERO_IMAGE}
                    alt={t('hero.imageAlt')}
                    className="w-full h-full object-cover"
                    fallbackLabel={t('brand')}
                  />
                </div>
              </div>
            </div>

            {/* 4-column key metrics strip below hero */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-10 mt-10 border-t border-emerald-950/10">
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-2xl font-display font-bold text-emerald-800 font-mono tabular-nums">
                  {t('hero.metrics.feeValue')}
                </div>
                <div className="text-xs text-slate-600 mt-1">{t('hero.metrics.feeLabel')}</div>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-2xl font-display font-bold text-teal-800 font-mono tabular-nums">
                  {t('hero.metrics.opCostValue')}
                </div>
                <div className="text-xs text-slate-600 mt-1">{t('hero.metrics.opCostLabel')}</div>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-2xl font-display font-bold text-slate-900">
                  {t('hero.metrics.langValue')}
                </div>
                <div className="text-xs text-slate-600 mt-1">{t('hero.metrics.langLabel')}</div>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-2xl font-display font-bold text-slate-900">
                  {t('hero.metrics.portalValue')}
                </div>
                <div className="text-xs text-slate-600 mt-1">{t('hero.metrics.portalLabel')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEM STATEMENT */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950 tracking-tight [text-wrap:balance]">
              {t('landing.problemTitle')}
            </h2>
            <p className="text-base text-slate-600 mt-2">{t('landing.problemSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-emerald-950/10 border border-emerald-950/10 rounded-xl overflow-hidden">
            {Array.isArray(challenges) &&
              challenges.map((item) => (
                <div key={item.num} className="bg-white p-6 space-y-2">
                  <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700">
                    {item.num}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
          </div>
        </section>

        {/* 4. PROJECT SOLUTION & 5. HOW IT WORKS */}
        <section id="how-it-works" className="bg-white border-y border-emerald-950/10 py-16">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950 tracking-tight [text-wrap:balance]">
                  {t('landing.solutionTitle')}
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  {t('landing.solutionSubtitle')}
                </p>
                <div className="pt-2 space-y-2.5 text-sm text-slate-700">
                  {Array.isArray(solutionPoints) &&
                    solutionPoints.map((pt) => (
                      <div key={pt} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="lg:col-span-7">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  {t('landing.howItWorksTitle')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.isArray(steps) &&
                    steps.map((s) => (
                      <div
                        key={s.step}
                        className="p-5 rounded-xl bg-[#F8FAF9] border border-emerald-950/10 space-y-1.5"
                      >
                        <h4 className="text-sm font-semibold text-emerald-900">{s.step}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. MAIN FEATURES (Asymmetric Bento) */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950 tracking-tight">
              {t('landing.featuresTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-6 rounded-xl bg-white border border-emerald-950/10 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-emerald-700">
                  {t('landing.bento.workflowEyebrow')}
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900">
                  {t('landing.bento.workflowTitle')}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                  {t('landing.bento.workflowDesc')}
                </p>
              </div>
              <div>
                <Link
                  to="/doctors"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
                >
                  <span>{t('landing.bento.browseDirectory')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-emerald-900 text-white space-y-3">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
              <h3 className="text-lg font-display font-bold">{t('landing.bento.rbacTitle')}</h3>
              <p className="text-sm text-emerald-100 leading-relaxed">
                {t('landing.bento.rbacDesc')}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white border border-emerald-950/10 space-y-2">
              <MapPin className="w-5 h-5 text-teal-700" />
              <h3 className="text-base font-semibold text-slate-900">
                {t('landing.bento.mapTitle')}
              </h3>
              <p className="text-sm text-slate-600">{t('landing.bento.mapDesc')}</p>
            </div>

            <div className="p-6 rounded-xl bg-white border border-emerald-950/10 space-y-2">
              <Languages className="w-5 h-5 text-teal-700" />
              <h3 className="text-base font-semibold text-slate-900">
                {t('landing.bento.langTitle')}
              </h3>
              <p className="text-sm text-slate-600">{t('landing.bento.langDesc')}</p>
            </div>

            <div className="p-6 rounded-xl bg-white border border-emerald-950/10 space-y-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-slate-900">
                {t('landing.bento.libraryTitle')}
              </h3>
              <p className="text-sm text-slate-600">{t('landing.bento.libraryDesc')}</p>
            </div>
          </div>
        </section>

        {/* 7. DOCTOR CONSULTATION SECTION (Live DB preview) */}
        <section className="bg-white border-y border-emerald-950/10 py-16">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950">
                  {t('landing.doctorsTitle')}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{t('landing.doctorsNote')}</p>
              </div>
              <Link
                to="/doctors"
                className="text-sm font-semibold text-emerald-800 hover:underline whitespace-nowrap shrink-0"
              >
                {t('landing.viewAllDoctors')}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-emerald-950/10 bg-[#F8FAF9] overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <SafeImage
                        src={doc.avatar_url}
                        alt={doc.full_name}
                        className="w-16 h-16 rounded-lg object-cover border border-emerald-950/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {doc.full_name}
                        </h3>
                        <p className="text-xs text-slate-600 truncate">{doc.qualification}</p>
                        <div className="text-xs text-emerald-800 mt-1">
                          <span>{translateEnum(t, 'specialization', doc.specialization)}</span>
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span className="tabular-nums">
                            {doc.experience_years} {t('common.yrsExpShort')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2">{doc.bio}</p>

                    <div className="text-xs text-slate-500">
                      <span>{translateLanguagesList(t, doc.languages_spoken)}</span>
                      {doc.is_sample ? (
                        <>
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-amber-700 font-medium">
                            {t('common.sampleLabel')}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-white border-t border-emerald-950/10 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      ₹{doc.consultation_fee}
                    </span>
                    <Link
                      to={`/doctors/${doc.id}`}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
                    >
                      {t('dashboards.bookSlot')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. NEARBY HOSPITAL SECTION */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950">
                {t('landing.hospitalsTitle')}
              </h2>
              <p className="text-sm text-slate-600 mt-1">{t('landing.hospitalsSubtitle')}</p>
            </div>
            <Link
              to="/hospitals"
              className="px-4 py-2 text-sm font-semibold text-emerald-900 bg-white border border-emerald-950/15 hover:border-emerald-700 rounded-lg whitespace-nowrap shrink-0"
            >
              {t('landing.openMap')}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hospitals.map((h) => (
              <div
                key={h.id}
                className="p-5 rounded-xl bg-white border border-emerald-950/10 space-y-2"
              >
                <div className="text-xs text-teal-800 font-medium">
                  <span>{translateEnum(t, 'hospitalCategory', h.category)}</span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span>{h.village_town}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{h.name}</h3>
                <p className="text-sm text-slate-600">{h.address}</p>
                <p className="text-xs text-slate-500 pt-1">{h.facilities}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. MULTILINGUAL SUPPORT & 10. HEALTHCARE BENEFITS */}
        <section className="bg-white border-y border-emerald-950/10 py-16">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="p-6 rounded-xl bg-[#F8FAF9] border border-emerald-950/10 space-y-4">
              <h2 className="text-2xl font-display font-bold text-slate-950">
                {t('landing.multilingualTitle')}
              </h2>
              <p className="text-sm text-slate-600">{t('landing.multilingualSubtitle')}</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { code: 'en', label: 'English' },
                    { code: 'te', label: 'తెలుగు (Telugu)' },
                    { code: 'hi', label: 'हिन्दी (Hindi)' },
                  ] as Array<{ code: SupportedLanguage; label: string }>
                ).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                      lang === item.code
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-800 border-emerald-950/15 hover:bg-emerald-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-display font-bold text-slate-950">
                {t('landing.benefitsTitle')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {Array.isArray(benefits) &&
                  benefits.map((b) => (
                    <div
                      key={b.title}
                      className="p-4 rounded-lg border border-emerald-950/10 bg-[#F8FAF9]"
                    >
                      <div className="font-semibold text-slate-900">{b.title}</div>
                      <p className="text-slate-600 mt-1">{b.desc}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* 11. FAQ & 12. CONTACT SECTION */}
        <section id="contact" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-2xl font-display font-bold text-slate-950">
                {t('landing.faqTitle')}
              </h2>
              <div className="divide-y divide-emerald-950/10 border border-emerald-950/10 rounded-xl bg-white">
                {Array.isArray(faqs) &&
                  faqs.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div key={idx} className="p-4">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{faq.a}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="p-6 rounded-xl bg-white border border-emerald-950/10 space-y-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-950">
                    {t('landing.contactTitle')}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">{t('landing.contactTeam')}</p>
                </div>

                {contactStatus && (
                  <div
                    className={`p-3 rounded-lg text-sm border ${
                      contactStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    {contactStatus.text}
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {t('landing.contactForm.nameLabel')}
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder={t('landing.contactForm.namePlaceholder')}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {t('landing.contactForm.contactLabel')}
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.emailOrPhone}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, emailOrPhone: e.target.value })
                        }
                        placeholder={t('landing.contactForm.contactPlaceholder')}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('landing.contactForm.villageLabel')}
                    </label>
                    <input
                      type="text"
                      value={contactForm.village}
                      onChange={(e) => setContactForm({ ...contactForm, village: e.target.value })}
                      placeholder={t('landing.contactForm.villagePlaceholder')}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('landing.contactForm.messageLabel')}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder={t('landing.contactForm.messagePlaceholder')}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingContact}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    {submittingContact
                      ? t('landing.contactForm.sending')
                      : t('landing.contactForm.submit')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
