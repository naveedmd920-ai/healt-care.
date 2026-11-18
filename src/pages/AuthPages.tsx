import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isValidPhone(val: string): boolean {
  const cleaned = val.replace(/[\s\-()]/g, '').trim();
  return /^[+]?[0-9]{8,15}$/.test(cleaned);
}

function isStrongPassword(val: string): boolean {
  return val.length >= 8 && /[A-Za-z]/.test(val) && /\d/.test(val);
}

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const demoAccounts = [
    {
      labelKey: 'auth.demoAccounts.patientLabel',
      roleKey: 'auth.demoAccounts.patientRole',
      email: 'patient@ruralhealth.demo',
      phone: '9848011122',
    },
    {
      labelKey: 'auth.demoAccounts.doctorVerifiedLabel',
      roleKey: 'auth.demoAccounts.doctorVerifiedRole',
      email: 'dr.ananya@ruralhealth.demo',
      phone: '9848022233',
    },
    {
      labelKey: 'auth.demoAccounts.doctorPendingLabel',
      roleKey: 'auth.demoAccounts.doctorPendingRole',
      email: 'dr.kiran@ruralhealth.demo',
      phone: '9848055566',
    },
    {
      labelKey: 'auth.demoAccounts.adminLabel',
      roleKey: 'auth.demoAccounts.adminRole',
      email: 'admin@ruralhealth.demo',
      phone: '9848099900',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = identifier.trim();
    if (!isValidEmail(trimmed) && !isValidPhone(trimmed)) {
      setError(t('auth.validation.invalidIdentifier'));
      return;
    }
    if (!password) {
      setError(t('auth.validation.passwordRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(trimmed, password);
      if (redirectPath && redirectPath.startsWith('/')) {
        navigate(redirectPath, { replace: true });
      } else {
        navigate(getDashboardPathForRole(user.role), { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-950">
                {t('auth.loginTitle')}
              </h1>
              <p className="text-sm text-slate-600 mt-1">{t('auth.loginSubtitle')}</p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-medium text-slate-800 mb-1"
                >
                  {t('auth.emailOrPhone')}
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('auth.emailOrPhonePlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="text-sm font-medium text-slate-800">
                    {t('auth.password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-emerald-800 hover:underline"
                  >
                    {t('auth.forgotLink')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? t('auth.signingIn') : t('auth.signInBtn')}
              </button>
            </form>

            <p className="text-sm text-slate-600">
              {t('auth.newToPlatform')}{' '}
              <Link
                to={redirectPath ? `/register?redirect=${encodeURIComponent(redirectPath)}` : '/register'}
                className="font-semibold text-emerald-800 hover:underline"
              >
                {t('auth.createAccountBtn')}
              </Link>
            </p>
          </div>

          <aside className="md:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">{t('auth.demoTitle')}</h2>
            <p className="text-xs text-slate-600">{t('auth.demoSubtitle')}</p>
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setIdentifier(acc.email);
                    setPassword('Demo@1234');
                    setError('');
                  }}
                  className="w-full text-left p-3 rounded-lg border border-emerald-950/10 bg-[#F8FAF9] hover:border-emerald-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                    <span>{t(acc.labelKey)}</span>
                    <span className="text-emerald-800">{t(acc.roleKey)}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-600 mt-0.5">
                    {acc.email} · {acc.phone}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: 'male',
    villageTown: '',
    district: 'Medchal-Malkajgiri',
    preferredLanguage: lang as SupportedLanguage,
    role: 'patient',
    qualification: 'MBBS',
    specialization: 'General Physician',
    experienceYears: '3',
    registrationNumber: '',
    councilName: 'Telangana State Medical Council',
    consentAccepted: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (form.fullName.trim().length < 2) {
      setError(t('auth.validation.fullNameMin'));
      return;
    }
    if (!isValidPhone(form.phone)) {
      setError(t('auth.validation.invalidPhone'));
      return;
    }
    if (!isValidEmail(form.email)) {
      setError(t('auth.validation.invalidEmail'));
      return;
    }
    if (!isStrongPassword(form.password)) {
      setError(t('auth.validation.passwordStrength'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth.validation.passwordMismatch'));
      return;
    }
    const ageNum = Number(form.age);
    if (!form.age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError(t('auth.validation.invalidAge'));
      return;
    }
    if (form.villageTown.trim().length < 2) {
      setError(t('auth.validation.villageRequired'));
      return;
    }
    if (
      form.role === 'doctor' &&
      (!form.qualification.trim() || !form.specialization.trim() || !form.registrationNumber.trim())
    ) {
      setError(t('auth.validation.doctorFieldsRequired'));
      return;
    }
    if (!form.consentAccepted) {
      setError(t('auth.validation.consentRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        villageTown: form.villageTown.trim(),
      });
      setSuccessMsg(t('auth.registrationSuccess'));
      if (redirectPath && redirectPath.startsWith('/') && user.role === 'patient') {
        navigate(redirectPath, { replace: true });
      } else {
        navigate(getDashboardPathForRole(user.role), { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setSubmitting(false);
    }
  };

  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[760px] w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white border border-emerald-950/10 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-950">
              {t('auth.registerTitle')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t('auth.registerSubtitle')}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.role')}
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                >
                  <option value="patient">{t('auth.patient')}</option>
                  <option value="doctor">{t('auth.doctor')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.preferredLanguage')}
                </label>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) =>
                    setForm({ ...form, preferredLanguage: e.target.value as SupportedLanguage })
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                >
                  <option value="en">English</option>
                  <option value="te">తెలుగు</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.phone')}
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t('auth.phonePlaceholder')}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{t('auth.passwordHint')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={`w-full pl-3 pr-10 py-2.5 text-sm rounded-lg border bg-[#F8FAF9] ${
                      passwordsMismatch ? 'border-red-500' : 'border-emerald-950/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="text-xs text-red-700 mt-1">
                    {t('auth.validation.passwordMismatch')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.age')}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.gender')}
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                >
                  <option value="male">{t('auth.male')}</option>
                  <option value="female">{t('auth.female')}</option>
                  <option value="other">{t('auth.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.villageTown')}
                </label>
                <input
                  type="text"
                  required
                  value={form.villageTown}
                  onChange={(e) => setForm({ ...form, villageTown: e.target.value })}
                  placeholder={t('auth.villagePlaceholder')}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>
            </div>

            {form.role === 'doctor' && (
              <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-700/20 space-y-3">
                <div className="text-xs font-semibold text-emerald-900">
                  {t('auth.doctorVerificationHeading')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    placeholder={t('auth.qualificationPlaceholder')}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  />
                  <input
                    type="text"
                    required
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder={t('auth.specializationPlaceholder')}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  />
                  <input
                    type="text"
                    required
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    placeholder={t('auth.regNumberPlaceholder')}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  />
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                    placeholder={t('auth.experiencePlaceholder')}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-white"
                  />
                </div>
              </div>
            )}

            <label className="flex items-start gap-2.5 text-xs text-slate-600 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentAccepted}
                onChange={(e) => setForm({ ...form, consentAccepted: e.target.checked })}
                className="mt-0.5 accent-emerald-700"
              />
              <span>{t('auth.consentText')}</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
            </button>
          </form>

          <p className="text-sm text-slate-600">
            {t('auth.alreadyRegistered')}{' '}
            <Link
              to={redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login'}
              className="font-semibold text-emerald-800 hover:underline"
            >
              {t('auth.signInBtn')}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [demoOtpNotice, setDemoOtpNotice] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError(t('auth.validation.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setDemoOtpNotice(t('auth.forgot.demoOtpNotice', { otp: res.data.demoOtp }));
      setStep('reset');
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(newPassword)) {
      setError(t('auth.validation.passwordStrength'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setStep('done');
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[520px] w-full mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-emerald-950/10 rounded-xl p-6 sm:p-8 space-y-5">
          <h1 className="text-2xl font-display font-bold text-slate-950">{t('auth.resetTitle')}</h1>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {demoOtpNotice && step === 'reset' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 font-mono">
              {demoOtpNotice}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-sm text-slate-600">{t('auth.forgot.instruction')}</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                {loading ? t('common.loading') : t('auth.forgot.generateOtp')}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.forgot.otpLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={t('auth.forgot.otpPlaceholder')}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.forgot.newPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('auth.forgot.newPasswordPlaceholder')}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                {loading ? t('common.loading') : t('auth.forgot.resetBtn')}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                {t('auth.forgot.successMessage')}
              </div>
              <Link
                to="/login"
                className="block w-full text-center py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg"
              >
                {t('auth.forgot.goToLogin')}
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
