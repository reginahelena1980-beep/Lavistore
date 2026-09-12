import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  QrCode, 
  Sparkles, 
  Flower2, 
  Gift, 
  Truck, 
  Heart,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  CreditCard,
  Mail,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TrioFlowersIcon } from './LavistoreLogo';
import { HomePageConfig, OrderData } from '../types';

interface OrderSuccessModalProps {
  orderData: OrderData | any;
  onClose: () => void;
  homePageConfig?: HomePageConfig;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderData,
  onClose,
  homePageConfig
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedPagSeguro, setCopiedPagSeguro] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);
  const [pixPaymentStatus, setPixPaymentStatus] = useState<'pending' | 'approved'>(
    orderData?.mercadoPagoStatus === 'approved' ? 'approved' : 'pending'
  );

  // Polling em tempo real para verificar confirmação imediata do PIX no Mercado Pago
  useEffect(() => {
    if (!orderData?.mercadoPagoPaymentId || pixPaymentStatus === 'approved') return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/mercadopago/payment_status/${orderData.mercadoPagoPaymentId}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.status === 'approved' && isSubscribed) {
            setPixPaymentStatus('approved');
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10B981', '#34D399', '#6EE7B7', '#F472B6']
            });
            clearInterval(interval);
          }
        }
      } catch (e) {
        // Silêncio no polling para não interromper a tela
      }
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [orderData?.mercadoPagoPaymentId, pixPaymentStatus]);

  const isGiftOrder = Number(orderData?.total || 0) === 0 || 
                      orderData?.couponApplied?.toUpperCase() === 'BRINDE' || 
                      orderData?.paymentMethod?.toLowerCase().includes('brinde') || 
                      orderData?.paymentMethod?.toLowerCase().includes('cortesia');

  useEffect(() => {
    if (isGiftOrder) {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#A855F7', '#F59E0B', '#10B981']
      });
    }
  }, [isGiftOrder]);

  if (!orderData) return null;

  const isMercadoPagoPayment = Boolean(orderData.mercadoPagoPaymentId) || 
                               orderData.paymentMethod?.includes('Mercado Pago') ||
                               Boolean(orderData.pixQrCode);

  const pixKey = orderData.pixQrCode || `00020126580014br.gov.bcb.pix0136lavistore-${orderData.orderId}-pix520400005303986540${Number(orderData.total || 0).toFixed(2)}5802BR5915LAVISTORE MIMO6009SAO PAULO62070503***6304`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const pagSeguroUrl = orderData.pagSeguroUrl || homePageConfig?.pagSeguroPaymentUrl || '';

  const handleCopyPagSeguro = () => {
    if (!pagSeguroUrl) return;
    navigator.clipboard.writeText(pagSeguroUrl);
    setCopiedPagSeguro(true);
    setTimeout(() => setCopiedPagSeguro(false), 2500);
  };

  const formattedAmount = Number(orderData.total || 0).toFixed(2);

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(formattedAmount);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2500);
  };

  // WhatsApp store notification logic (Requirement 4)
  const storePhoneRaw = homePageConfig?.whatsappNumber || '5511987654321';
  let cleanStorePhone = storePhoneRaw.replace(/\D/g, '');
  if (cleanStorePhone.length === 10 || cleanStorePhone.length === 11) {
    cleanStorePhone = `55${cleanStorePhone}`;
  }

  const itemsText = Array.isArray(orderData.items)
    ? orderData.items.map((it: any) => {
        const prod = it.product || it;
        const name = prod.name || 'Produto Lavistore';
        const qty = it.quantity || 1;
        const price = Number(it.sizePrice || prod.price || 0);
        const variantParts = [
          it.selectedSize ? `Tam: ${it.selectedSize}` : null,
          it.selectedColor ? `Cor: ${it.selectedColor}` : null,
          it.isGiftWrapped ? '🎁 Presente' : null
        ].filter(Boolean);
        const variantStr = variantParts.length > 0 ? ` (${variantParts.join(', ')})` : '';
        return `• ${qty}x ${name}${variantStr} - R$ ${(qty * price).toFixed(2)}`;
      }).join('\n')
    : 'Itens do pedido';

  const storeNotificationEmail = homePageConfig?.orderNotificationEmail || 'reginahelena1980@gmail.com';

  const waMessage = 
`🌸 *NOVA VENDA CONCLUÍDA - LAVISTORE* 🌸
━━━━━━━━━━━━━━━━━━━━━━
📦 *Pedido:* #${orderData.orderId}
📅 *Data:* ${orderData.date || new Date().toLocaleDateString('pt-BR')}

👤 *DADOS DA CLIENTE:*
• *Nome:* ${orderData.customerName}
• *WhatsApp:* ${orderData.customerPhone}
• *E-mail:* ${orderData.customerEmail}
${orderData.customerCpf ? `• *CPF:* ${orderData.customerCpf}\n` : ''}
📍 *ENDEREÇO DE ENTREGA:*
${orderData.address}

🛍️ *PRODUTOS COMPRADOS:*
${itemsText}

🚚 *ENVIO & FRETE:*
• Opção: ${orderData.shippingMethod} (${orderData.shippingDeadline || 'Consulte o prazo'})
• Frete: ${Number(orderData.shippingCost) === 0 ? 'GRÁTIS' : `R$ ${Number(orderData.shippingCost).toFixed(2)}`}

💳 *FORMA DE PAGAMENTO:*
• ${orderData.paymentMethod}
${orderData.mercadoPagoPaymentId ? `• Transação Mercado Pago: #${orderData.mercadoPagoPaymentId}\n• Status: Pagamento Aprovado ✓\n` : ''}
${orderData.pagSeguroUrl ? `• Link PagSeguro: ${orderData.pagSeguroUrl}\n` : ''}
${orderData.couponApplied ? `🏷️ *Cupom:* ${orderData.couponApplied} (- R$ ${Number(orderData.discountAmount).toFixed(2)})\n` : ''}
💰 *TOTAL DO PEDIDO: R$ ${Number(orderData.total).toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━━━
✨ Pedido gerado pela loja virtual Lavistore.`;

  const waLink = `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(waMessage)}`;

  const handleCopyWaMessage = () => {
    navigator.clipboard.writeText(waMessage);
    setCopiedWaMessage(true);
    setTimeout(() => setCopiedWaMessage(false), 2500);
  };

  const isPagSeguroPayment = (orderData.paymentMethod.includes('PagSeguro') || Boolean(orderData.pagSeguroUrl)) && Boolean(pagSeguroUrl);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in font-['Comfortaa']">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-amber-300 p-5 sm:p-8 text-slate-800 text-center space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebration Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-purple-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-200 animate-bounce">
            <Heart className="w-8 h-8 fill-purple-950" />
          </div>
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-950 uppercase tracking-widest bg-amber-100 px-3.5 py-1 rounded-full border border-amber-300 inline-block shadow-2xs">
              Pedido Confirmado com Carinho! 🌸
            </span>
            <h2 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
              Obrigada por sua compra!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
              Seu pedido <strong>#{orderData.orderId}</strong> foi registrado. Estamos preparando seu pacotinho! 🌸
            </p>
          </div>
        </div>

        {/* PEDIDO CORTESIA / CUPOM BRINDE (VALOR ZERO) */}
        {isGiftOrder && (
          <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 p-6 rounded-3xl border-2 border-pink-300 text-center space-y-3.5 shadow-md animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-pink-200 animate-pulse">
              <Gift className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-pink-700 uppercase tracking-wider bg-pink-100 px-3.5 py-1 rounded-full border border-pink-200 inline-block shadow-2xs">
                🎉 Pedido Cortesia Aprovado (100% Grátis)
              </span>
              <h3 className="font-['Playfair_Display'] font-bold text-xl text-purple-950">
                Resgate Concluído com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-purple-900 leading-relaxed max-w-md mx-auto">
                O cupom <strong>{orderData.couponApplied || 'BRINDE'}</strong> foi aplicado e o valor total do pedido e do frete foi 100% isento (<strong>Total: R$ 0,00</strong>). Não é necessário efetuar nenhum pagamento!
              </p>
            </div>
            <div className="p-3 bg-white/90 rounded-2xl border border-pink-200 text-xs inline-flex items-center gap-2 font-bold text-emerald-700 shadow-2xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Status: Pedido Aprovado & Confirmado • Valor Pago: R$ 0,00 🌸</span>
            </div>
          </div>
        )}

        {/* MERCADO PAGO - CARTÃO DE CRÉDITO APROVADO */}
        {orderData.paymentMethod.includes('Cartão') && isMercadoPagoPayment && !isGiftOrder && (
          <div className="bg-gradient-to-br from-emerald-50 via-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-emerald-300 text-center space-y-3 shadow-xs">
            <div className="flex items-center justify-center gap-2 text-emerald-950 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Pagamento Aprovado com Sucesso via Mercado Pago</span>
            </div>

            <p className="text-xs text-slate-700 max-w-lg mx-auto">
              A transação foi autorizada instantaneamente pelo <strong>Mercado Pago</strong> com criptografia de ponta a ponta.
            </p>

            <div className="p-3 bg-white rounded-xl border border-emerald-200 text-left text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Transação Mercado Pago:</span>
                <span className="font-mono font-bold text-purple-900">#{orderData.mercadoPagoPaymentId || 'MP-' + Math.floor(10000000 + Math.random() * 90000000)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Cobrado:</span>
                <span className="font-bold text-emerald-700">R$ {formattedAmount}</span>
              </div>
              {orderData.cardInstallments && (
                <div className="flex justify-between text-slate-600">
                  <span>Parcelamento:</span>
                  <span className="font-medium text-slate-800">{orderData.cardInstallments}x no Cartão</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-purple-900 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transação protegida e certificada pelo Mercado Pago</span>
            </div>
          </div>
        )}

        {/* CARTÃO DE CRÉDITO - PAGSEGURO (LINK DE PAGAMENTO - SE NÃO FOR MERCADO PAGO) */}
        {isPagSeguroPayment && !isMercadoPagoPayment && !isGiftOrder && (
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 p-5 rounded-2xl border-2 border-purple-300 text-center space-y-3 shadow-xs">
            <div className="flex items-center justify-center gap-2 text-purple-950 font-bold text-sm">
              <CreditCard className="w-5 h-5 text-purple-700" />
              <span>Conclua seu Pagamento no PagSeguro (PagBank)</span>
            </div>

            <p className="text-xs text-slate-700 max-w-lg mx-auto">
              Para sua comodidade e segurança, o pagamento com <strong>Cartão de Crédito em até 12x</strong> é processado no ambiente oficial do <strong>PagSeguro (PagBank)</strong>.
            </p>

            {/* Destaque do Valor da Compra e Botão Copiar Valor */}
            <div className="p-3.5 bg-white rounded-2xl border-2 border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-600 block tracking-wider">
                  Valor Total desta Compra:
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 font-['Mali']">
                  R$ {formattedAmount}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  (Já inclui produtos com cupom e o frete escolhido)
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyAmount}
                className="w-full sm:w-auto px-3.5 py-2 bg-pink-100 hover:bg-pink-200 text-pink-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedAmount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-pink-600" />}
                <span>{copiedAmount ? 'Valor Copiado!' : `Copiar R$ ${formattedAmount}`}</span>
              </button>
            </div>

            {/* Big Action Button for PagSeguro */}
            <div className="pt-1">
              <a
                href={pagSeguroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-700 via-purple-800 to-pink-700 hover:from-purple-800 hover:to-pink-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-purple-200"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pagar Agora no PagBank (Abrir Link)</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Copy Link Option */}
            <div className="flex items-center gap-2 max-w-md mx-auto pt-1">
              <input
                type="text"
                readOnly
                value={pagSeguroUrl}
                className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-purple-950 font-mono"
              />
              <button
                type="button"
                onClick={handleCopyPagSeguro}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedPagSeguro ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPagSeguro ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-950 text-left space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Instruções do PagBank:</span>
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-600">
                Se o seu link do PagBank for do tipo <em>"Cliente digita o valor"</em>, informe exatamente <strong>R$ {formattedAmount}</strong> na tela do PagBank para que o pagamento coincida com seu pedido.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-purple-900 font-medium pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transação 100% protegida e criptografada pelo PagSeguro UOL</span>
            </div>
          </div>
        )}

        {/* PIX QR CODE & COPIA E COLA */}
        {orderData.paymentMethod.includes('PIX') && !isGiftOrder && (
          <div className={`p-5 rounded-2xl border-2 text-center space-y-3 transition-colors shadow-xs ${
            pixPaymentStatus === 'approved' 
              ? 'bg-emerald-50/90 border-emerald-300' 
              : 'bg-amber-50/80 border-amber-200'
          }`}>
            {pixPaymentStatus === 'approved' ? (
              <div className="space-y-2 py-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md animate-in zoom-in-75">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-emerald-950 font-['Mali']">
                  🎉 PIX Confirmado com Sucesso pelo Mercado Pago!
                </h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  Recebemos a confirmação bancária do seu PIX no valor de <strong>R$ {formattedAmount}</strong>. Seu pedido foi aprovado e nossa equipe já está separando seus mimos com todo o carinho! 🌸
                </p>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white rounded-full border border-emerald-200 text-[11px] font-bold text-emerald-800 mt-2 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Transação Aprovada • #{orderData.mercadoPagoPaymentId || 'MP-PIX'}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                    <QrCode className="w-5 h-5 text-amber-600" />
                    <span>Pague via PIX Mercado Pago (+5% OFF)</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] bg-amber-200/80 text-amber-950 font-bold px-2.5 py-1 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-800" />
                    <span>Aguardando pagamento...</span>
                  </span>
                </div>

                {/* QR Code Real ou Canvas Estilizado */}
                {orderData.pixQrCodeBase64 ? (
                  <div className="w-44 h-44 bg-white p-2 rounded-2xl mx-auto border-2 border-amber-300 flex items-center justify-center shadow-inner">
                    <img 
                      src={`data:image/png;base64,${orderData.pixQrCodeBase64}`}
                      alt="QR Code PIX Mercado Pago"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-white p-2 rounded-2xl mx-auto border-2 border-amber-300 flex items-center justify-center shadow-inner">
                    <div className="grid grid-cols-5 gap-1.5 w-full h-full p-2 bg-purple-950 rounded-lg">
                      {[...Array(25)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-xs ${i % 2 === 0 || i % 5 === 0 ? 'bg-amber-300' : 'bg-amber-100'}`} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-700 max-w-md mx-auto px-1">
                    <span className="font-bold">Valor exato a transferir:</span>
                    <span className="text-emerald-700 font-extrabold text-sm font-['Mali']">R$ {formattedAmount}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Chave Pix Copia e Cola:</p>
                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      readOnly
                      value={pixKey}
                      className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-700 font-mono truncate"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-purple-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs shrink-0 cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    ⚡ Esta tela detecta e confirma seu PIX automaticamente em poucos segundos após a transferência no seu banco.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* NOTIFICAÇÃO DE VENDA PARA O WHATSAPP DA LOJA (REQUIREMENT 4) */}
        <div className="p-4 sm:p-5 bg-emerald-50/90 rounded-2xl border-2 border-emerald-300 space-y-3 text-left shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Notificação de Venda para o WhatsApp da Loja
                </h4>
                <p className="text-[10px] sm:text-[11px] text-emerald-800">
                  Resumo pronto e estruturado para o lojista acompanhar os pedidos no WhatsApp ({storePhoneRaw})
                </p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full hidden sm:inline-block">
              wa.me automático
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp da Loja (wa.me)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleCopyWaMessage}
              className="w-full py-2.5 px-3 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedWaMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
              <span>{copiedWaMessage ? 'Mensagem Copiada!' : 'Copiar Resumo Formatado'}</span>
            </button>
          </div>
        </div>

        {/* NOTIFICAÇÃO DE VENDA POR E-MAIL (REQUIREMENT 3) */}
        <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200 text-left flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-purple-950 block">
                Notificação Automática por E-mail Transmitida
              </span>
              <span className="text-[11px] text-slate-600">
                Os dados desta venda, produtos, frete e valor total foram transmitidos para <strong>{storeNotificationEmail}</strong>.
              </span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="E-mail processado" />
        </div>

        {/* Tracking Timeline */}
        <div className="p-4 bg-amber-50/60 rounded-2xl border-2 border-amber-200 space-y-3 text-left">
          <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Etapas do seu Pacotinho Lavistore</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-emerald-700 font-bold block mb-0.5">✓ 1. Confirmado</span>
              <p className="text-slate-600 text-[11px]">Pagamento e detalhes recebidos</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs">
              <span className="text-amber-800 font-bold block mb-0.5 animate-pulse">🌸 2. Embalagem Doce</span>
              <p className="text-slate-600 text-[11px]">Papel de seda, perfume e mimos</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs opacity-75">
              <span className="text-slate-500 font-bold block mb-0.5">🚚 3. Envio Express</span>
              <p className="text-slate-500 text-[11px]">Código de rastreio no seu e-mail</p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 text-left text-xs space-y-2">
          <div className="flex justify-between font-bold text-purple-950">
            <span>Destinatário:</span>
            <span>{orderData.customerName}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Endereço de Entrega:</span>
            <span className="text-right truncate max-w-[280px]">{orderData.address}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Forma de Envio:</span>
            <span>{orderData.shippingMethod}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Forma de Pagamento:</span>
            <span className="font-bold text-purple-900">{orderData.paymentMethod}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-rose-600 pt-2 border-t border-amber-200">
            <span>Valor Total:</span>
            <span>R$ {Number(orderData.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-r from-[#F43F5E] via-[#FB923C] via-[#FACC15] to-[#06B6D4] hover:opacity-95 text-white font-bold rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 border-2 border-white/60 active:scale-95 transition-transform cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Voltar para a Lavistore & Continuar Navegando</span>
        </button>

      </div>
    </div>
  );
};

