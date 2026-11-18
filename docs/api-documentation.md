# API Documentation — Rural Health Connect

Base URL: `/api`

## Authentication
- `POST /api/auth/register` — Register patient or doctor account (`role`: `patient` | `doctor`).
- `POST /api/auth/login` — Authenticate and receive JWT + user profile.
- `POST /api/auth/logout` — End client session.
- `POST /api/auth/forgot-password` — Generate 6-digit development demo OTP.
- `POST /api/auth/reset-password` — Verify OTP and update password hash.
- `GET /api/auth/me` — Retrieve authenticated user profile (`Bearer <token>`).

## Public Discovery
- `GET /api/doctors` — Search/filter verified doctors (`search`, `specialization`, `language`, `day`, `maxFee`, `sort`).
- `GET /api/doctors/:id` — Doctor detail and weekly availability.
- `GET /api/appointments/slots?doctorId=&date=` — Real-time available vs booked time slots.
- `GET /api/hospitals` — Search/filter hospitals (`search`, `location`, `category`, `lat`, `lng`).
- `GET /api/articles` — Search/filter health articles (`search`, `category`, `language`).
- `POST /api/contact` — Submit public contact inquiry.

## Patient Endpoints (`role: patient`)
- `GET /api/patient/dashboard` — Profile, upcoming/completed appointments, notifications, payments, and recommended articles.
- `PUT /api/patient/profile` — Update profile fields & language preference.
- `POST /api/appointments/book` — Transactionally book slot & record payment (`simulateOutcome`: `success` | `failure`).
- `PATCH /api/appointments/:id/cancel` — Cancel appointment and release slot lock.

## Doctor Endpoints (`role: doctor`)
- `GET /api/doctor/dashboard` — Doctor verification state, availability, and assigned appointments.
- `PUT /api/doctor/profile` — Update qualification, specialization, fee, languages, and bio.
- `PUT /api/doctor/availability` — Save weekly availability schedule.
- `PATCH /api/doctor/appointments/:id/status` — Accept (`confirmed`), decline (`cancelled`), or complete (`completed`).

## Consultation Room (`patient` / `doctor` / `admin` assigned)
- `GET /api/appointments/:id/consultation` — Authorized room metadata & notes.
- `PUT /api/appointments/:id/consultation` — Save doctor notes, prescription summary, and completion status.
- WebSocket Signaling: `ws(s)://<host>/ws/signaling?token=<jwt>&roomId=<roomId>`

## Administrator Endpoints (`role: admin`)
- `GET /api/admin/overview` — Platform counts, appointment breakdown, and revenue/operating cost summary.
- `GET /api/admin/users` & `PATCH /api/admin/users/:id/toggle-active`
- `GET /api/admin/doctors` & `PATCH /api/admin/doctors/:id/verify`
- `GET /api/admin/appointments` & `GET /api/admin/payments`
- `POST /api/admin/hospitals` & `DELETE /api/admin/hospitals/:id`
- `POST /api/admin/articles` & `DELETE /api/admin/articles/:id`
