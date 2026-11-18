# Rural Health Connect — Healthcare for Every Village

**Team Elite** | Sreenidhi Institute of Science and Technology (SNIST), Yamnampet, Ghatkesar

Rural Health Connect is a full-stack multilingual telemedicine, appointment scheduling, nearby hospital discovery, and preventive health awareness web application built to connect rural households with qualified doctors at a predictable **₹100 consultation fee** (with a **₹35 direct operating cost** unit-economics model).

---

## Application Pages & Core Features

- **Landing Page (`/`)**: Multilingual hero, rural healthcare problem/solution overview, 4-step workflow, featured sample doctors, nearby hospitals preview, ₹100 / ₹35 fee transparency breakdown, FAQ, and persisted contact inquiry form.
- **Multilingual Interface (`en` / `te` / `hi`)**: Live switching across **English**, **Telugu (తెలుగు)**, and **Hindi (हिन्दी)** persisted in `localStorage` and synchronized to the user's database profile.
- **Authentication & RBAC (`/login`, `/register`, `/forgot-password`)**:
  - JWT + `bcrypt` password hashing with strict role-based access control (`patient`, `doctor`, `admin`).
  - `?redirect=` preservation so patients signing in from a doctor's booking page return directly to their selected doctor.
  - Forgot Password / Reset Password flow using a clearly labelled **Development Demo OTP**.
- **Doctor Discovery & Booking (`/doctors`, `/doctors/:id`)**:
  - Debounced live filtering by name/clinic, specialization, language, availability day, maximum fee, and sort order, plus a Quick Profile Preview modal.
  - Slot availability query (`GET /api/doctors/:id/slots`), atomic double-booking lock (`slot_lock_key`), live payment capability status (`GET /api/config/capabilities`), and Development Payment Simulation (supporting success and failure test paths).
- **Patient Portal (`/patient/dashboard`)**:
  - Upcoming appointment reminder banner (today/tomorrow), overview metrics, appointment cancellation confirmation modal with optional reason, consultation summary & prescription notes modal, payment history, notifications, and profile/language editor.
- **Doctor Portal (`/doctor/dashboard`)**:
  - Verification status banner (`pending`, `verified`, `rejected`), weekly availability manager, appointment acceptance/rejection/completion, and consultation notes/prescription editor.
- **Administrator Portal (`/admin/dashboard`)**:
  - Platform revenue vs ₹35 operating cost overview, live search across users, doctors, and appointments, doctor verification approval/rejection queue, appointment status override (`PATCH /api/admin/appointments/:id/status`), and full create/edit/delete management for hospitals and health articles.
- **Video Consultation Room (`/consultation/:appointmentId`)**:
  - Room authorization restricted to the assigned patient, assigned doctor, or admin.
  - `getUserMedia` camera/mic controls, WebSocket signaling (`/ws/signaling`) + WebRTC peer connection, live consultation chat, and Single-Device Demo Mode fallback notice.
- **Nearby Hospital Finder (`/hospitals`)**: Interactive **Leaflet + OpenStreetMap** map with search by name, manual village/district fallback, category filtering, and optional browser geolocation sorting.
- **Health Tips & Awareness (`/health-tips`)**: 7 reviewed categories (`General health`, `Nutrition`, `Hygiene`, `Preventive healthcare`, `Women's health`, `Child healthcare`, `Elderly care`) with search, language filter, and full reader modal.

---

## Security Controls

- **Authentication**: Signed JWT tokens verified via `requireAuth` middleware and `bcrypt` password hashing (10 salt rounds).
- **Authorization (RBAC)**: Strict `requireRole(...)` guards on Patient, Doctor, and Admin API endpoints; consultation room access enforces participant matching (`patient_id` or `doctor_id`).
- **Concurrency & Data Integrity**: Relational foreign keys (`PRAGMA foreign_keys = ON` in SQLite; `FOREIGN KEY` constraints in MySQL) and unique `slot_lock_key` constraints inside database transactions prevent duplicate slot bookings under concurrent requests.
- **Environment Hygiene**: `.gitignore` excludes `.env*` (preserving `.env.example`), `*.db*`, `dist/`, `node_modules/`, `server.js`, and archive outputs.

---

## Implemented vs Simulated Features

| Feature | Production Capability | Development / Simulation Behavior |
| :--- | :--- | :--- |
| **Relational SQL Database** | MySQL 8.0+ (`DB_CLIENT=mysql`, `database/schema.sql`, `database/seed.sql`) | Embedded SQLite (`better-sqlite3` at `database/rural_health_connect.db`) with `PRAGMA foreign_keys = ON` and ACID transactions when MySQL is unavailable. |
| **Payment Gateway** | Configurable Razorpay (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` reported via `/api/config/capabilities`) | Clearly labelled **Development Payment Simulation** supporting both confirmed payments and simulated `402` payment failure testing. |
| **Password Reset OTP** | External SMS/Email provider integration | Clearly labelled **Development Demo OTP** returned in response for local testing without SMTP/SMS secrets. |
| **Video Consultation** | Real WebRTC + WebSocket signaling (`/ws/signaling`) across two browsers/devices | Local camera/mic + signaling works in one browser with a Single-Device Waiting/Demo Mode indicator until a second peer joins. |
| **Doctors & Hospitals** | Admin-verified doctors and curated hospital records | Initial seeded doctors and hospitals are explicitly marked `is_sample = 1` for demonstration. |

---

## Updated Folder Structure

```text
rural-health-connect/
├── backend/
│   ├── config/db.ts                  # Dual SQL adapter (MySQL 8.0+ & embedded SQLite)
│   ├── controllers/                  # Auth, Patient, Doctor, Appointment, Hospital, Article, Admin, Contact
│   ├── middleware/auth.ts            # JWT verification & role-based access control
│   ├── routes/api.ts                 # Versioned REST API + /api/config/capabilities
│   ├── services/signaling.ts         # WebSocket signaling for WebRTC consultation rooms
│   └── utils/                        # Validation & response helpers
├── database/
│   ├── schema.sql                    # 11-table MySQL 8.0+ schema with foreign keys & slot_lock_key
│   └── seed.sql                      # Verified Demo@1234 bcrypt hashes, sample doctors, hospitals, articles
├── docs/
│   ├── api-documentation.md
│   ├── database-design.md
│   └── project-overview.md
├── src/
│   ├── assets/images/                # Local photography assets
│   ├── components/                   # Navbar, Footer, SafeImage, ProtectedRoute, DashboardShell
│   ├── context/                      # AuthContext, LanguageContext
│   ├── pages/                        # Landing, Auth, Discovery, Booking, Hospitals, HealthTips, Video, 3 Dashboards
│   ├── services/api.ts               # Axios client with Bearer token interceptor
│   ├── translations/                 # English (en), Telugu (te), Hindi (hi)
│   ├── App.tsx                       # Route wiring & role guards
│   └── index.css                     # Tailwind CSS v4 + Leaflet styling
├── .env.example
├── .gitignore
├── index.html
├── metadata.json
├── package.json
├── server.ts                         # Express + Vite middleware + WebSocket signaling (port 3000)
├── tsconfig.json
└── vite.config.ts
```

---

## Demo Credentials (Password for all: `Demo@1234`)

- **Patient**: `patient@ruralhealth.demo` / `Demo@1234`
- **Doctor (Verified Sample)**: `dr.ananya@ruralhealth.demo` / `Demo@1234`
- **Doctor (Pending Verification)**: `dr.kiran@ruralhealth.demo` / `Demo@1234`
- **Administrator**: `admin@ruralhealth.demo` / `Demo@1234`

---

## Installation & Running Locally

### Option A: Zero-Config Embedded SQLite (Quick Start)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Optional — copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack development server (Express API + WebSocket signaling + Vite frontend on port `3000`):
   ```bash
   npm run dev
   ```
4. Build and run production bundle:
   ```bash
   npm run build
   npm start
   ```

### Option B: External MySQL 8.0+ Database
1. Create a MySQL database (e.g., `rural_health_connect`) and import the schema & seed files:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p rural_health_connect < database/seed.sql
   ```
2. Configure `.env`:
   ```env
   DB_CLIENT="mysql"
   MYSQL_HOST="127.0.0.1"
   MYSQL_PORT="3306"
   MYSQL_USER="root"
   MYSQL_PASSWORD="your_password"
   MYSQL_DATABASE="rural_health_connect"
   JWT_SECRET="replace_with_a_strong_random_secret"
   ```
3. Run `npm run dev` or `npm run build && npm start`.

---

## End-to-End Verification Checklist

1. **Patient Flow**: Sign in as `patient@ruralhealth.demo` -> Search doctors -> Select date & time slot -> Test simulated payment confirmation & `402` payment failure -> Verify duplicate slot booking returns `409` -> Cancel via modal & view consultation notes modal -> Edit profile & switch language (`en`/`te`/`hi`).
2. **Doctor Flow**: Sign in as `dr.ananya@ruralhealth.demo` -> Update weekly availability -> Accept or complete an appointment -> Open consultation room & save notes.
3. **Admin Flow**: Sign in as `admin@ruralhealth.demo` -> Search users/doctors/appointments -> Approve `dr.kiran@ruralhealth.demo` -> Update appointment status -> Add, edit, and delete a hospital or health article -> Inspect revenue vs ₹35 cost totals.
