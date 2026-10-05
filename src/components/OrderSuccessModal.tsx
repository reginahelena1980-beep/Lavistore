import React, { useState, useEffect, useMemo } from 'react';
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
  CreditCard,
  ShieldCheck,
  Loader2,
  Info,
  RefreshCw,
  Clock,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TrioFlowersIcon } from './LavistoreLogo';
import { HomePageConfig, OrderData } from '../types';
import { cleanCustomerCpf } from '../utils/documentUtils';
import { updateOrderStatus } from '../services/storeApiService';
import { checkMercadoPagoPaymentStatus, regenerateMercadoPagoPix } from '../services/mercadoPagoClientService';
import { validatePixCopiaECola } from '../services/pixPaymentService';

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
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [pixPaymentStatus, setPixPaymentStatus] = useState<'pending' | 'approved'>(
    orderData?.mercadoPagoStatus === 'approved' ? 'approved' : 'pending'
  );

  // Estados locais para chave Pix atualizada dinamicamente
  const [currentPixKey, setCurrentPixKey] = useState<string>(orderData?.pixQrCode || '');
  const [currentPixBase64, setCurrentPixBase64] = useState<string | null>(orderData?.pixQrCodeBase64 || null);
  const [currentTicketUrl, setCurrentTicketUrl] = useState<string>(orderData?.pixTicketUrl || '');
  const [currentPaymentId, setCurrentPaymentId] = useState<string>(String(orderData?.mercadoPagoPaymentId || ''));
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenSuccess, setRegenSuccess] = useState<string | null>(null);

  // Temporizador de 30 minutos (1800 segundos) para expiração do Pix
  const initialSeconds = useMemo(() => {
    if (orderData?.pixDateOfExpiration || orderData?.pixExpiresAt) {
      const expTime = new Date(orderData.pixDateOfExpiration || orderData.pixExpiresAt).getTime();
      const diff = Math.floor((expTime - Date.now()) / 1000);
      if (!isNaN(diff) && diff > 0) {
        return Math.min(diff, 1800);
      }
    }
    return 30 * 60; // 30 minutos
  }, [orderData?.pixDateOfExpiration, orderData?.pixExpiresAt]);

  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    if (pixPaymentStatus === 'approved') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pixPaymentStatus]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Polling em tempo real para verificar confirmação imediata do PIX no Mercado Pago
  useEffect(() => {
    const targetPaymentId = currentPaymentId || orderData?.mercadoPagoPaymentId;
    if (!targetPaymentId || pixPaymentStatus === 'approved') return;

    let isSubscribed = true;
    let pollCount = 0;
    const maxPolls = 120; // Até 8 minutos

    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls || !isSubscribed) {
        clearInterval(interval);
        return;
      }

      try {
        const result = await checkMercadoPagoPaymentStatus(targetPaymentId);

        if (result.status === 'approved' && isSubscribed) {
          clearInterval(interval);
          setPixPaymentStatus('approved');
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#34D399', '#6EE7B7', '#F472B6']
          });

          // Persiste o pedido como 'pago' no Firestore usando a função existente
          if (orderData?.orderId) {
            try {
              const persistRes = await updateOrderStatus(orderData.orderId, 'pago');
              if (persistRes && persistRes.success === false) {
                console.error('[OrderSuccessModal] Pagamento APROVADO no Mercado Pago, porém houve falha ao persistir no Firestore:', persistRes);
              } else {
                console.info(`[OrderSuccessModal] ✅ Pagamento APROVADO! Pedido #${orderData.orderId} persistido com sucesso como 'pago' no Firestore.`);
              }
            } catch (persistErr: any) {
              // Trata adequadamente erro de persistência para não confundir com pagamento não aprovado
              console.error('[OrderSuccessModal] Pagamento APROVADO no Mercado Pago, porém ocorreu erro ao persistir no Firestore:', persistErr?.message || persistErr);
            }
          }
        }
      } catch (err) {
        console.warn('[OrderSuccessModal] Polling retry...', err);
      }
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentPaymentId, orderData?.mercadoPagoPaymentId, pixPaymentStatus]);

  const paymentMethod = String(orderData?.paymentMethod || '');
  const isCartao = paymentMethod.toLowerCase().includes('cartão') || paymentMethod.toLowerCase().includes('cartao');
  const isPix = paymentMethod.toLowerCase().includes('pix') || Boolean(orderData?.pixQrCode);

  const isGiftOrder = Number(orderData?.total || 0) === 0 || 
                      String(orderData?.couponApplied || '').toUpperCase() === 'BRINDE' || 
                      paymentMethod.toLowerCase().includes('brinde') || 
                      paymentMethod.toLowerCase().includes('cortesia');

  useEffect(() => {
    if (isGiftOrder) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#EC4899', '#A855F7', '#F59E0B', '#10B981']
        });
      } catch {}
    }
  }, [isGiftOrder]);

  if (!orderData) return null;

  const isMercadoPagoPayment = Boolean(currentPaymentId || orderData.mercadoPagoPaymentId) || 
                               paymentMethod.includes('Mercado Pago') ||
                               Boolean(currentPixKey);


  const handleCopyPix = () => {
    if (!currentPixKey) return;
    navigator.clipboard.writeText(currentPixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const formattedAmount = Number(orderData.total || 0).toFixed(2);

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(formattedAmount);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2500);
  };

  // Função para gerar um novo Pix quando expirar ou falhar no banco (ex: C6 Bank)
  const handleRegeneratePix = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegenError(null);
    setRegenSuccess(null);

    try {
      const res = await regenerateMercadoPagoPix({
        orderId: orderData.orderId,
        amount: Number(orderData.total || 0),
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerCpf: cleanCustomerCpf(orderData.customerCpf),
        expirationMinutes: 30
      });

      if (res.success && res.pixQrCode) {
        setCurrentPixKey(res.pixQrCode);
        setCurrentPixBase64(res.pixQrCodeBase64 || null);
        if (res.pixTicketUrl) setCurrentTicketUrl(res.pixTicketUrl);
        if (res.paymentId) setCurrentPaymentId(res.paymentId);
        setTimeLeft(30 * 60);
        setRegenSuccess('Novo Pix gerado com sucesso! Válido por mais 30 minutos.');
        setTimeout(() => setRegenSuccess(null), 6000);
      } else {
        setRegenError(res.error || 'Não foi possível gerar um novo código Pix. Tente novamente em instantes.');
      }
    } catch (err: any) {
      setRegenError(err?.message || 'Erro de conexão ao gerar novo código Pix.');
    } finally {
      setIsRegenerating(false);
    }
  };

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
        {isCartao && isMercadoPagoPayment && !isGiftOrder && (
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
                <span className="font-mono font-bold text-purple-900">#{orderData?.mercadoPagoPaymentId || 'MP-' + Math.floor(10000000 + Math.random() * 90000000)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Cobrado:</span>
                <span className="font-bold text-emerald-700">R$ {formattedAmount}</span>
              </div>
              {orderData?.cardInstallments && (
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

        {/* PIX QR CODE & COPIA E COLA */}
        {isPix && !isGiftOrder && (
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
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                    <QrCode className="w-5 h-5 text-amber-600" />
                    <span>Pague via PIX Mercado Pago (+5% OFF)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Countdown Timer Badge de Expiração (30 min) */}
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border shadow-2xs ${
                      timeLeft <= 0 
                        ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                        : timeLeft < 300
                          ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                          : 'bg-purple-100 text-purple-900 border-purple-200'
                    }`}>
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>{timeLeft <= 0 ? 'Expirado' : `Expira em: ${formatCountdown(timeLeft)}`}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] bg-amber-200/80 text-amber-950 font-bold px-2.5 py-1 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-800" />
                      <span>Aguardando transferência...</span>
                    </span>
                  </div>
                </div>

                {/* Alerta de Expiração */}
                {timeLeft <= 0 && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs font-bold text-rose-900 flex items-center justify-between gap-2 animate-in fade-in max-w-md mx-auto">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>O tempo deste Pix expirou. Gere um novo código para pagar com segurança.</span>
                    </div>
                  </div>
                )}

                {/* QR Code Real de Alta Resolução (Escaneável em qualquer aplicativo bancário) */}
                <div className="relative w-52 h-52 bg-white p-3 rounded-2xl mx-auto border-2 border-amber-300 flex items-center justify-center shadow-md">
                  <img 
                    src={currentPixBase64 ? (currentPixBase64.startsWith('data:') ? currentPixBase64 : `data:image/png;base64,${currentPixBase64}`) : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(currentPixKey)}`}
                    alt="QR Code PIX Mercado Pago"
                    className={`w-full h-full object-contain rounded-lg transition-opacity ${timeLeft <= 0 ? 'opacity-30 grayscale' : 'opacity-100'}`}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('quickchart.io')) {
                        target.src = `https://quickchart.io/qr?size=300&text=${encodeURIComponent(currentPixKey)}`;
                      }
                    }}
                  />
                  {timeLeft <= 0 && (
                    <div className="absolute inset-0 bg-white/80 rounded-2xl flex flex-col items-center justify-center p-3 text-center">
                      <Clock className="w-8 h-8 text-rose-500 mb-1" />
                      <span className="text-xs font-bold text-rose-700">QR Code Expirado</span>
                      <span className="text-[10px] text-slate-500">Clique abaixo para gerar um novo Pix</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-white/95 rounded-xl border border-amber-200 flex items-center justify-between text-xs max-w-md mx-auto">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Valor exato a pagar:</span>
                      <strong className="text-emerald-700 text-base font-extrabold font-['Mali']">R$ {formattedAmount}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-purple-950 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                      <span>{copiedAmount ? 'Copiado!' : 'Copiar Valor'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 text-left max-w-md mx-auto">
                    <label className="text-xs text-slate-700 font-bold block">Código Pix Copia e Cola Oficial (com txid dinâmico):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={currentPixKey}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-700 font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-purple-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-xs shrink-0 cursor-pointer"
                      >
                        {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                      </button>
                    </div>
                    {currentPixKey && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-semibold pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Código Pix Oficial verificado</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback de Notificações de Regeneração do Pix */}
                  {regenSuccess && (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 max-w-md mx-auto animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{regenSuccess}</span>
                    </div>
                  )}

                  {regenError && (
                    <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2 max-w-md mx-auto animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{regenError}</span>
                    </div>
                  )}

                  {/* BOTÃO ATUALIZAR / GERAR NOVO PIX */}
                  <div className="pt-1 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={handleRegeneratePix}
                      disabled={isRegenerating}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-purple-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-amber-300"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-950" />
                          <span>Gerando Novo Pix no Mercado Pago...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 text-purple-950" />
                          <span>Atualizar / Gerar Novo Pix (30 min)</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-1">
                      O seu banco (ex: C6 Bank, Itaú, Nubank) informou <em>"conta digitada incorretamente"</em> ou o código expirou? Clique para gerar um novo Pix atualizado.
                    </p>
                  </div>

                  {currentTicketUrl && (
                    <div className="max-w-md mx-auto pt-1">
                      <a
                        href={currentTicketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs hover:shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                        <span>Abrir Comprovante Oficial no Mercado Pago</span>
                      </a>
                    </div>
                  )}

                  {/* ORIENTAÇÕES ESPECÍFICAS PARA C6 BANK E BANCOS DIGITAIS */}
                  <div className="p-3 bg-white/95 rounded-xl border border-amber-200/90 text-left max-w-md mx-auto space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-purple-950">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Instruções para C6 Bank, Nubank, Itaú e outros:</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
                      <li>
                        Abra o app do seu banco, escolha <strong>Pix Copia e Cola</strong> e cole o código acima (não use a opção de transferir para chave e-mail/CPF manual).
                      </li>
                      <li>
                        Cobranças Pix Imediatas têm validade de <strong>30 minutos</strong>. Se você demorar para pagar, clique no botão <strong>Atualizar / Gerar Novo Pix</strong> acima.
                      </li>
                      <li>
                        Por normas de segurança bancária do Banco Central, a conta que transfere não pode ser do mesmo CPF da conta recebedora do lojista.
                      </li>
                    </ul>
                  </div>


                  <span className="text-[10px] text-slate-500 block pt-1">
                    ⚡ Esta tela detecta e confirma seu PIX automaticamente em poucos segundos após a transferência no seu banco.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

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
            <span>{orderData?.customerName || 'Cliente'}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Endereço de Entrega:</span>
            <span className="text-right truncate max-w-[280px]">{orderData?.address || '-'}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Forma de Envio:</span>
            <span>{orderData?.shippingMethod || 'Envio Padrão'}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Forma de Pagamento:</span>
            <span className="font-bold text-purple-900">{orderData?.paymentMethod || 'PIX Instantâneo'}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-rose-600 pt-2 border-t border-amber-200">
            <span>Valor Total:</span>
            <span>R$ {Number(orderData?.total || 0).toFixed(2)}</span>
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

