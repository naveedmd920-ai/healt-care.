import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db.ts';
import { AuthRequest } from '../middleware/auth.ts';
import { sqlNow } from '../utils/crypto.ts';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export async function listDoctors(req: Request, res: Response): Promise<void> {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const specialization = String(req.query.specialization || '').trim();
    const language = String(req.query.language || '').trim().toLowerCase();
    const maxFeeRaw = req.query.maxFee !== undefined ? String(req.query.maxFee).trim() : '';
    const maxFee = maxFeeRaw !== '' ? Number(maxFeeRaw) : null;
    const day = String(req.query.day || '').trim();
    const sort = String(req.query.sort || 'fee_asc');

    const rows = await db.query<any>(
      `SELECT d.id, d.user_id, u.full_name, u.email, d.qualification, d.specialization,
              d.experience_years, d.consultation_fee, d.operating_cost, d.languages_spoken,
              d.bio, d.avatar_url, d.clinic_location, d.is_sample, d.verification_status
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE u.is_active = 1 AND d.verification_status = 'verified'`
    );

    const availabilities = await db.query<any>(
      `SELECT doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available
       FROM doctor_availability WHERE is_available = 1`
    );

    const availMap = new Map<number, any[]>();
    for (const av of availabilities) {
      const list = availMap.get(av.doctor_id) || [];
      list.push(av);
      availMap.set(av.doctor_id, list);
    }

    let filtered = rows.map((doc) => {
      const docAvail = (availMap.get(doc.id) || []).sort(
        (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
      );
      return {
        ...doc,
        availability: docAvail,
      };
    });

    if (search) {
      filtered = filtered.filter(
        (d) =>
          (d.full_name || '').toLowerCase().includes(search) ||
          (d.specialization || '').toLowerCase().includes(search) ||
          (d.qualification || '').toLowerCase().includes(search) ||
          (d.clinic_location || '').toLowerCase().includes(search) ||
          (d.languages_spoken || '').toLowerCase().includes(search)
      );
    }
    if (specialization && specialization !== 'all') {
      filtered = filtered.filter((d) => d.specialization.toLowerCase() === specialization.toLowerCase());
    }
    if (language && language !== 'all') {
      filtered = filtered.filter((d) => (d.languages_spoken || '').toLowerCase().includes(language));
    }
    if (maxFee !== null && !Number.isNaN(maxFee) && maxFee >= 0) {
      filtered = filtered.filter((d) => Number(d.consultation_fee) <= maxFee);
    }
    if (day && day !== 'all') {
      if (day === 'available_only') {
        filtered = filtered.filter((d) => d.availability.length > 0);
      } else {
        filtered = filtered.filter((d) =>
          d.availability.some((a: any) => a.day_of_week.toLowerCase() === day.toLowerCase())
        );
      }
    }

    if (sort === 'fee_desc') {
      filtered.sort((a, b) => Number(b.consultation_fee) - Number(a.consultation_fee));
    } else if (sort === 'experience_desc') {
      filtered.sort((a, b) => Number(b.experience_years) - Number(a.experience_years));
    } else {
      filtered.sort((a, b) => Number(a.consultation_fee) - Number(b.consultation_fee));
    }

    res.json({ doctors: filtered });
  } catch (err) {
    console.error('List doctors error:', err);
    res.status(500).json({ error: 'Unable to fetch doctors.' });
  }
}

export async function getDoctorById(req: Request, res: Response): Promise<void> {
  const doctorId = Number(req.params.id);
  try {
    const doctor = await db.get<any>(
      `SELECT d.id, d.user_id, u.full_name, u.phone, d.qualification, d.specialization,
              d.experience_years, d.consultation_fee, d.operating_cost, d.languages_spoken,
              d.bio, d.avatar_url, d.clinic_location, d.is_sample, d.verification_status
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ? AND u.is_active = 1`,
      [doctorId]
    );

    if (!doctor) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const availability = await db.query<any>(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, is_available
       FROM doctor_availability WHERE doctor_id = ?`,
      [doctorId]
    );

    res.json({ doctor: { ...doctor, availability } });
  } catch (err) {
    console.error('Get doctor error:', err);
    res.status(500).json({ error: 'Unable to load doctor profile.' });
  }
}

export async function getDoctorDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const doctor = await db.get<any>(
      `SELECT d.*, u.full_name, u.email, u.phone, u.preferred_language
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ?`,
      [userId]
    );

    if (!doctor) {
      res.status(404).json({ error: 'Doctor record not found.' });
      return;
    }

    const availability = await db.query<any>(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, is_available
       FROM doctor_availability WHERE doctor_id = ?`,
      [doctor.id]
    );

    const appointments = await db.query<any>(
      `SELECT a.id, a.patient_id, a.appointment_date, a.time_slot, a.symptoms, a.consultation_mode,
              a.status, a.payment_status, a.cancellation_reason, a.created_at,
              pu.full_name as patient_name, pu.phone as patient_phone, pu.preferred_language as patient_language,
              pp.age as patient_age, pp.gender as patient_gender, pp.village_town as patient_village,
              c.room_id, c.doctor_notes, c.prescription_summary, c.follow_up_date
       FROM appointments a
       JOIN users pu ON pu.id = a.patient_id
       LEFT JOIN patient_profiles pp ON pp.user_id = pu.id
       LEFT JOIN consultations c ON c.appointment_id = a.id
       WHERE a.doctor_id = ?
       ORDER BY a.appointment_date ASC, a.time_slot ASC`,
      [doctor.id]
    );

    const verification = await db.get<any>(
      `SELECT registration_number, council_name, status, review_notes, reviewed_at
       FROM doctor_verification_requests WHERE doctor_id = ? ORDER BY id DESC LIMIT 1`,
      [doctor.id]
    );

    const notifications = await db.query<any>(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`,
      [userId]
    );

    res.json({
      doctor,
      availability,
      appointments,
      verification,
      notifications,
    });
  } catch (err) {
    console.error('Doctor dashboard error:', err);
    res.status(500).json({ error: 'Unable to load doctor dashboard.' });
  }
}

const doctorProfileSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(8).max(15).optional(),
  qualification: z.string().trim().min(2),
  specialization: z.string().trim().min(2),
  experienceYears: z.coerce.number().int().min(0).max(70),
  consultationFee: z.coerce.number().int().min(0).max(5000),
  languagesSpoken: z.string().trim().min(2),
  bio: z.string().trim().max(1500),
  clinicLocation: z.string().trim().max(200).optional(),
});

export async function updateDoctorProfile(req: AuthRequest, res: Response): Promise<void> {
  const parsed = doctorProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid doctor profile fields' });
    return;
  }

  const d = parsed.data;
  const userId = req.user!.userId;
  const now = sqlNow();

  try {
    await db.transaction(async (tx) => {
      if (d.fullName || d.phone) {
        const u = await tx.get<any>('SELECT full_name, phone FROM users WHERE id = ?', [userId]);
        await tx.run('UPDATE users SET full_name = ?, phone = ?, updated_at = ? WHERE id = ?', [
          d.fullName ?? u.full_name,
          d.phone ?? u.phone,
          now,
          userId,
        ]);
      }

      await tx.run(
        `UPDATE doctors
         SET qualification = ?, specialization = ?, experience_years = ?, consultation_fee = ?,
             languages_spoken = ?, bio = ?, clinic_location = ?, updated_at = ?
         WHERE user_id = ?`,
        [
          d.qualification,
          d.specialization,
          d.experienceYears,
          d.consultationFee,
          d.languagesSpoken,
          d.bio,
          d.clinicLocation || '',
          now,
          userId,
        ]
      );
    });

    res.json({ message: 'Doctor profile updated successfully.' });
  } catch (err) {
    console.error('Update doctor profile error:', err);
    res.status(500).json({ error: 'Unable to update doctor profile.' });
  }
}

const availabilitySchema = z.object({
  slots: z.array(
    z.object({
      day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      slot_duration_minutes: z.coerce.number().int().min(10).max(60).default(30),
      is_available: z.boolean(),
    })
  ),
});

export async function updateDoctorAvailability(req: AuthRequest, res: Response): Promise<void> {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid availability format' });
    return;
  }

  try {
    const doctor = await db.get<{ id: number }>('SELECT id FROM doctors WHERE user_id = ?', [req.user!.userId]);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor profile not found.' });
      return;
    }

    const now = sqlNow();
    await db.transaction(async (tx) => {
      for (const s of parsed.data.slots) {
        const existing = await tx.get<{ id: number }>(
          'SELECT id FROM doctor_availability WHERE doctor_id = ? AND day_of_week = ?',
          [doctor.id, s.day_of_week]
        );
        if (existing) {
          await tx.run(
            `UPDATE doctor_availability
             SET start_time = ?, end_time = ?, slot_duration_minutes = ?, is_available = ?, updated_at = ?
             WHERE id = ?`,
            [s.start_time, s.end_time, s.slot_duration_minutes, s.is_available ? 1 : 0, now, existing.id]
          );
        } else {
          await tx.run(
            `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [doctor.id, s.day_of_week, s.start_time, s.end_time, s.slot_duration_minutes, s.is_available ? 1 : 0, now, now]
          );
        }
      }
    });

    res.json({ message: 'Availability schedule saved.' });
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ error: 'Unable to save availability schedule.' });
  }
}

export async function doctorUpdateAppointmentStatus(req: AuthRequest, res: Response): Promise<void> {
  const appointmentId = Number(req.params.id);
  const schema = z.object({
    status: z.enum(['confirmed', 'cancelled', 'completed']),
    reason: z.string().trim().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status update' });
    return;
  }

  try {
    const doctor = await db.get<{ id: number }>('SELECT id FROM doctors WHERE user_id = ?', [req.user!.userId]);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor profile not found' });
      return;
    }

    const appt = await db.get<any>(
      'SELECT * FROM appointments WHERE id = ? AND doctor_id = ?',
      [appointmentId, doctor.id]
    );
    if (!appt) {
      res.status(404).json({ error: 'Appointment not found for this doctor.' });
      return;
    }

    const now = sqlNow();
    const newStatus = parsed.data.status;

    await db.transaction(async (tx) => {
      if (newStatus === 'cancelled') {
        await tx.run(
          `UPDATE appointments
           SET status = 'cancelled', cancellation_reason = ?, slot_lock_key = NULL,
               payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
               updated_at = ?
           WHERE id = ?`,
          [parsed.data.reason || 'Declined by doctor', now, appointmentId]
        );
        await tx.run(
          `UPDATE payments SET status = CASE WHEN status = 'paid' THEN 'refunded' ELSE status END, updated_at = ?
           WHERE appointment_id = ?`,
          [now, appointmentId]
        );
      } else {
        await tx.run('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?', [
          newStatus,
          now,
          appointmentId,
        ]);
      }

      if (newStatus === 'completed') {
        await tx.run(
          'UPDATE consultations SET ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE appointment_id = ?',
          [now, now, appointmentId]
        );
      }

      await tx.run(
        `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
         VALUES (?, ?, ?, 'appointment', 0, ?, ?)`,
        [
          appt.patient_id,
          `Appointment ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          `Your consultation on ${appt.appointment_date} at ${appt.time_slot} has been marked as ${newStatus}.`,
          appointmentId,
          now,
        ]
      );
    });

    res.json({ message: `Appointment updated to ${newStatus}.` });
  } catch (err) {
    console.error('Doctor status update error:', err);
    res.status(500).json({ error: 'Unable to update appointment status.' });
  }
}
