import type { Request, Response } from 'express';
import { adminAuth, firestore } from './_firebaseAdmin.js';
import { RegisterRequestSchema } from './validation/schemas.js';
import { getClientIp } from './middleware/auth.js';
import { logger } from './services/logger.js';
import type { UserProfile, CreditLedgerEntry } from '../src/types/spiritual.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const parseResult = RegisterRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Dados de cadastro inválidos ou incompletos.',
      details: parseResult.error.format(),
    });
  }

  const data = parseResult.data;
  const clientIp = getClientIp(req);
  const normalizedEmail = data.email.toLowerCase().trim();

  try {
    // Check if email already registered in firestore
    const emailSnapshot = await firestore
      .collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!emailSnapshot.empty) {
      return res.status(400).json({
        error: 'Este e-mail já está cadastrado em nosso portal.',
      });
    }

    let uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If Firebase Admin has verified credentials, create real Firebase Auth user
    if (adminAuth && typeof adminAuth.createUser === 'function') {
      try {
        const firebaseUser = await adminAuth.createUser({
          email: normalizedEmail,
          password: data.password,
          displayName: data.fullName,
          emailVerified: false,
        });
        uid = firebaseUser.uid;
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-exists') {
          return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
        }
        logger.warn('Firebase Admin createUser fallback:', { error: String(authErr) });
      }
    }

    const INITIAL_CREDITS = 7;

    const newUser: UserProfile = {
      uid,
      fullName: data.fullName,
      email: normalizedEmail,
      phone: data.phone,
      birthDate: data.birthDate,
      birthTime: data.birthTime || '',
      city: data.city,
      timezone: data.timezone || 'America/Sao_Paulo',
      credits: INITIAL_CREDITS,
      isBlocked: false,
      isVerified: true,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      antiFraudScore: 0,
      deviceFingerprint: data.deviceId || 'web',
      role: normalizedEmail === 'brasilportalvip@gmail.com' ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save user doc
    await firestore.collection('users').doc(uid).set(newUser);

    // Record initial credit ledger
    const ledgerEntry: CreditLedgerEntry = {
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      uid,
      type: 'promotion',
      amount: INITIAL_CREDITS,
      previousBalance: 0,
      newBalance: INITIAL_CREDITS,
      description: 'Boas-vindas ao Reino de Maria Padilha — 07 créditos iniciais',
      timestamp: new Date().toISOString(),
    };

    await firestore.collection('credit_ledger').doc(ledgerEntry.id).set(ledgerEntry);

    logger.info('User successfully registered', { uid, email: normalizedEmail, ip: clientIp });

    return res.status(200).json({
      user: newUser,
      creditsGranted: INITIAL_CREDITS,
    });
  } catch (error: any) {
    logger.error('Error during user registration', error);
    return res.status(500).json({
      error: 'Erro interno ao processar cadastro.',
    });
  }
}
