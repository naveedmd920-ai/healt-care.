import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, AlertTriangle, Video, Phone } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum, translateLanguagesList } from '../utils/i18nHelpers';

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function DoctorDetailAndBookingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    return tmr.toISOString().split('T')[0];
  });
  const [slotData, setSlotData] = useState<{
    dayName: string;
    available: boolean;
    slots: Array<{ time: string; isBooked: boolean }>;
  } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState('');
  const [consultationMode, setConsultationMode] = useState<'video' | 'audio'>('video');
  const [symptoms, setSymptoms] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI Simulation');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [gatewayMode, setGatewayMode] = useState<'simulation' | 'razorpay'>('simulation');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/doctors/${id}`),
      api.get('/config/capabilities').catch(() => ({ data: { paymentGateway: 'simulation' } })),
    ])
      .then(([docRes, capRes]) => {
        setDoctor(docRes.data.doctor);
        setGatewayMode(capRes.data?.paymentGateway || 'simulation');
      })
      .catch((err) => setError(getApiErrorMessage(err, t('booking.doctorNotFound'))))
      .finally(() => setLoading(false));
  }, [id]);

  const loadSlots = async (dateStr: string) => {
    if (!id || !dateStr) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    try {
      const res = await api.get('/appointments/slots', {
        params: { doctorId: id, date: dateStr },
      });
      setSlotData(res.data);
    } catch {
      setSlotData(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots(selectedDate);
  }, [id, selectedDate]);

  const handleBook = async (simulateOutcome: 'success' | 'failure') => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/doctors/${id}`)}`);
      return;
    }
    if (user.role !== 'patient') {
      setBookingError(t('booking.patientOnlyError'));
      return;
    }
    if (!selectedSlot) {
      setBookingError(t('booking.selectSlotError'));
      return;
    }
    if (symptoms.trim().length < 5) {
      setBookingError(t('booking.symptomsLengthError'));
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    try {
      const res = await api.post('/appointments/book', {
        doctorId: Number(id),
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        symptoms: symptoms.trim(),
        consultationMode,
        paymentMethod,
        simulateOutcome,
      });
      setBookingSuccess(res.data.booking);
      await loadSlots(selectedDate);
    } catch (err) {
      setBookingError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="p-8 bg-white rounded-xl border border-emerald-950/10 text-sm text-slate-600">
            {t('booking.loadingProfile')}
          </div>
        ) : error || !doctor ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            {error || t('booking.doctorNotFound')}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Complete Doctor Profile */}
            <section className="lg:col-span-5 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-4">
                <SafeImage
                  src={doctor.avatar_url}
                  alt={doctor.full_name}
                  className="w-20 h-20 rounded-xl object-cover border border-emerald-950/10 shrink-0"
                />
                <div>
                  <h1 className="text-xl font-display font-bold text-slate-950">
                    {doctor.full_name}
                  </h1>
                  <p className="text-sm text-slate-600">{doctor.qualification}</p>
                  <p className="text-xs font-medium text-emerald-800 mt-1">
                    {translateEnum(t, 'specialization', doctor.specialization)} ·{' '}
                    {doctor.experience_years} {t('common.yearsExp')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-emerald-950/10 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t('booking.consultationFee')}</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900">
                    ₹{doctor.consultation_fee}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t('booking.operatingCost')}</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    ₹{doctor.operating_cost}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t('booking.languages')}</span>
                  <span className="text-slate-900 text-right">
                    {translateLanguagesList(t, doctor.languages_spoken)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t('booking.clinicDesk')}</span>
                  <span className="text-slate-900 text-right">
                    {doctor.clinic_location || t('common.telemedicine')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">{t('booking.aboutDoctor')}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
                {doctor.is_sample ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    {t('booking.sampleNotice')}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  {t('booking.weeklySchedule')}
                </h2>
                <div className="divide-y divide-emerald-950/10 border border-emerald-950/10 rounded-lg text-xs">
                  {(doctor.availability || []).map((av: any) => (
                    <div key={av.day_of_week} className="px-3 py-2 flex justify-between">
                      <span className="font-medium text-slate-800">
                        {translateEnum(t, 'day', av.day_of_week)}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {av.is_available
                          ? `${av.start_time} – ${av.end_time}`
                          : t('booking.unavailable')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right: Appointment Booking & Payment Simulation */}
            <section className="lg:col-span-7 bg-white border border-emerald-950/10 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-display font-bold text-slate-950">
                  {t('booking.bookHeading')}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{t('booking.bookSubheading')}</p>
              </div>

              {bookingSuccess ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-bold text-emerald-950">
                        {t('booking.bookingConfirmed', { id: bookingSuccess.appointmentId })}
                      </h3>
                      <p className="text-sm text-emerald-900 mt-1">
                        {t('booking.paymentRef')}:{' '}
                        <span className="font-mono font-semibold">
                          {bookingSuccess.transactionRef}
                        </span>{' '}
                        (
                        {bookingSuccess.gatewayMode === 'simulation'
                          ? t('booking.simGateway')
                          : t('booking.razorpayGateway')}
                        )
                      </p>
                      <p className="text-xs text-emerald-800 mt-1">
                        {t('booking.roomId')}:{' '}
                        <span className="font-mono">{bookingSuccess.roomId}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/consultation/${bookingSuccess.appointmentId}`}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                    >
                      {t('booking.openRoom')}
                    </Link>
                    <Link
                      to="/patient/dashboard"
                      className="px-4 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-700/20 rounded-lg"
                    >
                      {t('booking.goToDashboard')}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {!user && (
                    <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-950 flex flex-wrap items-center justify-between gap-2">
                      <span>{t('booking.signInNotice')}</span>
                      <Link
                        to={`/login?redirect=${encodeURIComponent(`/doctors/${id}`)}`}
                        className="px-3 py-1.5 font-semibold text-white bg-emerald-700 rounded-md"
                      >
                        {t('booking.loginToBook')}
                      </Link>
                    </div>
                  )}

                  {bookingError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {/* Step 1: Date */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-2">
                      <Calendar className="w-4 h-4 text-emerald-700" />
                      <span>{t('booking.step1')}</span>
                    </label>
                    <input
                      type="date"
                      min={getTodayIso()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                    />
                  </div>

                  {/* Step 2: Time Slots */}
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-2">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      <span>
                        {t('booking.step2')}{' '}
                        {slotData?.dayName ? `(${translateEnum(t, 'day', slotData.dayName)})` : ''}
                      </span>
                    </div>

                    {loadingSlots ? (
                      <div className="text-xs text-slate-500">{t('booking.checkingSlots')}</div>
                    ) : !slotData?.available || slotData.slots.length === 0 ? (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        {t('booking.noOpenSlots')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotData.slots.map((s) => (
                          <button
                            key={s.time}
                            type="button"
                            disabled={s.isBooked}
                            onClick={() => setSelectedSlot(s.time)}
                            className={`py-2 px-3 rounded-lg text-xs font-mono tabular-nums font-semibold border transition-colors ${
                              s.isBooked
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : selectedSlot === s.time
                                ? 'bg-emerald-700 text-white border-emerald-700 cursor-pointer'
                                : 'bg-[#F8FAF9] text-slate-800 border-emerald-950/15 hover:border-emerald-700 cursor-pointer'
                            }`}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Mode & Symptoms */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-900">
                      {t('booking.step3')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setConsultationMode('video')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                          consultationMode === 'video'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                            : 'bg-white text-slate-700 border-emerald-950/15'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>{t('booking.videoConsultation')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationMode('audio')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                          consultationMode === 'audio'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                            : 'bg-white text-slate-700 border-emerald-950/15'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>{t('booking.audioCall')}</span>
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder={t('booking.symptomsPlaceholder')}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
                    />
                  </div>

                  {/* Step 4: Payment Simulation */}
                  <div className="p-4 rounded-xl bg-[#F8FAF9] border border-emerald-950/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {t('booking.step4')} (
                        {gatewayMode === 'razorpay'
                          ? t('booking.razorpayConfigured')
                          : t('booking.devSimMode')}
                        )
                      </span>
                      <span className="text-base font-bold font-mono tabular-nums text-emerald-800">
                        ₹{doctor.consultation_fee}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {gatewayMode === 'razorpay'
                        ? t('booking.razorpayActiveDesc', {
                            fee: doctor.consultation_fee,
                            cost: doctor.operating_cost,
                          })
                        : t('booking.simModeDesc', {
                            fee: doctor.consultation_fee,
                            cost: doctor.operating_cost,
                          })}
                    </p>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-950/15 bg-white"
                    >
                      <option value="UPI Simulation">{t('booking.upiSim')}</option>
                      <option value="Wallet Simulation">{t('booking.walletSim')}</option>
                    </select>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        type="button"
                        disabled={bookingLoading}
                        onClick={() => handleBook('success')}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg cursor-pointer"
                      >
                        {bookingLoading
                          ? t('booking.processing')
                          : t('booking.confirmAndPay', { fee: doctor.consultation_fee })}
                      </button>
                      <button
                        type="button"
                        disabled={bookingLoading}
                        onClick={() => handleBook('failure')}
                        className="px-4 py-2.5 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        {t('booking.simulateFailure')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
