import { Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db.ts';
import { AuthRequest } from '../middleware/auth.ts';
import { sqlNow } from '../utils/crypto.ts';

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(8).max(15).optional(),
  preferredLanguage: z.enum(['en', 'te', 'hi']).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  villageTown: z.string().trim().min(2).optional(),
  district: z.string().trim().optional(),
  bloodGroup: z.string().trim().max(10).optional(),
  medicalNotes: z.string().trim().max(1000).optional(),
  emergencyContact: z.string().trim().max(25).optional(),
});

export async function getPatientDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await db.get<any>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.preferred_language,
              p.age, p.gender, p.village_town, p.district, p.blood_group, p.medical_notes, p.emergency_contact
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    const appointments = await db.query<any>(
      `SELECT a.id, a.appointment_date, a.time_slot, a.symptoms, a.consultation_mode, a.status, a.payment_status,
              a.cancellation_reason, a.created_at,
              d.id as doctor_id, d.specialization, d.qualification, d.consultation_fee, d.avatar_url, d.is_sample,
              du.full_name as doctor_name,
              c.room_id, c.doctor_notes, c.prescription_summary, c.follow_up_date
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       LEFT JOIN consultations c ON c.appointment_id = a.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.time_slot DESC`,
      [userId]
    );

    const notifications = await db.query<any>(
      `SELECT id, title, message, type, is_read, related_entity_id, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`,
      [userId]
    );

    const payments = await db.query<any>(
      `SELECT p.id, p.appointment_id, p.amount, p.currency, p.payment_method, p.gateway_mode, p.transaction_ref, p.status, p.created_at,
              a.appointment_date, a.time_slot, du.full_name as doctor_name
       FROM payments p
       JOIN appointments a ON a.id = p.appointment_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );

    const recommendedArticles = await db.query<any>(
      `SELECT id, title, category, language, short_description, image_url, published_date
       FROM health_articles
       WHERE is_reviewed = 1
       ORDER BY CASE WHEN language = ? THEN 0 ELSE 1 END, published_date DESC
       LIMIT 3`,
      [user?.preferred_language || 'en']
    );

    const upcoming = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
    const completed = appointments.filter((a) => a.status === 'completed');
    const cancelled = appointments.filter((a) => a.status === 'cancelled');

    res.json({
      profile: user,
      upcomingAppointments: upcoming,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      notifications,
      payments,
      recommendedArticles,
    });
  } catch (err) {
    console.error('Patient dashboard error:', err);
    res.status(500).json({ error: 'Unable to load patient dashboard data.' });
  }
}

export async function updatePatientProfile(req: AuthRequest, res: Response): Promise<void> {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile input' });
    return;
  }

  const userId = req.user!.userId;
  const d = parsed.data;
  const now = sqlNow();

  try {
    await db.transaction(async (tx) => {
      const existingUser = await tx.get<any>('SELECT * FROM users WHERE id = ?', [userId]);
      await tx.run(
        `UPDATE users SET full_name = ?, phone = ?, preferred_language = ?, updated_at = ? WHERE id = ?`,
        [
          d.fullName ?? existingUser.full_name,
          d.phone ?? existingUser.phone,
          d.preferredLanguage ?? existingUser.preferred_language,
          now,
          userId,
        ]
      );

      if (req.user!.role === 'patient') {
        const existingProfile = await tx.get<any>('SELECT * FROM patient_profiles WHERE user_id = ?', [userId]);
        if (existingProfile) {
          await tx.run(
            `UPDATE patient_profiles
             SET age = ?, gender = ?, village_town = ?, district = ?, blood_group = ?, medical_notes = ?, emergency_contact = ?, updated_at = ?
             WHERE user_id = ?`,
            [
              d.age ?? existingProfile.age,
              d.gender ?? existingProfile.gender,
              d.villageTown ?? existingProfile.village_town,
              d.district ?? existingProfile.district,
              d.bloodGroup ?? existingProfile.blood_group,
              d.medicalNotes ?? existingProfile.medical_notes,
              d.emergencyContact ?? existingProfile.emergency_contact,
              now,
              userId,
            ]
          );
        } else {
          await tx.run(
            `INSERT INTO patient_profiles (user_id, age, gender, village_town, district, blood_group, medical_notes, emergency_contact, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              d.age ?? null,
              d.gender ?? null,
              d.villageTown ?? 'Yamnampet',
              d.district ?? 'Medchal-Malkajgiri',
              d.bloodGroup ?? null,
              d.medicalNotes ?? null,
              d.emergencyContact ?? null,
              now,
              now,
            ]
          );
        }
      }
    });

    const updated = await db.get<any>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.preferred_language,
              p.age, p.gender, p.village_town, p.district, p.blood_group, p.medical_notes, p.emergency_contact
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    res.json({ message: 'Profile updated successfully.', profile: updated });
  } catch (err) {
    console.error('Update patient profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

export async function updateLanguagePreference(req: AuthRequest, res: Response): Promise<void> {
  const schema = z.object({ language: z.enum(['en', 'te', 'hi']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Supported languages are en, te, hi' });
    return;
  }

  try {
    await db.run('UPDATE users SET preferred_language = ?, updated_at = ? WHERE id = ?', [
      parsed.data.language,
      sqlNow(),
      req.user!.userId,
    ]);
    res.json({ preferred_language: parsed.data.language });
  } catch (err) {
    console.error('Update language error:', err);
    res.status(500).json({ error: 'Unable to save language preference.' });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [
      id,
      req.user!.userId,
    ]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.userId]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}
