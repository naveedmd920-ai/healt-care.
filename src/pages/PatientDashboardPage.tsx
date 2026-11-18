import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarClock,
  FileCheck2,
  Bell,
  UserCog,
  CreditCard,
  Stethoscope,
  MapPin,
  BookOpen,
  X,
  Clock,
} from 'lucide-react';
import { DashboardShell, SidebarNavItem } from '../components/DashboardShell';
import { useAuth } from '../context/AuthContext';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum } from '../utils/i18nHelpers';

export function PatientDashboardPage() {
  const { refreshUser } = useAuth();
  const { t, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [notesModalAppt, setNotesModalAppt] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    age: '',
    gender: 'male',
    villageTown: '',
    district: '',
    bloodGroup: '',
    emergencyContact: '',
    medicalNotes: '',
    preferredLanguage: 'en',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/patient/dashboard');
      setData(res.data);
      const p = res.data.profile;
      if (p) {
        setProfileForm({
          fullName: p.full_name || '',
          phone: p.phone || '',
          age: p.age ? String(p.age) : '',
          gender: p.gender || 'male',
          villageTown: p.village_town || '',
          district: p.district || '',
          bloodGroup: p.blood_group || '',
          emergencyContact: p.emergency_contact || '',
          medicalNotes: p.medical_notes || '',
          preferredLanguage: p.preferred_language || 'en',
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openCancelModal = (appt: any) => {
    setCancelTarget(appt);
    setCancelReason('');
  };

  const confirmCancelAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelling(true);
    setActionMsg('');
    try {
      await api.patch(`/appointments/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim() || 'Cancelled by patient from dashboard',
      });
      setActionMsg(t('dashboards.cancelledMsg', { id: cancelTarget.id }));
      setCancelTarget(null);
      await loadDashboard();
    } catch (err) {
      setActionMsg(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await loadDashboard();
    } catch {
      // Ignore transient error
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      await loadDashboard();
    } catch {
      // Ignore transient error
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setActionMsg('');
    try {
      await api.put('/patient/profile', profileForm);
      await setLanguage(profileForm.preferredLanguage as SupportedLanguage, false);
      await refreshUser();
      await loadDashboard();
      setActionMsg(t('dashboards.profileUpdated'));
    } catch (err) {
      setActionMsg(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setSavingProfile(false);
    }
  };

  const unreadCount = (data?.notifications || []).filter((n: any) => !n.is_read).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const imminentAppointments = (data?.upcomingAppointments || []).filter(
    (a: any) => a.appointment_date === todayStr || a.appointment_date === tomorrowStr
  );

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: t('dashboards.overview'), icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'appointments',
      label: t('dashboards.upcomingAppts'),
      icon: <CalendarClock className="w-4 h-4" />,
      badgeCount: (data?.upcomingAppointments || []).length,
    },
    { id: 'history', label: t('dashboards.completedAppts'), icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'payments', label: t('dashboards.payments'), icon: <CreditCard className="w-4 h-4" /> },
    {
      id: 'notifications',
      label: t('dashboards.notifications'),
      icon: <Bell className="w-4 h-4" />,
      badgeCount: unreadCount,
    },
    { id: 'profile', label: t('dashboards.editProfile'), icon: <UserCog className="w-4 h-4" /> },
  ];

  return (
    <DashboardShell
      portalLabel={t('dashboards.patientPortal')}
      items={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      extraLinks={[
        { to: '/doctors', label: t('dashboards.findDoctor') },
        { to: '/hospitals', label: t('dashboards.nearbyHospitals') },
        { to: '/health-tips', label: t('dashboards.healthTips') },
      ]}
    >
      {loading ? (
        <div className="p-8 bg-white rounded-xl border border-emerald-950/10 text-sm text-slate-600">
          {t('dashboards.loadingDashboard')}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {actionMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              {actionMsg}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              <div className="bg-white border border-emerald-950/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-display font-bold text-slate-950">
                    {t('dashboards.welcome')}, {data.profile.full_name}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {data.profile.village_town} · {data.profile.district} · {t('common.age')}{' '}
                    <span className="tabular-nums">{data.profile.age || '—'}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/doctors"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>{t('dashboards.bookSlot')}</span>
                  </Link>
                  <Link
                    to="/hospitals"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-700/20 rounded-lg"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{t('dashboards.nearbyHospitals')}</span>
                  </Link>
                </div>
              </div>

              {imminentAppointments.length > 0 && (
                <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-700/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-teal-800 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-teal-900">
                        {t('dashboards.reminderBanner')}
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">
                        {imminentAppointments[0].doctor_name} ·{' '}
                        <span className="font-mono tabular-nums">
                          {imminentAppointments[0].appointment_date} {t('common.at')}{' '}
                          {imminentAppointments[0].time_slot}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/consultation/${imminentAppointments[0].id}`}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 text-center"
                  >
                    {t('dashboards.joinCall')}
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">{t('dashboards.upcomingAppts')}</div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums text-emerald-800 mt-1">
                    {data.upcomingAppointments.length}
                  </div>
                </div>
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">{t('dashboards.completedAppts')}</div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {data.completedAppointments.length}
                  </div>
                </div>
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">{t('dashboards.unreadNotifications')}</div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums text-amber-700 mt-1">
                    {unreadCount}
                  </div>
                </div>
              </div>

              {/* Upcoming Preview */}
              <div className="bg-white border border-emerald-950/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    {t('dashboards.upcomingAppts')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('appointments')}
                    className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                  >
                    {t('dashboards.manageAll')}
                  </button>
                </div>
                {data.upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-slate-600">{t('dashboards.noUpcomingPreview')}</p>
                ) : (
                  <div className="divide-y divide-emerald-950/10">
                    {data.upcomingAppointments.slice(0, 3).map((a: any) => (
                      <div
                        key={a.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {a.doctor_name} · {translateEnum(t, 'specialization', a.specialization)}
                          </div>
                          <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                            {a.appointment_date} {t('common.at')} {a.time_slot} ·{' '}
                            {t('dashboards.statusLabel')}: {translateEnum(t, 'status', a.status)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/consultation/${a.id}`}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                          >
                            {t('dashboards.joinCall')}
                          </Link>
                          <button
                            type="button"
                            onClick={() => openCancelModal(a)}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            {t('dashboards.cancel')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Health Tips Preview */}
              <div className="bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>{t('dashboards.recommendedTips')}</span>
                  </h2>
                  <Link
                    to="/health-tips"
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    {t('dashboards.readMore')}
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(data.recommendedArticles || []).map((art: any) => (
                    <Link
                      key={art.id}
                      to="/health-tips"
                      className="p-3.5 rounded-lg border border-emerald-950/10 bg-[#F8FAF9] hover:border-emerald-700 transition-colors"
                    >
                      <div className="text-[11px] font-medium text-emerald-800">
                        {translateEnum(t, 'articleCategory', art.category)}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">
                        {art.title}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-display font-bold text-slate-950">
                  {t('dashboards.upcomingAppts')}
                </h1>
                <Link
                  to="/doctors"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg"
                >
                  {t('dashboards.bookNewAppt')}
                </Link>
              </div>
              {data.upcomingAppointments.length === 0 ? (
                <p className="text-sm text-slate-600">{t('dashboards.noUpcoming')}</p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingAppointments.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF9] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">
                          #{a.id} · {a.doctor_name} (
                          {translateEnum(t, 'specialization', a.specialization)})
                        </div>
                        <div className="text-xs text-slate-600 font-mono tabular-nums">
                          {a.appointment_date} · {a.time_slot} · {t('dashboards.modeLabel')}:{' '}
                          {translateEnum(t, 'mode', a.consultation_mode)} ·{' '}
                          {t('dashboards.statusLabel')}:{' '}
                          <span className="font-semibold text-emerald-800">
                            {translateEnum(t, 'status', a.status)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {t('dashboards.symptomsLabel')}: {a.symptoms}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/consultation/${a.id}`}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                        >
                          {t('dashboards.joinCall')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => openCancelModal(a)}
                          className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          {t('dashboards.cancelAppt')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5">
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.pastHeading')}
              </h1>
              {[...data.completedAppointments, ...data.cancelledAppointments].length === 0 ? (
                <p className="text-sm text-slate-600">{t('dashboards.noPast')}</p>
              ) : (
                <div className="space-y-3">
                  {[...data.completedAppointments, ...data.cancelledAppointments].map((a: any) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF9] space-y-2"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">
                          {a.doctor_name} · {translateEnum(t, 'specialization', a.specialization)}
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          {a.appointment_date} {a.time_slot} ·{' '}
                          {translateEnum(t, 'status', a.status)}
                        </span>
                      </div>
                      {a.doctor_notes && (
                        <p className="text-xs text-slate-700">
                          <strong>{t('dashboards.doctorNotesLabel')}:</strong> {a.doctor_notes}
                        </p>
                      )}
                      {a.prescription_summary && (
                        <p className="text-xs text-slate-700">
                          <strong>{t('dashboards.adviceSummaryLabel')}:</strong>{' '}
                          {a.prescription_summary}
                        </p>
                      )}
                      {a.cancellation_reason && (
                        <p className="text-xs text-red-700">
                          <strong>{t('dashboards.cancellationReasonLabel')}:</strong>{' '}
                          {a.cancellation_reason}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <button
                          type="button"
                          onClick={() => setNotesModalAppt(a)}
                          className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                        >
                          {t('dashboards.viewNotes')}
                        </button>
                        <Link
                          to={`/consultation/${a.id}`}
                          className="text-xs font-medium text-slate-600 hover:text-emerald-800 hover:underline"
                        >
                          {t('dashboards.openRoomArrow')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.payments')}
              </h1>
              {data.payments.length === 0 ? (
                <p className="text-sm text-slate-600">{t('dashboards.noPayments')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-emerald-950/10 text-slate-500">
                      <tr>
                        <th className="py-2.5 pr-4">{t('dashboards.table.ref')}</th>
                        <th className="py-2.5 pr-4">{t('dashboards.table.doctor')}</th>
                        <th className="py-2.5 pr-4">{t('dashboards.table.schedule')}</th>
                        <th className="py-2.5 pr-4">{t('dashboards.table.method')}</th>
                        <th className="py-2.5 pr-4">{t('dashboards.table.status')}</th>
                        <th className="py-2.5 text-right">{t('dashboards.table.amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-950/10">
                      {data.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-4 font-mono">{p.transaction_ref}</td>
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{p.doctor_name}</td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">
                            {p.appointment_date} {p.time_slot}
                          </td>
                          <td className="py-2.5 pr-4">
                            {p.payment_method} ({p.gateway_mode})
                          </td>
                          <td className="py-2.5 pr-4 font-semibold">
                            {translateEnum(t, 'status', p.status)}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-bold">
                            ₹{p.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-display font-bold text-slate-950">
                  {t('dashboards.notifications')}
                </h1>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                  >
                    {t('dashboards.markAllRead')}
                  </button>
                )}
              </div>
              {data.notifications.length === 0 ? (
                <p className="text-sm text-slate-600">{t('dashboards.noNotifications')}</p>
              ) : (
                <div className="space-y-2">
                  {data.notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                        n.is_read
                          ? 'bg-white border-emerald-950/10'
                          : 'bg-emerald-50/60 border-emerald-700/25'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                        <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          {n.created_at}
                        </div>
                      </div>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkNotificationRead(n.id)}
                          className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {t('dashboards.markRead')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4 max-w-2xl"
            >
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.editProfile')}
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('auth.fullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('auth.phone')}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('auth.age')}
                  </label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('auth.gender')}
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
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
                    value={profileForm.villageTown}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, villageTown: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('auth.preferredLanguage')}
                  </label>
                  <select
                    value={profileForm.preferredLanguage}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, preferredLanguage: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  >
                    <option value="en">English</option>
                    <option value="te">తెలుగు</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.patientProfile.bloodGroup')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.bloodGroup}
                    onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                    placeholder={t('dashboards.patientProfile.bloodGroupPlaceholder')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.patientProfile.emergencyContact')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergencyContact}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, emergencyContact: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('dashboards.patientProfile.medicalNotes')}
                </label>
                <textarea
                  rows={3}
                  value={profileForm.medicalNotes}
                  onChange={(e) => setProfileForm({ ...profileForm, medicalNotes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                {savingProfile ? t('common.saving') : t('common.save')}
              </button>
            </form>
          )}
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={confirmCancelAppointment}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-emerald-950/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-950">
                  {t('dashboards.cancelAppt')}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  #{cancelTarget.id} · {cancelTarget.doctor_name} ({cancelTarget.appointment_date}{' '}
                  {cancelTarget.time_slot})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('dashboards.cancelModal.reasonLabel')}
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('dashboards.cancelModal.reasonPlaceholder')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                {t('dashboards.cancelModal.keepBtn')}
              </button>
              <button
                type="submit"
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer disabled:opacity-60"
              >
                {cancelling
                  ? t('dashboards.cancelModal.cancelling')
                  : t('dashboards.cancelModal.confirmBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {notesModalAppt && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-emerald-950/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-950">
                  {t('dashboards.viewNotes')}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  {notesModalAppt.doctor_name} ·{' '}
                  {translateEnum(t, 'specialization', notesModalAppt.specialization)} ·{' '}
                  <span className="font-mono tabular-nums">
                    {notesModalAppt.appointment_date} {notesModalAppt.time_slot}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotesModalAppt(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-xs font-semibold text-slate-500">
                  {t('dashboards.notesModal.reportedSymptoms')}
                </div>
                <div className="text-slate-800 mt-1">{notesModalAppt.symptoms || '—'}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-xs font-semibold text-slate-500">
                  {t('dashboards.notesModal.doctorNotes')}
                </div>
                <div className="text-slate-800 mt-1">
                  {notesModalAppt.doctor_notes || t('dashboards.notesModal.noNotes')}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAF9] border border-emerald-950/10">
                <div className="text-xs font-semibold text-slate-500">
                  {t('dashboards.notesModal.prescriptionSummary')}
                </div>
                <div className="text-slate-800 mt-1">
                  {notesModalAppt.prescription_summary || t('dashboards.notesModal.noSummary')}
                </div>
              </div>
              {notesModalAppt.follow_up_date && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  {t('dashboards.notesModal.followUpDate')}:{' '}
                  <span className="font-mono font-semibold">{notesModalAppt.follow_up_date}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Link
                to={`/consultation/${notesModalAppt.id}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                {t('dashboards.openRoom')}
              </Link>
              <button
                type="button"
                onClick={() => setNotesModalAppt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
