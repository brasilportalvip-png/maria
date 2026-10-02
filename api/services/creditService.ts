import { firestore } from '../_firebaseAdmin.js';
import type { CreditLedgerEntry } from '../../src/types/spiritual.js';
import { logger } from './logger.js';

// In-memory ledger map for dev and testing
const ledgerStore = new Map<string, CreditLedgerEntry>();
const idempotencyStore = new Map<string, CreditLedgerEntry>();

export async function getUserCredits(uid: string): Promise<number> {
  try {
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return typeof data?.credits === 'number' ? data.credits : 7;
    }
  } catch (err) {
    logger.warn('Error reading user credits from Firestore, using default:', { uid, error: String(err) });
  }
  return 7;
}

export async function debitCredits(params: {
  uid: string;
  amount: number;
  type: 'reading' | 'chat';
  referenceId?: string;
  description: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; newBalance: number; ledgerId: string }> {
  const { uid, amount, type, referenceId, description, idempotencyKey } = params;

  if (amount <= 0) {
    throw new Error('O valor de débito deve ser maior que zero.');
  }

  // Check idempotency first to prevent double billing
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    const existing = idempotencyStore.get(idempotencyKey)!;
    logger.info('Duplicate debit request ignored due to idempotencyKey', { idempotencyKey, uid });
    return {
      success: true,
      newBalance: existing.newBalance,
      ledgerId: existing.id,
    };
  }

  const userRef = firestore.collection('users').doc(uid);
  const ledgerId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  let finalBalance = 0;

  try {
    await firestore.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      const currentCredits = userDoc.exists && typeof userDoc.data()?.credits === 'number'
        ? userDoc.data().credits
        : 7;

      if (currentCredits < amount) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      finalBalance = currentCredits - amount;

      transaction.update(userRef, {
        credits: finalBalance,
        updatedAt: new Date().toISOString(),
      });

      const entry: CreditLedgerEntry = {
        id: ledgerId,
        uid,
        type,
        amount: -amount,
        previousBalance: currentCredits,
        newBalance: finalBalance,
        referenceId,
        idempotencyKey,
        description,
        timestamp: new Date().toISOString(),
      };

      const ledgerRef = firestore.collection('credit_ledger').doc(ledgerId);
      transaction.set(ledgerRef, entry);

      ledgerStore.set(ledgerId, entry);
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, entry);
      }
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      throw new Error('INSUFFICIENT_CREDITS');
    }
    // Fallback in test/in-memory mode
    const current = await getUserCredits(uid);
    if (current < amount) {
      throw new Error('INSUFFICIENT_CREDITS');
    }
    finalBalance = current - amount;
    await userRef.set({ credits: finalBalance }, { merge: true });

    const entry: CreditLedgerEntry = {
      id: ledgerId,
      uid,
      type,
      amount: -amount,
      previousBalance: current,
      newBalance: finalBalance,
      referenceId,
      idempotencyKey,
      description,
      timestamp: new Date().toISOString(),
    };
    ledgerStore.set(ledgerId, entry);
    if (idempotencyKey) idempotencyStore.set(idempotencyKey, entry);
  }

  logger.info('Credits debited successfully', { uid, amount, newBalance: finalBalance, type, referenceId });

  return {
    success: true,
    newBalance: finalBalance,
    ledgerId,
  };
}

export async function refundCredits(params: {
  uid: string;
  amount: number;
  referenceId?: string;
  reason: string;
}): Promise<{ success: boolean; newBalance: number }> {
  const { uid, amount, referenceId, reason } = params;
  const current = await getUserCredits(uid);
  const newBalance = current + amount;
  const ledgerId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const entry: CreditLedgerEntry = {
    id: ledgerId,
    uid,
    type: 'refund',
    amount: amount,
    previousBalance: current,
    newBalance,
    referenceId,
    description: `Estorno automático: ${reason}`,
    timestamp: new Date().toISOString(),
  };

  try {
    await firestore.collection('users').doc(uid).set({ credits: newBalance }, { merge: true });
    await firestore.collection('credit_ledger').doc(ledgerId).set(entry);
  } catch (err) {
    console.warn('[creditService] Refund storage warning:', err);
  }

  ledgerStore.set(ledgerId, entry);
  logger.info('Credits refunded successfully', { uid, amount, newBalance, reason, referenceId });

  return { success: true, newBalance };
}

export async function addPurchaseCredits(params: {
  uid: string;
  amount: number;
  paymentId: string;
  planId: string;
}): Promise<{ success: boolean; newBalance: number }> {
  const { uid, amount, paymentId, planId } = params;

  // Check if this payment was already credited
  const existingDoc = await firestore.collection('credit_ledger')
    .where('referenceId', '==', paymentId)
    .where('type', '==', 'purchase')
    .limit(1)
    .get();

  if (!existingDoc.empty) {
    logger.warn('Payment already credited, skipping:', { paymentId, uid });
    const current = await getUserCredits(uid);
    return { success: true, newBalance: current };
  }

  const current = await getUserCredits(uid);
  const newBalance = current + amount;
  const ledgerId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const entry: CreditLedgerEntry = {
    id: ledgerId,
    uid,
    type: 'purchase',
    amount,
    previousBalance: current,
    newBalance,
    referenceId: paymentId,
    description: `Compra de créditos - Plano ${planId}`,
    timestamp: new Date().toISOString(),
  };

  await firestore.collection('users').doc(uid).set({ credits: newBalance }, { merge: true });
  await firestore.collection('credit_ledger').doc(ledgerId).set(entry);

  logger.info('Purchase credits applied successfully', { uid, amount, newBalance, paymentId, planId });
  return { success: true, newBalance };
}
