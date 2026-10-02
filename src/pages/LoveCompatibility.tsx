import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { motion } from 'motion/react';
import { Heart, Coins, Calendar, User, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export const LoveCompatibility: React.FC = () => {
  const { user, apiFetch, setUserCredits, addHistoryItem } = useApp();
  
  const [name1, setName1] = useState('');
  const [date1, setDate1] = useState('');
  const [name2, setName2] = useState('');
  const [date2, setDate2] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Results
  const [scores, setScores] = useState<{ emotional: number; spiritual: number; affective: number } | null>(null);
  const [readingResult, setReadingResult] = useState<string | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg('');

    if (user.credits < 2) {
      setErrorMsg('Créditos insuficientes! Esta análise de compatibilidade premium consome 2 créditos.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/reading', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tarot',
          userData: {
            fullName: name1,
            birthDate: date1
          },
          specificName: name2,
          specificDate: date2,
          question: `Sinastria e Compatibilidade Amorosa entre ${name1} e ${name2}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na consulta espiritual.');

      if (typeof data.newCreditsBalance === 'number') {
        setUserCredits(data.newCreditsBalance);
      }

      const title = `Compatibilidade: ${name1} & ${name2}`;
      addHistoryItem({
        id: `compat_${Date.now()}`,
        userId: user.uid,
        type: 'compatibility',
        title,
        date: new Date().toISOString(),
        content: data.reading,
        creditsUsed: 1,
      });

      // Generate deterministic lovely scores based on names
      let h1 = 0, h2 = 0;
      for (let i = 0; i < name1.length; i++) h1 += name1.charCodeAt(i);
      for (let i = 0; i < name2.length; i++) h2 += name2.charCodeAt(i);
      
      const sum = h1 + h2;
      const emotional = 70 + (sum % 26);
      const spiritual = 65 + ((sum * 7) % 31);
      const affective = 75 + ((sum * 3) % 21);

      setScores({ emotional, spiritual, affective });
      setReadingResult(data.reading);

    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar sinastria amorosa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setScores(null);
    setReadingResult(null);
    setName1('');
    setDate1('');
    setName2('');
    setDate2('');
    setErrorMsg('');
  };

  return (
    <div id="mp_compatibility_page" className="mx-auto max-w-4xl px-4 py-8 text-white">
      {/* Title */}
      <div className="mb-8 text-center">
        <Heart className="mx-auto w-10 h-10 text-red-500 mb-2 animate-pulse" />
        <h2 className="font-serif text-2xl md:text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-white to-[#D4AF37]">
          Compatibilidade Amorosa Premium
        </h2>
        <p className="text-xs md:text-sm text-gray-300 max-w-xl mx-auto mt-2">
          Consulte as cartas e os astros para revelar a sinastria energética, os desafios cármicos e o potencial futuro entre você e seu amor.
        </p>
      </div>

      {readingResult && scores ? (
        /* RESULT VIEW */
        <motion.div
          id="compatibility_results_card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#D4AF37]/30 bg-black/80 p-6 md:p-8 backdrop-blur-sm shadow-[0_0_30px_rgba(139,0,0,0.25)]"
        >
          <div className="text-center border-b border-gray-900 pb-4 mb-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border border-red-500/50 shadow-[0_0_15px_rgba(139,0,0,0.4)] mb-3">
              <video
                src="https://portalvipbrasil.com.br/wp-content/uploads/2026/06/Maria-Padilha-Rainha-Das-7-Encruzilhadas-Portas-Das-Pombo-giras.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-serif text-lg md:text-xl font-bold text-white mt-1">
              Sinastria: {name1} & {name2}
            </h3>
            <span className="text-[10px] font-mono text-[#D4AF37] uppercase">Análise de Vibração e Destino Amoroso</span>
          </div>

          {/* Scores Meter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg bg-red-950/10 border border-gray-950 p-4 text-center">
              <span className="text-gray-400 block text-[10px] uppercase font-mono">Compatibilidade Emocional</span>
              <span className="text-white text-3xl font-extrabold block mt-2">{scores.emotional}%</span>
              <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden mt-2 border border-gray-950">
                <div className="bg-red-600 h-full rounded-full" style={{ width: `${scores.emotional}%` }} />
              </div>
            </div>

            <div className="rounded-lg bg-red-950/10 border border-gray-950 p-4 text-center">
              <span className="text-gray-400 block text-[10px] uppercase font-mono">Compatibilidade Espiritual</span>
              <span className="text-white text-3xl font-extrabold block mt-2">{scores.spiritual}%</span>
              <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden mt-2 border border-gray-950">
                <div className="bg-[#D4AF37] h-full rounded-full" style={{ width: `${scores.spiritual}%` }} />
              </div>
            </div>

            <div className="rounded-lg bg-red-950/10 border border-gray-950 p-4 text-center">
              <span className="text-gray-400 block text-[10px] uppercase font-mono">Compatibilidade Afetiva</span>
              <span className="text-white text-3xl font-extrabold block mt-2">{scores.affective}%</span>
              <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden mt-2 border border-gray-950">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${scores.affective}%` }} />
              </div>
            </div>
          </div>

          {/* Channeled Text */}
          <div className="prose prose-invert max-w-none text-xs md:text-sm text-gray-200 leading-relaxed space-y-4">
            <div className="border border-red-950/40 rounded-xl bg-red-950/5 p-4 md:p-6">
              <h4 className="font-serif text-[#D4AF37] text-base font-bold mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-red-500" />
                Doutrina dos Caminhos de Maria Padilha para o Casal
              </h4>
              <div dangerouslySetInnerHTML={{ __html: readingResult }} />
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              id="btn_reset_compatibility"
              onClick={handleReset}
              className="px-6 py-2 rounded bg-gradient-to-r from-red-800 to-red-650 hover:from-red-700 hover:to-red-600 text-xs font-bold uppercase tracking-wider text-white border border-[#D4AF37]/30 transition-all cursor-pointer"
            >
              Fazer Nova Análise
            </button>
          </div>
        </motion.div>
      ) : (
        /* INPUT FORM */
        <form onSubmit={handleCalculate} className="mx-auto max-w-xl rounded-xl border border-gray-800 bg-black/75 p-6 md:p-8 backdrop-blur-sm shadow-md">
          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-950/40 p-3 text-xs text-red-300 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.4)] mb-4">
                <video
                  src="https://portalvipbrasil.com.br/wp-content/uploads/2026/06/Maria-Padilha-Rainha-Das-7-Encruzilhadas-Portas-Das-Pombo-giras.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2 justify-center">
                <RefreshCw className="w-4 h-4 text-[#D4AF37] animate-spin" /> Alinhando Destinos de Amor...
              </h3>
              <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto leading-normal px-4">
                Analisando numerologia dos nomes, astros e cartas sob a irradiação da Rainha das 7 Encruzilhadas.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Persona 1 */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] block border-b border-gray-900 pb-1">Seus Dados</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-300 mb-1">Seu Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                      <input
                        id="comp_name1"
                        type="text"
                        placeholder="Seu nome"
                        value={name1}
                        onChange={(e) => setName1(e.target.value)}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 pl-8 pr-3 py-1.5 text-xs text-white focus:border-red-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-300 mb-1">Sua Data de Nascimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                      <input
                        id="comp_date1"
                        type="date"
                        value={date1}
                        onChange={(e) => setDate1(e.target.value)}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 pl-8 pr-3 py-1.5 text-xs text-white focus:border-red-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Persona 2 */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] block border-b border-gray-900 pb-1">Dados de seu Amor</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-300 mb-1">Nome Completo do Parceiro(a)</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                      <input
                        id="comp_name2"
                        type="text"
                        placeholder="Nome do parceiro(a)"
                        value={name2}
                        onChange={(e) => setName2(e.target.value)}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 pl-8 pr-3 py-1.5 text-xs text-white focus:border-red-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-gray-300 mb-1">Data de Nascimento do Parceiro(a)</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                      <input
                        id="comp_date2"
                        type="date"
                        value={date2}
                        onChange={(e) => setDate2(e.target.value)}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 pl-8 pr-3 py-1.5 text-xs text-white focus:border-red-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculate Action */}
              <div className="pt-4 border-t border-gray-900 flex flex-col items-center gap-3">
                <button
                  id="btn_calculate_sinastria"
                  type="submit"
                  className="w-full py-2.5 rounded bg-gradient-to-r from-red-800 to-red-650 hover:from-red-700 hover:to-red-600 text-xs font-bold uppercase tracking-wider text-white border border-[#D4AF37]/40 shadow-md cursor-pointer transition-all"
                >
                  Calcular Compatibilidade Amorosa (2 Créditos)
                </button>
                <div className="flex items-center gap-1.5 text-[10.5px] text-[#D4AF37] font-mono">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Esta análise consome 2 créditos do seu saldo.</span>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
