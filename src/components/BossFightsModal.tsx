import React, { useState } from 'react';
import { 
  X, 
  Swords, 
  ShieldAlert, 
  Sparkles, 
  Trophy, 
  Copy, 
  Check, 
  Dice6, 
  Flame, 
  Zap, 
  Gift, 
  Skull,
  Award
} from 'lucide-react';
import { Coupon } from '../types';
import { playLootSound, playClickSound } from '../utils/soundSystem';

interface BossFightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupons: Coupon[];
  onApplyCouponToCart?: (couponCode: string) => void;
}

export const BossFightsModal: React.FC<BossFightsModalProps> = ({
  isOpen,
  onClose,
  coupons,
  onApplyCouponToCart
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [bossHp, setBossHp] = useState(100);
  const [attackFeedback, setAttackFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    playLootSound();
    if (onApplyCouponToCart) {
      onApplyCouponToCart(code);
    }
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleAttackBoss = () => {
    playClickSound();
    setDiceRolling(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 20) + 1; // D20 roll
      setDiceResult(roll);
      setDiceRolling(false);

      if (roll >= 15) {
        // Critical strike!
        const damage = 35;
        setBossHp(prev => Math.max(0, prev - damage));
        setAttackFeedback(`💥 CRÍTICO D20 [${roll}]! Você causou ${damage} de dano ao Guardião!`);
        playLootSound();
      } else if (roll >= 8) {
        const damage = 20;
        setBossHp(prev => Math.max(0, prev - damage));
        setAttackFeedback(`⚔️ GOLPE CERTEIRO D20 [${roll}]! Dano: ${damage} HP!`);
      } else {
        setAttackFeedback(`🛡️ DEFENDIDO D20 [${roll}]! O Guardião bloqueou parte do golpe!`);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#080D1A] border-2 border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Boss Banner */}
        <div className="relative bg-gradient-to-r from-cyan-950 via-[#0C1A30] to-purple-950 p-6 border-b border-cyan-500/30">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                  EVENTO BOSS FIGHT
                </span>
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-amber-400" /> DROP DA SEMANA
                </span>
              </div>
              <h3 className="font-['Cinzel_Decorative',serif] text-xl sm:text-2xl font-bold text-white mt-1">
                Guardião da Porta dos Segredos
              </h3>
            </div>
          </div>

          {/* Boss HP Bar */}
          <div className="mt-4 bg-[#050A14] p-3 rounded-2xl border border-cyan-500/20">
            <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
              <span className="text-cyan-300 flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" /> HP do Guardião
              </span>
              <span className={bossHp === 0 ? "text-emerald-400" : "text-cyan-400"}>
                {bossHp > 0 ? `${bossHp} / 100 HP` : 'DERROTADO! 🏆'}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-cyan-500/30">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  bossHp > 50 
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                    : bossHp > 0 
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${bossHp}%` }}
              />
            </div>
            
            {/* Interactive Attack action */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={handleAttackBoss}
                disabled={diceRolling || bossHp === 0}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#050A14] font-black text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Dice6 className={`w-4 h-4 ${diceRolling ? 'animate-spin' : ''}`} />
                <span>{bossHp === 0 ? 'Guardião Derrotado!' : 'Rolar D20 de Ataque'}</span>
              </button>

              {attackFeedback && (
                <span className="text-xs font-semibold text-cyan-200 animate-in fade-in">
                  {attackFeedback}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Loot Drops / Coupons List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-['Cinzel',serif] text-sm uppercase tracking-wider text-slate-200 flex items-center gap-2 font-bold">
              <Gift className="w-4 h-4 text-cyan-400" />
              Loot Drops & Cupons Ativos da Loja
            </h4>
            <span className="text-xs text-slate-400">Clique para copiar e aplicar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Frete Grátis Card */}
            <div className="p-4 rounded-2xl bg-[#0C1527] border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between gap-3 group transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
                    FRETE GRÁTIS
                  </span>
                  <span className="text-xs text-slate-400">Todo o Brasil</span>
                </div>
                <h5 className="font-['Cinzel',serif] font-bold text-white text-base mt-2">
                  FRETEGRATIS
                </h5>
                <p className="text-xs text-slate-400 mt-1">
                  Zera o frete da transportadora em qualquer pedido.
                </p>
              </div>

              <button
                onClick={() => handleCopy('FRETEGRATIS')}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedCode === 'FRETEGRATIS' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copiado & Aplicado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Cupom</span>
                  </>
                )}
              </button>
            </div>

            {/* Coupons from system */}
            {coupons.filter(c => c.isActive && c.code !== 'FRETEGRATIS').map(coupon => (
              <div 
                key={coupon.id}
                className="p-4 rounded-2xl bg-[#0C1527] border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between gap-3 group transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                      {coupon.type === 'percentage' 
                        ? `${coupon.discountValue}% OFF` 
                        : coupon.type === 'fixed' 
                          ? `R$ ${coupon.discountValue} OFF` 
                          : 'BRINDE'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {coupon.minOrderValue ? `Mín: R$ ${coupon.minOrderValue}` : 'Sem mínimo'}
                    </span>
                  </div>
                  <h5 className="font-['Cinzel',serif] font-bold text-white text-base mt-2">
                    {coupon.code}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {coupon.description}
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(coupon.code)}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedCode === coupon.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copiado & Aplicado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Cupom</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#050A14] border-t border-cyan-500/20 text-center text-xs text-slate-400">
          <p className="font-medium">
            💡 Dica: Cole o código copiado na finalização de compra ou sacola para desbloquear seu bônus!
          </p>
        </div>
      </div>
    </div>
  );
};
