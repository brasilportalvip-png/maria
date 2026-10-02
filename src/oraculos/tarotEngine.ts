import type { TarotCard, TarotDrawPosition } from '../types/spiritual.js';
import crypto from 'crypto';

// Complete 22 Major Arcana
export const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 'm00', number: 0, name: 'O Louco', arcana: 'major',
    keywords: ['início', 'liberdade', 'salto de fé', 'espontaneidade'],
    uprightMeaning: 'Abertura para novos caminhos, coragem de começar do zero e quebra de amarras.',
    reversedMeaning: 'Imprudência, ingenuidade perigosa ou medo de dar o primeiro passo.',
    spiritualAdvice: 'Caminhe com leveza, mas não feche os olhos para o abismo à sua frente.'
  },
  {
    id: 'm01', number: 1, name: 'O Mago', arcana: 'major',
    keywords: ['manifestação', 'recursos', 'iniciativa', 'poder'],
    uprightMeaning: 'Todas as ferramentas estão na sua mesa. Capacidade de agir e transformar intenção em realidade.',
    reversedMeaning: 'Ilusão, manipulação de palavras ou dispersão de talentos.',
    spiritualAdvice: 'Use seu magnetismo para construir verdades, não para alimentar disfarces.'
  },
  {
    id: 'm02', number: 2, name: 'A Sacerdotisa', arcana: 'major',
    keywords: ['intuição', 'mistério', 'silêncio', 'sabedoria oculta'],
    uprightMeaning: 'Momento de guardar segredo, ouvir a voz interior e observar sem alardear.',
    reversedMeaning: 'Segredos revelados de forma prejudicial ou isolamento teimoso.',
    spiritualAdvice: 'O silêncio é a chave mais forte de quem governa a própria energia.'
  },
  {
    id: 'm03', number: 3, name: 'A Imperatriz', arcana: 'major',
    keywords: ['abundância', 'fertilidade', 'beleza', 'criação'],
    uprightMeaning: 'Crescimento fértil, realização de projetos, magnetismo e conforto material.',
    reversedMeaning: 'Desperdício, vaidade excessiva ou bloqueio de criatividade.',
    spiritualAdvice: 'A rosa floresce sem pressa. Deixe que seus projetos amadureçam com firmeza.'
  },
  {
    id: 'm04', number: 4, name: 'O Imperador', arcana: 'major',
    keywords: ['estrutura', 'autoridade', 'disciplina', 'estabilidade'],
    uprightMeaning: 'Ordem, regras claras, liderança firme e capacidade de proteger o que foi conquistado.',
    reversedMeaning: 'Rigidez tirânica, teimosia cega ou perda de controle prático.',
    spiritualAdvice: 'Governe seus passos com dignidade; o respeito não se impõe pelo grito, mas pela postura.'
  },
  {
    id: 'm05', number: 5, name: 'O Hierofante', arcana: 'major',
    keywords: ['tradição', 'compromisso', 'orientação espiritual', 'aliança'],
    uprightMeaning: 'Conselhos sábios, respeito aos ensinamentos ancestrais e pactos leais.',
    reversedMeaning: 'Dogmatismo sufocante ou conselhos vindos de falsos mestres.',
    spiritualAdvice: 'Busque a sabedoria que liberta sua alma, não a que aprisiona suas escolhas.'
  },
  {
    id: 'm06', number: 6, name: 'Os Enamorados', arcana: 'major',
    keywords: ['escolha', 'encruzilhada do coração', 'desejo', 'afinidade'],
    uprightMeaning: 'Decisão importante guiada pelos valores da alma; atração profunda e encruzilhada de caminhos.',
    reversedMeaning: 'Dúvida paralisante, conflito interno ou atalhos desleais.',
    spiritualAdvice: 'Escolher um caminho significa deixar outro para trás com maturidade.'
  },
  {
    id: 'm07', number: 7, name: 'O Carro', arcana: 'major',
    keywords: ['avanço', 'vitória', 'domínio', 'direção'],
    uprightMeaning: 'Força de vontade em marcha acelerada; superação de obstáculos através do foco.',
    reversedMeaning: 'Perda de rédeas, agressividade impulsiva ou corrida na direção errada.',
    spiritualAdvice: 'Tenha pressa de acertar o rumo, não apenas de acelerar a marcha.'
  },
  {
    id: 'm08', number: 8, name: 'A Justiça', arcana: 'major',
    keywords: ['verdade', 'equilíbrio', 'causa e efeito', 'acerto de contas'],
    uprightMeaning: 'A verdade prevalece. O que foi plantado será colhido com exatidão implacável.',
    reversedMeaning: 'Injustiça aparente, fuga de responsabilidade ou julgamento precipitado.',
    spiritualAdvice: 'A balança não erra. Mantenha suas mãos limpas e sua palavra reta.'
  },
  {
    id: 'm09', number: 9, name: 'O Eremita', arcana: 'major',
    keywords: ['recolhimento', 'introspecção', 'prudência', 'luz interior'],
    uprightMeaning: 'Pausa necessária para reflexão profunda; recolha sua luz das tempestades externas.',
    reversedMeaning: 'Solidão amarga, isolamento covarde ou recusa a enxergar a realidade.',
    spiritualAdvice: 'Quem não aprende a caminhar consigo mesmo tropeça na companhia dos outros.'
  },
  {
    id: 'm10', number: 10, name: 'A Roda da Fortuna', arcana: 'major',
    keywords: ['ciclos', 'destino', 'virada', 'mudança inevitável'],
    uprightMeaning: 'Virada nos caminhos; o que estava estagnado entra em movimento rápido.',
    reversedMeaning: 'Resistência ao fluxo inevitável ou reviravolta desconfortável.',
    spiritualAdvice: 'Na encruzilhada do destino, quem se apoia na vaidade cai quando a roda gira.'
  },
  {
    id: 'm11', number: 11, name: 'A Força', arcana: 'major',
    keywords: ['magnetismo', 'coragem serena', 'autocontrole', 'domínio sutil'],
    uprightMeaning: 'Conquista através da paciência e da elegância moral, amansando as feras internas.',
    reversedMeaning: 'Brutalidade desnecessária, fraqueza emocional ou perda de paciência.',
    spiritualAdvice: 'A verdadeira força não ruge; ela olha a fera nos olhos e a acalma.'
  },
  {
    id: 'm12', number: 12, name: 'O Enforcado', arcana: 'major',
    keywords: ['pausa', 'sacrifício consciente', 'nova perspectiva', 'renúncia'],
    uprightMeaning: 'Necessidade de parar para enxergar o mundo por outro ângulo; paciência espiritual.',
    reversedMeaning: 'Vitimismo inútil, estagnação forçada ou teimosia em carregar pesos alheios.',
    spiritualAdvice: 'Nem todo silêncio é derrota; às vezes a vida pede que você assista ao teatro sem subir no palco.'
  },
  {
    id: 'm13', number: 13, name: 'A Morte', arcana: 'major',
    keywords: ['corte definitivo', 'transformação profunda', 'renascimento', 'fim de ciclo'],
    uprightMeaning: 'Encerramento de uma fase que já cumpriu seu papel, abrindo solo para o novo brotar.',
    reversedMeaning: 'Apego ao que já secou, medo do luto ou resistência ao recomeço.',
    spiritualAdvice: 'Não regue plantas de plástico. Deixe o passado partir com reverência.'
  },
  {
    id: 'm14', number: 14, name: 'A Temperança', arcana: 'major',
    keywords: ['alquimia', 'cura', 'paciência', 'harmonia dos opostos'],
    uprightMeaning: 'Cura lenta e harmoniosa; mistura sábia de sentimentos e razão para encontrar a paz.',
    reversedMeaning: 'Descompasso, extremismo de temperamento ou pressa prejudicial.',
    spiritualAdvice: 'As águas sagradas encontram seu nível sem violência. Dê tempo ao tempo.'
  },
  {
    id: 'm15', number: 15, name: 'O Diabo', arcana: 'major',
    keywords: ['desejo ardente', 'química', 'apego material', 'prisão das paixões'],
    uprightMeaning: 'Magnetismo irresistível, ambição material intensa, química que arde e acorrenta.',
    reversedMeaning: 'Libertação de vícios emocionais, rompimento de pactos tóxicos ou medo da própria sombra.',
    spiritualAdvice: 'O fogo aquece o inverno, mas queima a mão de quem o aperta sem respeito.'
  },
  {
    id: 'm16', number: 16, name: 'A Torre', arcana: 'major',
    keywords: ['ruptura necessária', 'despertar brusco', 'queda de ilusões', 'libertação'],
    uprightMeaning: 'A tempestade que derruba construções erguidas sobre alicerces falsos; libertação dolorosa.',
    reversedMeaning: 'Atraso em aceitar o óbvio ou ruína evitada no último minuto.',
    spiritualAdvice: 'Quando o castelo de ilusão desaba, o que cai é a mentira; sua alma continua inteira.'
  },
  {
    id: 'm17', number: 17, name: 'A Estrela', arcana: 'major',
    keywords: ['esperança', 'bênção cósmica', 'renovação', 'luz no horizonte'],
    uprightMeaning: 'Proteção espiritual límpida, alívio após o vendaval e fé restabelecida.',
    reversedMeaning: 'Desânimo temporário, pessimismo infundado ou falta de fé.',
    spiritualAdvice: 'Olhe para cima: as noites mais escuras mostram as estrelas mais brilhantes.'
  },
  {
    id: 'm18', number: 18, name: 'A Lua', arcana: 'major',
    keywords: ['névoa', 'ilusão', 'intuição profunda', 'medos ocultos'],
    uprightMeaning: 'Território de sombras e miragens; nem tudo o que parece é real. Confie no sexto sentido.',
    reversedMeaning: 'A névoa começa a dissipar-se, revelando o que estava escondido.',
    spiritualAdvice: 'Não decida no escuro da desconfiança. Deixe a maré baixar para enxergar as pedras.'
  },
  {
    id: 'm19', number: 19, name: 'O Sol', arcana: 'major',
    keywords: ['clareza absoluta', 'vitória', 'alegria', 'prosperidade'],
    uprightMeaning: 'Verdade radiante, sucesso comprovado, calor de vida e caminhos escancarados.',
    reversedMeaning: 'Nuvens passageiras diante do brilho ou arrogância temporária.',
    spiritualAdvice: 'Sua luz não precisa pedir licença para brilhar; apenas permaneça na sua verdade.'
  },
  {
    id: 'm20', number: 20, name: 'O Julgamento', arcana: 'major',
    keywords: ['chamado', 'despertar', 'renascimento', 'acerto com o destino'],
    uprightMeaning: 'Hora da chamada; clareza definitiva para assumir seu verdadeiro lugar no mundo.',
    reversedMeaning: 'Culpa inútil, medo do veredito ou adiamento da própria redenção.',
    spiritualAdvice: 'O sino tocou: levante a cabeça e assuma o comando do seu destino.'
  },
  {
    id: 'm21', number: 21, name: 'O Mundo', arcana: 'major',
    keywords: ['plenitude', 'conclusão de ciclo', 'triunfo', 'realização total'],
    uprightMeaning: 'Vitória consumada; a jornada alcança sua coroa de ouro e fecha o círculo com glória.',
    reversedMeaning: 'Pequenos detalhes pendentes para a vitória final.',
    spiritualAdvice: 'Celebre com gratidão: o reino da sua dignidade foi conquistado.'
  },
];

// Minor Arcana (Selected key Court & Ace/Ten cards for accurate cartomancy breadth)
export const MINOR_CARDS: TarotCard[] = [
  { id: 'c_as', number: 1, name: 'Ás de Copas', arcana: 'minor', suit: 'copas', keywords: ['novo amor', 'abundância afetiva', 'cura emocional'], uprightMeaning: 'Nasce uma nova fonte de afeto, perdão e receptividade.', spiritualAdvice: 'Abra a taça para o afeto verdadeiro.' },
  { id: 'c_02', number: 2, name: 'Dois de Copas', arcana: 'minor', suit: 'copas', keywords: ['união', 'reciprocidade', 'parceria verdadeira'], uprightMeaning: 'Sintonia mútua, química equilibrada e acordo sincero entre duas partes.', spiritualAdvice: 'Cultive a troca justa onde o que você dá é recebido e retribuído.' },
  { id: 'c_10', number: 10, name: 'Dez de Copas', arcana: 'minor', suit: 'copas', keywords: ['plenitude familiar', 'paz no lar', 'harmonia duradoura'], uprightMeaning: 'Alegria compartilhada, segurança afetiva e comunhão de almas.', spiritualAdvice: 'A verdadeira bênção está na paz do coração.' },
  { id: 'o_as', number: 1, name: 'Ás de Ouros', arcana: 'minor', suit: 'ouros', keywords: ['prosperidade', 'semente de riqueza', 'oportunidade material'], uprightMeaning: 'Chega uma proposta concreta de dinheiro, trabalho ou projeto estável.', spiritualAdvice: 'Plante com responsabilidade para colher com fartura.' },
  { id: 'o_10', number: 10, name: 'Dez de Ouros', arcana: 'minor', suit: 'ouros', keywords: ['legado', 'segurança financeira', 'patrimônio'], uprightMeaning: 'Estabilidade sólida construída com trabalho, garantindo futuro tranquilo.', spiritualAdvice: 'Construa alicerces que o vento das incertezas não consiga abalar.' },
  { id: 'e_as', number: 1, name: 'Ás de Espadas', arcana: 'minor', suit: 'espadas', keywords: ['clareza mental', 'corte justo', 'vitória da razão'], uprightMeaning: 'A espada da verdade corta mal-entendidos e impõe a lucidez.', spiritualAdvice: 'A verdade pode arder na hora, mas salva da neblina da mentira.' },
  { id: 'p_as', number: 1, name: 'Ás de Paus', arcana: 'minor', suit: 'paus', keywords: ['chama de ação', 'vitalidade', 'entusiasmo'], uprightMeaning: 'Uma nova fagulha de ânimo, força para lutar e paixão criativa.', spiritualAdvice: 'Assopre a brasa enquanto o fogo pede movimento.' },
];

export const FULL_DECK: TarotCard[] = [...MAJOR_ARCANA, ...MINOR_CARDS];

// Cryptographically secure integer selection [min, max)
function getSecureRandomInt(min: number, max: number): number {
  return crypto.randomInt(min, max);
}

// Fisher-Yates cryptographically secure shuffle
export function secureShuffle<T>(deck: T[]): T[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawTarotCards(
  count: number = 3,
  deck: TarotCard[] = FULL_DECK
): TarotDrawPosition[] {
  if (count > deck.length) {
    throw new Error('A quantidade de cartas solicitada excede o baralho disponível.');
  }

  const shuffled = secureShuffle(deck);
  const selectedCards = shuffled.slice(0, count);

  const defaultPositionLabels = [
    'Passado & Raiz da Situação',
    'Presente & Momento Atual',
    'Tendência Futura & Conselho do Destino',
    'Fator Oculto & Bloqueio',
    'Síntese & Caminho Maior'
  ];

  return selectedCards.map((card, idx) => {
    // 20% natural reversal chance in professional cartomancy
    const isReversed = getSecureRandomInt(0, 100) < 20;
    return {
      position: idx + 1,
      label: defaultPositionLabels[idx] || `Posição ${idx + 1}`,
      card,
      isReversed,
      specificInterpretation: isReversed && card.reversedMeaning
        ? card.reversedMeaning
        : card.uprightMeaning,
    };
  });
}
