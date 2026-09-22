import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Truck, 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  CreditCard, 
  QrCode, 
  FileText,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { OrderData } from '../types';
import { fetchOrders as fetchOrdersFromApi, updateOrderStatus } from '../services/storeApiService';

interface OrdersManagerProps {
  onRefreshOrders?: () => void;
}

export const OrdersManager: React.FC<OrdersManagerProps> = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'shipped'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Load orders from API & localStorage (merge and deduplicate)
  const fetchOrders = async () => {
    setIsLoading(true);
    let serverList: OrderData[] = [];
    let localList: OrderData[] = [];

    // 1. Fetch from server API via storeApiService
    try {
      serverList = await fetchOrdersFromApi();
    } catch (err) {
      console.warn('Erro ao carregar pedidos do servidor:', err);
    }

    // 2. Read from localStorage fallback
    try {
      const saved = localStorage.getItem('lavistore_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localList = parsed;
        }
      }
    } catch (err) {
      console.error(err);
    }

    // Merge by orderId, preferring server record if present
    const map = new Map<string, OrderData>();
    localList.forEach(item => {
      if (item && item.orderId) {
        map.set(String(item.orderId), item);
      }
    });
    serverList.forEach(item => {
      if (item && item.orderId) {
        map.set(String(item.orderId), {
          ...(map.get(String(item.orderId)) || {}),
          ...item
        });
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.receivedAt || a.date || 0).getTime();
      const dateB = new Date(b.receivedAt || b.date || 0).getTime();
      return dateB - dateA;
    });

    setOrders(merged);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.orderId === orderId) {
          return { ...o, customStatus: newStatus };
        }
        return o;
      });
      // Save locally as offline cache
      try {
        localStorage.setItem('lavistore_orders', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Sincroniza imediatamente com o servidor para refletir em qualquer computador
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.warn('Erro ao atualizar status do pedido no servidor:', err);
    }
  };

  const handleCopyOrderSummary = (order: OrderData) => {
    const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
    const itemsText = Array.isArray(order.items)
      ? order.items.map((i) => `• ${i.quantity}x ${i.product?.name || (i as any).name} (${i.selectedSize ? `Tam: ${i.selectedSize}` : ''} ${i.selectedColor ? `Cor: ${i.selectedColor}` : ''})`).join('\n')
      : 'Itens do pedido';

    const text = `🌸 *LAVISTORE - PEDIDO #${order.orderId}* 🌸\n` +
      `Cliente: ${order.customerName}\n` +
      `Telefone: ${order.customerPhone}\n` +
      `Endereço: ${order.address}\n\n` +
      `*Itens:*\n${itemsText}\n\n` +
      `Frete: ${order.shippingMethod} (R$ ${Number(order.shippingCost || 0).toFixed(2)})\n` +
      `Pagamento: ${order.paymentMethod}\n` +
      `*TOTAL: R$ ${Number(order.total || 0).toFixed(2)}*`;

    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.orderId);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        String(order.orderId || '').toLowerCase().includes(q) ||
        String(order.customerName || '').toLowerCase().includes(q) ||
        String(order.customerEmail || '').toLowerCase().includes(q) ||
        String(order.customerPhone || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (statusFilter === 'approved') {
        return order.mercadoPagoStatus === 'approved' || 
               order.customStatus === 'pago' || 
               order.paymentMethod?.toLowerCase().includes('cartão');
      }
      if (statusFilter === 'pending') {
        return order.mercadoPagoStatus === 'pending' || 
               order.customStatus === 'pendente' ||
               order.paymentMethod?.toLowerCase().includes('pix');
      }
      if (statusFilter === 'shipped') {
        return order.customStatus === 'enviado' || order.customStatus === 'entregue';
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return orders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  }, [orders]);

  const avgTicket = useMemo(() => {
    return orders.length > 0 ? totalRevenue / orders.length : 0;
  }, [orders, totalRevenue]);

  return (
    <div className="space-y-6 font-['Comfortaa']">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/95 rounded-2xl p-4 border-2 border-purple-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-900 font-bold">
            <span>Total de Pedidos</span>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-purple-950">
            {orders.length}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Transmitidos pela loja</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border-2 border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
            <span>Volume de Vendas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-emerald-900">
            R$ {totalRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Soma de todos os pedidos</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border-2 border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Ticket Médio</span>
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-amber-900">
            R$ {avgTicket.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Média por cliente</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border-2 border-pink-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-pink-900 font-bold">
            <span>Status SMTP / E-mail</span>
            <Mail className="w-4 h-4 text-pink-600" />
          </div>
          <p className="font-['Mali'] text-lg font-bold text-purple-950 truncate">
            Ativo & Seguro
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Disparos automáticos</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Refresh */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border-2 border-purple-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido..."
            className="w-full pl-9 pr-4 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-xs text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-purple-950 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
            }`}
          >
            Todos ({orders.length})
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Aprovados
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Pendentes
          </button>

          <button
            onClick={() => setStatusFilter('shipped')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'shipped'
                ? 'bg-cyan-600 text-white shadow-2xs'
                : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100'
            }`}
          >
            Enviados
          </button>

          {/* Reload button */}
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl transition-all ml-auto sm:ml-2"
            title="Recarregar Pedidos do Servidor"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/90 rounded-3xl p-12 text-center border-2 border-purple-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
            Nenhum pedido encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm 
              ? 'Nenhum pedido corresponde aos critérios de busca informados.'
              : 'Assim que uma cliente concluir uma compra no site, o pedido aparecerá aqui com todos os detalhes e notificações.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            const isPaid = order.mercadoPagoStatus === 'approved' || 
                           order.customStatus === 'pago' ||
                           order.paymentMethod?.toLowerCase().includes('cartão');
            const isPix = Boolean(order.pixQrCode) || order.paymentMethod?.toLowerCase().includes('pix');
            const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
            const waLink = cleanPhone.length >= 10
              ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}`
              : null;

            return (
              <div 
                key={order.orderId}
                className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-purple-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header Summary Row */}
                <div 
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-purple-50/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-['Mali'] font-bold text-base text-purple-950">
                          #{order.orderId}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {order.date || new Date(order.receivedAt).toLocaleDateString('pt-BR')}
                        </span>
                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {order.customStatus 
                            ? order.customStatus.toUpperCase()
                            : isPaid 
                              ? 'PAGO / APROVADO' 
                              : isPix 
                                ? 'PIX AGUARDANDO' 
                                : 'PROCESSANDO'}
                        </span>
                        {order.mercadoPagoPaymentId && (
                          <span className="text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full">
                            Mercado Pago #{order.mercadoPagoPaymentId}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-purple-900 mt-0.5">
                        {order.customerName} <span className="text-slate-400 font-normal">({order.customerEmail})</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Valor Total</span>
                      <span className="font-['Mali'] text-base sm:text-lg font-bold text-[#E11D48]">
                        R$ {Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-purple-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-purple-100 p-4 sm:p-6 bg-[#FAF5FF]/60 space-y-6 animate-in fade-in">
                    
                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-950">Mudar Status:</span>
                        <select
                          value={order.customStatus || (isPaid ? 'pago' : 'pendente')}
                          onChange={(e) => handleUpdateOrderStatus(order.orderId, e.target.value)}
                          className="text-xs font-bold bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1 text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          <option value="pendente">Aguardando Pagamento</option>
                          <option value="pago">Pago / Aprovado</option>
                          <option value="separacao">Em Separação</option>
                          <option value="enviado">Enviado com Rastreio</option>
                          <option value="entregue">Entregue</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyOrderSummary(order)}
                          className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedOrderId === order.orderId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Resumo</span>
                            </>
                          )}
                        </button>

                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Conversar no WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer & Delivery */}
                      <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-3">
                        <h4 className="font-['Mali'] text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          <span>Destinatário & Envio</span>
                        </h4>

                        <div className="space-y-1.5 text-xs text-slate-700">
                          <p><strong>Nome:</strong> {order.customerName}</p>
                          <p><strong>E-mail:</strong> {order.customerEmail}</p>
                          <p><strong>Telefone / WhatsApp:</strong> {order.customerPhone}</p>
                          {order.customerCpf && <p><strong>CPF:</strong> {order.customerCpf}</p>}
                          <p><strong>Endereço Completo:</strong> {order.address}</p>
                          <div className="pt-2 border-t border-purple-100 text-purple-950">
                            <p><strong>Frete Escolhido:</strong> {order.shippingMethod} {order.shippingDeadline ? `(${order.shippingDeadline})` : ''}</p>
                            <p><strong>Valor do Frete:</strong> {Number(order.shippingCost || 0) === 0 ? 'GRÁTIS' : `R$ ${Number(order.shippingCost).toFixed(2)}`}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment & Breakdown */}
                      <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-3">
                        <h4 className="font-['Mali'] text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-purple-600" />
                          <span>Pagamento & Valores</span>
                        </h4>

                        <div className="space-y-1.5 text-xs text-slate-700">
                          <p><strong>Forma:</strong> {order.paymentMethod}</p>
                          {order.mercadoPagoPaymentId && (
                            <p><strong>Mercado Pago ID:</strong> #{order.mercadoPagoPaymentId} ({order.mercadoPagoStatus})</p>
                          )}
                          {order.cardInstallments && (
                            <p><strong>Parcelamento:</strong> {order.cardInstallments}x</p>
                          )}

                          <div className="pt-2 border-t border-purple-100 space-y-1">
                            <div className="flex justify-between text-slate-600">
                              <span>Subtotal Produtos:</span>
                              <span>R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {Number(order.discountAmount || 0) > 0 && (
                              <div className="flex justify-between text-rose-600 font-bold">
                                <span>Desconto Cupom ({order.couponApplied || 'Cupom'}):</span>
                                <span>- R$ {Number(order.discountAmount).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-600">
                              <span>Frete:</span>
                              <span>R$ {Number(order.shippingCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-purple-950 text-sm pt-1 border-t border-purple-200">
                              <span>Total da Compra:</span>
                              <span className="text-[#E11D48]">R$ {Number(order.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Products Bought */}
                    <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-3">
                      <h4 className="font-['Mali'] text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-pink-600" />
                        <span>Itens Comprados</span>
                      </h4>

                      <div className="divide-y divide-purple-100">
                        {Array.isArray(order.items) && order.items.map((item: any, idx: number) => {
                          const prod = item.product || item;
                          const name = prod.name || item.name || 'Produto Lavistore';
                          const unitP = Number(item.sizePrice || prod.price || 0);
                          const qty = Number(item.quantity || 1);
                          const img = prod.images?.[0] || prod.image;

                          return (
                            <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3">
                                {img && (
                                  <img 
                                    src={img} 
                                    alt={name} 
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-lg object-cover border border-purple-100"
                                  />
                                )}
                                <div>
                                  <p className="font-bold text-purple-950">{name}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    {item.selectedSize && <span>Tam: {item.selectedSize}</span>}
                                    {item.selectedColor && <span>Cor: {item.selectedColor}</span>}
                                    {item.isGiftWrapped && <span className="text-pink-600 font-bold">🎁 Embalagem Presente</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-slate-500">{qty}x R$ {unitP.toFixed(2)}</span>
                                <p className="font-bold text-purple-950">R$ {(qty * unitP).toFixed(2)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
