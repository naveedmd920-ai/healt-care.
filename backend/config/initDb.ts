import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import { env } from './env.ts';

function formatDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export async function initializeDatabase(): Promise<void> {
  if (env.dbClient === 'mysql') {
    // When running against an external MySQL instance, verify connectivity cleanly.
    await db.query('SELECT 1');
    return;
  }

  const sqlite = db.getRawSqlite();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
      preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'te', 'hi')),
      is_active INTEGER NOT NULL DEFAULT 1,
      reset_otp TEXT NULL,
      reset_otp_expires_at TEXT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS patient_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      age INTEGER NULL,
      gender TEXT NULL CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
      village_town TEXT NOT NULL,
      district TEXT NULL DEFAULT 'Medchal-Malkajgiri',
      blood_group TEXT NULL,
      medical_notes TEXT NULL,
      emergency_contact TEXT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      qualification TEXT NOT NULL,
      specialization TEXT NOT NULL,
      experience_years INTEGER NOT NULL DEFAULT 1,
      consultation_fee INTEGER NOT NULL DEFAULT 100,
      operating_cost INTEGER NOT NULL DEFAULT 35,
      languages_spoken TEXT NOT NULL DEFAULT 'English, Telugu',
      bio TEXT NULL,
      avatar_url TEXT NULL,
      clinic_location TEXT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_doctors_spec ON doctors(specialization);
    CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(verification_status);

    CREATE TABLE IF NOT EXISTS doctor_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 20,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (doctor_id, day_of_week),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      consultation_mode TEXT NOT NULL DEFAULT 'video' CHECK (consultation_mode IN ('video', 'audio')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
      cancellation_reason TEXT NULL,
      slot_lock_key TEXT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id, appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id, appointment_date);

    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      room_id TEXT NOT NULL UNIQUE,
      doctor_notes TEXT NULL,
      prescription_summary TEXT NULL,
      follow_up_date TEXT NULL,
      started_at TEXT NULL,
      ended_at TEXT NULL,
      connection_mode TEXT NOT NULL DEFAULT 'webrtc' CHECK (connection_mode IN ('webrtc', 'demo_simulation')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT NOT NULL,
      village_town TEXT NOT NULL,
      district TEXT NOT NULL,
      phone TEXT NOT NULL,
      facilities TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      operating_hours TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('General health','Nutrition','Hygiene','Preventive healthcare','Women''s health','Child healthcare','Elderly care')),
      language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te', 'hi')),
      short_description TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NULL,
      is_reviewed INTEGER NOT NULL DEFAULT 1,
      published_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      is_read INTEGER NOT NULL DEFAULT 0,
      related_entity_id INTEGER NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 100,
      operating_cost INTEGER NOT NULL DEFAULT 35,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_method TEXT NOT NULL DEFAULT 'UPI Simulation',
      gateway_mode TEXT NOT NULL DEFAULT 'simulation' CHECK (gateway_mode IN ('razorpay', 'simulation')),
      transaction_ref TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_verification_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      registration_number TEXT NOT NULL,
      council_name TEXT NOT NULL,
      document_note TEXT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by INTEGER NULL,
      review_notes TEXT NULL,
      reviewed_at TEXT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const existingUsers = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (existingUsers && existingUsers.count > 0) {
    return;
  }

  // Seed initial demo data idempotently with a real bcrypt password hash
  const demoPasswordHash = await bcrypt.hash('Demo@1234', 10);

  await db.transaction(async (tx) => {
    // 1. Seed Demo Patient, Sample Doctors (3 verified sample, 1 pending), and Admin
    const p1 = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Ramesh Goud', 'patient@ruralhealth.demo', '9848011122', demoPasswordHash, 'patient', 'en']
    );
    const p2 = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Lakshmi Narayana', 'lakshmi.patient@ruralhealth.demo', '9848011133', demoPasswordHash, 'patient', 'te']
    );
    const d1User = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Dr. Ananya Reddy (Sample)', 'dr.ananya@ruralhealth.demo', '9848022233', demoPasswordHash, 'doctor', 'en']
    );
    const d2User = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Dr. Suresh Babu (Sample)', 'dr.suresh@ruralhealth.demo', '9848033344', demoPasswordHash, 'doctor', 'te']
    );
    const d3User = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Dr. Lakshmi Devi (Sample)', 'dr.lakshmi@ruralhealth.demo', '9848044455', demoPasswordHash, 'doctor', 'hi']
    );
    const d4User = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Dr. Kiran Kumar (Pending Sample)', 'dr.kiran@ruralhealth.demo', '9848055566', demoPasswordHash, 'doctor', 'en']
    );
    const adminUser = await tx.run(
      `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Team Elite Admin', 'admin@ruralhealth.demo', '9848099900', demoPasswordHash, 'admin', 'en']
    );

    // 2. Patient Profiles
    await tx.run(
      `INSERT INTO patient_profiles (user_id, age, gender, village_town, district, blood_group, medical_notes, emergency_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p1.insertId, 44, 'male', 'Yamnampet', 'Medchal-Malkajgiri', 'O+', 'Seasonal dust allergy; checks blood pressure monthly.', '9848011199']
    );
    await tx.run(
      `INSERT INTO patient_profiles (user_id, age, gender, village_town, district, blood_group, medical_notes, emergency_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p2.insertId, 58, 'female', 'Ghatkesar', 'Medchal-Malkajgiri', 'B+', 'Joint discomfort and routine diabetes monitoring.', '9848011188']
    );

    // 3. Doctors (is_sample = 1 so UI honestly marks them as demonstration profiles)
    const doc1 = await tx.run(
      `INSERT INTO doctors (user_id, qualification, specialization, experience_years, consultation_fee, operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'verified')`,
      [
        d1User.insertId,
        'MBBS, MD (General Medicine)',
        'General Physician',
        8,
        100,
        35,
        'English, Telugu, Hindi',
        'Sample demonstration physician focused on rural primary care, viral fever triage, blood pressure management, and diabetes guidance.',
        '/src/assets/images/doctor_female_general_1795011401396.jpg',
        'Ghatkesar Outreach Desk (Sample)',
      ]
    );

    const doc2 = await tx.run(
      `INSERT INTO doctors (user_id, qualification, specialization, experience_years, consultation_fee, operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'verified')`,
      [
        d2User.insertId,
        'MBBS, DCH (Pediatrics)',
        'Pediatrician',
        11,
        100,
        35,
        'English, Telugu',
        'Sample demonstration pediatrician supporting rural families with child growth tracking, seasonal fever advice, and immunization schedules.',
        '/src/assets/images/doctor_male_pediatrician_1795011401592.jpg',
        'Keesara Rural Care Desk (Sample)',
      ]
    );

    const doc3 = await tx.run(
      `INSERT INTO doctors (user_id, qualification, specialization, experience_years, consultation_fee, operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'verified')`,
      [
        d3User.insertId,
        'MBBS, MS (OB-GYN)',
        'Gynecologist',
        14,
        100,
        35,
        'English, Hindi, Telugu',
        'Sample demonstration specialist focusing on maternal health, iron-deficiency counseling, and women wellness consultations.',
        '/src/assets/images/doctor_female_gynecologist_1795011402278.jpg',
        'Bibinagar Maternal Care Unit (Sample)',
      ]
    );

    const doc4 = await tx.run(
      `INSERT INTO doctors (user_id, qualification, specialization, experience_years, consultation_fee, operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending')`,
      [
        d4User.insertId,
        'MBBS (Community Medicine)',
        'Preventive Care',
        4,
        100,
        35,
        'English, Telugu',
        'Sample pending verification profile used to demonstrate the administrator verification queue.',
        '/src/assets/images/doctor_male_pediatrician_1795011401592.jpg',
        'Yamnampet Village Desk (Sample)',
      ]
    );

    // 4. Doctor Verification Requests
    await tx.run(
      `INSERT INTO doctor_verification_requests (doctor_id, registration_number, council_name, document_note, status, reviewed_by, review_notes, reviewed_at)
       VALUES (?, ?, ?, ?, 'approved', ?, 'Demo verification approved', datetime('now'))`,
      [doc1.insertId, 'TSMC-DEMO-10421', 'Telangana State Medical Council (Demo)', 'Sample verification record for demonstration', adminUser.insertId]
    );
    await tx.run(
      `INSERT INTO doctor_verification_requests (doctor_id, registration_number, council_name, document_note, status, reviewed_by, review_notes, reviewed_at)
       VALUES (?, ?, ?, ?, 'approved', ?, 'Demo verification approved', datetime('now'))`,
      [doc2.insertId, 'TSMC-DEMO-10884', 'Telangana State Medical Council (Demo)', 'Sample verification record for demonstration', adminUser.insertId]
    );
    await tx.run(
      `INSERT INTO doctor_verification_requests (doctor_id, registration_number, council_name, document_note, status, reviewed_by, review_notes, reviewed_at)
       VALUES (?, ?, ?, ?, 'approved', ?, 'Demo verification approved', datetime('now'))`,
      [doc3.insertId, 'TSMC-DEMO-09215', 'Telangana State Medical Council (Demo)', 'Sample verification record for demonstration', adminUser.insertId]
    );
    await tx.run(
      `INSERT INTO doctor_verification_requests (doctor_id, registration_number, council_name, document_note, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [doc4.insertId, 'TSMC-DEMO-22410', 'Telangana State Medical Council (Demo)', 'Awaiting administrator approval in demo queue']
    );

    // 5. Doctor Weekly Availability (Every day for demo convenience, with clear morning & evening windows)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const docId of [doc1.insertId, doc2.insertId, doc3.insertId]) {
      for (const day of days) {
        await tx.run(
          `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [docId, day, '09:00', '13:00', 30, day === 'Sunday' ? 0 : 1]
        );
      }
    }
    // Also make doc1 available on Sunday so any day tested works smoothly!
    await tx.run(
      `UPDATE doctor_availability SET is_available = 1, start_time = '10:00', end_time = '13:00' WHERE doctor_id = ? AND day_of_week = 'Sunday'`,
      [doc1.insertId]
    );

    // 6. Sample Appointments, Payments, and Consultations
    const tomorrow = formatDateOffset(1);
    const yesterday = formatDateOffset(-2);

    const apptUpcoming = await tx.run(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, symptoms, consultation_mode, status, payment_status, slot_lock_key)
       VALUES (?, ?, ?, ?, ?, 'video', 'confirmed', 'paid', ?)`,
      [p1.insertId, doc1.insertId, tomorrow, '10:00', 'Mild fever and body ache since 2 days', `${doc1.insertId}_${tomorrow}_10:00`]
    );

    await tx.run(
      `INSERT INTO consultations (appointment_id, room_id, connection_mode) VALUES (?, ?, 'webrtc')`,
      [apptUpcoming.insertId, `rhc-room-${apptUpcoming.insertId}-demo`]
    );

    await tx.run(
      `INSERT INTO payments (appointment_id, patient_id, amount, operating_cost, currency, payment_method, gateway_mode, transaction_ref, status)
       VALUES (?, ?, 100, 35, 'INR', 'UPI Simulation', 'simulation', ?, 'paid')`,
      [apptUpcoming.insertId, p1.insertId, `SIM-TXN-${apptUpcoming.insertId}-1001`]
    );

    const apptCompleted = await tx.run(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, symptoms, consultation_mode, status, payment_status, slot_lock_key)
       VALUES (?, ?, ?, ?, ?, 'video', 'completed', 'paid', ?)`,
      [p1.insertId, doc2.insertId, yesterday, '11:00', 'Childhood seasonal cough follow-up', `${doc2.insertId}_${yesterday}_11:00`]
    );

    await tx.run(
      `INSERT INTO consultations (appointment_id, room_id, doctor_notes, prescription_summary, follow_up_date, started_at, ended_at, connection_mode)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-2 days', '+15 minutes'), 'webrtc')`,
      [
        apptCompleted.insertId,
        `rhc-room-${apptCompleted.insertId}-done`,
        'Patient advised warm hydration, steam inhalation, and temperature monitoring twice daily.',
        'Warm saline nasal drops; Paracetamol syrup SOS if fever > 100.4F (consult local PHC if persistent).',
        formatDateOffset(5),
      ]
    );

    await tx.run(
      `INSERT INTO payments (appointment_id, patient_id, amount, operating_cost, currency, payment_method, gateway_mode, transaction_ref, status)
       VALUES (?, ?, 100, 35, 'INR', 'UPI Simulation', 'simulation', ?, 'paid')`,
      [apptCompleted.insertId, p1.insertId, `SIM-TXN-${apptCompleted.insertId}-1002`]
    );

    // 7. Sample Hospitals (clearly flagged is_sample = 1)
    const sampleHospitals = [
      [
        'Yamnampet Primary Health Centre (Sample)',
        'Primary Health Centre',
        'Main Panchayat Road, Yamnampet Village',
        'Yamnampet',
        'Medchal-Malkajgiri',
        '040-0000-0101 (Demo)',
        'Outpatient Care, Maternal Checkups, Basic Lab, Immunization',
        17.4562,
        78.6684,
        'Mon-Sat 08:00 AM - 04:00 PM (Sample)',
      ],
      [
        'Ghatkesar Community Health Centre (Sample)',
        'Community Health Centre',
        'Station Road, Ghatkesar Mandal',
        'Ghatkesar',
        'Medchal-Malkajgiri',
        '040-0000-0102 (Demo)',
        '24x7 Emergency Triage, Pharmacy, X-Ray, General Medicine',
        17.4518,
        78.6852,
        '24 Hours (Sample)',
      ],
      [
        'Keesara Maternal & Child Clinic (Sample)',
        'Rural Clinic',
        'Temple Road, Keesara Mandal',
        'Keesara',
        'Medchal-Malkajgiri',
        '040-0000-0103 (Demo)',
        'Antenatal Care, Pediatrics, Blood Sugar Screening, ORS Corner',
        17.5234,
        78.6639,
        'Mon-Sat 09:00 AM - 06:00 PM (Sample)',
      ],
      [
        'Bibinagar Area Referral Hospital (Sample)',
        'District Referral Hospital',
        'NH-163 Corridor, Bibinagar',
        'Bibinagar',
        'Yadadri Bhuvanagiri',
        '040-0000-0104 (Demo)',
        'Emergency Care, Diagnostics, General Surgery, Orthopedics',
        17.4725,
        78.7955,
        '24 Hours (Sample)',
      ],
      [
        'Pocharam Wellness Sub-Centre (Sample)',
        'Sub-Centre',
        'Gram Panchayat Lane, Pocharam',
        'Pocharam',
        'Medchal-Malkajgiri',
        '040-0000-0105 (Demo)',
        'BP & Glucose Monitoring, First Aid, Telemedicine Helpdesk',
        17.4342,
        78.6478,
        'Mon-Fri 09:00 AM - 03:00 PM (Sample)',
      ],
    ];

    for (const h of sampleHospitals) {
      await tx.run(
        `INSERT INTO hospitals (name, category, address, village_town, district, phone, facilities, latitude, longitude, operating_hours, is_sample)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        h
      );
    }

    // 8. Multilingual Health Articles across all 7 required categories
    const imgArticle = '/src/assets/images/article_preventive_hygiene_1795011404035.jpg';
    const articles = [
      [
        'Recognizing Early Dehydration and Using ORS Safely',
        'General health',
        'en',
        'How to spot early dehydration in adults and children during hot months and prepare Oral Rehydration Solution correctly.',
        'Educational Health Guide: Dehydration can progress quickly during agricultural work or summer heat. Watch for dry mouth, dizziness, dark urine, or lethargy. Mix one standard ORS packet in one full liter of clean boiled-and-cooled drinking water. Sip steadily rather than drinking all at once. Always consult a qualified doctor or visit your nearest Primary Health Centre if vomiting persists or symptoms worsen.',
        imgArticle,
        formatDateOffset(-10),
      ],
      [
        'Balanced Village Meals: Iron and Protein on a Budget',
        'Nutrition',
        'en',
        'Combining millets, pulses, leafy greens, and vitamin C foods to prevent anemia and maintain daily energy.',
        'Educational Health Guide: Affordable local ingredients provide strong nutrition. Pairing green leafy vegetables (palak, gongura, amaranth) or jaggery with vitamin C sources such as lemon or amla improves iron absorption. Including lentils (dal), groundnuts, eggs, or curd supports muscle strength for rural workers and growing children. This guide is educational and does not replace individualized clinical advice.',
        imgArticle,
        formatDateOffset(-8),
      ],
      [
        'Safe Drinking Water and Handwashing Practices at Home',
        'Hygiene',
        'en',
        'Simple water storage and 20-second soap handwashing habits that prevent waterborne seasonal illnesses.',
        'Educational Health Guide: Waterborne infections such as diarrhea and typhoid are largely preventable. Store drinking water in clean covered vessels with a long-handled ladle rather than dipping hands. Wash hands with soap and clean running water for 20 seconds before preparing food, feeding children, and after using the toilet. Seek medical attention promptly if fever or watery stools persist beyond 24 hours.',
        imgArticle,
        formatDateOffset(-7),
      ],
      [
        'Why Regular Blood Pressure Checks Matter After Age 35',
        'Preventive healthcare',
        'en',
        'Understanding silent hypertension and how periodic checkups protect heart and kidney health.',
        'Educational Health Guide: High blood pressure often causes no noticeable symptoms in its early stages. Adults over 35 should get their blood pressure checked at a local wellness sub-centre or during a teleconsultation at least twice a year. Reducing excess salt in pickles and fried snacks, walking regularly, and taking prescribed medicines consistently help prevent serious complications.',
        imgArticle,
        formatDateOffset(-6),
      ],
      [
        'Antenatal Care and Iron Support During Pregnancy',
        'Women\'s health',
        'en',
        'Essential checkups, nutrition habits, and warning signs every expectant mother and family should know.',
        'Educational Health Guide: Regular antenatal checkups help track maternal hemoglobin, blood pressure, and fetal growth. Eat small nutritious meals rich in pulses, milk, greens, and clean water. Never skip iron-folic acid tablets prescribed by your doctor, and seek immediate care at the nearest hospital if there is severe headache, swelling, blurred vision, or reduced movement.',
        imgArticle,
        formatDateOffset(-5),
      ],
      [
        'Child Immunization Milestones and Fever Care',
        'Child healthcare',
        'en',
        'Keeping track of routine childhood vaccines and safe home care while consulting a pediatrician.',
        'Educational Health Guide: Routine immunization protects children from preventable illnesses such as polio, measles, and diphtheria. Keep your Mother and Child Protection (MCP) card updated at every clinic visit. If a child develops mild fever, dress them in light cotton clothes, encourage fluids, and consult a qualified doctor before giving any medication.',
        imgArticle,
        formatDateOffset(-4),
      ],
      [
        'Joint Comfort, Fall Prevention, and Medicine Safety for Seniors',
        'Elderly care',
        'en',
        'Practical home adjustments and daily routines that keep elderly family members mobile and safe.',
        'Educational Health Guide: Older adults benefit from well-lit walkways, non-slip footwear, and gentle morning stretching. Keep a single written list of all current medicines and dosages to show during online doctor consultations. Never stop blood pressure or diabetes tablets without speaking to a qualified physician.',
        imgArticle,
        formatDateOffset(-3),
      ],
      [
        'వేసవిలో డీహైడ్రేషన్ గుర్తించడం మరియు ORS ఉపయోగించే విధానం',
        'General health',
        'te',
        'ఎండకాలంలో నీటి కొరత లక్షణాలను గుర్తించడం మరియు సురక్షితంగా ORS తయారు చేయడం ఎలా.',
        'విద్యాపరమైన ఆరోగ్య సమాచారం: పొలం పనులు చేసేటప్పుడు లేదా ఎండ ఎక్కువగా ఉన్నప్పుడు శరీరంలో నీరు త్వరగా తగ్గుతుంది. నోరు ఎండిపోవడం, తల తిరగడం, అలసట లక్షణాలు కనిపిస్తే వెంటనే నీడలో విశ్రాంతి తీసుకోండి. ఒక లీటరు శుభ్రమైన కాచి చల్లార్చిన నీటిలో ఒక ORS ప్యాకెట్ కలిపి కొద్దికొద్దిగా తాగాలి. లక్షణాలు తగ్గకపోతే వెంటనే డాక్టర్‌ను సంప్రదించండి.',
        imgArticle,
        formatDateOffset(-2),
      ],
      [
        'గ్రామీణ ఆహారంలో ఐరన్ మరియు ప్రోటీన్ సమతుల్యత',
        'Nutrition',
        'te',
        'రక్తహీనతను నివారించడానికి చిరుధాన్యాలు, ఆకుకూరలు, పప్పులు ఎలా ఉపయోగపడతాయో తెలుసుకోండి.',
        'విద్యాపరమైన ఆరోగ్య సమాచారం: మన గ్రామాలలో సులభంగా దొరికే రాగులు, జొన్నలు, ఆకుకూరలు, కందిపప్పు మరియు నిమ్మరసం కలిపి తీసుకోవడం వల్ల రక్తహీనత తగ్గుతుంది. గర్భిణీ స్త్రీలు మరియు పెరిగే పిల్లలకు ప్రతిరోజూ పౌష్టికాహారం అవసరం. ఈ సమాచారం అవగాహన కోసం మాత్రమే; వైద్య సలహా కోసం డాక్టర్‌ను సంప్రదించండి.',
        imgArticle,
        formatDateOffset(-2),
      ],
      [
        'साफ पानी और साबुन से हाथ धोने की सही आदतें',
        'Hygiene',
        'hi',
        'मानसून और गर्मी में पानी से होने वाली बीमारियों से बचने के आसान घरेलू उपाय।',
        'शैक्षिक स्वास्थ्य जानकारी: दस्त और टाइफाइड जैसी कई बीमारियां स्वच्छ पानी और हाथ धोने से रोकी जा सकती हैं। पीने का पानी हमेशा ढके हुए बर्तन में रखें। खाना बनाने से पहले और शौच के बाद 20 सेकंड तक साबुन से हाथ जरूर धोएं। यदि बुखार या दस्त 24 घंटे से अधिक रहें तो तुरंत डॉक्टर से परामर्श लें।',
        imgArticle,
        formatDateOffset(-1),
      ],
      [
        '35 वर्ष के बाद नियमित ब्लड प्रेशर जांच क्यों जरूरी है',
        'Preventive healthcare',
        'hi',
        'उच्च रक्तचाप के शुरुआती संकेतों को समझें और समय पर जांच से हृदय को सुरक्षित रखें।',
        'शैक्षिक स्वास्थ्य जानकारी: हाई ब्लड प्रेशर अक्सर बिना किसी शुरुआती लक्षण के बढ़ता है। 35 वर्ष से अधिक आयु के लोगों को साल में कम से कम दो बार स्थानीय स्वास्थ्य केंद्र या ऑनलाइन परामर्श के जरिए जांच करानी चाहिए। नमक कम करें, रोज टहलें और डॉक्टर की बताई दवा नियमित लें।',
        imgArticle,
        formatDateOffset(-1),
      ],
    ];

    for (const a of articles) {
      await tx.run(
        `INSERT INTO health_articles (title, category, language, short_description, content, image_url, is_reviewed, published_date)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        a
      );
    }

    // 9. Initial Notifications
    await tx.run(
      `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id)
       VALUES (?, ?, ?, 'appointment', 0, ?)`,
      [
        p1.insertId,
        'Upcoming Consultation Confirmed',
        `Your video consultation with Dr. Ananya Reddy (Sample) is confirmed for ${tomorrow} at 10:00.`,
        apptUpcoming.insertId,
      ]
    );
    await tx.run(
      `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id)
       VALUES (?, ?, ?, 'verification', 0, ?)`,
      [
        adminUser.insertId,
        'Pending Doctor Verification Request',
        'Dr. Kiran Kumar (Pending Sample) submitted TSMC-DEMO-22410 for administrator verification review.',
        doc4.insertId,
      ]
    );
  });
}
