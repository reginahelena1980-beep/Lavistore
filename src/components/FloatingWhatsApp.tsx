import React, { useState } from 'react';
import { MessageCircle, X, Send, Shield, Gamepad2, Sparkles } from 'lucide-react';
import { HomePageConfig } from '../types';
import { playClickSound } from '../utils/soundSystem';

interface FloatingWhatsAppProps {
  config?: HomePageConfig;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const cleanNumber = (config?.whatsappNumber || '5511987654321').replace(/\D/g, '');

  const handleToggle = () => {
    playClickSound();
    setIsOpen(!isOpen);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      setSentSuccess(true);
      const encodedMsg = encodeURIComponent(chatMessage);
      const waUrl = `https://wa.me/${cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`}?text=${encodedMsg}`;
      
      setTimeout(() => {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        setSentSuccess(false);
        setChatMessage('');
        setIsOpen(false);
      }, 1200);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Popover Window */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-88 bg-[#09101F] rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.35)] border border-cyan-500/40 overflow-hidden animate-in fade-in slide-in-from-bottom-5 text-slate-100 font-['Cinzel',serif]">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-950 via-[#0B172E] to-blue-950 p-4 text-white flex items-center justify-between border-b border-cyan-500/30">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#09101F] rounded-full animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-cyan-300">
                  {config?.whatsappChatTitle || 'Suporte Gamer Oficial 🎮'}
                </h4>
                <p className="text-[9px] text-slate-400 tracking-wider">
                  {config?.whatsappChatSubtitle || 'Guardião Online • Dúvidas & Relíquias'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-[#050A15] min-h-[140px] flex flex-col justify-end text-xs font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="bg-[#0C1529] p-3.5 rounded-2xl rounded-bl-xs border border-cyan-500/30 shadow-xs space-y-1.5 self-start max-w-[90%]">
              <p className="font-bold text-cyan-300 flex items-center gap-1">
                <span>{config?.whatsappWelcomeGreeting || 'Saudações, Aventureiro! ⚔️'}</span>
              </p>
              <p className="text-slate-300 text-xs leading-relaxed">
                {config?.whatsappWelcomeMessage || 'Precisa de suporte sobre drops da semana, disponibilidade de tamanhos, rastreio de pedidos ou personalização de kits? Estou à disposição!'}
              </p>
              <span className="text-[8px] text-cyan-500/80 block text-right font-mono">Guardião Online</span>
            </div>

            {sentSuccess && (
              <div className="bg-cyan-950 text-cyan-300 border border-cyan-500/60 p-2.5 rounded-2xl text-[11px] font-bold text-center animate-in fade-in">
                Iniciando chat seguro no WhatsApp Oficial... ⚡
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#080E1C] border-t border-cyan-500/20 flex gap-2 font-['Plus_Jakarta_Sans',sans-serif]">
            <input
              type="text"
              required
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Digite sua dúvida ou pedido..."
              className="flex-1 px-3.5 py-2 bg-[#050914] border border-cyan-500/40 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
            <button
              type="submit"
              className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-transform active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button: ✨ SUPORTE GAMER 🎮 */}
      <button
        id="btn-floating-whatsapp"
        onClick={handleToggle}
        className="group flex items-center gap-2 bg-[#070D1A] hover:bg-[#0B152A] text-cyan-300 hover:text-cyan-200 border-2 border-cyan-400/60 hover:border-cyan-300 px-4 py-3 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer select-none font-['Cinzel',serif]"
        title="Abrir Suporte Gamer Oficial"
      >
        <span className="text-cyan-400 text-xs">✨</span>
        <span className="text-xs font-black tracking-widest uppercase">
          SUPORTE GAMER
        </span>
        <span className="text-sm leading-none">🎮</span>
        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-ping ml-0.5" />
      </button>
    </div>
  );
};
