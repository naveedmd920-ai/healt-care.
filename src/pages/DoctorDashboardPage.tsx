import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  UserCog,
  CheckCircle,
  XCircle,
  Video,
} from 'lucide-react';
import { DashboardShell, SidebarNavItem } from '../components/DashboardShell';
import { useLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum } from '../utils/i18nHelpers';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DoctorDashboardPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('appointments');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    qualification: '',
    specialization: '',
    experienceYears: '1',
    consultationFee: '100',
    languagesSpoken: '',
    bio: '',
    clinicLocation: '',
  });

  const [slots, setSlots] = useState<
    Array<{
      day_of_week: string;
      start_time: string;
      end_time: string;
      slot_duration_minutes: number;
      is_available: boolean;
    }>
  >([]);

  const loadDoctorDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/doctor/dashboard');
      setData(res.data);
      const d = res.data.doctor;
      setProfileForm({
        fullName: d.full_name || '',
        phone: d.phone || '',
        qualification: d.qualification || '',
        specialization: d.specialization || '',
        experienceYears: String(d.experience_years ?? 1),
        consultationFee: String(d.consultation_fee ?? 100),
        languagesSpoken: d.languages_spoken || '',
        bio: d.bio || '',
        clinicLocation: d.clinic_location || '',
      });

      const avMap = new Map<string, any>();
      (res.data.availability || []).forEach((a: any) => avMap.set(a.day_of_week, a));
      setSlots(
        DAYS.map((day) => {
          const found = avMap.get(day);
          return {
            day_of_week: day,
            start_time: found?.start_time || '09:00',
            end_time: found?.end_time || '13:00',
            slot_duration_minutes: found?.slot_duration_minutes || 30,
            is_available: Boolean(found?.is_available),
          };
        })
      );
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorDashboard();
  }, []);

  const handleAppointmentDecision = async (
    id: number,
    status: 'confirmed' | 'cancelled' | 'completed'
  ) => {
    setStatusMsg('');
    try {
      await api.patch(`/doctor/appointments/${id}/status`, { status });
      setStatusMsg(
        t('dashboards.doctorDash.apptUpdated', {
          id,
          status: translateEnum(t, 'status', status),
        })
      );
      await loadDoctorDashboard();
    } catch (err) {
      setStatusMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      await api.put('/doctor/profile', profileForm);
      setStatusMsg(t('dashboards.doctorDash.profileSaved'));
      await loadDoctorDashboard();
    } catch (err) {
      setStatusMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      await api.put('/doctor/availability', { slots });
      setStatusMsg(t('dashboards.doctorDash.availabilitySaved'));
      await loadDoctorDashboard();
    } catch (err) {
      setStatusMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const pendingCount = (data?.appointments || []).filter((a: any) => a.status === 'pending').length;

  const navItems: SidebarNavItem[] = [
    {
      id: 'appointments',
      label: t('dashboards.doctorDash.tabAppointments'),
      icon: <CalendarCheck className="w-4 h-4" />,
      badgeCount: pendingCount,
    },
    {
      id: 'availability',
      label: t('dashboards.doctorDash.tabAvailability'),
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'profile',
      label: t('dashboards.doctorDash.tabProfile'),
      icon: <UserCog className="w-4 h-4" />,
    },
    {
      id: 'overview',
      label: t('dashboards.doctorDash.tabOverview'),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
  ];

  return (
    <DashboardShell
      portalLabel={t('dashboards.doctorPortal')}
      items={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {loading ? (
        <div className="p-8 bg-white rounded-xl border border-emerald-950/10 text-sm text-slate-600">
          {t('dashboards.doctorDash.loading')}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Verification Status Notice */}
          <div
            className={`p-4 rounded-xl border text-sm flex flex-wrap items-center justify-between gap-2 ${
              data.doctor.verification_status === 'verified'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : data.doctor.verification_status === 'rejected'
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div>
              <strong>{t('dashboards.doctorDash.verificationStatus')}: </strong>
              <span className="font-mono font-semibold">
                {translateEnum(t, 'status', data.doctor.verification_status)}
              </span>
              {data.doctor.is_sample ? ` (${t('common.sampleLabel')})` : ''}
              {data.doctor.verification_status === 'pending' &&
                t('dashboards.doctorDash.pendingNotice')}
            </div>
            {data.verification?.registration_number && (
              <span className="text-xs font-mono">
                {t('dashboards.doctorDash.regLabel')}: {data.verification.registration_number}
              </span>
            )}
          </div>

          {statusMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              {statusMsg}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.doctorDash.scheduleHeading')}
              </h1>
              {data.appointments.length === 0 ? (
                <p className="text-sm text-slate-600">{t('dashboards.doctorDash.noAppointments')}</p>
              ) : (
                <div className="space-y-3">
                  {data.appointments.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF9] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">
                          #{a.id} · {a.patient_name}{' '}
                          <span className="text-xs font-normal text-slate-600">
                            ({a.patient_village || t('dashboards.doctorDash.villageNa')},{' '}
                            {t('common.age')} {a.patient_age || '—'})
                          </span>
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-600">
                          {a.appointment_date} {t('common.at')} {a.time_slot} ·{' '}
                          {t('dashboards.modeLabel')}:{' '}
                          {translateEnum(t, 'mode', a.consultation_mode)} ·{' '}
                          {t('dashboards.statusLabel')}:{' '}
                          <span className="font-semibold text-emerald-800">
                            {translateEnum(t, 'status', a.status)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700">
                          {t('dashboards.symptomsLabel')}: {a.symptoms}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {a.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAppointmentDecision(a.id, 'confirmed')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{t('dashboards.doctorDash.accept')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAppointmentDecision(a.id, 'cancelled')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{t('dashboards.doctorDash.decline')}</span>
                            </button>
                          </>
                        )}

                        {(a.status === 'confirmed' || a.status === 'pending') && (
                          <Link
                            to={`/consultation/${a.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 rounded-lg"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{t('dashboards.doctorDash.startConsultation')}</span>
                          </Link>
                        )}

                        {a.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleAppointmentDecision(a.id, 'completed')}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-emerald-950/15 rounded-lg cursor-pointer"
                          >
                            {t('dashboards.doctorDash.markCompleted')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'availability' && (
            <form
              onSubmit={handleSaveAvailability}
              className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4"
            >
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.doctorDash.manageAvailability')}
              </h1>
              <div className="divide-y divide-emerald-950/10 border border-emerald-950/10 rounded-xl">
                {slots.map((slot, idx) => (
                  <div
                    key={slot.day_of_week}
                    className="p-3.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-3 text-sm"
                  >
                    <label className="sm:col-span-3 flex items-center gap-2 font-medium text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slot.is_available}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx].is_available = e.target.checked;
                          setSlots(next);
                        }}
                        className="accent-emerald-700"
                      />
                      <span>{translateEnum(t, 'day', slot.day_of_week)}</span>
                    </label>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {t('dashboards.doctorDash.from')}
                      </span>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx].start_time = e.target.value;
                          setSlots(next);
                        }}
                        className="px-2 py-1 text-xs rounded border border-emerald-950/15 bg-[#F8FAF9]"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {t('dashboards.doctorDash.to')}
                      </span>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx].end_time = e.target.value;
                          setSlots(next);
                        }}
                        className="px-2 py-1 text-xs rounded border border-emerald-950/15 bg-[#F8FAF9]"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {t('dashboards.doctorDash.slotMins')}
                      </span>
                      <select
                        value={slot.slot_duration_minutes}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx].slot_duration_minutes = Number(e.target.value);
                          setSlots(next);
                        }}
                        className="px-2 py-1 text-xs rounded border border-emerald-950/15 bg-[#F8FAF9]"
                      >
                        <option value={15}>
                          {t('dashboards.doctorDash.minOption', { mins: 15 })}
                        </option>
                        <option value={20}>
                          {t('dashboards.doctorDash.minOption', { mins: 20 })}
                        </option>
                        <option value={30}>
                          {t('dashboards.doctorDash.minOption', { mins: 30 })}
                        </option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                {t('dashboards.doctorDash.saveAvailabilityBtn')}
              </button>
            </form>
          )}

          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4 max-w-2xl"
            >
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.doctorDash.editDoctorProfile')}
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
                    {t('dashboards.doctorDash.qualification')}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.qualification}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, qualification: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.doctorDash.specialization')}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.specialization}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, specialization: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.doctorDash.experienceYears')}
                  </label>
                  <input
                    type="number"
                    required
                    value={profileForm.experienceYears}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, experienceYears: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.doctorDash.consultationFee')}
                  </label>
                  <input
                    type="number"
                    required
                    value={profileForm.consultationFee}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, consultationFee: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.doctorDash.languagesSpoken')}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.languagesSpoken}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, languagesSpoken: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('dashboards.doctorDash.clinicLocation')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.clinicLocation}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, clinicLocation: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('dashboards.doctorDash.biography')}
                </label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                {t('dashboards.doctorDash.saveDoctorProfileBtn')}
              </button>
            </form>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                <div className="text-xs text-slate-500">
                  {t('dashboards.doctorDash.pendingRequests')}
                </div>
                <div className="text-2xl font-display font-bold font-mono tabular-nums text-amber-700 mt-1">
                  {pendingCount}
                </div>
              </div>
              <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                <div className="text-xs text-slate-500">
                  {t('dashboards.doctorDash.confirmedUpcoming')}
                </div>
                <div className="text-2xl font-display font-bold font-mono tabular-nums text-emerald-800 mt-1">
                  {data.appointments.filter((a: any) => a.status === 'confirmed').length}
                </div>
              </div>
              <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                <div className="text-xs text-slate-500">
                  {t('dashboards.doctorDash.completedConsultations')}
                </div>
                <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.appointments.filter((a: any) => a.status === 'completed').length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
