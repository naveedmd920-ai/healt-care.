-- Rural Health Connect - MySQL 8.0+ Normalized Relational Schema
-- Team Elite | Sreenidhi Institute of Science and Technology (SNIST)

CREATE DATABASE IF NOT EXISTS rural_health_connect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rural_health_connect;

-- 1. Users (Core Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  preferred_language ENUM('en', 'te', 'hi') NOT NULL DEFAULT 'en',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  reset_otp VARCHAR(12) NULL,
  reset_otp_expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_phone (phone)
) ENGINE=InnoDB;

-- 2. Patient Profiles
CREATE TABLE IF NOT EXISTS patient_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  age INT NULL,
  gender ENUM('male', 'female', 'other') NULL,
  village_town VARCHAR(150) NOT NULL,
  district VARCHAR(120) NULL DEFAULT 'Medchal-Malkajgiri',
  blood_group VARCHAR(10) NULL,
  medical_notes TEXT NULL,
  emergency_contact VARCHAR(25) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patient_user (user_id),
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  qualification VARCHAR(180) NOT NULL,
  specialization VARCHAR(120) NOT NULL,
  experience_years INT NOT NULL DEFAULT 1,
  consultation_fee INT NOT NULL DEFAULT 100,
  operating_cost INT NOT NULL DEFAULT 35,
  languages_spoken VARCHAR(150) NOT NULL DEFAULT 'English, Telugu',
  bio TEXT NULL,
  avatar_url VARCHAR(500) NULL,
  clinic_location VARCHAR(200) NULL,
  is_sample TINYINT(1) NOT NULL DEFAULT 0,
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doctor_user (user_id),
  INDEX idx_doctors_specialization (specialization),
  INDEX idx_doctors_status (verification_status),
  INDEX idx_doctors_fee (consultation_fee),
  CONSTRAINT fk_doctor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Doctor Availability
CREATE TABLE IF NOT EXISTS doctor_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 20,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doctor_day (doctor_id, day_of_week),
  CONSTRAINT fk_avail_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  symptoms TEXT NOT NULL,
  consultation_mode ENUM('video', 'audio') NOT NULL DEFAULT 'video',
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  cancellation_reason VARCHAR(255) NULL,
  slot_lock_key VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_appointment_slot_lock (slot_lock_key),
  INDEX idx_appointments_patient (patient_id, appointment_date),
  INDEX idx_appointments_doctor (doctor_id, appointment_date),
  INDEX idx_appointments_status (status),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Consultations
CREATE TABLE IF NOT EXISTS consultations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  room_id VARCHAR(100) NOT NULL,
  doctor_notes TEXT NULL,
  prescription_summary TEXT NULL,
  follow_up_date DATE NULL,
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  connection_mode ENUM('webrtc', 'demo_simulation') NOT NULL DEFAULT 'webrtc',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_consultation_appt (appointment_id),
  UNIQUE KEY uq_consultation_room (room_id),
  CONSTRAINT fk_consult_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  address VARCHAR(300) NOT NULL,
  village_town VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  facilities TEXT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  operating_hours VARCHAR(120) NOT NULL,
  is_sample TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospitals_location (village_town, district),
  INDEX idx_hospitals_category (category)
) ENGINE=InnoDB;

-- 8. Health Articles
CREATE TABLE IF NOT EXISTS health_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(250) NOT NULL,
  category ENUM(
    'General health',
    'Nutrition',
    'Hygiene',
    'Preventive healthcare',
    'Women\'s health',
    'Child healthcare',
    'Elderly care'
  ) NOT NULL,
  language ENUM('en', 'te', 'hi') NOT NULL DEFAULT 'en',
  short_description VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500) NULL,
  is_reviewed TINYINT(1) NOT NULL DEFAULT 1,
  published_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_articles_cat_lang (category, language)
) ENGINE=InnoDB;

-- 9. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(60) NOT NULL DEFAULT 'system',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  related_entity_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  patient_id INT NOT NULL,
  amount INT NOT NULL DEFAULT 100,
  operating_cost INT NOT NULL DEFAULT 35,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  payment_method VARCHAR(60) NOT NULL DEFAULT 'UPI Simulation',
  gateway_mode ENUM('razorpay', 'simulation') NOT NULL DEFAULT 'simulation',
  transaction_ref VARCHAR(120) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_tx (transaction_ref),
  INDEX idx_payments_patient (patient_id),
  INDEX idx_payments_appt (appointment_id),
  CONSTRAINT fk_pay_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. Doctor Verification Requests
CREATE TABLE IF NOT EXISTS doctor_verification_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  council_name VARCHAR(180) NOT NULL,
  document_note VARCHAR(300) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  review_notes VARCHAR(300) NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dvr_status (status),
  CONSTRAINT fk_dvr_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_dvr_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
