import React, { useState } from 'react';
import { MessageCircle, X, Send, Flower2 } from 'lucide-react';
import { HomePageConfig } from '../types';

interface FloatingWhatsAppProps {
  config?: HomePageConfig;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const cleanNumber = (config?.whatsappNumber || '5511987654321').replace(/\D/g, '');

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
        <div className="mb-3 w-80 sm:w-88 bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 text-slate-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
                  <Flower2 className="w-6 h-6 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-purple-600 rounded-full" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{config?.whatsappChatTitle || 'Concierge Lavistore 🌸'}</h4>
                <p className="text-[8px] text-pink-100">{config?.whatsappChatSubtitle || 'Atendimento Online • Suporte a Presentes'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-[#FAF7FD] min-h-[140px] flex flex-col justify-end text-xs">
            <div className="bg-white p-3 rounded-2xl rounded-bl-xs border border-purple-100 shadow-2xs space-y-1 self-start max-w-[85%]">
              <p className="font-semibold text-purple-950">
                {config?.whatsappWelcomeGreeting || 'Olá, bem-vinda à Lavistore! 🌷'}
              </p>
              <p className="text-slate-600">
                {config?.whatsappWelcomeMessage || 'Posso ajudar você a escolher um mimo perfeito, tirar dúvidas sobre o frete ou montar uma caixa personalizada?'}
              </p>
              <span className="text-[7px] text-slate-400 block text-right">Agora mesmo</span>
            </div>

            {sentSuccess && (
              <div className="bg-emerald-100 text-emerald-950 border border-emerald-300 p-2.5 rounded-2xl text-[11px] font-semibold text-center animate-in fade-in">
                Abrindo conversa oficial no WhatsApp... 🎀
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-purple-100 flex gap-2">
            <input
              type="text"
              required
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Digite sua dúvida ou pedido..."
              className="flex-1 px-3 py-2 bg-purple-50/70 border border-purple-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit"
              className="p-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        id="btn-floating-whatsapp"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-3 rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
        title="Falar no WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-white" />
        <span className="text-xs font-bold hidden sm:inline">
          {config?.whatsappButtonLabel || 'Dúvidas? Fale Conosco'}
        </span>
        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
      </button>
    </div>
  );
};
