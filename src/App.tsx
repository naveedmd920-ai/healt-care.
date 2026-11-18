import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { DoctorDiscoveryPage } from './pages/DoctorDiscoveryPage';
import { DoctorDetailAndBookingPage } from './pages/DoctorDetailAndBookingPage';
import { HospitalFinderPage } from './pages/HospitalFinderPage';
import { HealthTipsPage } from './pages/HealthTipsPage';
import { VideoConsultationPage } from './pages/VideoConsultationPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/doctors" element={<DoctorDiscoveryPage />} />
            <Route path="/doctors/:id" element={<DoctorDetailAndBookingPage />} />
            <Route path="/hospitals" element={<HospitalFinderPage />} />
            <Route path="/health-tips" element={<HealthTipsPage />} />

            {/* Protected Role Dashboards */}
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Telemedicine Video Consultation Room */}
            <Route
              path="/consultation/:appointmentId"
              element={
                <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                  <VideoConsultationPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
