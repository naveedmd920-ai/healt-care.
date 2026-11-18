# Database Design — Rural Health Connect

The normalized relational schema (`database/schema.sql`) defines 11 core tables with foreign keys, indexes, and unique constraints:

1. `users` — Core accounts (`patient`, `doctor`, `admin`), bcrypt `password_hash`, `preferred_language` (`en`, `te`, `hi`), `is_active`, and `reset_otp`.
2. `patient_profiles` — 1:1 with `users`; stores age, gender, village/town, district, blood group, medical notes, and emergency contact.
3. `doctors` — 1:1 with `users`; qualification, specialization, experience, `consultation_fee` (default ₹100), `operating_cost` (default ₹35), `languages_spoken`, `is_sample`, `verification_status` (`pending`, `verified`, `rejected`).
4. `doctor_availability` — Weekly schedule per doctor (`day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `is_available`).
5. `appointments` — Links `patient_id` (`users.id`) and `doctor_id` (`doctors.id`), with `slot_lock_key` (`UNIQUE` on active non-cancelled slots) to prevent double booking at the database level.
6. `consultations` — 1:1 with `appointments`; stores `room_id`, `doctor_notes`, `prescription_summary`, `follow_up_date`, `started_at`, `ended_at`.
7. `hospitals` — Rural clinics, PHCs, CHCs, and referral hospitals with coordinates (`latitude`, `longitude`), facilities, and `is_sample` flag.
8. `health_articles` — Reviewed educational articles across 7 categories and 3 languages (`en`, `te`, `hi`).
9. `notifications` — User notifications for appointment status, doctor verification, and public contact inquiries.
10. `payments` — Tracks ₹100 consultation fee, ₹35 direct operating cost, gateway mode (`razorpay` / `simulation`), `transaction_ref`, and status (`pending`, `paid`, `failed`, `refunded`).
11. `doctor_verification_requests` — Audit trail for medical council registration numbers, reviewer admin ID, and approval/rejection notes.
