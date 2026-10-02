import { describe, it, expect } from 'vitest';
import { debitCredits, refundCredits, getUserCredits } from '../api/services/creditService.js';
import { MODEL_CHAIN } from '../api/services/geminiService.js';

describe('Credit Service & Gemini Resilience (Requisitos 7, 8, 13, 14, 76)', () => {
  it('A cadeia de modelos Gemini deve priorizar gemini-3.8-flash conforme especificação oficial', () => {
    expect(MODEL_CHAIN[0]).toBe('gemini-3.8-flash');
    expect(MODEL_CHAIN.length).toBeGreaterThanOrEqual(3);
  });

  it('deve debitar créditos e impedir débito se o saldo for insuficiente', async () => {
    const testUid = `test_user_${Date.now()}`;
    // User starts with 7 credits default
    const initialCredits = await getUserCredits(testUid);
    expect(initialCredits).toBe(7);

    // Debit 3 credits
    const res1 = await debitCredits({
      uid: testUid,
      amount: 3,
      type: 'chat',
      description: 'Primeira consulta de teste',
    });

    expect(res1.success).toBe(true);
    expect(res1.newBalance).toBe(4);

    // Debit another 3 credits
    const res2 = await debitCredits({
      uid: testUid,
      amount: 3,
      type: 'chat',
      description: 'Segunda consulta de teste',
    });

    expect(res2.success).toBe(true);
    expect(res2.newBalance).toBe(1);

    // Attempt to debit 3 credits when only 1 credit remains -> must throw INSUFFICIENT_CREDITS
    await expect(
      debitCredits({
        uid: testUid,
        amount: 3,
        type: 'chat',
        description: 'Terceira consulta que deve falhar',
      })
    ).rejects.toThrow('INSUFFICIENT_CREDITS');
  });

  it('deve respeitar a idempotencyKey impedindo cobrança dupla', async () => {
    const testUid = `idempotent_user_${Date.now()}`;
    const idKey = `key_${Date.now()}`;

    const first = await debitCredits({
      uid: testUid,
      amount: 3,
      type: 'chat',
      description: 'Consulta com idempotência',
      idempotencyKey: idKey,
    });

    const second = await debitCredits({
      uid: testUid,
      amount: 3,
      type: 'chat',
      description: 'Consulta repetida com mesma chave',
      idempotencyKey: idKey,
    });

    // Balances must match, no double debit!
    expect(first.newBalance).toBe(second.newBalance);
    expect(first.ledgerId).toBe(second.ledgerId);
  });

  it('deve estornar créditos de forma confiável após falha', async () => {
    const testUid = `refund_user_${Date.now()}`;
    const initial = await getUserCredits(testUid);

    await debitCredits({
      uid: testUid,
      amount: 3,
      type: 'chat',
      description: 'Consulta pré-falha',
    });

    expect(await getUserCredits(testUid)).toBe(initial - 3);

    // Refund 3 credits
    const refundRes = await refundCredits({
      uid: testUid,
      amount: 3,
      reason: 'Falha simulada de conexão',
    });

    expect(refundRes.success).toBe(true);
    expect(refundRes.newBalance).toBe(initial);
  });
});
