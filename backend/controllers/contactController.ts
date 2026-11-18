import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db.ts';
import { sqlNow } from '../utils/crypto.ts';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  emailOrPhone: z.string().trim().min(5, 'Email or phone number is required'),
  village: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Please enter at least 10 characters'),
});

export async function submitContactInquiry(req: Request, res: Response): Promise<void> {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid contact inquiry' });
    return;
  }

  try {
    const admins = await db.query<{ id: number }>("SELECT id FROM users WHERE role = 'admin'");
    const now = sqlNow();
    const { name, emailOrPhone, village, message } = parsed.data;

    for (const admin of admins) {
      await db.run(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'contact_inquiry', 0, ?)`,
        [
          admin.id,
          `Contact Inquiry from ${name}`,
          `Contact: ${emailOrPhone}${village ? ` (${village})` : ''} — ${message}`,
          now,
        ]
      );
    }

    res.status(201).json({
      message: 'Your inquiry has been saved and routed to the Rural Health Connect coordinator team.',
    });
  } catch (err) {
    console.error('Contact inquiry error:', err);
    res.status(500).json({ error: 'Unable to submit inquiry at this time.' });
  }
}
