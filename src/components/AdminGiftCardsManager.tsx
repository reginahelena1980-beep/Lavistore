import React, { useState, useEffect, useMemo } from 'react';
import { 
  PenTool, 
  Sparkles, 
  Printer, 
  Copy, 
  Check, 
  Search, 
  ShoppingBag, 
  Heart, 
  Flower2, 
  Gift, 
  ExternalLink,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  MessageCircle
} from 'lucide-react';
import { OrderData } from '../types';
import { fetchOrders as fetchOrdersFromApi } from '../services/storeApiService';
import { extractDedicationFromOrder, openDedicationPrintWindow, OrderDedicationInfo } from '../utils/dedicationHelper';
import { CARD_TEMPLATES } from '../data/categories';

interface AdminGiftCardsManagerProps {
  onSelectOrder?: (orderId: string) => void;
}

export const AdminGiftCardsManager: React.FC<AdminGiftCardsManagerProps> = ({ onSelectOrder }) => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados para criação de cartão avulso sob demanda
  const [activeTab, setActiveTab] = useState<'order-cards' | 'custom-generator'>('order-cards');
  const [customRecipient, setCustomRecipient] = useState('');
  const [customSender, setCustomSender] = useState('');
  const [customMessage, setCustomMessage] = useState(CARD_TEMPLATES[0].text);
  const [customTheme, setCustomTheme] = useState<'Sakura Rosé' | 'Lavanda Imperial' | 'Tulipas Douradas' | 'Margaridinhas Lilás'>('Sakura Rosé');
  const [customRibbon, setCustomRibbon] = useState('Cetim Rosa');

  const loadOrders = async () => {
    setIsLoading(true);
    let list: OrderData[] = [];
    try {
      list = await fetchOrdersFromApi();
    } catch {
      // fallback
    }

    try {
      const saved = localStorage.getItem('lavistore_orders');
      if (saved) {
        const local = JSON.parse(saved);
        if (Array.isArray(local)) {
          const map = new Map<string, OrderData>();
          local.forEach(o => map.set(o.orderId, o));
          list.forEach(o => map.set(o.orderId, { ...(map.get(o.orderId) || {}), ...o }));
          list = Array.from(map.values());
        }
      }
    } catch {}

    setOrders(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Extrai todas as dedicatórias dos pedidos cadastrados
  const orderDedications = useMemo(() => {
    const dedications: OrderDedicationInfo[] = [];
    orders.forEach(order => {
      const ded = extractDedicationFromOrder(order);
      if (ded) {
        dedications.push(ded);
      }
    });
    return dedications;
  }, [orders]);

  // Filtra por termo de busca
  const filteredDedications = useMemo(() => {
    if (!searchTerm.trim()) return orderDedications;
    const q = searchTerm.toLowerCase();
    return orderDedications.filter(d => 
      d.orderId.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.recipient.toLowerCase().includes(q) ||
      d.sender.toLowerCase().includes(q) ||
      d.message.toLowerCase().includes(q)
    );
  }, [orderDedications, searchTerm]);

  const handleCopyText = (ded: OrderDedicationInfo) => {
    const text = `💌 CARTÃO DE DEDICATÓRIA (Pedido #${ded.orderId})\n` +
      `Para: ${ded.recipient}\n` +
      `"${ded.message}"\n` +
      `De: ${ded.sender}\n` +
      (ded.ribbon ? `Fita: ${ded.ribbon}\n` : '') +
      `🌸 Lavistore Kids`;
    navigator.clipboard.writeText(text);
    setCopiedId(ded.orderId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrintCustomCard = () => {
    const ded: OrderDedicationInfo = {
      orderId: 'AVULSO',
      customerName: customSender || 'Cliente Especial',
      recipient: customRecipient || 'Pessoa Amada',
      sender: customSender || 'Com todo carinho',
      message: customMessage || 'Um mimo especial para você!',
      theme: customTheme,
      ribbon: customRibbon
    };
    openDedicationPrintWindow(ded);
  };

  return (
    <div className="space-y-6 font-['Comfortaa']">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-pink-100">
              <PenTool className="w-3.5 h-3.5" />
              <span>Expedição Afetuosa Lavistore</span>
            </div>
            <h2 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-white">
              Cartões de Dedicatórias & Presentes 💌
            </h2>
            <p className="text-xs sm:text-sm text-pink-100 max-w-xl">
              Aqui você visualiza todas as dedicatórias escritas pelos clientes nos pedidos e imprime cartõezinhos perfeitos (tamanho 10x15cm) para borrifar cheirinho e colocar dentro dos pacotes!
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('order-cards')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                activeTab === 'order-cards'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              Dedicatórias dos Pedidos ({orderDedications.length})
            </button>
            <button
              onClick={() => setActiveTab('custom-generator')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                activeTab === 'custom-generator'
                  ? 'bg-amber-300 text-purple-950 font-bold shadow-md'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Imprimir Cartão Avulso</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Dedicatórias dos Pedidos */}
      {activeTab === 'order-cards' && (
        <div className="space-y-4">
          
          {/* Top Bar with Search */}
          <div className="bg-white/95 rounded-2xl p-4 border-2 border-purple-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por destinatário, mensagem ou pedido..."
                className="w-full pl-9 pr-4 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-xs text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-900 font-bold bg-pink-100 px-3 py-1.5 rounded-xl border border-pink-200">
                💌 {filteredDedications.length} {filteredDedications.length === 1 ? 'cartão pronto para impressão' : 'cartões prontos para impressão'}
              </span>
              <button
                onClick={loadOrders}
                disabled={isLoading}
                className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl transition-all cursor-pointer"
                title="Recarregar Pedidos"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredDedications.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border-2 border-purple-200 space-y-3">
              <div className="w-14 h-14 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                <PenTool className="w-7 h-7" />
              </div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Nenhum cartãozinho de dedicatória encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Quando os clientes montarem uma Sacolinha Amarela ou escreverem mensagens para presentes, os cartões aparecerão listados aqui com formatação especial para impressão.
              </p>
              <button
                onClick={() => setActiveTab('custom-generator')}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:from-pink-600 hover:to-rose-600"
              >
                Escrever e Imprimir um Cartão Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDedications.map((ded) => (
                <div 
                  key={ded.orderId}
                  className="bg-white rounded-3xl border-2 border-pink-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Bar with Order ID & Actions */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 border-b border-pink-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-['Mali'] font-bold text-sm text-purple-950 bg-white px-2.5 py-1 rounded-xl border border-purple-200 shadow-2xs">
                        #{ded.orderId}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Comprador: <strong>{ded.customerName}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyText(ded)}
                        className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copiar texto do cartão"
                      >
                        {copiedId === ded.orderId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-purple-600" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      {onSelectOrder && (
                        <button
                          type="button"
                          onClick={() => onSelectOrder(ded.orderId)}
                          className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Abrir detalhes completos deste pedido"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Ver Pedido</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Gift Card Preview */}
                  <div className="p-5 space-y-4 flex-1">
                    
                    {/* The Styled Greeting Card Preview Box */}
                    <div className="bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-purple-50/70 border-2 border-dashed border-pink-300 rounded-2xl p-4 relative shadow-2xs">
                      
                      {/* Floral badges */}
                      <span className="absolute top-2 left-2 text-xs">🌸</span>
                      <span className="absolute top-2 right-2 text-xs">🌸</span>
                      
                      <div className="text-center pb-2 border-b border-pink-200/60">
                        <span className="text-[10px] font-bold text-pink-700 uppercase tracking-widest">
                          Cartão de Dedicatória Especial
                        </span>
                      </div>

                      {/* Para & De */}
                      <div className="pt-2 flex justify-between items-baseline text-xs font-bold text-purple-950">
                        <div>
                          <span className="text-pink-600">Para: </span>
                          <span className="font-['Caveat'] text-lg font-bold text-slate-900">{ded.recipient}</span>
                        </div>
                        <div>
                          <span className="text-pink-600">De: </span>
                          <span className="font-['Caveat'] text-lg font-bold text-slate-900">{ded.sender}</span>
                        </div>
                      </div>

                      {/* Dedication Text */}
                      <div className="py-3 px-2 my-2 bg-white/70 rounded-xl border border-pink-100">
                        <p className="font-['Playfair_Display'] italic text-xs sm:text-sm text-slate-800 leading-relaxed text-center">
                          "{ded.message}"
                        </p>
                      </div>

                      {/* Ribbon / Bag Info */}
                      {(ded.ribbon || ded.bag) && (
                        <div className="text-[11px] text-pink-900 font-semibold flex items-center justify-between pt-1 border-t border-pink-200/60">
                          <span>🎀 Fita: <strong>{ded.ribbon || 'Cetim Lavistore'}</strong></span>
                          <span>🛍️ {ded.bag || 'Sacolinha Amarela'}</span>
                        </div>
                      )}
                    </div>

                    {/* Observações adicionais do cliente se houver */}
                    {ded.notes && ded.notes !== ded.message && (
                      <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-950">
                        <strong className="text-amber-900 block mb-0.5">Observação do cliente:</strong>
                        <span>{ded.notes}</span>
                      </div>
                    )}

                  </div>

                  {/* Card Print Action Button */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Tamanho pronto para corte: 10x15cm
                    </span>

                    <button
                      type="button"
                      onClick={() => openDedicationPrintWindow(ded)}
                      className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4 text-white" />
                      <span>Imprimir Cartão de Dedicatória</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: Criador & Impressor de Cartão Avulso */}
      {activeTab === 'custom-generator' && (
        <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-pink-100 pb-3">
            <div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Criar e Imprimir Cartão de Dedicatória Avulso
              </h3>
              <p className="text-xs text-slate-500">
                Precisa imprimir um cartãozinho rápido para uma cliente ou embalagem especial de balcão? Preencha os campos abaixo e clique em Imprimir!
              </p>
            </div>
            <button
              onClick={() => setActiveTab('order-cards')}
              className="text-xs text-pink-700 font-bold hover:underline cursor-pointer"
            >
              ← Voltar para Dedicatórias dos Pedidos
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Form Controls */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Sugestões Rápidas */}
              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1.5">
                  Sugestões Prontas de Mensagem:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CARD_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomMessage(tpl.text)}
                      className="text-xs px-2.5 py-1 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 font-medium cursor-pointer transition-colors"
                    >
                      {tpl.theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">
                    Para (Nome de quem vai receber):
                  </label>
                  <input
                    type="text"
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    placeholder="Ex: Beatriz / Minha Amiga"
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">
                    De (Nome de quem envia):
                  </label>
                  <input
                    type="text"
                    value={customSender}
                    onChange={(e) => setCustomSender(e.target.value)}
                    placeholder="Ex: Com amor, Mariana"
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">
                  Mensagem do Cartão:
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 bg-pink-50/50 border border-pink-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed font-['Comfortaa']"
                  placeholder="Escreva a mensagem personalizada com muito carinho..."
                />
              </div>

              {/* Theme & Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Estilo Floral:</label>
                  <select
                    value={customTheme}
                    onChange={(e: any) => setCustomTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                  >
                    <option value="Sakura Rosé">🌸 Sakura Rosé</option>
                    <option value="Lavanda Imperial">💜 Lavanda Imperial</option>
                    <option value="Tulipas Douradas">🌷 Tulipas Douradas</option>
                    <option value="Margaridinhas Lilás">🌼 Margaridinhas Lilás</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Fita / Embalagem:</label>
                  <input
                    type="text"
                    value={customRibbon}
                    onChange={(e) => setCustomRibbon(e.target.value)}
                    placeholder="Ex: Cetim Rosa Chiclete"
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </div>

            </div>

            {/* Live Preview & Print Action */}
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold text-purple-900 block">Prévia do Cartão para Impressão:</span>
              
              <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 p-6 rounded-3xl border-2 border-dashed border-pink-300 relative shadow-md">
                <span className="absolute top-3 left-3 text-base">🌸</span>
                <span className="absolute top-3 right-3 text-base">🌸</span>
                <span className="absolute bottom-3 left-3 text-base">🌸</span>
                <span className="absolute bottom-3 right-3 text-base">🌸</span>

                <div className="bg-white/90 backdrop-blur-xs p-6 rounded-2xl border border-pink-200 space-y-4 text-center">
                  <div className="space-y-0.5">
                    <h4 className="font-['Playfair_Display'] font-bold text-base text-pink-900 uppercase tracking-widest">
                      Lavistore Kids
                    </h4>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                      Com Carinho & Doçura
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="text-xs font-bold text-pink-700">Para: </span>
                    <span className="font-['Caveat'] text-2xl font-bold text-slate-900">
                      {customRecipient || 'Pessoa Especial'}
                    </span>
                  </div>

                  <p className="font-['Playfair_Display'] italic text-sm text-slate-800 leading-relaxed py-2 px-3">
                    "{customMessage}"
                  </p>

                  <div className="text-right">
                    <span className="text-xs font-bold text-pink-700">Com amor, </span>
                    <span className="font-['Caveat'] text-2xl font-bold text-slate-900">
                      {customSender || 'Lavistore'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-dashed border-pink-200 flex justify-between items-center text-[10px] text-slate-500">
                    <span>Fita: {customRibbon}</span>
                    <span>Embalado artesanalmente ✨</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrintCustomCard}
                className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir Este Cartãozinho Agora</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
