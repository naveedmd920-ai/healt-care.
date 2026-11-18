import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import {
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  resetPassword,
} from '../controllers/authController.ts';
import {
  getPatientDashboard,
  markAllNotificationsRead,
  markNotificationRead,
  updateLanguagePreference,
  updatePatientProfile,
} from '../controllers/patientController.ts';
import {
  doctorUpdateAppointmentStatus,
  getDoctorById,
  getDoctorDashboard,
  listDoctors,
  updateDoctorAvailability,
  updateDoctorProfile,
} from '../controllers/doctorController.ts';
import {
  bookAppointment,
  cancelAppointment,
  getConsultationDetails,
  getDoctorSlots,
  listMyAppointments,
  updateConsultationNotes,
} from '../controllers/appointmentController.ts';
import { listHospitals } from '../controllers/hospitalController.ts';
import { getArticleById, listArticles } from '../controllers/articleController.ts';
import {
  adminCreateArticle,
  adminCreateHospital,
  adminDeleteArticle,
  adminDeleteHospital,
  adminListAppointments,
  adminListDoctors,
  adminListPayments,
  adminListUsers,
  adminToggleUserActive,
  adminUpdateAppointmentStatus,
  adminUpdateArticle,
  adminUpdateHospital,
  adminVerifyDoctor,
  getAdminOverview,
} from '../controllers/adminController.ts';
import { submitContactInquiry } from '../controllers/contactController.ts';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

// Health & Gateway Capability check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Rural Health Connect API' });
});
router.get('/config/capabilities', (_req, res) => {
  const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  res.json({
    paymentGateway: razorpayConfigured ? 'razorpay' : 'simulation',
    databaseDriver: process.env.DB_CLIENT === 'mysql' || process.env.MYSQL_HOST ? 'mysql' : 'sqlite',
  });
});

// Auth routes
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', authLimiter, forgotPassword);
router.post('/auth/reset-password', authLimiter, resetPassword);
router.get('/auth/me', authenticateToken, getMe);

// Public discovery & education routes
router.get('/doctors', listDoctors);
router.get('/doctors/:id', getDoctorById);
router.get('/appointments/slots', getDoctorSlots);
router.get('/hospitals', listHospitals);
router.get('/articles', listArticles);
router.get('/articles/:id', getArticleById);
router.post('/contact', submitContactInquiry);

// Shared authenticated routes
router.put('/user/language', authenticateToken, updateLanguagePreference);
router.patch('/notifications/:id/read', authenticateToken, markNotificationRead);
router.patch('/notifications/read-all', authenticateToken, markAllNotificationsRead);

// Patient routes
router.get('/patient/dashboard', authenticateToken, requireRole('patient'), getPatientDashboard);
router.put('/patient/profile', authenticateToken, requireRole('patient', 'doctor', 'admin'), updatePatientProfile);

// Appointments & Consultations (role-checked inside handlers)
router.get('/appointments', authenticateToken, listMyAppointments);
router.post('/appointments/book', authenticateToken, requireRole('patient'), bookAppointment);
router.patch('/appointments/:id/cancel', authenticateToken, cancelAppointment);
router.get('/appointments/:id/consultation', authenticateToken, getConsultationDetails);
router.put('/appointments/:id/consultation', authenticateToken, updateConsultationNotes);

// Doctor Portal routes
router.get('/doctor/dashboard', authenticateToken, requireRole('doctor'), getDoctorDashboard);
router.put('/doctor/profile', authenticateToken, requireRole('doctor'), updateDoctorProfile);
router.put('/doctor/availability', authenticateToken, requireRole('doctor'), updateDoctorAvailability);
router.patch('/doctor/appointments/:id/status', authenticateToken, requireRole('doctor'), doctorUpdateAppointmentStatus);

// Admin Portal routes (strict RBAC)
router.get('/admin/overview', authenticateToken, requireRole('admin'), getAdminOverview);
router.get('/admin/users', authenticateToken, requireRole('admin'), adminListUsers);
router.patch('/admin/users/:id/toggle-active', authenticateToken, requireRole('admin'), adminToggleUserActive);
router.get('/admin/doctors', authenticateToken, requireRole('admin'), adminListDoctors);
router.patch('/admin/doctors/:id/verify', authenticateToken, requireRole('admin'), adminVerifyDoctor);
router.get('/admin/appointments', authenticateToken, requireRole('admin'), adminListAppointments);
router.patch('/admin/appointments/:id/status', authenticateToken, requireRole('admin'), adminUpdateAppointmentStatus);
router.get('/admin/payments', authenticateToken, requireRole('admin'), adminListPayments);
router.post('/admin/hospitals', authenticateToken, requireRole('admin'), adminCreateHospital);
router.put('/admin/hospitals/:id', authenticateToken, requireRole('admin'), adminUpdateHospital);
router.delete('/admin/hospitals/:id', authenticateToken, requireRole('admin'), adminDeleteHospital);
router.post('/admin/articles', authenticateToken, requireRole('admin'), adminCreateArticle);
router.put('/admin/articles/:id', authenticateToken, requireRole('admin'), adminUpdateArticle);
router.delete('/admin/articles/:id', authenticateToken, requireRole('admin'), adminDeleteArticle);

export default router;
