import React, { useState } from 'react';
import { 
  PenTool, 
  Sparkles, 
  Copy, 
  Check, 
  Printer, 
  Flower2, 
  Heart,
  RefreshCw
} from 'lucide-react';
import { CARD_TEMPLATES } from '../data/categories';

export const GiftCardGenerator: React.FC = () => {
  const [recipient, setRecipient] = useState('Minha Amiga Querida');
  const [sender, setSender] = useState('Com carinho, Mari');
  const [occasion, setOccasion] = useState('Aniversário');
  const [themeStyle, setThemeStyle] = useState<'sakura' | 'lavender' | 'tulip' | 'daisy'>('lavender');
  const [cardMessage, setCardMessage] = useState(
    'Que o seu dia seja repleto de flores, sorrisos sinceros e toda a doçura que você espalha pelo mundo. Você é uma pessoa muito especial!'
  );
  const [isCopied, setIsCopied] = useState(false);

  const themeStyles = {
    lavender: {
      name: 'Lavanda Imperial',
      bgClass: 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50 border-purple-300 text-purple-950',
      badgeClass: 'bg-purple-200 text-purple-900',
      stamp: '🌸 Carinho & Afeto'
    },
    sakura: {
      name: 'Sakura Rosé',
      bgClass: 'bg-gradient-to-br from-pink-50 via-rose-100/50 to-purple-50 border-pink-300 text-pink-950',
      badgeClass: 'bg-pink-200 text-pink-900',
      stamp: '💮 Sakura Sweet'
    },
    tulip: {
      name: 'Tulipas Douradas',
      bgClass: 'bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50 border-amber-300 text-slate-800',
      badgeClass: 'bg-amber-100 text-amber-900',
      stamp: '🌷 Jardim Botânico'
    },
    daisy: {
      name: 'Margaridinhas Lilás',
      bgClass: 'bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 border-purple-200 text-slate-900',
      badgeClass: 'bg-purple-100 text-purple-800',
      stamp: '🌼 Feito com Amor'
    }
  };

  const handleQuickTemplate = (tplText: string) => {
    setCardMessage(tplText);
  };

  const handleCopy = () => {
    const fullText = `💌 Para: ${recipient}\n\n"${cardMessage}"\n\n🌸 De: ${sender} (Presente Especial)`;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-white via-purple-50/40 to-pink-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider">
            <PenTool className="w-3.5 h-3.5 text-pink-500" />
            <span>Dedicatórias & Cartões</span>
          </div>
          <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-bold text-purple-950">
            Gerador de Dedicatórias Encantadoras
          </h2>
          <p className="font-['Quicksand'] text-sm sm:text-base text-slate-600 font-medium">
            Crie cartões personalizados e mensagens afetuosas para acompanhar seus presentes ou enviar para alguém querido.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Controls column */}
          <div className="lg:col-span-6 bg-white p-5 sm:p-7 rounded-3xl border border-purple-100 shadow-sm space-y-4">
            
            {/* Occasion & Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-purple-900 block mb-1">Ocasião:</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-3 py-2 bg-purple-50/60 border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  <option value="Aniversário">Aniversário 🎂</option>
                  <option value="Amizade">Amizade Doce 🌸</option>
                  <option value="Agradecimento">Agradecimento Especial 🌷</option>
                  <option value="Amor">Amor & Afeto 💖</option>
                  <option value="Sucesso">Novos Projetos & Estudos ✍️</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-900 block mb-1">Moldura Floral:</label>
                <div className="flex gap-1.5">
                  {(['lavender', 'sakura', 'tulip', 'daisy'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setThemeStyle(t)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        themeStyle === t
                          ? 'border-pink-500 bg-pink-100 text-pink-900 shadow-2xs'
                          : 'border-purple-100 bg-purple-50/50 text-slate-600'
                      }`}
                    >
                      {t === 'lavender' ? 'Lilás' : t === 'sakura' ? 'Rosa' : t === 'tulip' ? 'Tulipa' : 'Floral'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-purple-900 block mb-1">Nome de quem recebe:</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Digite o nome de quem vai receber aqui"
                  className="w-full px-3 py-2 bg-purple-50/60 border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-900 block mb-1">Sua assinatura:</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="Digite o seu nome aqui"
                  className="w-full px-3 py-2 bg-purple-50/60 border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
            </div>

            {/* Templates Quick selector */}
            <div>
              <label className="text-xs font-bold text-purple-900 block mb-1.5">
                Inspirações Prontas:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CARD_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickTemplate(tpl.text)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 hover:bg-pink-100 text-purple-800 border border-purple-100 transition-colors"
                  >
                    {tpl.theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div>
              <label className="text-xs font-bold text-purple-900 block mb-1">
                Texto do Cartão:
              </label>
              <textarea
                rows={4}
                value={cardMessage}
                onChange={(e) => setCardMessage(e.target.value)}
                placeholder="Escreva a mensagem especial do cartão aqui"
                className="w-full p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400 font-['Quicksand'] font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                id="btn-copy-card-message"
                onClick={handleCopy}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copiado para Área de Transferência!' : 'Copiar Mensagem'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold text-xs flex items-center gap-1.5 border border-purple-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Cartão</span>
              </button>
            </div>

          </div>

          {/* Right Preview Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md">
              
              {/* Floral Decorative Card Frame */}
              <div className={`p-6 sm:p-8 rounded-3xl border-4 shadow-xl relative overflow-hidden transition-all duration-500 ${themeStyles[themeStyle].bgClass}`}>
                
                {/* Decorative Floral Badges */}
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-3 mb-4">
                  <span className={`text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${themeStyles[themeStyle].badgeClass}`}>
                    {themeStyles[themeStyle].stamp}
                  </span>
                  <div className="flex items-center gap-1 text-pink-500">
                    <Flower2 className="w-4 h-4 fill-pink-300" />
                    <Flower2 className="w-3.5 h-3.5 fill-purple-300" />
                  </div>
                </div>

                {/* Recipient */}
                <div className="mb-4">
                  <span className="text-[11px] uppercase tracking-wider text-purple-700/80 font-bold block">
                    Querida(o),
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-purple-950 italic">
                    {recipient || 'Alguém especial'}
                  </h3>
                </div>

                {/* Main Card Body */}
                <div className="my-6 min-h-[100px] flex items-center">
                  <p className="font-['Playfair_Display'] text-sm sm:text-base leading-relaxed text-slate-800 italic">
                    "{cardMessage}"
                  </p>
                </div>

                {/* Sender Signature */}
                <div className="border-t border-purple-200/60 pt-4 flex items-end justify-between">
                  <div>
                    <span className="text-[8px] uppercase text-purple-700/80 font-semibold block">
                      Com todo carinho,
                    </span>
                    <p className="font-['Playfair_Display'] text-base sm:text-lg font-bold text-pink-600">
                      {sender || 'Sua Loja'}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-pink-400 flex flex-col items-center justify-center rotate-12 text-[6.5px] text-pink-600 font-extrabold uppercase text-center p-1 bg-white/70 shadow-xs">
                    <span>MIMO</span>
                    <span>100% AMOR</span>
                  </div>
                </div>

              </div>

              <p className="text-center text-xs text-slate-500 mt-3 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Este cartão acompanha sua caixa de presentes impresso em papel de alta gramatura.</span>
              </p>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
