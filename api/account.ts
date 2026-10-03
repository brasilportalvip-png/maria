import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware/auth.js';
import { DeleteAccountSchema } from './validation/schemas.js';
import { firestore, adminAuth } from './_firebaseAdmin.js';
import { logger } from './services/logger.js';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const authReq = req as AuthenticatedRequest;
  const isAuthed = await requireAuth(authReq, res);
  if (!isAuthed) return;

  const user = authReq.user!;
  const action = (req.query?.action as string) || req.body?.action || 'export_data';

  try {
    if (action === 'export_data') {
      // LGPD: Data portability / access
      const readingsSnap = await firestore.collection('readings').where('uid', '==', user.uid).get();
      const readings = readingsSnap.docs.map((d: any) => d.data());

      const ledgerSnap = await firestore.collection('credit_ledger').where('uid', '==', user.uid).get();
      const ledger = ledgerSnap.docs.map((d: any) => d.data());

      const diarySnap = await firestore.collection('diary').where('userId', '==', user.uid).get();
      const diary = diarySnap.docs.map((d: any) => d.data());

      const ordersSnap = await firestore.collection('payment_orders').where('uid', '==', user.uid).get();
      const orders = ordersSnap.docs.map((d: any) => {
        const o = d.data();
        return {
          orderId: o.orderId,
          planName: o.planName,
          expectedAmount: o.expectedAmount,
          currency: o.currency,
          status: o.status,
          createdAt: o.createdAt,
        };
      });

      let spiritualProfile = null;
      try {
        const sDoc = await firestore.collection('spiritual_profiles').doc(user.uid).get();
        if (sDoc.exists) spiritualProfile = sDoc.data();
      } catch {
        // ignore
      }

      let spiritualHistory = null;
      try {
        const hDoc = await firestore.collection('spiritual_history').doc(user.uid).get();
        if (hDoc.exists) spiritualHistory = hDoc.data();
      } catch {
        // ignore
      }

      return res.status(200).json({
        userProfile: {
          fullName: user.fullName,
          email: user.email,
          birthDate: user.birthDate,
          birthTime: user.birthTime || null,
          credits: user.credits,
          createdAt: user.createdAt,
        },
        spiritualProfile,
        spiritualHistory,
        readings,
        creditLedger: ledger,
        diaryEntries: diary,
        paymentOrders: orders,
        exportedAt: new Date().toISOString(),
      });
    }

    if (action === 'delete_account' && req.method === 'POST') {
      const parseResult = DeleteAccountSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Para confirmar a exclusão, envie exatamente a frase de confirmação: QUERO_EXCLUIR_MINHA_CONTA',
        });
      }

      // Anonymize user record irreversibly
      await firestore.collection('users').doc(user.uid).set({
        fullName: '[Conta Excluída pelo Titular - LGPD]',
        email: `deleted_${user.uid}@anonymized.invalid`,
        phone: '',
        birthDate: '',
        birthTime: '',
        credits: 0,
        isBlocked: true,
        deletedAt: new Date().toISOString(),
      }, { merge: true });

      // Delete diary entries
      const diaryDocs = await firestore.collection('diary').where('userId', '==', user.uid).get();
      for (const d of diaryDocs.docs) {
        await d.ref.delete();
      }

      // Delete readings to purge personal questions and natal data
      const readingsDocs = await firestore.collection('readings').where('uid', '==', user.uid).get();
      for (const r of readingsDocs.docs) {
        await r.ref.delete();
      }

      // Anonymize payment orders (retaining financial records without personal identity)
      const paymentDocs = await firestore.collection('payment_orders').where('uid', '==', user.uid).get();
      for (const p of paymentDocs.docs) {
        await p.ref.set({ userEmail: '[anonimizado@lgpd.invalid]' }, { merge: true });
      }

      // Delete spiritual profiles and living history
      try {
        await firestore.collection('spiritual_profiles').doc(user.uid).delete();
        await firestore.collection('spiritual_history').doc(user.uid).delete();
      } catch {
        // ignore
      }

      // If Admin SDK exists, delete auth user
      if (adminAuth && typeof adminAuth.deleteUser === 'function') {
        try {
          await adminAuth.deleteUser(user.uid);
        } catch (e) {
          logger.warn('Failed to delete auth user, anonymized in database:', { uid: user.uid });
        }
      }

      logger.security('Account successfully deleted under LGPD', { uid: user.uid });

      return res.status(200).json({
        success: true,
        message: 'Sua conta e seus dados pessoais de perfil e diário foram excluídos com sucesso. Registros contábeis e fiscais foram anonimizados conforme exigido por lei.',
      });
    }

    return res.status(400).json({ error: 'Ação não reconhecida.' });
  } catch (err: any) {
    logger.error('Account management error', err);
    return res.status(500).json({ error: 'Erro ao processar solicitação de conta.' });
  }
}
