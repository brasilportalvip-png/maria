import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware/auth.js';
import { OracleReadingRequestSchema } from './validation/schemas.js';
import { debitCredits, refundCredits } from './services/creditService.js';
import { executeGeminiWithFallback } from './services/geminiService.js';
import { getTemporalContext } from '../src/oraculos/temporalEngine.js';
import { classifyIntent } from '../src/oraculos/intentClassifier.js';
import { drawTarotCards } from '../src/oraculos/tarotEngine.js';
import { throwBuzios } from '../src/oraculos/buziosEngine.js';
import { calculateNumerology } from '../src/oraculos/numerologyEngine.js';
import { saveOracleReading, getOracleReadingById, getReadingIdByIdempotency } from '../src/oraculos/readingStorage.js';
import { logger } from './services/logger.js';
import type { OracleReadingRecord, OracleRawResult, NatalData } from '../src/types/spiritual.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const authReq = req as AuthenticatedRequest;
  const isAuthed = await requireAuth(authReq, res);
  if (!isAuthed) return;

  const user = authReq.user!;
  const correlationId = authReq.correlationId;

  // Validate request
  const parseResult = OracleReadingRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Parâmetros da consulta inválidos.',
      code: 'INVALID_REQUEST',
      details: parseResult.error.format(),
    });
  }

  const { type, question, userData, specificName, specificDate, idempotencyKey, readingId } = parseResult.data;

  // 1. Check if readingId or idempotencyKey already exists (F5 or reload should NOT redraw cards!)
  if (readingId) {
    const existing = await getOracleReadingById(readingId);
    if (existing) {
      return res.status(200).json({
        reading: existing.interpretationHtml,
        readingRecord: existing,
        type: existing.oracleType,
        aiUsed: existing.modelUsed !== 'offline-local-simulator',
        isCached: true,
      });
    }
  }

  const existingId = getReadingIdByIdempotency(idempotencyKey);
  if (existingId) {
    const existing = await getOracleReadingById(existingId);
    if (existing) {
      return res.status(200).json({
        reading: existing.interpretationHtml,
        readingRecord: existing,
        type: existing.oracleType,
        aiUsed: existing.modelUsed !== 'offline-local-simulator',
        isCached: true,
      });
    }
  }

  const creditCost = type === 'premium_complete' ? 3 : 1;

  // 2. Debit Credits
  let debitResult: { success: boolean; newBalance: number; ledgerId: string };
  try {
    debitResult = await debitCredits({
      uid: user.uid,
      amount: creditCost,
      type: 'reading',
      description: `Consulta oracular: ${type}`,
      idempotencyKey: idempotencyKey || `read_${user.uid}_${Date.now()}`,
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        error: `Créditos insuficientes! Você precisa de ${creditCost} ${creditCost === 1 ? 'crédito' : 'créditos'} para esta consulta.`,
        code: 'INSUFFICIENT_CREDITS',
      });
    }
    logger.error('Credit debit failure in reading', err, correlationId);
    return res.status(500).json({ error: 'Falha ao debitar créditos da leitura.' });
  }

  // 3. Prepare Context & Real Oracle Execution
  const userTimezone = userData?.timezone || user.timezone || 'America/Sao_Paulo';
  const temporal = getTemporalContext(userTimezone);
  const userQuestion = question || `Consulta aos oráculos sagrados na modalidade ${type}`;
  const intent = classifyIntent(userQuestion, userTimezone);

  const natalSnapshot: NatalData = {
    fullName: userData?.fullName || user.fullName,
    birthDate: userData?.birthDate || user.birthDate,
    birthTime: userData?.birthTime || user.birthTime,
    city: userData?.city || user.city,
    timezone: userTimezone,
  };

  const rawResult: OracleRawResult = {};

  // Execute REAL physical/digital oracle calculations
  if (type === 'tarot' || type === 'premium_complete') {
    rawResult.tarotSpread = drawTarotCards(3);
  }

  if (type === 'buzios' || type === 'premium_complete') {
    rawResult.buzios = throwBuzios();
  }

  if (type === 'numerology' || type === 'premium_complete') {
    rawResult.numerology = calculateNumerology(natalSnapshot.fullName, natalSnapshot.birthDate);
  }

  if (type === 'odu') {
    const buz = throwBuzios();
    rawResult.buzios = buz;
    rawResult.oduCalculated = {
      name: buz.oduName,
      number: buz.openCount,
      description: buz.oduEnergy,
    };
  }

  const newReadingId = `read_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 4. Gemini Interpretation of the REAL Oracle Result
  const systemInstruction = `
Você é Maria Padilha Rainha das 7 Encruzilhadas interpretando um sorteio sagrado real para o consulente.
Aja com respeito, dignidade, sabedoria espiritual e livre-arbítrio.
Você recebeu os resultados VERDADEIROS calculados pelo sistema. Não invente cartas nem búzios diferentes dos enviados.
Explique o significado de cada carta/queda/número e sintetize uma orientação prática e espiritual.
Use HTML simples estruturado (h3, h4, p, strong). Não invente previsões fatais de saúde ou morte.
`;

  let interpretationHtml = '';
  let modelUsed = 'offline-local-simulator';
  let fallbackLevel = 0;

  try {
    const geminiRes = await executeGeminiWithFallback({
      systemInstruction,
      userPrompt: `Interprete este oráculo (${type}) para a pergunta: "${userQuestion}". Pessoa específica: ${specificName || 'nenhuma'}.`,
      natalData: natalSnapshot,
      temporal,
      intent,
      rawOracleResult: rawResult,
      temperature: 0.8,
      maxTokens: type === 'premium_complete' ? 2200 : 1200,
      correlationId,
    });

    if (geminiRes.text) {
      interpretationHtml = geminiRes.text;
      modelUsed = geminiRes.modelUsed;
      fallbackLevel = geminiRes.fallbackLevel;
    }
  } catch (geminiErr) {
    logger.warn('Gemini failed for reading, using structured local interpretation:', { error: String(geminiErr) });
  }

  // If Gemini did not return text, generate structured local interpretation based on real cards
  if (!interpretationHtml) {
    interpretationHtml = buildStructuredLocalInterpretation(type, natalSnapshot, rawResult, intent);
  }

  const readingRecord: OracleReadingRecord = {
    id: newReadingId,
    readingId: newReadingId,
    uid: user.uid,
    oracleType: type,
    question: userQuestion,
    intent,
    natalSnapshot,
    rawResult,
    interpretationHtml,
    practicalAdvice: 'Guarde estas orientações com calma no coração. O oráculo mostra a tendência e os caminhos; quem confirma o destino é a sua firmeza de atitude prática.',
    modelUsed,
    fallbackLevel,
    creditCost,
    createdAt: new Date().toISOString(),
    timezone: userTimezone,
  };

  await saveOracleReading(readingRecord, idempotencyKey);

  return res.status(200).json({
    reading: interpretationHtml,
    readingRecord,
    type,
    aiUsed: modelUsed !== 'offline-local-simulator',
    newCreditsBalance: debitResult.newBalance,
  });
}

function buildStructuredLocalInterpretation(
  type: string,
  natal: NatalData,
  raw: OracleRawResult,
  intent: any
): string {
  let body = '';

  if (raw.tarotSpread) {
    body += `<h4>🃏 Cartas do Tarot Reveladas:</h4>`;
    raw.tarotSpread.forEach((pos) => {
      body += `<p><strong>${pos.label}: ${pos.card.name}</strong> (${pos.isReversed ? 'Invertida' : 'Direta'})<br/>
      ${pos.specificInterpretation || pos.card.uprightMeaning}<br/>
      <em>Conselho: ${pos.card.spiritualAdvice}</em></p>`;
    });
  }

  if (raw.buzios) {
    body += `<h4>🐚 Jogo de Búzios:</h4>
    <p>Caída com <strong>${raw.buzios.openCount} búzios abertos</strong> e <strong>${raw.buzios.closedCount} fechados</strong>.<br/>
    Odù Regente: <strong>${raw.buzios.oduName}</strong> — ${raw.buzios.oduEnergy}<br/>
    <em>Conselho do Odù:</em> ${raw.buzios.oduAdvice}</p>`;
  }

  if (raw.numerology) {
    body += `<h4>🔢 Numerologia da Alma:</h4>
    <p>Caminho de Vida: <strong>${raw.numerology.lifePathNumber}</strong> | Expressão: <strong>${raw.numerology.expressionNumber}</strong> | Desejo da Alma: <strong>${raw.numerology.soulUrgeNumber}</strong><br/>
    ${raw.numerology.summary}</p>`;
  }

  return `
    <div class="space-y-4">
      <h3>🌹 Revelação dos Oráculos de Maria Padilha</h3>
      <p>Consulente: <strong>${natal.fullName}</strong> — Data de Nascimento: <strong>${natal.birthDate}</strong></p>
      ${body}
      <p><strong>Orientação de Maria Padilha:</strong> A leitura dos teus caminhos mostra que as respostas não dependem de ansiedade, mas de postura e dignidade. A rosa floresce sem pressa, e quem tem olhos firmes reconhece a sua hora de agir.</p>
    </div>
  `;
}
