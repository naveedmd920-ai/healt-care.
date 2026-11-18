import { Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db.ts';
import { AuthRequest } from '../middleware/auth.ts';
import { sqlNow } from '../utils/crypto.ts';

export async function getAdminOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const patientCount = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE role = 'patient'"
    );
    const doctorCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM doctors');
    const pendingVerifications = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM doctors WHERE verification_status = 'pending'"
    );

    const apptStats = await db.query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM appointments GROUP BY status'
    );

    const paySummary = await db.get<{
      total_revenue: number | null;
      total_operating_cost: number | null;
      paid_count: number;
    }>(
      `SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
              SUM(CASE WHEN status = 'paid' THEN operating_cost ELSE 0 END) as total_operating_cost,
              SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count
       FROM payments`
    );

    const recentActivity = await db.query<any>(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 12`,
      [req.user!.userId]
    );

    res.json({
      stats: {
        totalPatients: Number(patientCount?.count || 0),
        totalDoctors: Number(doctorCount?.count || 0),
        pendingDoctorVerifications: Number(pendingVerifications?.count || 0),
        appointmentsByStatus: apptStats.map((r) => ({ status: r.status, count: Number(r.count) })),
        totalRevenue: Number(paySummary?.total_revenue || 0),
        totalOperatingCost: Number(paySummary?.total_operating_cost || 0),
        paidConsultations: Number(paySummary?.paid_count || 0),
      },
      recentActivity,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Unable to load admin overview.' });
  }
}

export async function adminListUsers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await db.query<any>(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.preferred_language, u.is_active, u.created_at,
              p.age, p.gender, p.village_town, p.district
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Unable to fetch users.' });
  }
}

export async function adminToggleUserActive(req: AuthRequest, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (userId === req.user!.userId) {
    res.status(400).json({ error: 'Administrators cannot deactivate their own active session.' });
    return;
  }

  try {
    const target = await db.get<{ id: number; is_active: number }>(
      'SELECT id, is_active FROM users WHERE id = ?',
      [userId]
    );
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const nextActive = target.is_active ? 0 : 1;
    await db.run('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?', [
      nextActive,
      sqlNow(),
      userId,
    ]);
    res.json({ message: nextActive ? 'User activated.' : 'User deactivated.', is_active: nextActive });
  } catch (err) {
    console.error('Toggle user error:', err);
    res.status(500).json({ error: 'Unable to update user status.' });
  }
}

export async function adminListDoctors(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const doctors = await db.query<any>(
      `SELECT d.*, u.full_name, u.email, u.phone, u.is_active,
              dvr.registration_number, dvr.council_name, dvr.document_note, dvr.review_notes
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN doctor_verification_requests dvr ON dvr.doctor_id = d.id
       ORDER BY CASE WHEN d.verification_status = 'pending' THEN 0 ELSE 1 END, d.id DESC`
    );
    res.json({ doctors });
  } catch (err) {
    console.error('Admin list doctors error:', err);
    res.status(500).json({ error: 'Unable to fetch doctors.' });
  }
}

export async function adminVerifyDoctor(req: AuthRequest, res: Response): Promise<void> {
  const doctorId = Number(req.params.id);
  const schema = z.object({
    decision: z.enum(['verified', 'rejected']),
    reviewNotes: z.string().trim().max(300).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Decision must be verified or rejected.' });
    return;
  }

  try {
    const doctor = await db.get<any>('SELECT id, user_id FROM doctors WHERE id = ?', [doctorId]);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    const now = sqlNow();
    const { decision, reviewNotes } = parsed.data;
    const reqStatus = decision === 'verified' ? 'approved' : 'rejected';

    await db.transaction(async (tx) => {
      await tx.run('UPDATE doctors SET verification_status = ?, updated_at = ? WHERE id = ?', [
        decision,
        now,
        doctorId,
      ]);

      await tx.run(
        `UPDATE doctor_verification_requests
         SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = ?, updated_at = ?
         WHERE doctor_id = ?`,
        [reqStatus, req.user!.userId, reviewNotes || `Marked as ${reqStatus} by admin`, now, now, doctorId]
      );

      await tx.run(
        `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
         VALUES (?, ?, ?, 'verification', 0, ?, ?)`,
        [
          doctor.user_id,
          decision === 'verified' ? 'Doctor Account Verified' : 'Doctor Verification Rejected',
          decision === 'verified'
            ? 'Your practitioner profile has been verified by an administrator and is now visible to patients.'
            : `Your verification request was declined. Notes: ${reviewNotes || 'Please review submitted details.'}`,
          doctorId,
          now,
        ]
      );
    });

    res.json({ message: `Doctor status updated to ${decision}.` });
  } catch (err) {
    console.error('Admin verify doctor error:', err);
    res.status(500).json({ error: 'Unable to update doctor verification status.' });
  }
}

export async function adminListAppointments(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const appointments = await db.query<any>(
      `SELECT a.*, pu.full_name as patient_name, du.full_name as doctor_name, d.specialization,
              p.amount, p.transaction_ref
       FROM appointments a
       JOIN users pu ON pu.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       LEFT JOIN payments p ON p.appointment_id = a.id
       ORDER BY a.created_at DESC`
    );
    res.json({ appointments });
  } catch (err) {
    console.error('Admin list appointments error:', err);
    res.status(500).json({ error: 'Unable to load appointments.' });
  }
}

export async function adminListPayments(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const payments = await db.query<any>(
      `SELECT p.*, pu.full_name as patient_name, pu.email as patient_email,
              a.appointment_date, a.time_slot, du.full_name as doctor_name
       FROM payments p
       JOIN users pu ON pu.id = p.patient_id
       JOIN appointments a ON a.id = p.appointment_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments });
  } catch (err) {
    console.error('Admin list payments error:', err);
    res.status(500).json({ error: 'Unable to load payment records.' });
  }
}

const hospitalSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  address: z.string().trim().min(5),
  village_town: z.string().trim().min(2),
  district: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  facilities: z.string().trim().min(3),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  operating_hours: z.string().trim().min(3),
  is_sample: z.boolean().default(true),
});

export async function adminCreateHospital(req: AuthRequest, res: Response): Promise<void> {
  const parsed = hospitalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid hospital fields' });
    return;
  }

  const h = parsed.data;
  const now = sqlNow();
  try {
    const result = await db.run(
      `INSERT INTO hospitals (name, category, address, village_town, district, phone, facilities, latitude, longitude, operating_hours, is_sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        h.name,
        h.category,
        h.address,
        h.village_town,
        h.district,
        h.phone,
        h.facilities,
        h.latitude,
        h.longitude,
        h.operating_hours,
        h.is_sample ? 1 : 0,
        now,
        now,
      ]
    );
    res.status(201).json({ message: 'Hospital added.', id: result.insertId });
  } catch (err) {
    console.error('Create hospital error:', err);
    res.status(500).json({ error: 'Unable to add hospital.' });
  }
}

export async function adminDeleteHospital(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    await db.run('DELETE FROM hospitals WHERE id = ?', [id]);
    res.json({ message: 'Hospital removed.' });
  } catch (err) {
    console.error('Delete hospital error:', err);
    res.status(500).json({ error: 'Unable to remove hospital.' });
  }
}

const articleSchema = z.object({
  title: z.string().trim().min(4),
  category: z.enum([
    'General health',
    'Nutrition',
    'Hygiene',
    'Preventive healthcare',
    "Women's health",
    'Child healthcare',
    'Elderly care',
  ]),
  language: z.enum(['en', 'te', 'hi']).default('en'),
  short_description: z.string().trim().min(10),
  content: z.string().trim().min(20),
  image_url: z.string().trim().optional(),
});

export async function adminCreateArticle(req: AuthRequest, res: Response): Promise<void> {
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid article fields' });
    return;
  }

  const a = parsed.data;
  const now = sqlNow();
  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await db.run(
      `INSERT INTO health_articles (title, category, language, short_description, content, image_url, is_reviewed, published_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        a.title,
        a.category,
        a.language,
        a.short_description,
        a.content,
        a.image_url || '/src/assets/images/article_preventive_hygiene_1795011404035.jpg',
        today,
        now,
        now,
      ]
    );
    res.status(201).json({ message: 'Health article published.', id: result.insertId });
  } catch (err) {
    console.error('Create article error:', err);
    res.status(500).json({ error: 'Unable to create health article.' });
  }
}

export async function adminDeleteArticle(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  try {
    await db.run('DELETE FROM health_articles WHERE id = ?', [id]);
    res.json({ message: 'Health article deleted.' });
  } catch (err) {
    console.error('Delete article error:', err);
    res.status(500).json({ error: 'Unable to delete health article.' });
  }
}

export async function adminUpdateHospital(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const parsed = hospitalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid hospital fields' });
    return;
  }

  const h = parsed.data;
  try {
    await db.run(
      `UPDATE hospitals
       SET name = ?, category = ?, address = ?, village_town = ?, district = ?, phone = ?,
           facilities = ?, latitude = ?, longitude = ?, operating_hours = ?, is_sample = ?, updated_at = ?
       WHERE id = ?`,
      [
        h.name,
        h.category,
        h.address,
        h.village_town,
        h.district,
        h.phone,
        h.facilities,
        h.latitude,
        h.longitude,
        h.operating_hours,
        h.is_sample ? 1 : 0,
        sqlNow(),
        id,
      ]
    );
    res.json({ message: 'Hospital updated.' });
  } catch (err) {
    console.error('Update hospital error:', err);
    res.status(500).json({ error: 'Unable to update hospital.' });
  }
}

export async function adminUpdateArticle(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid article fields' });
    return;
  }

  const a = parsed.data;
  try {
    await db.run(
      `UPDATE health_articles
       SET title = ?, category = ?, language = ?, short_description = ?, content = ?, updated_at = ?
       WHERE id = ?`,
      [a.title, a.category, a.language, a.short_description, a.content, sqlNow(), id]
    );
    res.json({ message: 'Health article updated.' });
  } catch (err) {
    console.error('Update article error:', err);
    res.status(500).json({ error: 'Unable to update article.' });
  }
}

export async function adminUpdateAppointmentStatus(req: AuthRequest, res: Response): Promise<void> {
  const appointmentId = Number(req.params.id);
  const schema = z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
    reason: z.string().trim().max(250).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid appointment status.' });
    return;
  }

  const now = sqlNow();
  const { status, reason } = parsed.data;

  try {
    const appt = await db.get<any>('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    await db.transaction(async (tx) => {
      if (status === 'cancelled') {
        await tx.run(
          `UPDATE appointments
           SET status = 'cancelled', cancellation_reason = ?, slot_lock_key = NULL,
               payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
               updated_at = ?
           WHERE id = ?`,
          [reason || 'Cancelled by administrator', now, appointmentId]
        );
        await tx.run(
          `UPDATE payments SET status = CASE WHEN status = 'paid' THEN 'refunded' ELSE status END, updated_at = ?
           WHERE appointment_id = ?`,
          [now, appointmentId]
        );
      } else {
        const lockKey = `${appt.doctor_id}_${appt.appointment_date}_${appt.time_slot}`;
        await tx.run(
          `UPDATE appointments SET status = ?, slot_lock_key = ?, updated_at = ? WHERE id = ?`,
          [status, lockKey, now, appointmentId]
        );
      }
    });

    res.json({ message: `Appointment #${appointmentId} updated to ${status}.` });
  } catch (err) {
    console.error('Admin update appointment status error:', err);
    res.status(500).json({ error: 'Unable to update appointment status.' });
  }
}
