import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../src/oraculos/intentClassifier.js';

describe('Universal Intent Classifier (Requisitos Críticos 21, 22, 73)', () => {
  it('CASO 1: "Estou abrindo sociedade com Carlos. Teremos sucesso?" deve ser classificado como BUSINESS/PARTNERSHIP, NUNCA LOVE', () => {
    const question = 'Estou abrindo sociedade com Carlos. Teremos sucesso?';
    const result = classifyIntent(question);

    expect(result.isRomantic).toBe(false);
    expect(result.isBusinessOrCareer).toBe(true);
    expect(['sociedade', 'negocios']).toContain(result.primaryCategory);
    expect(result.participants.some((p) => p.name.includes('Carlos') && p.role === 'socio')).toBe(true);
  });

  it('CASO 2: "Maria vai conseguir emprego?" deve ser classificado como CAREER/EMPLOYMENT, NUNCA LOVE', () => {
    const question = 'Maria vai conseguir emprego?';
    const result = classifyIntent(question);

    expect(result.isRomantic).toBe(false);
    expect(result.isBusinessOrCareer).toBe(true);
    expect(result.primaryCategory).toBe('emprego');
  });

  it('CASO 3: "Maria ainda me ama?" deve ser classificado como LOVE/RELATIONSHIP', () => {
    const question = 'Maria ainda me ama?';
    const result = classifyIntent(question);

    expect(result.isRomantic).toBe(true);
    expect(result.isBusinessOrCareer).toBe(false);
    expect(['amor', 'relacionamento']).toContain(result.primaryCategory);
  });

  it('CASO 4: "Meu irmão vai melhorar no trabalho?" deve ser classificado como FAMILY + CAREER, NUNCA LOVE', () => {
    const question = 'Meu irmão vai melhorar no trabalho?';
    const result = classifyIntent(question);

    expect(result.isRomantic).toBe(false);
    expect(result.isBusinessOrCareer).toBe(true);
    expect(['familia', 'emprego']).toContain(result.primaryCategory);
  });

  it('Não deve acionar comparação amorosa quando for apenas parceria com data de nascimento', () => {
    const question = 'Estou abrindo sociedade com Flavio Roberto Ortiz Costa, 02/02/1983. Teremos sucesso?';
    const result = classifyIntent(question);

    expect(result.isRomantic).toBe(false);
    expect(result.isBusinessOrCareer).toBe(true);
    expect(result.participants.some((p) => p.name.includes('Flavio') && p.birthDate === '02/02/1983')).toBe(true);
  });
});
