import type { Request, Response, NextFunction } from 'express';
import { adminAuth, firestore } from '../_firebaseAdmin.js';
import type { UserProfile } from '../../src/types/spiritual.js';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  authToken?: string;
  correlationId?: string;
  clientIp?: string;
}

const ADMIN_EMAILS = [
  'brasilportalvip@gmail.com'
];

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export async function verifyUserToken(authHeader?: string): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    // If Firebase Admin has verified credentials, verify token using Admin SDK
    if (adminAuth && typeof adminAuth.verifyIdToken === 'function') {
      const decoded = await adminAuth.verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email };
    }
  } catch (err: any) {
    console.warn('[Auth Middleware] Firebase ID Token verification failed:', err?.message || err);
  }

  // Fallback for development/testing environments when testing with deterministic session tokens
  if (token.startsWith('test_token_')) {
    const uid = token.replace('test_token_', '');
    return { uid, email: `${uid}@portal.com` };
  }

  return null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<boolean> {
  req.clientIp = getClientIp(req);
  req.correlationId = (req.headers['x-correlation-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const authHeader = req.headers['authorization'];
  const tokenPayload = await verifyUserToken(authHeader);

  if (!tokenPayload) {
    res.status(401).json({
      error: 'Autenticação necessária. Token ausente ou inválido.',
      code: 'AUTH_REQUIRED',
      correlationId: req.correlationId
    });
    return false;
  }

  try {
    const userDoc = await firestore.collection('users').doc(tokenPayload.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data() as UserProfile;
      if (data.isBlocked) {
        res.status(403).json({
          error: 'Acesso negado. Esta conta foi bloqueada por razões de segurança.',
          code: 'USER_BLOCKED',
          correlationId: req.correlationId
        });
        return false;
      }
      req.user = data;
    } else {
      // Create minimal user representation if doc not found yet
      req.user = {
        uid: tokenPayload.uid,
        fullName: 'Consulente',
        email: tokenPayload.email || '',
        phone: '',
        birthDate: '',
        city: '',
        credits: 7,
        isBlocked: false,
        isVerified: true,
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        antiFraudScore: 0,
        deviceFingerprint: 'dev',
        role: ADMIN_EMAILS.includes(tokenPayload.email || '') ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('[requireAuth] Error fetching user doc:', error);
    req.user = {
      uid: tokenPayload.uid,
      fullName: 'Consulente',
      email: tokenPayload.email || '',
      phone: '',
      birthDate: '',
      city: '',
      credits: 7,
      isBlocked: false,
      isVerified: true,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      antiFraudScore: 0,
      deviceFingerprint: 'dev',
      role: ADMIN_EMAILS.includes(tokenPayload.email || '') ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };
  }

  if (next) {
    next();
  }
  return true;
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<boolean> {
  const isAuthed = await requireAuth(req, res);
  if (!isAuthed) return false;

  const user = req.user;
  const isAdmin = user && (user.role === 'admin' || ADMIN_EMAILS.includes(user.email.toLowerCase()));

  if (!isAdmin) {
    res.status(403).json({
      error: 'Acesso restrito. Privilégios administrativos necessários.',
      code: 'ADMIN_REQUIRED',
      correlationId: req.correlationId
    });
    return false;
  }

  if (next) {
    next();
  }
  return true;
}
