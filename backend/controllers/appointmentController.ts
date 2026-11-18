import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db.ts';
import { env } from '../config/env.ts';
import { AuthRequest } from '../middleware/auth.ts';
import { getDayName, sqlNow } from '../utils/crypto.ts';

function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots: string[] = [];

  for (let t = startTotal; t + durationMinutes <= endTotal; t += durationMinutes) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

export async function getDoctorSlots(req: Request, res: Response): Promise<void> {
  const doctorId = Number(req.query.doctorId);
  const date = String(req.query.date || '').trim();

  if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Valid doctorId and YYYY-MM-DD date are required.' });
    return;
  }

  try {
    const doctor = await db.get<any>(
      `SELECT id, consultation_fee, verification_status FROM doctors WHERE id = ?`,
      [doctorId]
    );
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    const dayName = getDayName(date);
    const avail = await db.get<any>(
      `SELECT start_time, end_time, slot_duration_minutes, is_available
       FROM doctor_availability
       WHERE doctor_id = ? AND day_of_week = ?`,
      [doctorId, dayName]
    );

    if (!avail || !avail.is_available) {
      res.json({ date, dayName, available: false, slots: [] });
      return;
    }

    const allSlots = generateTimeSlots(avail.start_time, avail.end_time, avail.slot_duration_minutes);
    const booked = await db.query<{ time_slot: string }>(
      `SELECT time_slot FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'`,
      [doctorId, date]
    );
    const bookedSet = new Set(booked.map((b) => b.time_slot));

    const slots = allSlots.map((time) => ({
      time,
      isBooked: bookedSet.has(time),
    }));

    res.json({
      date,
      dayName,
      available: true,
      consultationFee: doctor.consultation_fee,
      slots,
    });
  } catch (err) {
    console.error('Get doctor slots error:', err);
    res.status(500).json({ error: 'Unable to check doctor slot availability.' });
  }
}

const bookSchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time slot'),
  symptoms: z.string().trim().min(5, 'Please briefly describe your symptoms (min 5 chars)'),
  consultationMode: z.enum(['video', 'audio']).default('video'),
  paymentMethod: z.string().trim().default('UPI Simulation'),
  simulateOutcome: z.enum(['success', 'failure']).default('success'),
});

export async function bookAppointment(req: AuthRequest, res: Response): Promise<void> {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid booking payload' });
    return;
  }

  const patientId = req.user!.userId;
  const d = parsed.data;
  const now = sqlNow();
  const todayStr = new Date().toISOString().split('T')[0];

  if (d.appointmentDate < todayStr) {
    res.status(400).json({ error: 'Cannot book appointments in the past.' });
    return;
  }

  // Explicitly demonstrate payment failure handling without leaving orphaned booking locks
  if (d.simulateOutcome === 'failure') {
    res.status(402).json({
      error: 'Simulated payment declined. No appointment was booked and no amount was charged.',
      paymentStatus: 'failed',
      gatewayMode: env.razorpay.keyId ? 'razorpay' : 'simulation',
    });
    return;
  }

  try {
    const doctor = await db.get<any>(
      `SELECT d.id, d.user_id, d.consultation_fee, d.operating_cost, d.verification_status, u.full_name
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ? AND u.is_active = 1`,
      [d.doctorId]
    );

    if (!doctor) {
      res.status(404).json({ error: 'Selected doctor was not found.' });
      return;
    }
    if (doctor.verification_status !== 'verified') {
      res.status(400).json({ error: 'Appointments can only be booked with verified doctors.' });
      return;
    }

    const dayName = getDayName(d.appointmentDate);
    const avail = await db.get<any>(
      `SELECT start_time, end_time, slot_duration_minutes, is_available
       FROM doctor_availability WHERE doctor_id = ? AND day_of_week = ?`,
      [d.doctorId, dayName]
    );

    if (!avail || !avail.is_available) {
      res.status(400).json({ error: `Doctor is not available on ${dayName}.` });
      return;
    }

    const validSlots = generateTimeSlots(avail.start_time, avail.end_time, avail.slot_duration_minutes);
    if (!validSlots.includes(d.timeSlot)) {
      res.status(400).json({ error: 'Selected time slot is outside the doctor availability window.' });
      return;
    }

    const slotLockKey = `${d.doctorId}_${d.appointmentDate}_${d.timeSlot}`;
    const gatewayMode = env.razorpay.keyId && env.razorpay.keySecret ? 'razorpay' : 'simulation';
    const txRef = `${gatewayMode === 'razorpay' ? 'RZP' : 'SIM'}-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const bookingResult = await db.transaction(async (tx) => {
      // Prevent duplicate booking by the same patient with same doctor on same day & active status
      const patientDup = await tx.get<{ id: number }>(
        `SELECT id FROM appointments
         WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ? AND status != 'cancelled'`,
        [patientId, d.doctorId, d.appointmentDate]
      );
      if (patientDup) {
        throw Object.assign(
          new Error('You already have an active appointment with this doctor on the selected date.'),
          { statusCode: 409 }
        );
      }

      // Prevent double booking of the same doctor slot
      const slotTaken = await tx.get<{ id: number }>(
        `SELECT id FROM appointments WHERE slot_lock_key = ?`,
        [slotLockKey]
      );
      if (slotTaken) {
        throw Object.assign(
          new Error('This time slot has already been booked. Please pick another time.'),
          { statusCode: 409 }
        );
      }

      const apptRes = await tx.run(
        `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, time_slot, symptoms, consultation_mode, status, payment_status, slot_lock_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 'paid', ?, ?, ?)`,
        [
          patientId,
          d.doctorId,
          d.appointmentDate,
          d.timeSlot,
          d.symptoms,
          d.consultationMode,
          slotLockKey,
          now,
          now,
        ]
      );

      const appointmentId = apptRes.insertId;
      const roomId = `rhc-room-${appointmentId}-${Math.random().toString(36).slice(2, 8)}`;

      await tx.run(
        `INSERT INTO consultations (appointment_id, room_id, connection_mode, created_at, updated_at)
         VALUES (?, ?, 'webrtc', ?, ?)`,
        [appointmentId, roomId, now, now]
      );

      await tx.run(
        `INSERT INTO payments (appointment_id, patient_id, amount, operating_cost, currency, payment_method, gateway_mode, transaction_ref, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, 'paid', ?, ?)`,
        [
          appointmentId,
          patientId,
          doctor.consultation_fee,
          doctor.operating_cost,
          d.paymentMethod,
          gatewayMode,
          txRef,
          now,
          now,
        ]
      );

      await tx.run(
        `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
         VALUES (?, ?, ?, 'appointment', 0, ?, ?)`,
        [
          patientId,
          'Appointment Booked',
          `Appointment #${appointmentId} with ${doctor.full_name} on ${d.appointmentDate} at ${d.timeSlot} is recorded (Payment ref: ${txRef}).`,
          appointmentId,
          now,
        ]
      );

      await tx.run(
        `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
         VALUES (?, ?, ?, 'appointment', 0, ?, ?)`,
        [
          doctor.user_id,
          'New Appointment Request',
          `New ${d.consultationMode} consultation requested for ${d.appointmentDate} at ${d.timeSlot}.`,
          appointmentId,
          now,
        ]
      );

      return { appointmentId, roomId, transactionRef: txRef, gatewayMode, amount: doctor.consultation_fee };
    });

    res.status(201).json({
      message: 'Appointment booked successfully.',
      booking: bookingResult,
    });
  } catch (err: any) {
    if (err?.statusCode === 409 || String(err?.message || '').includes('UNIQUE')) {
      res.status(409).json({ error: err.message || 'Time slot is no longer available.' });
      return;
    }
    console.error('Book appointment error:', err);
    res.status(500).json({ error: 'Unable to complete booking. Please try again.' });
  }
}

export async function listMyAppointments(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  try {
    if (user.role === 'patient') {
      const rows = await db.query<any>(
        `SELECT a.*, d.specialization, d.qualification, d.consultation_fee, d.avatar_url, d.is_sample,
                du.full_name as doctor_name, c.room_id, c.doctor_notes, c.prescription_summary
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id
         JOIN users du ON du.id = d.user_id
         LEFT JOIN consultations c ON c.appointment_id = a.id
         WHERE a.patient_id = ?
         ORDER BY a.appointment_date DESC, a.time_slot DESC`,
        [user.userId]
      );
      res.json({ appointments: rows });
      return;
    }

    if (user.role === 'doctor') {
      const doc = await db.get<{ id: number }>('SELECT id FROM doctors WHERE user_id = ?', [user.userId]);
      if (!doc) {
        res.json({ appointments: [] });
        return;
      }
      const rows = await db.query<any>(
        `SELECT a.*, pu.full_name as patient_name, pu.phone as patient_phone,
                pp.village_town as patient_village, pp.age as patient_age,
                c.room_id, c.doctor_notes, c.prescription_summary
         FROM appointments a
         JOIN users pu ON pu.id = a.patient_id
         LEFT JOIN patient_profiles pp ON pp.user_id = pu.id
         LEFT JOIN consultations c ON c.appointment_id = a.id
         WHERE a.doctor_id = ?
         ORDER BY a.appointment_date DESC, a.time_slot DESC`,
        [doc.id]
      );
      res.json({ appointments: rows });
      return;
    }

    const rows = await db.query<any>(
      `SELECT a.*, pu.full_name as patient_name, du.full_name as doctor_name, d.specialization
       FROM appointments a
       JOIN users pu ON pu.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       ORDER BY a.appointment_date DESC, a.time_slot DESC`
    );
    res.json({ appointments: rows });
  } catch (err) {
    console.error('List appointments error:', err);
    res.status(500).json({ error: 'Unable to load appointments.' });
  }
}

export async function cancelAppointment(req: AuthRequest, res: Response): Promise<void> {
  const appointmentId = Number(req.params.id);
  const reason = String(req.body?.reason || 'Cancelled by patient').trim().slice(0, 250);
  const user = req.user!;
  const now = sqlNow();

  try {
    const appt = await db.get<any>(
      `SELECT a.*, d.user_id as doctor_user_id
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ?`,
      [appointmentId]
    );
    if (!appt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    const isOwnerPatient = user.role === 'patient' && appt.patient_id === user.userId;
    const isAssignedDoctor = user.role === 'doctor' && appt.doctor_user_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isOwnerPatient && !isAssignedDoctor && !isAdmin) {
      res.status(403).json({ error: 'You are not authorized to cancel this appointment.' });
      return;
    }
    if (appt.status === 'completed') {
      res.status(400).json({ error: 'Completed consultations cannot be cancelled.' });
      return;
    }
    if (appt.status === 'cancelled') {
      res.status(400).json({ error: 'Appointment is already cancelled.' });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.run(
        `UPDATE appointments
         SET status = 'cancelled', cancellation_reason = ?, slot_lock_key = NULL,
             payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
             updated_at = ?
         WHERE id = ?`,
        [reason, now, appointmentId]
      );

      await tx.run(
        `UPDATE payments SET status = CASE WHEN status = 'paid' THEN 'refunded' ELSE status END, updated_at = ?
         WHERE appointment_id = ?`,
        [now, appointmentId]
      );

      const targetNotifyUser = isOwnerPatient ? appt.doctor_user_id : appt.patient_id;
      await tx.run(
        `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
         VALUES (?, ?, ?, 'appointment', 0, ?, ?)`,
        [
          targetNotifyUser,
          'Appointment Cancelled',
          `Appointment #${appointmentId} (${appt.appointment_date} ${appt.time_slot}) was cancelled. Reason: ${reason}`,
          appointmentId,
          now,
        ]
      );
    });

    res.json({ message: 'Appointment cancelled and slot released.' });
  } catch (err) {
    console.error('Cancel appointment error:', err);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
}

export async function getConsultationDetails(req: AuthRequest, res: Response): Promise<void> {
  const appointmentId = Number(req.params.id);
  const user = req.user!;

  try {
    const row = await db.get<any>(
      `SELECT a.id as appointment_id, a.patient_id, a.doctor_id, a.appointment_date, a.time_slot,
              a.symptoms, a.consultation_mode, a.status, a.payment_status,
              pu.full_name as patient_name, pp.age as patient_age, pp.gender as patient_gender, pp.village_town as patient_village,
              d.user_id as doctor_user_id, du.full_name as doctor_name, d.qualification, d.specialization,
              d.avatar_url as doctor_avatar, d.is_sample as doctor_is_sample,
              c.id as consultation_id, c.room_id, c.doctor_notes, c.prescription_summary, c.follow_up_date,
              c.started_at, c.ended_at, c.connection_mode
       FROM appointments a
       JOIN users pu ON pu.id = a.patient_id
       LEFT JOIN patient_profiles pp ON pp.user_id = pu.id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users du ON du.id = d.user_id
       LEFT JOIN consultations c ON c.appointment_id = a.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (!row) {
      res.status(404).json({ error: 'Consultation appointment not found.' });
      return;
    }

    const authorized =
      user.role === 'admin' ||
      (user.role === 'patient' && row.patient_id === user.userId) ||
      (user.role === 'doctor' && row.doctor_user_id === user.userId);

    if (!authorized) {
      res.status(403).json({
        error: 'Access denied. Only the assigned patient and doctor may join this consultation.',
      });
      return;
    }

    res.json({ consultation: row });
  } catch (err) {
    console.error('Get consultation error:', err);
    res.status(500).json({ error: 'Unable to load consultation room details.' });
  }
}

export async function updateConsultationNotes(req: AuthRequest, res: Response): Promise<void> {
  const appointmentId = Number(req.params.id);
  const schema = z.object({
    doctorNotes: z.string().trim().max(3000).optional(),
    prescriptionSummary: z.string().trim().max(3000).optional(),
    followUpDate: z.string().trim().optional(),
    markStarted: z.boolean().optional(),
    markCompleted: z.boolean().optional(),
    connectionMode: z.enum(['webrtc', 'demo_simulation']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid consultation notes input.' });
    return;
  }

  try {
    const row = await db.get<any>(
      `SELECT a.id, a.patient_id, d.user_id as doctor_user_id
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ?`,
      [appointmentId]
    );
    if (!row) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    const isDoctorOwner = req.user!.role === 'doctor' && row.doctor_user_id === req.user!.userId;
    const isPatientOwner = req.user!.role === 'patient' && row.patient_id === req.user!.userId;

    if (!isDoctorOwner && !isPatientOwner && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized consultation update.' });
      return;
    }

    const now = sqlNow();
    const d = parsed.data;
    const existing = await db.get<any>('SELECT * FROM consultations WHERE appointment_id = ?', [appointmentId]);

    if (isDoctorOwner || req.user!.role === 'admin') {
      await db.transaction(async (tx) => {
        await tx.run(
          `UPDATE consultations
           SET doctor_notes = ?, prescription_summary = ?, follow_up_date = ?,
               started_at = CASE WHEN ? = 1 THEN COALESCE(started_at, ?) ELSE started_at END,
               ended_at = CASE WHEN ? = 1 THEN ? ELSE ended_at END,
               connection_mode = COALESCE(?, connection_mode),
               updated_at = ?
           WHERE appointment_id = ?`,
          [
            d.doctorNotes ?? existing?.doctor_notes ?? null,
            d.prescriptionSummary ?? existing?.prescription_summary ?? null,
            d.followUpDate ?? existing?.follow_up_date ?? null,
            d.markStarted ? 1 : 0,
            now,
            d.markCompleted ? 1 : 0,
            now,
            d.connectionMode ?? null,
            now,
            appointmentId,
          ]
        );

        if (d.markCompleted) {
          await tx.run(
            `UPDATE appointments SET status = 'completed', updated_at = ? WHERE id = ?`,
            [now, appointmentId]
          );
          await tx.run(
            `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
             VALUES (?, ?, ?, 'consultation', 0, ?, ?)`,
            [
              row.patient_id,
              'Consultation Completed',
              'Your doctor has saved consultation notes and follow-up guidance for your appointment.',
              appointmentId,
              now,
            ]
          );
        }
      });
    } else if (d.markStarted || d.connectionMode) {
      await db.run(
        `UPDATE consultations
         SET started_at = CASE WHEN ? = 1 THEN COALESCE(started_at, ?) ELSE started_at END,
             connection_mode = COALESCE(?, connection_mode),
             updated_at = ?
         WHERE appointment_id = ?`,
        [d.markStarted ? 1 : 0, now, d.connectionMode ?? null, now, appointmentId]
      );
    }

    res.json({ message: 'Consultation record updated.' });
  } catch (err) {
    console.error('Update consultation error:', err);
    res.status(500).json({ error: 'Unable to update consultation record.' });
  }
}
