import type { Request, Response } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { requireAuth, type AuthenticatedRequest } from './middleware/auth.js';
import { CreatePaymentRequestSchema } from './validation/schemas.js';
import { firestore } from './_firebaseAdmin.js';
import { logger } from './services/logger.js';
import type { PaymentOrder } from '../src/types/spiritual.js';

export const SERVER_PLANS: Record<string, { id: string; name: string; price: number; credits: number }> = {
  prata: { id: 'prata', name: 'Plano Prata — 30 Créditos', price: 50, credits: 30 },
  ouro: { id: 'ouro', name: 'Plano Ouro — 65 Créditos', price: 100, credits: 65 },
  diamante: { id: 'diamante', name: 'Plano Diamante — 110 Créditos', price: 150, credits: 110 },
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const authReq = req as AuthenticatedRequest;
  const isAuthed = await requireAuth(authReq, res);
  if (!isAuthed) return;

  const user = authReq.user!;

  // Validate request body
  const parseResult = CreatePaymentRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Plano inválido ou parâmetros incorretos.',
      details: parseResult.error.format(),
    });
  }

  const { planId, idempotencyKey } = parseResult.data;
  const plan = SERVER_PLANS[planId];

  if (!plan) {
    return res.status(400).json({ error: 'Plano selecionado não existe na tabela do servidor.' });
  }

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const orderRecord: PaymentOrder = {
    orderId,
    uid: user.uid,
    userEmail: user.email,
    planId: plan.id,
    planName: plan.name,
    expectedAmount: plan.price,
    currency: 'BRL',
    expectedCredits: plan.credits,
    status: 'pending',
    idempotencyKey: idempotencyKey || orderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await firestore.collection('payment_orders').doc(orderId).set(orderRecord);
  } catch (err) {
    logger.warn('Failed to save payment_order in Firestore, proceeding with preference creation', { orderId, error: String(err) });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const siteUrl = process.env.PUBLIC_SITE_URL || process.env.APP_BASE_URL || 'http://localhost:3000';

  if (!accessToken || accessToken === 'MY_ACCESS_TOKEN') {
    // Graceful test/sandbox simulation when MP credentials are not yet provisioned
    logger.warn('MERCADO_PAGO_ACCESS_TOKEN not configured. Returning test sandbox init_point.');
    return res.status(200).json({
      orderId,
      init_point: `${siteUrl}/credits?mock_order=${orderId}&plan=${plan.id}`,
      sandbox_init_point: `${siteUrl}/credits?mock_order=${orderId}&plan=${plan.id}`,
      isMock: true,
    });
  }

  try {
    const mpClient = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(mpClient);

    const preferenceBody = {
      items: [
        {
          id: plan.id,
          title: plan.name,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: plan.price,
        },
      ],
      payer: {
        email: user.email,
        name: user.fullName || 'Consulente',
      },
      metadata: {
        orderId,
        userId: user.uid,
        userEmail: user.email,
        planId: plan.id,
        expectedAmount: plan.price,
        expectedCredits: plan.credits,
      },
      external_reference: orderId,
      notification_url: `${siteUrl}/api/mercadopago-webhook`,
      back_urls: {
        success: `${siteUrl}/credits?status=success&orderId=${orderId}`,
        failure: `${siteUrl}/credits?status=failure&orderId=${orderId}`,
        pending: `${siteUrl}/credits?status=pending&orderId=${orderId}`,
      },
      auto_return: 'approved',
    };

    const mpRes = await preferenceClient.create({ body: preferenceBody });

    // Update order with provider preference ID
    await firestore.collection('payment_orders').doc(orderId).set({
      providerPreferenceId: mpRes.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({
      orderId,
      id: mpRes.id,
      init_point: mpRes.init_point,
      sandbox_init_point: mpRes.sandbox_init_point,
    });
  } catch (err: any) {
    logger.error('Error creating Mercado Pago preference', err);
    return res.status(500).json({
      error: 'Não foi possível gerar a preferência de pagamento no momento. Tente novamente mais tarde.',
    });
  }
}
