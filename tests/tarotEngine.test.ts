import { describe, it, expect } from 'vitest';
import { drawTarotCards, FULL_DECK } from '../src/oraculos/tarotEngine.js';

describe('Tarot Real Oracle Engine (Requisitos 25, 26, 72)', () => {
  it('deve sortear exatamente 3 cartas sem repetição em uma tiragem padrão', () => {
    const spread = drawTarotCards(3);
    expect(spread).toHaveLength(3);

    const cardIds = spread.map((p) => p.card.id);
    const uniqueIds = new Set(cardIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('todas as cartas sorteadas devem pertencer ao baralho oficial', () => {
    const spread = drawTarotCards(5);
    expect(spread).toHaveLength(5);

    spread.forEach((p) => {
      expect(FULL_DECK.some((c) => c.id === p.card.id)).toBe(true);
      expect(p.card.name).toBeDefined();
      expect(p.label).toBeDefined();
      expect(typeof p.isReversed).toBe('boolean');
    });
  });

  it('deve lançar erro se a quantidade pedida exceder o baralho', () => {
    expect(() => drawTarotCards(FULL_DECK.length + 1)).toThrow();
  });
});
