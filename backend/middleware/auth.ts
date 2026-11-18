import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/crypto.ts';
import { db } from '../config/db.ts';

export interface AuthRequest extends Request {
  user?: JwtPayload & {
    full_name: string;
    preferred_language: 'en' | 'te' | 'hi';
    is_active: number;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = verifyToken(token);
    const dbUser = await db.get<{
      id: number;
      email: string;
      role: 'patient' | 'doctor' | 'admin';
      full_name: string;
      preferred_language: 'en' | 'te' | 'hi';
      is_active: number;
    }>(
      'SELECT id, email, role, full_name, preferred_language, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!dbUser) {
      res.status(401).json({ error: 'Account no longer exists.' });
      return;
    }
    if (!dbUser.is_active) {
      res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
      return;
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      full_name: dbUser.full_name,
      preferred_language: dbUser.preferred_language,
      is_active: dbUser.is_active,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function requireRole(...roles: Array<'patient' | 'doctor' | 'admin'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}
