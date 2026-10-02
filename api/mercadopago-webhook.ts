import type { Request, Response } from 'express';
import { firestore } from './_firebaseAdmin.js';
import { addPurchaseCredits } from './services/creditService.js';
import { logger } from './services/logger.js';

function extractPaymentId(req: Request): string | null {
  return (
    req.body?.data?.id ||
    req.body?.id ||
    (req.query?.['data.id'] as string) ||
    (req.query?.id as string) ||
    (req.query?.payment_id as string) ||
    null
  );
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const paymentId = extractPaymentId(req);

  if (!paymentId) {
    return res.status(200).json({ received: true, ignored: true, reason: 'missing_payment_id' });
  }

  if (!accessToken || accessToken === 'MY_ACCESS_TOKEN') {
    logger.warn('Webhook received but MERCADO_PAGO_ACCESS_TOKEN is not configured', { paymentId });
    return res.status(200).json({ received: true, simulated: true });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const paymentInfo = await mpRes.json();

    if (!mpRes.ok) {
      logger.error('Failed to fetch payment info from Mercado Pago', { status: mpRes.status, paymentInfo });
      return res.status(200).json({ received: true, error: 'fetch_failed' });
    }

    if (paymentInfo.status !== 'approved') {
      logger.info('Payment received but not approved yet', { paymentId, status: paymentInfo.status });
      return res.status(200).json({ received: true, status: paymentInfo.status });
    }

    const metadata = paymentInfo.metadata || {};
    const userId = metadata.user_id || metadata.userId;
    const credits = Number(metadata.expected_credits || metadata.credits || 0);
    const planId = metadata.plan_id || metadata.planId || 'prata';
    const expectedAmount = Number(metadata.expected_amount || 0);

    // Validate currency and amount
    if (paymentInfo.currency_id !== 'BRL') {
      logger.error('Payment currency mismatch', { currency: paymentInfo.currency_id, paymentId });
      return res.status(400).json({ error: 'Moeda não aceita' });
    }

    if (expectedAmount > 0 && Math.abs(Number(paymentInfo.transaction_amount) - expectedAmount) > 0.01) {
      logger.error('Payment amount mismatch!', {
        received: paymentInfo.transaction_amount,
        expected: expectedAmount,
        paymentId,
      });
      return res.status(400).json({ error: 'Valor divergente do esperado.' });
    }

    if (!userId || credits <= 0) {
      logger.warn('Payment metadata missing userId or credits', { paymentId, metadata });
      return res.status(200).json({ received: true, ignored: true, reason: 'missing_user_or_credits' });
    }

    // Apply credits idempotently
    const creditResult = await addPurchaseCredits({
      uid: userId,
      amount: credits,
      paymentId: String(paymentId),
      planId,
    });

    // Update order status if orderId was attached
    const orderId = metadata.order_id || metadata.orderId || paymentInfo.external_reference;
    if (orderId) {
      await firestore.collection('payment_orders').doc(orderId).set({
        status: 'credited',
        providerPaymentId: String(paymentId),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return res.status(200).json({
      received: true,
      credited: true,
      newBalance: creditResult.newBalance,
    });
  } catch (err: any) {
    logger.error('Error processing Mercado Pago webhook', err);
    return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
  }
}
