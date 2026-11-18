-- Rural Health Connect - Seed Data (MySQL 8.0+)
-- Note: Sample doctors and sample hospitals are explicitly flagged is_sample = 1 for demonstration.
-- Demo passwords (all hashed with bcrypt cost 10 for 'Demo@1234'):
--   Patient: patient@ruralhealth.demo / Demo@1234
--   Doctor (Verified Sample): dr.ananya@ruralhealth.demo / Demo@1234
--   Doctor (Pending Verification): dr.kiran@ruralhealth.demo / Demo@1234
--   Admin: admin@ruralhealth.demo / Demo@1234

USE rural_health_connect;

-- Users (verified bcrypt hash for 'Demo@1234')
INSERT INTO users (id, full_name, email, phone, password_hash, role, preferred_language, is_active) VALUES
(1, 'Ramesh Goud', 'patient@ruralhealth.demo', '9848011122', '$2b$10$lGM7WXXDh3r/FmWl6oiGxeUPdKCBusrm/O6syJECR62I.6Wmqf9vC', 'patient', 'en', 1),
(2, 'Dr. Ananya Reddy (Sample)', 'dr.ananya@ruralhealth.demo', '9848022233', '$2b$10$lGM7WXXDh3r/FmWl6oiGxeUPdKCBusrm/O6syJECR62I.6Wmqf9vC', 'doctor', 'en', 1),
(3, 'Dr. Suresh Babu (Sample)', 'dr.suresh@ruralhealth.demo', '9848033344', '$2b$10$lGM7WXXDh3r/FmWl6oiGxeUPdKCBusrm/O6syJECR62I.6Wmqf9vC', 'doctor', 'te', 1),
(4, 'Dr. Lakshmi Devi (Sample)', 'dr.lakshmi@ruralhealth.demo', '9848044455', '$2b$10$lGM7WXXDh3r/FmWl6oiGxeUPdKCBusrm/O6syJECR62I.6Wmqf9vC', 'doctor', 'hi', 1),
(5, 'Dr. Kiran Kumar (Pending Sample)', 'dr.kiran@ruralhealth.demo', '9848055566', '$2b$10$lGM7WXXDh3r/FmWl6oiGxeUPdKCBusrm/O6syJECR62I.6Wmqf9vC', 'doctor', 'en', 1),
(6, 'Team Elite Admin', 'admin@ruralhealth.demo', '9848099900', '$2b$10$lGM7WXXDh3r/FmWl6oiGxeUPdKCBusrm/O6syJECR62I.6Wmqf9vC', 'admin', 'en', 1)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Patient Profile
INSERT INTO patient_profiles (user_id, age, gender, village_town, district, blood_group, medical_notes, emergency_contact) VALUES
(1, 44, 'male', 'Yamnampet', 'Medchal-Malkajgiri', 'O+', 'Seasonal dust allergy; checks blood pressure monthly.', '9848011199')
ON DUPLICATE KEY UPDATE village_town = VALUES(village_town);

-- Doctors
INSERT INTO doctors (id, user_id, qualification, specialization, experience_years, consultation_fee, operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status) VALUES
(1, 2, 'MBBS, MD (General Medicine)', 'General Physician', 8, 100, 35, 'English, Telugu, Hindi', 'Sample demonstration physician focused on rural primary care, viral fever triage, blood pressure management, and diabetes guidance.', '/src/assets/images/doctor_female_general_1795011401396.jpg', 'Ghatkesar Outreach Desk (Sample)', 1, 'verified'),
(2, 3, 'MBBS, DCH (Pediatrics)', 'Pediatrician', 11, 100, 35, 'English, Telugu', 'Sample demonstration pediatrician supporting rural families with child growth tracking, seasonal fever advice, and immunization schedules.', '/src/assets/images/doctor_male_pediatrician_1795011401592.jpg', 'Keesara Rural Care Desk (Sample)', 1, 'verified'),
(3, 4, 'MBBS, MS (OB-GYN)', 'Gynecologist', 14, 100, 35, 'English, Hindi, Telugu', 'Sample demonstration specialist focusing on maternal health, iron-deficiency counseling, and women wellness consultations.', '/src/assets/images/doctor_female_gynecologist_1795011402278.jpg', 'Bibinagar Maternal Care Unit (Sample)', 1, 'verified'),
(4, 5, 'MBBS (Community Medicine)', 'Preventive Care', 4, 100, 35, 'English, Telugu', 'Sample pending verification profile used to demonstrate the administrator verification queue.', '/src/assets/images/doctor_male_pediatrician_1795011401592.jpg', 'Yamnampet Village Desk (Sample)', 1, 'pending')
ON DUPLICATE KEY UPDATE qualification = VALUES(qualification);

-- Doctor Availability
INSERT IGNORE INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available) VALUES
(1, 'Monday', '09:00', '13:00', 30, 1),
(1, 'Tuesday', '09:00', '13:00', 30, 1),
(1, 'Wednesday', '09:00', '13:00', 30, 1),
(1, 'Thursday', '09:00', '13:00', 30, 1),
(1, 'Friday', '09:00', '13:00', 30, 1),
(1, 'Saturday', '09:00', '13:00', 30, 1),
(1, 'Sunday', '10:00', '13:00', 30, 1),
(2, 'Monday', '09:00', '13:00', 30, 1),
(2, 'Tuesday', '09:00', '13:00', 30, 1),
(2, 'Wednesday', '09:00', '13:00', 30, 1),
(2, 'Thursday', '09:00', '13:00', 30, 1),
(2, 'Friday', '09:00', '13:00', 30, 1),
(2, 'Saturday', '09:00', '13:00', 30, 1),
(3, 'Monday', '09:00', '13:00', 30, 1),
(3, 'Tuesday', '09:00', '13:00', 30, 1),
(3, 'Wednesday', '09:00', '13:00', 30, 1),
(3, 'Thursday', '09:00', '13:00', 30, 1),
(3, 'Friday', '09:00', '13:00', 30, 1),
(3, 'Saturday', '09:00', '13:00', 30, 1);

-- Doctor Verification Requests
INSERT INTO doctor_verification_requests (doctor_id, registration_number, council_name, document_note, status, reviewed_by, review_notes) VALUES
(1, 'TSMC-DEMO-10421', 'Telangana State Medical Council (Demo)', 'Sample verification record for demonstration', 'approved', 6, 'Approved for platform demonstration'),
(2, 'TSMC-DEMO-10884', 'Telangana State Medical Council (Demo)', 'Sample verification record for demonstration', 'approved', 6, 'Approved for platform demonstration'),
(3, 'TSMC-DEMO-09215', 'Telangana State Medical Council (Demo)', 'Sample verification record for demonstration', 'approved', 6, 'Approved for platform demonstration'),
(4, 'TSMC-DEMO-22410', 'Telangana State Medical Council (Demo)', 'Pending verification demo submission', 'pending', NULL, NULL);

-- Sample Hospitals (explicitly labelled is_sample = 1)
INSERT INTO hospitals (name, category, address, village_town, district, phone, facilities, latitude, longitude, operating_hours, is_sample) VALUES
('Yamnampet Primary Health Centre (Sample)', 'Primary Health Centre', 'Main Panchayat Road, Yamnampet Village', 'Yamnampet', 'Medchal-Malkajgiri', '040-0000-0101 (Demo)', 'Outpatient Care, Maternal Checkups, Basic Lab, Immunization', 17.4562, 78.6684, 'Mon-Sat 08:00 AM - 04:00 PM (Sample)', 1),
('Ghatkesar Community Health Centre (Sample)', 'Community Health Centre', 'Station Road, Ghatkesar Mandal', 'Ghatkesar', 'Medchal-Malkajgiri', '040-0000-0102 (Demo)', '24x7 Emergency Triage, Pharmacy, X-Ray, General Medicine', 17.4518, 78.6852, '24 Hours (Sample)', 1),
('Keesara Maternal & Child Clinic (Sample)', 'Rural Clinic', 'Temple Road, Keesara Mandal', 'Keesara', 'Medchal-Malkajgiri', '040-0000-0103 (Demo)', 'Antenatal Care, Pediatrics, Blood Sugar Screening, ORS Corner', 17.5234, 78.6639, 'Mon-Sat 09:00 AM - 06:00 PM (Sample)', 1),
('Bibinagar Area Referral Hospital (Sample)', 'District Referral Hospital', 'NH-163 Corridor, Bibinagar', 'Bibinagar', 'Yadadri Bhuvanagiri', '040-0000-0104 (Demo)', 'Emergency Care, Diagnostics, General Surgery, Orthopedics', 17.4725, 78.7955, '24 Hours (Sample)', 1),
('Pocharam Wellness Sub-Centre (Sample)', 'Sub-Centre', 'Gram Panchayat Lane, Pocharam', 'Pocharam', 'Medchal-Malkajgiri', '040-0000-0105 (Demo)', 'BP & Glucose Monitoring, First Aid, Telemedicine Helpdesk', 17.4342, 78.6478, 'Mon-Fri 09:00 AM - 03:00 PM (Sample)', 1);

-- Health Articles (all 7 categories)
INSERT INTO health_articles (title, category, language, short_description, content, image_url, is_reviewed, published_date) VALUES
('Recognizing Early Dehydration and Using ORS Safely', 'General health', 'en', 'How to spot early dehydration in adults and children during hot months and prepare Oral Rehydration Solution correctly.', 'Educational Health Guide: Mix one standard ORS packet in one full liter of clean boiled-and-cooled drinking water. Always consult a qualified doctor if vomiting persists.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-10-15'),
('Balanced Village Meals: Iron and Protein on a Budget', 'Nutrition', 'en', 'Combining millets, pulses, leafy greens, and vitamin C foods to prevent anemia and maintain daily energy.', 'Educational Health Guide: Pairing leafy greens with lemon or amla improves iron absorption. Educational only; consult a doctor for medical diagnosis.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-10-18'),
('Safe Drinking Water and Handwashing Practices at Home', 'Hygiene', 'en', 'Simple water storage and 20-second soap handwashing habits that prevent waterborne seasonal illnesses.', 'Educational Health Guide: Store drinking water in covered vessels and wash hands with soap for 20 seconds before meals.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-10-20'),
('Why Regular Blood Pressure Checks Matter After Age 35', 'Preventive healthcare', 'en', 'Understanding silent hypertension and how periodic checkups protect heart and kidney health.', 'Educational Health Guide: Check blood pressure at least twice a year and follow prescribed medication consistently.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-10-22'),
('Antenatal Care and Iron Support During Pregnancy', 'Women\'s health', 'en', 'Essential checkups, nutrition habits, and warning signs every expectant mother and family should know.', 'Educational Health Guide: Attend regular antenatal visits and take prescribed iron-folic acid tablets.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-10-25'),
('Child Immunization Milestones and Fever Care', 'Child healthcare', 'en', 'Keeping track of routine childhood vaccines and safe home care while consulting a pediatrician.', 'Educational Health Guide: Keep your MCP card updated and consult a qualified pediatrician before giving medication.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-10-28'),
('Joint Comfort, Fall Prevention, and Medicine Safety for Seniors', 'Elderly care', 'en', 'Practical home adjustments and daily routines that keep elderly family members mobile and safe.', 'Educational Health Guide: Maintain well-lit walkways and keep an updated medicine list for every consultation.', '/src/assets/images/article_preventive_hygiene_1795011404035.jpg', 1, '2026-11-01');
