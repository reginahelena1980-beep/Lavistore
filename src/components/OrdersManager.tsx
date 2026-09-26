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
  PackageCheck,
  FileSpreadsheet,
  Printer,
  Package,
  Boxes,
  Send,
  CheckSquare,
  Square,
  Save,
  Tag,
  Gift,
  Sparkles,
  PenTool,
  Trash2
} from 'lucide-react';
import { OrderData, BiProductCalculatedRecord } from '../types';
import { fetchOrders as fetchOrdersFromApi, updateOrderStatus, clearAllOrders } from '../services/storeApiService';
import { GoogleSheetsModal } from './GoogleSheetsModal';
import { getStoredSheetsConfig, GoogleSheetsConfig } from '../services/googleSheetsService';
import { extractDedicationFromOrder, openDedicationPrintWindow, OrderDedicationInfo } from '../utils/dedicationHelper';

interface OrdersManagerProps {
  onRefreshOrders?: () => void;
  onGoToCards?: () => void;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({ onRefreshOrders, onGoToCards }) => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'separation' | 'dedication' | 'approved' | 'pending' | 'shipped'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copiedAddressOrderId, setCopiedAddressOrderId] = useState<string | null>(null);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState<boolean>(false);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getStoredSheetsConfig());
  const [biRecords, setBiRecords] = useState<BiProductCalculatedRecord[]>([]);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Estados locais para edição de código de rastreamento por pedido
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savedTrackingMsg, setSavedTrackingMsg] = useState<string | null>(null);
  // Checklist de separação física por item
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Carrega registros de BI para sincronização completa
  useEffect(() => {
    fetch('/api/bi/records')
      .then(r => r.json())
      .then(d => {
        if (d.records && Array.isArray(d.records)) {
          setBiRecords(d.records);
        }
      })
      .catch(() => {});
  }, []);

  // Carrega pedidos da API & localStorage (com fallback)
  const fetchOrders = async () => {
    setIsLoading(true);
    let serverList: OrderData[] = [];
    let hasServerSuccess = false;

    // 1. Fetch from server API via storeApiService
    try {
      serverList = await fetchOrdersFromApi();
      hasServerSuccess = true;
    } catch (err) {
      console.warn('Erro ao carregar pedidos do servidor:', err);
    }

    let finalOrders: OrderData[] = [];

    if (hasServerSuccess) {
      // O servidor é a autoridade máxima. Atualiza o cache local.
      finalOrders = serverList;
      try {
        localStorage.setItem('lavistore_orders', JSON.stringify(serverList));
      } catch (err) {
        console.error(err);
      }
    } else {
      // 2. Read from localStorage fallback apenas se a chamada à API falhar
      try {
        const saved = localStorage.getItem('lavistore_orders');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            finalOrders = parsed;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    const merged = finalOrders.sort((a, b) => {
      const dateA = new Date(a.receivedAt || a.date || 0).getTime();
      const dateB = new Date(b.receivedAt || b.date || 0).getTime();
      return dateB - dateA;
    });

    setOrders(merged);

    // Inicializa os inputs de rastreamento com o que veio do banco
    const initialTracking: Record<string, string> = {};
    merged.forEach(o => {
      if (o.trackingCode) {
        initialTracking[o.orderId] = o.trackingCode;
      }
    });
    setTrackingInputs(prev => ({ ...initialTracking, ...prev }));

    // Se houver pedidos e nenhum expandido, expande o primeiro para o lojista já ver os itens
    if (merged.length > 0 && !expandedOrderId) {
      setExpandedOrderId(merged[0].orderId);
    } else if (merged.length === 0) {
      setExpandedOrderId(null);
    }

    setIsLoading(false);
  };

  const handleClearOrders = async () => {
    try {
      setIsLoading(true);
      await clearAllOrders();
      setOrders([]);
      try {
        localStorage.removeItem('lavistore_orders');
      } catch {}
      setShowClearModal(false);
      if (onRefreshOrders) {
        onRefreshOrders();
      }
    } catch (err) {
      console.error('Erro ao limpar pedidos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Atualiza o status e/ou código de rastreamento do pedido
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, trackingCode?: string) => {
    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.orderId === orderId) {
          return { 
            ...o, 
            customStatus: newStatus,
            trackingCode: trackingCode !== undefined ? trackingCode : o.trackingCode
          };
        }
        return o;
      });
      try {
        localStorage.setItem('lavistore_orders', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    try {
      await updateOrderStatus(orderId, newStatus, trackingCode);
    } catch (err) {
      console.warn('Erro ao atualizar status do pedido no servidor:', err);
    }
  };

  // Salvar código de rastreamento e marcar como enviado
  const handleSaveTrackingCode = async (orderId: string) => {
    const code = (trackingInputs[orderId] || '').trim();
    const order = orders.find(o => o.orderId === orderId);
    const newStatus = (order?.customStatus === 'entregue') ? 'entregue' : 'enviado';

    await handleUpdateOrderStatus(orderId, newStatus, code);
    setSavedTrackingMsg(orderId);
    setTimeout(() => setSavedTrackingMsg(null), 3000);
  };

  // Botão rápido de 1 clique: Marcar como Enviado
  const handleMarkAsShipped = async (orderId: string) => {
    const code = (trackingInputs[orderId] || orders.find(o => o.orderId === orderId)?.trackingCode || '').trim();
    await handleUpdateOrderStatus(orderId, 'enviado', code);
    setSavedTrackingMsg(orderId);
    setTimeout(() => setSavedTrackingMsg(null), 3000);
  };

  // Disparo com 1 clique para WhatsApp da cliente avisando que foi postado
  const handleSendWhatsAppTracking = (order: OrderData) => {
    const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Este pedido não possui telefone cadastrado.');
      return;
    }
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const code = (trackingInputs[order.orderId] || order.trackingCode || '').trim();
    
    let msg = `🌸 *LAVISTORE KIDS - PEDIDO #${order.orderId}* 🌸\n\n` +
      `Olá, ${order.customerName}! Tudo bem? 💕\n\n`;

    if (code) {
      const trackingUrl = code.length >= 8 
        ? `https://rastreamento.correios.com.br/app/index.php?codigo=${code}`
        : '';
      msg += `Temos uma novidade linda: *seu pedido já foi postado e está a caminho!* 🚚✨\n\n` +
        `📦 *Código de Rastreamento:* \`${code}\`\n` +
        (trackingUrl ? `🔗 *Acompanhe a entrega:* ${trackingUrl}\n\n` : '\n') +
        `Você também pode acompanhar pelo site dos Correios ou da transportadora.\n\n`;
    } else {
      msg += `Seu pedido já foi aprovado e está sendo preparado com muito amor e carinho na nossa expedição! 🎁✨\n` +
        `Assim que for postado na agência, nós te enviamos o código de rastreio por aqui.\n\n`;
    }

    msg += `Agradecemos demais por escolher a Lavistore Kids! 💖\nQualquer dúvida, estamos sempre à sua disposição!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Copiar resumo do pedido
  const handleCopyOrderSummary = (order: OrderData) => {
    const itemsText = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((i) => {
          const prod: any = i.product || i;
          const name = prod?.name || (i as any).name || 'Produto';
          const size = i.selectedSize ? `Tam: ${i.selectedSize}` : '';
          const color = i.selectedColor ? `Cor: ${i.selectedColor}` : '';
          const gift = i.isGiftWrapped ? '🎁 Presente' : '';
          const details = [size, color, gift].filter(Boolean).join(' • ');
          return `• ${i.quantity}x ${name} ${details ? `(${details})` : ''}`;
        }).join('\n')
      : 'Itens do pedido';

    const text = `🌸 *LAVISTORE - PEDIDO #${order.orderId}* 🌸\n` +
      `Cliente: ${order.customerName}\n` +
      `Telefone: ${order.customerPhone}\n` +
      `Endereço: ${order.address}\n\n` +
      `*Itens:*\n${itemsText}\n\n` +
      `Frete: ${order.shippingMethod} (R$ ${Number(order.shippingCost || 0).toFixed(2)})\n` +
      (order.trackingCode ? `Código de Rastreio: ${order.trackingCode}\n` : '') +
      `Pagamento: ${order.paymentMethod}\n` +
      `*TOTAL: R$ ${Number(order.total || 0).toFixed(2)}*`;

    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.orderId);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  // Copiar endereço para colar na etiqueta de envio
  const handleCopyShippingAddress = (order: OrderData) => {
    const text = `DESTINATÁRIO:\n` +
      `${order.customerName}\n` +
      `${order.address}\n` +
      (order.city ? `${order.city} - ${order.state || ''}\n` : '') +
      `Telefone: ${order.customerPhone}\n` +
      (order.customerCpf ? `CPF: ${order.customerCpf}\n` : '') +
      `Pedido Lavistore #${order.orderId}`;

    navigator.clipboard.writeText(text);
    setCopiedAddressOrderId(order.orderId);
    setTimeout(() => setCopiedAddressOrderId(null), 2500);
  };

  // Imprimir Ficha de Separação / Romaneio
  const handlePrintPackingSlip = (order: OrderData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map((item: any) => {
      const prod = item.product || item;
      const name = prod.name || item.name || 'Produto';
      const qty = item.quantity || 1;
      const size = item.selectedSize ? `Tam: ${item.selectedSize}` : '';
      const color = item.selectedColor ? `Cor: ${item.selectedColor}` : '';
      const gift = item.isGiftWrapped ? '🎁 Embalar para Presente' : '';
      const details = [size, color, gift].filter(Boolean).join(' • ');

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: bold; width: 50px; text-align: center; font-size: 16px;">[ &nbsp; ]</td>
          <td style="padding: 12px; font-size: 15px; font-weight: bold; width: 60px; color: #4c1d95; text-align: center;">${qty}x</td>
          <td style="padding: 12px; font-size: 14px;">
            <div style="font-weight: bold; color: #111827;">${name}</div>
            ${details ? `<div style="font-size: 12px; color: #b45309; font-weight: 600; margin-top: 4px;">${details}</div>` : ''}
            ${prod.description && prod.description.includes('Sacolinha') ? `<div style="font-size: 11px; color: #4b5563; margin-top: 4px; background: #fef3c7; padding: 6px; border-radius: 4px;">${prod.description}</div>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const dedication = extractDedicationFromOrder(order);
    const dedicationHtml = dedication ? `
      <div style="border: 2px dashed #f43f5e; border-radius: 12px; padding: 16px; margin-top: 25px; background: #fff1f2; position: relative; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #fbcfe8; padding-bottom: 8px; margin-bottom: 12px;">
          <span style="font-size: 13px; font-weight: bold; color: #9f1239; text-transform: uppercase; letter-spacing: 0.5px;">✂️ Recortar Cartão de Dedicatória com Cheirinho</span>
          <span style="font-size: 11px; color: #be185d; font-weight: bold;">Pedido #${order.orderId} ${dedication.ribbon ? `• Fita: ${dedication.ribbon}` : ''}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
          <div><strong style="color: #be185d;">Para:</strong> <span style="font-weight: bold; font-size: 16px; color: #111827;">${dedication.recipient}</span></div>
          <div><strong style="color: #be185d;">De:</strong> <span style="font-weight: bold; font-size: 16px; color: #111827;">${dedication.sender}</span></div>
        </div>
        <div style="font-style: italic; font-size: 14px; line-height: 1.6; color: #1f2937; padding: 12px 16px; background: rgba(255,255,255,0.9); border-radius: 8px; border: 1px solid #fecdd3; text-align: center; margin: 8px 0;">
          "${dedication.message}"
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9d174d; margin-top: 6px;">
          <span>🌸 Lavistore Kids • Feito com amor</span>
          <span>✨ Borrifar essência doce artesanal</span>
        </div>
      </div>
    ` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha de Separação - Pedido #${order.orderId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1f2937; line-height: 1.5; }
            h1 { font-size: 22px; color: #581c87; margin: 0 0 4px 0; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .box { background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #e5e7eb; }
            th { text-align: left; padding: 12px; background: #f3f4f6; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #374151; }
            .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px dashed #d1d5db; padding-top: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>🌸 Lavistore Kids - Ficha de Separação / Romaneio</h1>
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: bold;">PEDIDO #${order.orderId}</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #4b5563;">
              Data: ${order.date || new Date(order.receivedAt || '').toLocaleDateString('pt-BR')}<br>
              Status: <strong>${(order.customStatus || 'Aprovado').toUpperCase()}</strong>
            </div>
          </div>

          <div class="box">
            <table style="width: 100%; border: none; margin: 0;">
              <tr style="border: none;">
                <td style="border: none; padding: 0; vertical-align: top; width: 60%;">
                  <strong style="color: #581c87;">DESTINATÁRIO:</strong><br>
                  <strong style="font-size: 14px;">${order.customerName}</strong><br>
                  ${order.address}<br>
                  Tel: ${order.customerPhone} ${order.customerCpf ? `• CPF: ${order.customerCpf}` : ''}
                </td>
                <td style="border: none; padding: 0; vertical-align: top; width: 40%; text-align: right;">
                  <strong style="color: #581c87;">ENVIO:</strong><br>
                  <strong>${order.shippingMethod}</strong> ${order.shippingDeadline ? `(${order.shippingDeadline})` : ''}<br>
                  ${order.trackingCode ? `Rastreio: <strong>${order.trackingCode}</strong><br>` : ''}
                  Valor do Frete: R$ ${Number(order.shippingCost || 0).toFixed(2)}
                </td>
              </tr>
            </table>
          </div>

          <h2 style="font-size: 16px; margin: 20px 0 10px 0; color: #374151;">ITENS PARA SEPARAÇÃO NO ESTOQUE:</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Conferido</th>
                <th style="text-align: center;">Qtd</th>
                <th>Produto & Detalhes (Tamanho / Cor)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${dedicationHtml}

          <div class="footer">
            Conferido e embalado com muito amor pela equipe Lavistore Kids! 💕🎀
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Alterna o checklist de um item
  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        String(order.orderId || '').toLowerCase().includes(q) ||
        String(order.customerName || '').toLowerCase().includes(q) ||
        String(order.customerEmail || '').toLowerCase().includes(q) ||
        String(order.customerPhone || '').toLowerCase().includes(q) ||
        String(order.trackingCode || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      const isPaid = order.mercadoPagoStatus === 'approved' || 
                     order.customStatus === 'pago' || 
                     order.paymentMethod?.toLowerCase().includes('cartão');
      const isAlreadyShipped = order.customStatus === 'enviado' || order.customStatus === 'entregue';

      if (statusFilter === 'separation') {
        return (order.customStatus === 'separacao' || (isPaid && !isAlreadyShipped));
      }
      if (statusFilter === 'dedication') {
        return Boolean(extractDedicationFromOrder(order));
      }
      if (statusFilter === 'approved') {
        return isPaid;
      }
      if (statusFilter === 'pending') {
        return order.mercadoPagoStatus === 'pending' || 
               order.customStatus === 'pendente' ||
               order.paymentMethod?.toLowerCase().includes('pix');
      }
      if (statusFilter === 'shipped') {
        return isAlreadyShipped;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter]);

  // Contadores para abas
  const counts = useMemo(() => {
    let separation = 0;
    let shipped = 0;
    let dedicationCount = 0;
    orders.forEach(o => {
      const isPaid = o.mercadoPagoStatus === 'approved' || o.customStatus === 'pago' || o.paymentMethod?.toLowerCase().includes('cartão');
      const isShipped = o.customStatus === 'enviado' || o.customStatus === 'entregue';
      if (o.customStatus === 'separacao' || (isPaid && !isShipped)) separation++;
      if (isShipped) shipped++;
      if (extractDedicationFromOrder(o)) dedicationCount++;
    });
    return { separation, shipped, dedicationCount };
  }, [orders]);

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
          <p className="text-[10px] text-slate-500 font-medium">Cadastrados na loja</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border-2 border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Para Separar / Enviar</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-amber-950">
            {counts.separation}
          </p>
          <p className="text-[10px] text-amber-800 font-medium">Aguardando postagem</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border-2 border-cyan-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-cyan-900 font-bold">
            <span>Enviados com Rastreio</span>
            <Truck className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-cyan-950">
            {counts.shipped}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Postados para entrega</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border-2 border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
            <span>Volume de Vendas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-emerald-900">
            R$ {totalRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Ticket médio: R$ {avgTicket.toFixed(2)}</p>
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
            placeholder="Buscar por cliente, pedido, rastreio..."
            className="w-full pl-9 pr-4 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-xs text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-purple-950 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
            }`}
          >
            Todos ({orders.length})
          </button>

          <button
            onClick={() => setStatusFilter('separation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'separation'
                ? 'bg-amber-500 text-white shadow-2xs ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Para Separar ({counts.separation})</span>
          </button>

          <button
            onClick={() => setStatusFilter('dedication')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'dedication'
                ? 'bg-pink-600 text-white shadow-2xs ring-2 ring-pink-300'
                : 'bg-pink-50 text-pink-900 hover:bg-pink-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-pink-500" />
            <span>Com Dedicatória ({counts.dedicationCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('shipped')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'shipped'
                ? 'bg-cyan-600 text-white shadow-2xs'
                : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Enviados ({counts.shipped})</span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Aprovados
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-rose-500 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
            }`}
          >
            Pendentes
          </button>

          {/* Atalho para Central de Cartões e Dedicatórias */}
          {onGoToCards && (
            <button
              type="button"
              onClick={onGoToCards}
              className="px-3 py-1.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Ir para a Central de Cartões e Dedicatórias de Presente"
            >
              <PenTool className="w-3.5 h-3.5 text-pink-200" />
              <span>💌 Ver Cartões ({counts.dedicationCount})</span>
            </button>
          )}

          {/* Google Sheets button */}
          <button
            type="button"
            onClick={() => {
              setSheetsConfig(getStoredSheetsConfig());
              setShowGoogleSheetsModal(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ml-auto sm:ml-2 shrink-0"
            title="Sincronizar pedidos e financeiro com Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Google Sheets</span>
            {sheetsConfig?.spreadsheetId && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse ml-0.5"></span>
            )}
          </button>

          {/* Reload button */}
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl transition-all cursor-pointer shrink-0"
            title="Recarregar Pedidos do Servidor"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão para limpar pedidos de teste */}
          {orders.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Limpar todos os pedidos para publicar a loja"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Limpar Pedidos ({orders.length})</span>
            </button>
          )}
        </div>

      </div>

      {/* Modal de confirmação para limpar pedidos */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-purple-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border-2 border-rose-200 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Limpar Pedidos de Teste?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta ação apagará os pedidos de teste para que a loja seja publicada com a listagem de pedidos zerada, pronta para receber os pedidos reais das clientes.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearOrders}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirmar e Limpar</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              : 'Assim que uma cliente concluir uma compra no site, o pedido aparecerá aqui com todos os itens, checklist de separação e código de envio.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.orderId;
            const dedication = extractDedicationFromOrder(order);
            const isPaid = order.mercadoPagoStatus === 'approved' || 
                           order.customStatus === 'pago' ||
                           order.paymentMethod?.toLowerCase().includes('cartão');
            const isPix = Boolean(order.pixQrCode) || order.paymentMethod?.toLowerCase().includes('pix');
            const isShipped = order.customStatus === 'enviado' || order.customStatus === 'entregue';
            const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
            const waLink = cleanPhone.length >= 10
              ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}`
              : null;

            const totalItemsCount = (order.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
            const currentTracking = trackingInputs[order.orderId] ?? order.trackingCode ?? '';

            return (
              <div 
                key={order.orderId}
                className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 transition-all overflow-hidden ${
                  isExpanded 
                    ? 'border-purple-400 shadow-md ring-2 ring-purple-200/50' 
                    : 'border-purple-200 hover:border-purple-300 shadow-2xs hover:shadow-sm'
                }`}
              >
                {/* Header Summary Row */}
                <div 
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-purple-50/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isShipped 
                        ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                        : isPaid 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isShipped ? (
                        <Truck className="w-5 h-5" />
                      ) : isPaid ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-['Mali'] font-bold text-base text-purple-950">
                          #{order.orderId}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {order.date || (order.receivedAt ? new Date(order.receivedAt).toLocaleDateString('pt-BR') : 'Hoje')}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${
                          isShipped
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-300'
                            : isPaid 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {isShipped && <Truck className="w-3 h-3 text-cyan-700" />}
                          {order.customStatus 
                            ? order.customStatus === 'separacao' 
                              ? 'EM SEPARAÇÃO' 
                              : order.customStatus === 'enviado' 
                                ? 'ENVIADO / POSTADO' 
                                : order.customStatus.toUpperCase()
                            : isPaid 
                              ? 'PAGO / PRONTO P/ SEPARAR' 
                              : isPix 
                                ? 'PIX AGUARDANDO' 
                                : 'PROCESSANDO'}
                        </span>

                        {/* Badge de Rastreamento se já cadastrado */}
                        {order.trackingCode && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Truck className="w-3 h-3 text-purple-700" />
                            <span>Rastreio: {order.trackingCode}</span>
                          </span>
                        )}

                        {/* Badge de Dedicatória */}
                        {dedication && (
                          <span className="text-[10px] font-bold bg-pink-100 text-pink-900 border border-pink-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <PenTool className="w-3 h-3 text-pink-600" />
                            <span>Cartão Dedicatória</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs font-semibold text-purple-950">
                          {order.customerName}
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="text-xs text-slate-500 font-medium">
                          {order.customerPhone || order.customerEmail}
                        </p>
                      </div>

                      {/* Mini Preview de Produtos no cabeçalho */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center -space-x-2">
                          {(order.items || []).slice(0, 4).map((it: any, idx: number) => {
                            const p = it.product || it;
                            const img = p.images?.[0] || p.image;
                            return (
                              <div
                                key={idx}
                                className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white shadow-2xs overflow-hidden shrink-0"
                                title={`${it.quantity || 1}x ${p.name || it.name} ${it.selectedSize ? `(Tam: ${it.selectedSize})` : ''}`}
                              >
                                {img ? (
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-purple-800">
                                    {(p.name || 'P')[0]}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(order.items || []).length > 4 && (
                            <span className="w-7 h-7 rounded-full bg-purple-200 text-purple-950 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                              +{(order.items || []).length - 4}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-bold text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-lg border border-purple-200">
                          📦 {totalItemsCount} {totalItemsCount === 1 ? 'item para conferir' : 'itens para conferir'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Valor Total</span>
                      <span className="font-['Mali'] text-base sm:text-lg font-bold text-[#E11D48]">
                        R$ {Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Botão bem visível para abrir / fechar detalhes */}
                    <div className="flex items-center gap-2">
                      {dedication && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDedicationPrintWindow(dedication);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-pink-100 hover:bg-pink-200 text-pink-900 border border-pink-300 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="Imprimir cartão floral de dedicatória (10x15cm) em 1 clique"
                        >
                          <Printer className="w-3.5 h-3.5 text-pink-600" />
                          <span className="hidden sm:inline">Imprimir Cartão</span>
                          <span className="sm:hidden">Cartão</span>
                        </button>
                      )}

                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                        isExpanded
                          ? 'bg-purple-900 text-amber-300 border border-purple-800'
                          : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
                      }`}>
                        <span>{isExpanded ? 'Recolher' : 'Ver Itens p/ Separar'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-purple-200 p-4 sm:p-6 bg-gradient-to-b from-[#FAF5FF] to-white space-y-6 animate-in fade-in">
                    
                    {/* 1. SEÇÃO PRINCIPAL DE EXPEDIÇÃO & ENVIO: ONDE INFORMA QUE FOI ENVIADO */}
                    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-purple-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-['Mali'] text-base font-bold text-amber-300 flex items-center gap-2">
                              <span>Expedição, Envio & Código de Rastreamento</span>
                            </h3>
                            <p className="text-xs text-purple-200">
                              Altere o status para "Enviado", informe o código de postagem e avise a cliente no WhatsApp.
                            </p>
                          </div>
                        </div>

                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
                          <span className="text-xs font-bold text-purple-200 pl-1">Status:</span>
                          <select
                            value={order.customStatus || (isPaid ? 'pago' : 'pendente')}
                            onChange={(e) => handleUpdateOrderStatus(order.orderId, e.target.value)}
                            className="text-xs font-bold bg-white text-purple-950 border border-purple-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                          >
                            <option value="pendente">⏳ Aguardando Pagamento</option>
                            <option value="pago">✓ Pago / Aprovado (Pronto p/ Separação)</option>
                            <option value="separacao">📦 Em Separação</option>
                            <option value="enviado">🚚 Enviado com Rastreio</option>
                            <option value="entregue">✨ Entregue ao Cliente</option>
                            <option value="cancelado">❌ Cancelado</option>
                          </select>
                        </div>
                      </div>

                      {/* Inputs de Rastreio & Ações de Envio */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-6 flex flex-col gap-1">
                          <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-amber-300" />
                            <span>Código de Rastreamento (Correios / Transportadora):</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={currentTracking}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTrackingInputs(prev => ({ ...prev, [order.orderId]: val }));
                              }}
                              placeholder="Ex: QB123456789BR ou link de rastreio"
                              className="flex-1 px-3 py-2 bg-white text-purple-950 placeholder-slate-400 font-mono text-xs font-bold rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTrackingCode(order.orderId)}
                              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
                              title="Salvar código de rastreamento"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar</span>
                            </button>
                          </div>
                        </div>

                        {/* Botões Rápidos: Marcar como Enviado e Enviar no WhatsApp */}
                        <div className="md:col-span-6 flex items-center gap-2 flex-wrap pt-1 sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleMarkAsShipped(order.orderId)}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-purple-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Marca o status do pedido como Enviado no sistema"
                          >
                            <Truck className="w-4 h-4 text-purple-950" />
                            <span>Marcar como Enviado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppTracking(order)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Abre o WhatsApp da cliente com mensagem de rastreamento pré-formatada"
                          >
                            <MessageCircle className="w-4 h-4 text-white" />
                            <span>Enviar Rastreio no WhatsApp</span>
                          </button>
                        </div>
                      </div>

                      {/* Feedback de salvamento ou link do rastreio ativo */}
                      {savedTrackingMsg === order.orderId && (
                        <div className="bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Status e rastreamento atualizados com sucesso no servidor da loja! ✨</span>
                        </div>
                      )}

                      {order.trackingCode && (
                        <div className="flex items-center gap-2 text-xs text-purple-200 bg-white/5 p-2 rounded-xl border border-white/10 flex-wrap">
                          <span>📦 Rastreamento ativo:</span>
                          <strong className="font-mono text-amber-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-amber-300/40">
                            {order.trackingCode}
                          </strong>
                          {order.trackingCode.length >= 8 && (
                            <a
                              href={`https://rastreamento.correios.com.br/app/index.php?codigo=${order.trackingCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-300 hover:text-white underline font-semibold flex items-center gap-1 ml-auto"
                            >
                              <span>Acompanhar nos Correios</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SEÇÃO ESPECIAL DE DEDICATÓRIA & CARTÃO DE PRESENTE */}
                    {dedication && (
                      <div className="bg-gradient-to-r from-pink-50 via-rose-50/70 to-purple-50 p-4 sm:p-5 rounded-2xl border-2 border-pink-300 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200/80 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                              <PenTool className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-['Mali'] text-base font-bold text-pink-950 flex items-center gap-2">
                                <span>Cartão de Dedicatória com Cheirinho 🌸</span>
                              </h4>
                              <p className="text-xs text-pink-800">
                                Mensagem personalizada enviada para acompanhar a embalagem de presente.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDedicationPrintWindow(dedication)}
                              className="px-4 py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                              title="Abre a janela de impressão com o cartãozinho floral 10x15cm pronto para corte"
                            >
                              <Printer className="w-4 h-4 text-white" />
                              <span>🖨️ Imprimir Cartão de Dedicatória (10x15cm)</span>
                            </button>
                          </div>
                        </div>

                        {/* Cartãozinho Visual Prévia */}
                        <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border-2 border-dashed border-pink-300 relative shadow-2xs space-y-3">
                          <span className="absolute top-2.5 left-3 text-sm">🌸</span>
                          <span className="absolute top-2.5 right-3 text-sm">🌸</span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-pink-50/60 rounded-xl border border-pink-100">
                              <span className="text-pink-600 font-bold block text-[10px] uppercase tracking-wider">Destinatário (Para):</span>
                              <strong className="text-base text-slate-900 font-['Caveat']">{dedication.recipient}</strong>
                            </div>
                            <div className="p-2.5 bg-pink-50/60 rounded-xl border border-pink-100 sm:text-right">
                              <span className="text-pink-600 font-bold block text-[10px] uppercase tracking-wider">Remetente (De):</span>
                              <strong className="text-base text-slate-900 font-['Caveat']">{dedication.sender}</strong>
                            </div>
                          </div>

                          <div className="p-3 bg-pink-50/30 rounded-xl border border-pink-100">
                            <span className="text-[10px] font-bold text-pink-700 uppercase tracking-widest block text-center mb-1">
                              Mensagem do Cartão
                            </span>
                            <p className="font-['Playfair_Display'] italic text-sm text-slate-800 leading-relaxed text-center px-4">
                              "{dedication.message}"
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-[11px] text-pink-900 pt-2 border-t border-dashed border-pink-200">
                            <div className="flex items-center gap-3">
                              {dedication.ribbon && <span>🎀 Fita: <strong>{dedication.ribbon}</strong></span>}
                              {dedication.bag && <span>🛍️ <strong>{dedication.bag}</strong></span>}
                            </div>
                            <span className="text-slate-500 font-medium">✨ Pronto para imprimir, recortar e perfumar</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. ITENS COMPRADOS PARA SEPARAÇÃO (ROMANEIO & CHECKLIST) */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-purple-200 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-['Mali'] text-sm sm:text-base font-bold text-purple-950 flex items-center gap-2">
                              <span>Itens Comprados para Separação</span>
                              <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                                {totalItemsCount} {totalItemsCount === 1 ? 'unidade' : 'unidades'}
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Marque a caixinha [✓] ao colocar cada mimo na embalagem para conferir sem erros.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {dedication && (
                            <button
                              type="button"
                              onClick={() => openDedicationPrintWindow(dedication)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                              title="Imprimir Cartão de Dedicatória com Cheirinho (10x15cm)"
                            >
                              <Printer className="w-3.5 h-3.5 text-pink-200" />
                              <span>Imprimir Dedicatória</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintPackingSlip(order)}
                            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Imprimir folha de separação / romaneio para a expedição"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" />
                            <span>Imprimir Romaneio</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyOrderSummary(order)}
                            className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        </div>
                      </div>

                      {/* Lista de Itens com Checkbox de Separação */}
                      <div className="divide-y divide-purple-100">
                        {Array.isArray(order.items) && order.items.length > 0 ? (
                          order.items.map((item: any, idx: number) => {
                            const prod = item.product || item;
                            const name = prod.name || item.name || 'Produto Lavistore';
                            const unitP = Number(item.price || item.sizePrice || prod.price || 0);
                            const qty = Number(item.quantity || 1);
                            const img = prod.images?.[0] || prod.image;
                            const itemKey = `${order.orderId}-${idx}`;
                            const isChecked = Boolean(checkedItems[itemKey]);

                            return (
                              <div 
                                key={idx} 
                                className={`py-3.5 px-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isChecked ? 'bg-emerald-50/60 border border-emerald-200/80' : 'hover:bg-purple-50/50'
                                }`}
                              >
                                <div className="flex items-start sm:items-center gap-3">
                                  {/* Checkbox de Separação */}
                                  <button
                                    type="button"
                                    onClick={() => toggleItemCheck(order.orderId, idx)}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-1 sm:mt-0 ${
                                      isChecked
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                        : 'border-slate-300 hover:border-purple-400 bg-white text-transparent'
                                    }`}
                                    title={isChecked ? 'Item conferido e separado!' : 'Clique para marcar como separado'}
                                  >
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  </button>

                                  {/* Imagem do Produto */}
                                  {img ? (
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-purple-200 bg-white shrink-0 shadow-2xs">
                                      <img 
                                        src={img} 
                                        alt={name} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-14 h-14 rounded-xl border border-purple-200 bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                                      Lavi
                                    </div>
                                  )}

                                  {/* Nome e Detalhes de Tamanho / Cor / Sacolinha */}
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className={`font-bold text-xs sm:text-sm ${isChecked ? 'line-through text-slate-500' : 'text-purple-950'}`}>
                                        {name}
                                      </p>
                                    </div>

                                    {/* Badges de Tamanho e Cor */}
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      {item.selectedSize && (
                                        <span className="font-extrabold text-amber-950 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                                          <span>📏 Tamanho:</span>
                                          <strong>{item.selectedSize}</strong>
                                        </span>
                                      )}

                                      {item.selectedColor && (
                                        <span className="font-bold text-pink-900 bg-pink-100 border border-pink-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                          <span>🎨 Cor:</span>
                                          <strong>{item.selectedColor}</strong>
                                        </span>
                                      )}

                                      {item.isGiftWrapped && (
                                        <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                          <Gift className="w-3 h-3 text-rose-500" />
                                          <span>Embalar para Presente 🎁</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Se for Sacolinha Personalizada: Exibe mimos, fita e cartão */}
                                    {prod.description && prod.description.includes('Sacolinha') && (
                                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950 space-y-1 mt-1">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Detalhes da Sacolinha Amarela:</span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-700">
                                          {prod.description}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Quantidade e Preço */}
                                <div className="text-right shrink-0 pl-9 sm:pl-0 flex sm:flex-col justify-between sm:justify-center items-end">
                                  <span className="font-black text-xs sm:text-sm text-purple-950 bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200">
                                    {qty}x unidade{qty > 1 ? 's' : ''}
                                  </span>
                                  <span className="text-[11px] text-slate-500 mt-1 font-medium block">
                                    Total: R$ {(qty * unitP).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                            <p className="font-bold text-slate-700">Nenhum item discriminado neste pedido.</p>
                            <p className="text-[11px]">Os produtos comprados aparecerão aqui com fotos, tamanhos e quantidades discriminadas.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. DADOS DE DESTINATÁRIO & ENDEREÇO DE ENTREGA + PAGAMENTO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Destinatário & Endereço */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <h4 className="font-['Mali'] text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-purple-600" />
                            <span>Destinatário & Endereço de Envio</span>
                          </h4>

                          <button
                            type="button"
                            onClick={() => handleCopyShippingAddress(order)}
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-950 flex items-center gap-1 cursor-pointer"
                            title="Copiar dados formatados para colar no gerador de etiqueta"
                          >
                            {copiedAddressOrderId === order.orderId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Endereço Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar para Etiqueta</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-700">
                          <p><strong>Nome:</strong> {order.customerName}</p>
                          <p><strong>E-mail:</strong> {order.customerEmail}</p>
                          <p><strong>Telefone / WhatsApp:</strong> {order.customerPhone}</p>
                          {order.customerCpf && <p><strong>CPF:</strong> {order.customerCpf}</p>}
                          <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-100 text-purple-950 font-medium">
                            <p><strong>Endereço de Entrega:</strong></p>
                            <p className="mt-0.5">{order.address}</p>
                          </div>
                          <div className="pt-2 border-t border-purple-100 text-purple-950 space-y-1">
                            <p><strong>Frete Selecionado:</strong> {order.shippingMethod} {order.shippingDeadline ? `(${order.shippingDeadline})` : ''}</p>
                            <p><strong>Valor do Frete:</strong> {Number(order.shippingCost || 0) === 0 ? 'GRÁTIS' : `R$ ${Number(order.shippingCost).toFixed(2)}`}</p>
                          </div>

                          {order.notes && (
                            <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 font-medium">
                              <p className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                                <FileText className="w-3.5 h-3.5 text-amber-700" />
                                <span>Observações / Solicitação do Cliente:</span>
                              </p>
                              <p className="mt-0.5 text-xs text-amber-900/90">{order.notes}</p>
                            </div>
                          )}
                        </div>

                        {waLink && (
                          <div className="pt-2">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                              <span>Conversar com a cliente no WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Pagamento & Valores */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <h4 className="font-['Mali'] text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            <span>Pagamento & Valores</span>
                          </h4>
                        </div>

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
                              <span>Subtotal dos Produtos:</span>
                              <span>R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {Number(order.discountAmount || 0) > 0 && (
                              <div className="flex justify-between text-rose-600 font-bold">
                                <span>Desconto ({order.couponApplied || 'Cupom'}):</span>
                                <span>- R$ {Number(order.discountAmount).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-600">
                              <span>Frete:</span>
                              <span>R$ {Number(order.shippingCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-purple-950 text-sm pt-2 border-t border-purple-200">
                              <span>Total da Compra:</span>
                              <span className="text-[#E11D48] text-base font-extrabold">R$ {Number(order.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={showGoogleSheetsModal}
        onClose={() => {
          setShowGoogleSheetsModal(false);
          setSheetsConfig(getStoredSheetsConfig());
        }}
        biRecords={biRecords}
        orders={orders}
      />
    </div>
  );
};
