import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  Building2,
  BookOpen,
  Trash2,
  Pencil,
  Search,
} from 'lucide-react';
import { DashboardShell, SidebarNavItem } from '../components/DashboardShell';
import { useLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum } from '../utils/i18nHelpers';

export function AdminDashboardPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [doctorQuery, setDoctorQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [apptQuery, setApptQuery] = useState('');

  const [editingHospitalId, setEditingHospitalId] = useState<number | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);

  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    category: 'Primary Health Centre',
    address: '',
    village_town: '',
    district: 'Medchal-Malkajgiri',
    phone: '',
    facilities: '',
    latitude: '17.4600',
    longitude: '78.6700',
    operating_hours: 'Mon-Sat 09:00 AM - 05:00 PM',
  });

  const [articleForm, setArticleForm] = useState({
    title: '',
    category: 'General health',
    language: 'en',
    short_description: '',
    content: '',
  });

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [ov, us, dr, ap, py, ho, ar] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users'),
        api.get('/admin/doctors'),
        api.get('/admin/appointments'),
        api.get('/admin/payments'),
        api.get('/hospitals'),
        api.get('/articles'),
      ]);
      setOverview(ov.data);
      setUsers(us.data.users || []);
      setDoctors(dr.data.doctors || []);
      setAppointments(ap.data.appointments || []);
      setPayments(py.data.payments || []);
      setHospitals(ho.data.hospitals || []);
      setArticles(ar.data.articles || []);
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleVerifyDoctor = async (doctorId: number, decision: 'verified' | 'rejected') => {
    setMsg('');
    try {
      await api.patch(`/admin/doctors/${doctorId}/verify`, {
        decision,
        reviewNotes: decision === 'verified' ? 'Verified by Administrator' : 'Verification declined',
      });
      setMsg(
        t('dashboards.adminDash.doctorMarked', {
          id: doctorId,
          decision: translateEnum(t, 'status', decision),
        })
      );
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const handleToggleUser = async (userId: number) => {
    setMsg('');
    try {
      const res = await api.patch(`/admin/users/${userId}/toggle-active`);
      setMsg(res.data.message);
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const resetHospitalForm = () => {
    setEditingHospitalId(null);
    setHospitalForm({
      name: '',
      category: 'Primary Health Centre',
      address: '',
      village_town: '',
      district: 'Medchal-Malkajgiri',
      phone: '',
      facilities: '',
      latitude: '17.4600',
      longitude: '78.6700',
      operating_hours: 'Mon-Sat 09:00 AM - 05:00 PM',
    });
  };

  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      if (editingHospitalId) {
        await api.put(`/admin/hospitals/${editingHospitalId}`, hospitalForm);
        setMsg(t('dashboards.adminDash.hospitalUpdated', { id: editingHospitalId }));
      } else {
        await api.post('/admin/hospitals', { ...hospitalForm, is_sample: true });
        setMsg(t('dashboards.adminDash.hospitalAdded'));
      }
      resetHospitalForm();
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const handleEditHospital = (h: any) => {
    setEditingHospitalId(h.id);
    setHospitalForm({
      name: h.name || '',
      category: h.category || 'Primary Health Centre',
      address: h.address || '',
      village_town: h.village_town || '',
      district: h.district || 'Medchal-Malkajgiri',
      phone: h.phone || '',
      facilities: h.facilities || '',
      latitude: String(h.latitude ?? '17.4600'),
      longitude: String(h.longitude ?? '78.6700'),
      operating_hours: h.operating_hours || 'Mon-Sat 09:00 AM - 05:00 PM',
    });
  };

  const handleDeleteHospital = async (id: number) => {
    try {
      await api.delete(`/admin/hospitals/${id}`);
      if (editingHospitalId === id) resetHospitalForm();
      setMsg(t('dashboards.adminDash.hospitalDeleted'));
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArticleForm({
      title: '',
      category: 'General health',
      language: 'en',
      short_description: '',
      content: '',
    });
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      if (editingArticleId) {
        await api.put(`/admin/articles/${editingArticleId}`, articleForm);
        setMsg(t('dashboards.adminDash.articleUpdated', { id: editingArticleId }));
      } else {
        await api.post('/admin/articles', articleForm);
        setMsg(t('dashboards.adminDash.articlePublished'));
      }
      resetArticleForm();
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const handleEditArticle = (a: any) => {
    setEditingArticleId(a.id);
    setArticleForm({
      title: a.title || '',
      category: a.category || 'General health',
      language: a.language || 'en',
      short_description: a.short_description || '',
      content: a.content || '',
    });
  };

  const handleDeleteArticle = async (id: number) => {
    try {
      await api.delete(`/admin/articles/${id}`);
      if (editingArticleId === id) resetArticleForm();
      setMsg(t('dashboards.adminDash.articleDeleted'));
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const handleUpdateAppointmentStatus = async (id: number, status: string) => {
    setMsg('');
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status });
      setMsg(
        t('dashboards.adminDash.apptStatusUpdated', {
          id,
          status: translateEnum(t, 'status', status),
        })
      );
      await loadAllAdminData();
    } catch (err) {
      setMsg(getApiErrorMessage(err, t('common.genericError')));
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (d.full_name || '').toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q) ||
      (d.verification_status || '').toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.village_town || '').toLowerCase().includes(q)
    );
  });

  const filteredAppointments = appointments.filter((a) => {
    const q = apptQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      String(a.id).includes(q) ||
      (a.patient_name || '').toLowerCase().includes(q) ||
      (a.doctor_name || '').toLowerCase().includes(q) ||
      (a.status || '').toLowerCase().includes(q)
    );
  });

  const pendingDocsCount = overview?.stats?.pendingDoctorVerifications || 0;

  const navItems: SidebarNavItem[] = [
    {
      id: 'overview',
      label: t('dashboards.adminDash.tabOverview'),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'doctors',
      label: t('dashboards.adminDash.tabDoctors'),
      icon: <Stethoscope className="w-4 h-4" />,
      badgeCount: pendingDocsCount,
    },
    {
      id: 'users',
      label: t('dashboards.adminDash.tabUsers'),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'appointments',
      label: t('dashboards.adminDash.tabAppointments'),
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'payments',
      label: t('dashboards.adminDash.tabPayments'),
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'hospitals',
      label: t('dashboards.adminDash.tabHospitals'),
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'articles',
      label: t('dashboards.adminDash.tabArticles'),
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <DashboardShell
      portalLabel={t('dashboards.adminPortal')}
      items={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {loading ? (
        <div className="p-8 bg-white rounded-xl border border-emerald-950/10 text-sm text-slate-600">
          {t('dashboards.adminDash.loading')}
        </div>
      ) : (
        <div className="space-y-6">
          {msg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              {msg}
            </div>
          )}

          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">
                    {t('dashboards.adminDash.registeredPatients')}
                  </div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums text-slate-950 mt-1">
                    {overview.stats.totalPatients}
                  </div>
                </div>
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">
                    {t('dashboards.adminDash.registeredDoctors')}
                  </div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums text-emerald-800 mt-1">
                    {overview.stats.totalDoctors}
                  </div>
                </div>
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">
                    {t('dashboards.adminDash.pendingApprovals')}
                  </div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums text-amber-700 mt-1">
                    {overview.stats.pendingDoctorVerifications}
                  </div>
                </div>
                <div className="p-5 bg-white border border-emerald-950/10 rounded-xl">
                  <div className="text-xs text-slate-500">
                    {t('dashboards.adminDash.revenueOpCost')}
                  </div>
                  <div className="text-xl font-display font-bold font-mono tabular-nums text-slate-950 mt-1">
                    ₹{overview.stats.totalRevenue} / ₹{overview.stats.totalOperatingCost}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {t('dashboards.adminDash.appointmentStats')}
                  </h2>
                  <div className="divide-y divide-emerald-950/10 text-sm">
                    {overview.stats.appointmentsByStatus.map((row: any) => (
                      <div key={row.status} className="py-2.5 flex justify-between">
                        <span className="text-slate-700">
                          {translateEnum(t, 'status', row.status)}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {t('dashboards.adminDash.recentActivity')}
                  </h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                    {overview.recentActivity.length === 0 ? (
                      <p className="text-slate-500">
                        {t('dashboards.adminDash.noRecentActivity')}
                      </p>
                    ) : (
                      overview.recentActivity.map((act: any) => (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-lg bg-[#F8FAF9] border border-emerald-950/10"
                        >
                          <div className="font-semibold text-slate-900">{act.title}</div>
                          <div className="text-slate-600 mt-0.5">{act.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'doctors' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-xl font-display font-bold text-slate-950">
                  {t('dashboards.adminDash.doctorVerificationHeading')}
                </h1>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={doctorQuery}
                    onChange={(e) => setDoctorQuery(e.target.value)}
                    placeholder={t('dashboards.adminDash.filterDoctorsPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {filteredDoctors.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF9] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-900">
                        {d.full_name} · {translateEnum(t, 'specialization', d.specialization)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {d.qualification} · {d.experience_years} {t('common.yrs')} ·{' '}
                        {t('dashboards.doctorDash.regLabel')}:{' '}
                        <span className="font-mono">{d.registration_number || t('common.na')}</span>
                      </div>
                      <div className="text-xs">
                        {t('dashboards.statusLabel')}:{' '}
                        <span
                          className={`font-mono font-semibold ${
                            d.verification_status === 'verified'
                              ? 'text-emerald-800'
                              : d.verification_status === 'rejected'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {translateEnum(t, 'status', d.verification_status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.verification_status !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyDoctor(d.id, 'verified')}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                        >
                          {t('dashboards.adminDash.approve')}
                        </button>
                      )}
                      {d.verification_status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyDoctor(d.id, 'rejected')}
                          className="px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          {t('dashboards.adminDash.reject')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-xl font-display font-bold text-slate-950">
                  {t('dashboards.adminDash.tabUsers')}
                </h1>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder={t('dashboards.adminDash.searchUsersPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-emerald-950/10 text-slate-500">
                    <tr>
                      <th className="py-2.5 pr-4">{t('dashboards.table.name')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.email')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.role')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.village')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.status')}</th>
                      <th className="py-2.5 text-right">{t('dashboards.table.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/10">
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{u.full_name}</td>
                        <td className="py-2.5 pr-4 font-mono">{u.email}</td>
                        <td className="py-2.5 pr-4">{translateEnum(t, 'role', u.role)}</td>
                        <td className="py-2.5 pr-4">{u.village_town || '—'}</td>
                        <td className="py-2.5 pr-4">
                          {u.is_active
                            ? translateEnum(t, 'status', 'active')
                            : translateEnum(t, 'status', 'disabled')}
                        </td>
                        <td className="py-2.5 text-right">
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u.id)}
                              className="px-2.5 py-1 text-xs font-medium border border-emerald-950/15 rounded hover:bg-slate-50 cursor-pointer"
                            >
                              {u.is_active
                                ? t('dashboards.adminDash.deactivate')
                                : t('dashboards.adminDash.activate')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-xl font-display font-bold text-slate-950">
                  {t('dashboards.adminDash.allAppointments')}
                </h1>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={apptQuery}
                    onChange={(e) => setApptQuery(e.target.value)}
                    placeholder={t('dashboards.adminDash.searchApptsPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-emerald-950/10 text-slate-500">
                    <tr>
                      <th className="py-2.5 pr-4">{t('dashboards.table.id')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.patient')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.doctor')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.dateSlot')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.status')}</th>
                      <th className="py-2.5 text-right">{t('dashboards.table.fee')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/10">
                    {filteredAppointments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-4 font-mono">#{a.id}</td>
                        <td className="py-2.5 pr-4">{a.patient_name}</td>
                        <td className="py-2.5 pr-4">{a.doctor_name}</td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums">
                          {a.appointment_date} {a.time_slot}
                        </td>
                        <td className="py-2.5 pr-4">
                          <select
                            value={a.status}
                            onChange={(e) => handleUpdateAppointmentStatus(a.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-emerald-950/15 bg-[#F8FAF9] font-semibold"
                            aria-label={`#${a.id}`}
                          >
                            <option value="pending">{translateEnum(t, 'status', 'pending')}</option>
                            <option value="confirmed">
                              {translateEnum(t, 'status', 'confirmed')}
                            </option>
                            <option value="completed">
                              {translateEnum(t, 'status', 'completed')}
                            </option>
                            <option value="cancelled">
                              {translateEnum(t, 'status', 'cancelled')}
                            </option>
                          </select>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          ₹{a.amount || 100}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white border border-emerald-950/10 rounded-xl p-6 space-y-4">
              <h1 className="text-xl font-display font-bold text-slate-950">
                {t('dashboards.adminDash.tabPayments')}
              </h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-emerald-950/10 text-slate-500">
                    <tr>
                      <th className="py-2.5 pr-4">{t('dashboards.table.ref')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.patient')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.doctor')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.mode')}</th>
                      <th className="py-2.5 pr-4">{t('dashboards.table.status')}</th>
                      <th className="py-2.5 pr-4 text-right">{t('dashboards.table.fee')}</th>
                      <th className="py-2.5 text-right">{t('dashboards.table.opCost')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/10">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-mono">{p.transaction_ref}</td>
                        <td className="py-2.5 pr-4">{p.patient_name}</td>
                        <td className="py-2.5 pr-4">{p.doctor_name}</td>
                        <td className="py-2.5 pr-4">
                          {p.payment_method} ({p.gateway_mode})
                        </td>
                        <td className="py-2.5 pr-4 font-semibold">
                          {translateEnum(t, 'status', p.status)}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                          ₹{p.amount}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          ₹{p.operating_cost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'hospitals' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSaveHospital}
                className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    {editingHospitalId
                      ? t('dashboards.adminDash.editHospital', { id: editingHospitalId })
                      : t('dashboards.adminDash.addHospitalHeading')}
                  </h2>
                  {editingHospitalId && (
                    <button
                      type="button"
                      onClick={resetHospitalForm}
                      className="text-xs font-medium text-slate-600 hover:underline cursor-pointer"
                    >
                      {t('dashboards.adminDash.cancelEdit')}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder={t('dashboards.adminDash.hospitalName')}
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
                <input
                  type="text"
                  required
                  placeholder={t('dashboards.adminDash.address')}
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder={t('auth.villageTown')}
                    value={hospitalForm.village_town}
                    onChange={(e) =>
                      setHospitalForm({ ...hospitalForm, village_town: e.target.value })
                    }
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                  <input
                    type="text"
                    required
                    placeholder={t('auth.phone')}
                    value={hospitalForm.phone}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder={t('dashboards.adminDash.facilitiesPlaceholder')}
                  value={hospitalForm.facilities}
                  onChange={(e) =>
                    setHospitalForm({ ...hospitalForm, facilities: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder={t('dashboards.adminDash.latitude')}
                    value={hospitalForm.latitude}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, latitude: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder={t('dashboards.adminDash.longitude')}
                    value={hospitalForm.longitude}
                    onChange={(e) =>
                      setHospitalForm({ ...hospitalForm, longitude: e.target.value })
                    }
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  {editingHospitalId
                    ? t('dashboards.adminDash.saveHospitalChanges')
                    : t('dashboards.adminDash.addHospitalBtn')}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  {t('dashboards.adminDash.hospitalDirectory')}
                </h2>
                <div className="space-y-2">
                  {hospitals.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{h.name}</div>
                        <div className="text-xs text-slate-600">
                          {h.village_town} · {translateEnum(t, 'hospitalCategory', h.category)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditHospital(h)}
                          className="p-2 text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                          aria-label={t('dashboards.adminDash.editHospital', { id: h.id })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHospital(h.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          aria-label={t('common.cancel')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'articles' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSaveArticle}
                className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    {editingArticleId
                      ? t('dashboards.adminDash.editArticle', { id: editingArticleId })
                      : t('dashboards.adminDash.publishArticleHeading')}
                  </h2>
                  {editingArticleId && (
                    <button
                      type="button"
                      onClick={resetArticleForm}
                      className="text-xs font-medium text-slate-600 hover:underline cursor-pointer"
                    >
                      {t('dashboards.adminDash.cancelEdit')}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder={t('dashboards.adminDash.articleTitle')}
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  >
                    {[
                      'General health',
                      'Nutrition',
                      'Hygiene',
                      'Preventive healthcare',
                      "Women's health",
                      'Child healthcare',
                      'Elderly care',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {translateEnum(t, 'articleCategory', cat)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={articleForm.language}
                    onChange={(e) => setArticleForm({ ...articleForm, language: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                  >
                    <option value="en">English</option>
                    <option value="te">తెలుగు</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>
                <input
                  type="text"
                  required
                  placeholder={t('dashboards.adminDash.shortDescPlaceholder')}
                  value={articleForm.short_description}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, short_description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
                <textarea
                  rows={4}
                  required
                  placeholder={t('dashboards.adminDash.articleContentPlaceholder')}
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  {editingArticleId
                    ? t('dashboards.adminDash.saveArticleChanges')
                    : t('dashboards.adminDash.publishArticleBtn')}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-5 space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  {t('dashboards.adminDash.publishedArticles')}
                </h2>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {articles.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                        <div className="text-xs text-slate-600">
                          {translateEnum(t, 'articleCategory', a.category)} ·{' '}
                          {a.language.toUpperCase()} · {a.published_date}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditArticle(a)}
                          className="p-2 text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                          aria-label={t('dashboards.adminDash.editArticle', { id: a.id })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(a.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          aria-label={t('common.cancel')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
