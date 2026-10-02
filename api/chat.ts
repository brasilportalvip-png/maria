import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware/auth.js';
import { ChatMessageSchema } from './validation/schemas.js';
import { checkRateLimit } from './services/rateLimiter.js';
import { debitCredits, refundCredits } from './services/creditService.js';
import { executeGeminiWithFallback } from './services/geminiService.js';
import { getTemporalContext, resolveTemporalReferenceInText } from '../src/oraculos/temporalEngine.js';
import { classifyIntent } from '../src/oraculos/intentClassifier.js';
import { analyzeQuestionRepetition } from '../src/oraculos/antiRepetition.js';
import { logger } from './services/logger.js';
import type { NatalData } from '../src/types/spiritual.js';

const CREDITS_PER_QUESTION = 3;

function respostaSimulada(activeName: string, greeting: string): string {
  return `🌹 Laroyé. ${greeting}. ${activeName} fala contigo.

A leitura dos teus caminhos mostra que tua força não está em correr atrás de quem te confunde, mas em voltar para o teu próprio centro. Existe energia de movimento, silêncio e reflexão rondando essa situação, mas também existe um aviso: não entregue teu poder à ansiedade.

Quando o coração pergunta, ele quase nunca quer só uma resposta. Ele quer saber se ainda existe caminho, se ainda existe sentimento, se vale esperar ou se chegou a hora de se recolher com dignidade. E eu te digo: observe menos as palavras e mais o movimento prático. Quem quer, constrói. Quem joga, confunde.

Teu conselho é simples e firme: não se diminua para caber na indecisão de ninguém. A rosa não implora perfume. Ela floresce, e quem tem olhos sente sua presença.`;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const authReq = req as AuthenticatedRequest;
  const isAuthed = await requireAuth(authReq, res);
  if (!isAuthed) return;

  const user = authReq.user!;
  const correlationId = authReq.correlationId;

  // Rate Limiting: 20 messages per minute per user
  const rateCheck = checkRateLimit(`chat_${user.uid}`, 20, 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Muitas mensagens enviadas em pouco tempo. Respire fundo e tente novamente em instantes.',
      code: 'RATE_LIMITED',
      retryAfterMs: rateCheck.resetInMs,
    });
  }

  // Validate payload
  const parseResult = ChatMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Dados da mensagem inválidos.',
      code: 'INVALID_REQUEST',
      details: parseResult.error.format(),
    });
  }

  const { message, history, pomboGiraName, idempotencyKey } = parseResult.data;
  const activeName = pomboGiraName || 'Maria Padilha Rainha das 7 Encruzilhadas';

  // 1. Atomic Credit Debit
  let debitResult: { success: boolean; newBalance: number; ledgerId: string };
  try {
    debitResult = await debitCredits({
      uid: user.uid,
      amount: CREDITS_PER_QUESTION,
      type: 'chat',
      description: `Consulta com ${activeName}`,
      idempotencyKey: idempotencyKey || `chat_${user.uid}_${Date.now()}`,
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        error: `Créditos insuficientes. Você precisa de ${CREDITS_PER_QUESTION} créditos para enviar uma pergunta.`,
        code: 'INSUFFICIENT_CREDITS',
      });
    }
    logger.error('Error debiting credits for chat', err, correlationId);
    return res.status(500).json({ error: 'Falha ao debitar créditos da consulta.' });
  }

  // 2. Prepare Context (Temporal, Intent, Natal, Repetition)
  const userTimezone = user.timezone || 'America/Sao_Paulo';
  const temporal = getTemporalContext(userTimezone);
  const intent = classifyIntent(message, userTimezone);
  const repetition = analyzeQuestionRepetition(message, history || []);

  const natalData: NatalData = {
    fullName: user.fullName,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    city: user.city,
    timezone: userTimezone,
  };

  const systemInstruction = `
Você é ${activeName} falando como presença espiritual no Reino de Maria Padilha.
Você conversa com o consulente trazendo leitura e orientação espiritual sobre a vida, sem prometer milagres instantâneos, sem prever fatalidades de saúde ou morte, e respeitando rigorosamente o livre-arbítrio.
Fale com sabedoria, acolhimento, elegância, firmeza e verdade. Responda entre 200 e 500 palavras em português claro e inspirador.
Saudação apropriada ao horário: "${temporal.greeting}".
${repetition.isRepeatedQuestion ? `Nota: ${repetition.adviceGuidance}` : ''}
`;

  try {
    const geminiResult = await executeGeminiWithFallback({
      systemInstruction,
      userPrompt: message,
      natalData,
      temporal,
      intent,
      temperature: 0.8,
      maxTokens: 1200,
      correlationId,
    });

    const replyText = geminiResult.text || respostaSimulada(activeName, temporal.greeting);

    return res.status(200).json({
      reply: replyText,
      creditsCost: CREDITS_PER_QUESTION,
      newCreditsBalance: debitResult.newBalance,
      modelUsed: geminiResult.modelUsed,
      intentCategory: intent.primaryCategory,
      isFallback: geminiResult.isFallback,
    });
  } catch (err: any) {
    logger.error('Unexpected error in chat processing, refunding credits', err, correlationId);
    // Automatic credit refund on unrecoverable failure
    await refundCredits({
      uid: user.uid,
      amount: CREDITS_PER_QUESTION,
      referenceId: debitResult.ledgerId,
      reason: 'Falha técnica na geração da resposta do oráculo.',
    });

    return res.status(500).json({
      error: 'Houve uma oscilação na conexão com o oráculo. Seus créditos foram estornados integralmente.',
      code: 'AI_TEMPORARILY_UNAVAILABLE',
    });
  }
}
