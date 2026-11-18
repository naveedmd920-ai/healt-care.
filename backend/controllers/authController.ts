import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db.ts';
import { AuthRequest } from '../middleware/auth.ts';
import {
  comparePassword,
  generateDemoOtp,
  hashPassword,
  signToken,
  sqlNow,
} from '../utils/crypto.ts';

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, '').trim();
}

const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include at least one letter and one number');

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
    phone: z
      .string()
      .trim()
      .transform((val) => normalizePhone(val))
      .refine((val) => /^[+]?[0-9]{8,15}$/.test(val), 'Please enter a valid 8–15 digit phone number'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    age: z.coerce.number().int().min(1, 'Age must be between 1 and 120').max(120, 'Age must be between 1 and 120'),
    gender: z.enum(['male', 'female', 'other']),
    villageTown: z.string().trim().min(2, 'Village or town name is required'),
    district: z.string().trim().optional(),
    preferredLanguage: z.enum(['en', 'te', 'hi']).default('en'),
    role: z.enum(['patient', 'doctor']).default('patient'),
    qualification: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    experienceYears: z.coerce.number().int().min(0).max(70).optional(),
    registrationNumber: z.string().trim().optional(),
    councilName: z.string().trim().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z
  .object({
    identifier: z.string().trim().min(3, 'Email or phone number is required').optional(),
    email: z.string().trim().min(3, 'Email or phone number is required').optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((d) => Boolean(d.identifier || d.email), {
    message: 'Email or phone number is required',
    path: ['identifier'],
  });

const forgotSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
});

const resetSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  otp: z.string().trim().min(4, 'Verification OTP is required'),
  newPassword: strongPasswordSchema,
});

async function buildSafeUserPayload(userId: number) {
  const user = await db.get<any>(
    `SELECT id, full_name, email, phone, role, preferred_language, is_active, created_at
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) return null;

  if (user.role === 'patient') {
    const profile = await db.get<any>(
      `SELECT age, gender, village_town, district, blood_group, medical_notes, emergency_contact
       FROM patient_profiles WHERE user_id = ?`,
      [userId]
    );
    return { ...user, profile: profile || null };
  }

  if (user.role === 'doctor') {
    const doctor = await db.get<any>(
      `SELECT id as doctor_id, qualification, specialization, experience_years, consultation_fee,
              operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status
       FROM doctors WHERE user_id = ?`,
      [userId]
    );
    return { ...user, doctor: doctor || null };
  }

  return user;
}

export async function register(req: Request, res: Response): Promise<void> {
  if (req.body?.role === 'admin') {
    res.status(403).json({ error: 'Administrator accounts cannot be self-registered.' });
    return;
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid registration fields',
      issues: parsed.error.issues,
    });
    return;
  }

  const data = parsed.data;

  try {
    const existingEmail = await db.get<{ id: number }>(
      'SELECT id FROM users WHERE LOWER(email) = ?',
      [data.email]
    );
    if (existingEmail) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const normalizedDigits = data.phone.replace(/^\+/, '');
    const existingPhone = await db.get<{ id: number }>(
      `SELECT id FROM users
       WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ?
          OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?`,
      [data.phone, normalizedDigits]
    );
    if (existingPhone) {
      res.status(409).json({ error: 'An account with this phone number already exists.' });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const now = sqlNow();

    const createdUserId = await db.transaction(async (tx) => {
      const userRes = await tx.run(
        `INSERT INTO users (full_name, email, phone, password_hash, role, preferred_language, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [data.fullName, data.email, data.phone, passwordHash, data.role, data.preferredLanguage, now, now]
      );
      const userId = userRes.insertId;

      if (data.role === 'patient') {
        await tx.run(
          `INSERT INTO patient_profiles (user_id, age, gender, village_town, district, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, data.age, data.gender, data.villageTown, data.district || 'Medchal-Malkajgiri', now, now]
        );
        await tx.run(
          `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, 'welcome', 0, ?)`,
          [
            userId,
            'Welcome to Rural Health Connect',
            'Your patient account is active. You can browse verified doctors, book ₹100 consultations, and locate nearby hospitals.',
            now,
          ]
        );
      } else {
        const docRes = await tx.run(
          `INSERT INTO doctors (user_id, qualification, specialization, experience_years, consultation_fee, operating_cost, languages_spoken, bio, avatar_url, clinic_location, is_sample, verification_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 100, 35, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
          [
            userId,
            data.qualification || 'MBBS',
            data.specialization || 'General Physician',
            data.experienceYears ?? 2,
            data.preferredLanguage === 'te'
              ? 'English, Telugu'
              : data.preferredLanguage === 'hi'
              ? 'English, Hindi'
              : 'English',
            'Registered practitioner awaiting administrator credential verification.',
            '/src/assets/images/doctor_female_general_1795011401396.jpg',
            data.villageTown,
            now,
            now,
          ]
        );

        await tx.run(
          `INSERT INTO doctor_verification_requests (doctor_id, registration_number, council_name, document_note, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
          [
            docRes.insertId,
            data.registrationNumber || `REG-${userId}-${Date.now().toString().slice(-4)}`,
            data.councilName || 'State Medical Council',
            'Submitted during doctor registration',
            now,
            now,
          ]
        );

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (const day of days) {
          await tx.run(
            `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available, created_at, updated_at)
             VALUES (?, ?, '09:00', '13:00', 30, 1, ?, ?)`,
            [docRes.insertId, day, now, now]
          );
        }

        const admins = await tx.query<{ id: number }>("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins) {
          await tx.run(
            `INSERT INTO notifications (user_id, title, message, type, is_read, related_entity_id, created_at)
             VALUES (?, ?, ?, 'verification', 0, ?, ?)`,
            [
              admin.id,
              'New Doctor Verification Request',
              `${data.fullName} registered as ${data.specialization || 'General Physician'} and awaits approval.`,
              docRes.insertId,
              now,
            ]
          );
        }
      }

      return userId;
    });

    const token = signToken({ userId: createdUserId, email: data.email, role: data.role });
    const safeUser = await buildSafeUserPayload(createdUserId);

    res.status(201).json({
      message:
        data.role === 'doctor'
          ? 'Doctor account registered. Administrator verification is pending.'
          : 'Registration successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Unable to complete registration. Please try again.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials format' });
    return;
  }

  const rawIdentifier = (parsed.data.identifier || parsed.data.email || '').trim();
  const { password } = parsed.data;
  const isEmail = rawIdentifier.includes('@');

  try {
    let user: any = null;
    if (isEmail) {
      user = await db.get<any>(
        'SELECT id, email, password_hash, role, is_active FROM users WHERE LOWER(email) = ?',
        [rawIdentifier.toLowerCase()]
      );
    } else {
      const normalized = normalizePhone(rawIdentifier);
      const digitsOnly = normalized.replace(/^\+/, '');
      user = await db.get<any>(
        `SELECT id, email, password_hash, role, is_active FROM users
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ?
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?`,
        [normalized, digitsOnly]
      );
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email/phone or password.' });
      return;
    }
    if (!user.is_active) {
      res.status(403).json({ error: 'This account has been disabled. Contact administrator.' });
      return;
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email/phone or password.' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const safeUser = await buildSafeUserPayload(user.id);

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to server error.' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'Logged out successfully.' });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const safeUser = await buildSafeUserPayload(req.user.userId);
  if (!safeUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: safeUser });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Valid email required' });
    return;
  }

  try {
    const user = await db.get<{ id: number; email: string }>(
      'SELECT id, email FROM users WHERE email = ?',
      [parsed.data.email]
    );
    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    const otp = generateDemoOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.run(
      'UPDATE users SET reset_otp = ?, reset_otp_expires_at = ?, updated_at = ? WHERE id = ?',
      [otp, expires, sqlNow(), user.id]
    );

    res.json({
      message: 'Development Demo OTP generated (no external SMS/SMTP provider configured).',
      demoMode: true,
      demoOtp: otp,
      expiresInMinutes: 15,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Unable to generate password reset OTP.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset input' });
    return;
  }

  const { email, otp, newPassword } = parsed.data;
  try {
    const user = await db.get<{ id: number; reset_otp: string | null; reset_otp_expires_at: string | null }>(
      'SELECT id, reset_otp, reset_otp_expires_at FROM users WHERE email = ?',
      [email]
    );

    if (!user || !user.reset_otp || user.reset_otp !== otp) {
      res.status(400).json({ error: 'Invalid or mismatched verification OTP.' });
      return;
    }

    const expiresMs = user.reset_otp_expires_at ? new Date(user.reset_otp_expires_at.replace(' ', 'T') + 'Z').getTime() : 0;
    if (Date.now() > expiresMs) {
      res.status(400).json({ error: 'OTP has expired. Please request a new reset code.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await db.run(
      'UPDATE users SET password_hash = ?, reset_otp = NULL, reset_otp_expires_at = NULL, updated_at = ? WHERE id = ?',
      [newHash, sqlNow(), user.id]
    );

    res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
}
