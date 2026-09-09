import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  CreditCard, 
  QrCode, 
  Barcode, 
  ShieldCheck, 
  Truck, 
  Flower2, 
  Sparkles, 
  Copy, 
  ArrowRight,
  Gift,
  Tag,
  Loader2,
  MapPin,
  AlertCircle,
  Info,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, ShippingOption, Coupon, HomePageConfig, OrderData } from '../types';
import { evaluateCoupon } from '../utils/couponUtils';
import { DEFAULT_COUPONS } from '../data/coupons';
import { calculateMelhorEnvioShipping, formatCep, isValidCep, getShippingConfig } from '../services/shippingService';
import { fetchAddressByCep } from '../services/cepService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  appliedCoupon?: string | null;
  setAppliedCoupon?: (coupon: string | null) => void;
  onOrderSuccess: (orderData: OrderData) => void;
  selectedShippingOption?: ShippingOption | null;
  setSelectedShippingOption?: (option: ShippingOption | null) => void;
  destinationCep?: string;
  setDestinationCep?: (cep: string) => void;
  availableCoupons?: Coupon[];
  homePageConfig?: HomePageConfig;
  onOpenReturnPolicy?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  discountAmount: initialDiscountAmount,
  appliedCoupon: externalAppliedCoupon,
  setAppliedCoupon: setExternalAppliedCoupon,
  onOrderSuccess,
  selectedShippingOption: externalSelectedShipping,
  setSelectedShippingOption: setExternalSelectedShipping,
  destinationCep: externalCep,
  setDestinationCep: setExternalCep,
  availableCoupons = DEFAULT_COUPONS,
  homePageConfig,
  onOpenReturnPolicy
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
  
  // Customer info state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');

  // Address
  const [cep, setCep] = useState(externalCep || '');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Credit Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState('1');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  // Mercado Pago config & Brick status
  const [mpConfig, setMpConfig] = useState<{
    publicKey: string;
    isConfigured: boolean;
    hasCustomPublicKey: boolean;
    environment: string;
  } | null>(null);
  const [brickActive, setBrickActive] = useState(false);
  const [isBrickReady, setIsBrickReady] = useState(false);

  // Extra gift flag
  const [hidePrices, setHidePrices] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Cupom de Desconto / Frete Grátis
  const [checkoutCoupon, setCheckoutCoupon] = useState(externalAppliedCoupon || '');
  const [couponInputText, setCouponInputText] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Frete Real - Melhor Envio
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(externalSelectedShipping || null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [melhorEnvioStatus, setMelhorEnvioStatus] = useState<{ configured: boolean; env: string } | null>(null);

  // Auto-preenchimento de Endereço via CEP (ViaCEP / BrasilAPI)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);

  // Busca e preenche endereço completo a partir do CEP
  const fetchAddress = async (targetCep: string) => {
    if (!isValidCep(targetCep)) return;
    setIsLoadingAddress(true);
    setAddressNotice(null);

    try {
      const addr = await fetchAddressByCep(targetCep);
      if (addr && (addr.street || addr.city)) {
        if (addr.street) setStreet(addr.street);
        if (addr.district) setDistrict(addr.district);
        if (addr.city) setCity(addr.city);
        if (addr.state) setState(addr.state);
        if (addr.complement && !complement) setComplement(addr.complement);

        setAddressNotice('Endereço preenchido automaticamente ✨');

        // Foca automaticamente no campo "Número" para facilitar para o cliente
        setTimeout(() => {
          const numberInput = document.getElementById('checkout_address_number');
          if (numberInput) numberInput.focus();
        }, 150);
      } else {
        setAddressNotice(null);
      }
    } catch (e) {
      console.warn('Falha no auto-preenchimento do CEP:', e);
      setAddressNotice(null);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Carrega status das credenciais do Mercado Pago
  useEffect(() => {
    fetch('/api/mercadopago/config')
      .then(r => r.json())
      .then(data => setMpConfig(data))
      .catch(err => console.warn('Aviso: endpoint Mercado Pago config:', err));
  }, []);

  // Sincroniza cupom externo
  useEffect(() => {
    if (externalAppliedCoupon !== undefined && externalAppliedCoupon !== checkoutCoupon) {
      setCheckoutCoupon(externalAppliedCoupon || '');
    }
  }, [externalAppliedCoupon]);

  // Sincroniza frete selecionado previamente na etapa anterior
  useEffect(() => {
    if (externalSelectedShipping) {
      setSelectedOption(externalSelectedShipping);
    }
  }, [externalSelectedShipping]);

  // Sincroniza CEP externo
  useEffect(() => {
    if (externalCep && externalCep !== cep) {
      setCep(externalCep);
    }
  }, [externalCep]);

  // Carrega status da API do Melhor Envio
  useEffect(() => {
    getShippingConfig().then(cfg => {
      setMelhorEnvioStatus({ configured: cfg.configured, env: cfg.env });
    });
  }, []);

  // Busca opções de frete assim que o modal abre ou o CEP mudar
  const fetchShipping = async (targetCep: string) => {
    if (!isValidCep(targetCep) || items.length === 0) return;
    setIsLoadingShipping(true);
    setShippingError(null);

    try {
      const res = await calculateMelhorEnvioShipping(targetCep, items);
      if (res.options && res.options.length > 0) {
        setShippingOptions(res.options);

        // Preserva rigorosamente o frete calculado e selecionado na etapa anterior
        const preferredOption = selectedOption || externalSelectedShipping;
        let chosen: ShippingOption | undefined;

        if (preferredOption) {
          chosen = res.options.find(o => o.id === preferredOption.id)
            || res.options.find(o => o.name.toLowerCase() === preferredOption.name.toLowerCase())
            || res.options.find(o => o.carrier.toLowerCase() === preferredOption.carrier.toLowerCase() && Math.abs(o.price - preferredOption.price) < 2)
            || res.options.find(o => o.carrier.toLowerCase() === preferredOption.carrier.toLowerCase());
        }

        // Se ainda não havia nenhuma escolhida, adota a mais em conta ou a primeira
        if (!chosen) {
          chosen = [...res.options].sort((a, b) => a.price - b.price)[0] || res.options[0];
        }

        setSelectedOption(chosen);
        if (setExternalSelectedShipping) {
          setExternalSelectedShipping(chosen);
        }
      } else {
        setShippingError('Nenhuma opção de frete encontrada para este CEP.');
      }
    } catch (err: any) {
      console.error('Erro ao consultar Melhor Envio:', err);
      setShippingError(err.message || 'Erro ao consultar taxas do Melhor Envio.');
    } finally {
      setIsLoadingShipping(false);
    }
  };

  useEffect(() => {
    if (isOpen && isValidCep(cep)) {
      if (!street) {
        fetchAddress(cep);
      }
      fetchShipping(cep);
    }
  }, [isOpen]);

  // Lógica de cálculo do cupom
  const couponEvaluation = evaluateCoupon(checkoutCoupon, subtotal, 0, availableCoupons);
  const isFreeShippingCoupon = couponEvaluation.isFreeShipping;
  const FREE_SHIPPING_THRESHOLD = 149.00;
  const isFreeShippingEligible = isFreeShippingCoupon || subtotal >= FREE_SHIPPING_THRESHOLD;

  // Desconto no subtotal dos produtos (ex: LAVI10, FLORZINHA)
  const currentDiscountAmount = couponEvaluation.calculatedDiscount;

  // Valor do Frete Selecionado (preserva o valor previamente escolhido/calculado)
  const baseShippingCost = selectedOption 
    ? selectedOption.price 
    : (externalSelectedShipping ? externalSelectedShipping.price : (shippingOptions[0]?.price ?? 13.38));
  const finalShippingCost = isFreeShippingEligible ? 0 : baseShippingCost;

  // Desconto PIX de 5%
  const pixDiscount = paymentMethod === 'pix' ? (subtotal - currentDiscountAmount) * 0.05 : 0;

  // Total Final
  const finalOrderTotal = Math.max(0, subtotal - currentDiscountAmount - pixDiscount + finalShippingCost);

  // Aplicação do Cupom
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInputText.trim()) return;

    const evalResult = evaluateCoupon(couponInputText, subtotal, 0, availableCoupons);
    if (evalResult.isValid) {
      setCheckoutCoupon(evalResult.code);
      if (setExternalAppliedCoupon) {
        setExternalAppliedCoupon(evalResult.code);
      }
      setCouponFeedback({ message: evalResult.message, isError: false });
      setCouponInputText('');
    } else {
      setCouponFeedback({ message: evalResult.message, isError: true });
    }
  };

  const handleRemoveCoupon = () => {
    setCheckoutCoupon('');
    if (setExternalAppliedCoupon) {
      setExternalAppliedCoupon(null);
    }
    setCouponFeedback({ message: 'Cupom removido.', isError: false });
  };

  // Inicialização do Mercado Pago Payment Brick
  useEffect(() => {
    if (!isOpen) return;

    let timer: any;
    const tryInitBrick = async () => {
      if (typeof window !== 'undefined' && window.MercadoPago && mpConfig?.publicKey) {
        const container = document.getElementById('paymentBrick_container');
        if (container) {
          try {
            if (window.paymentBrickController) {
              try {
                window.paymentBrickController.unmount();
              } catch (e) {}
            }
            const mp = new window.MercadoPago(mpConfig.publicKey, { locale: 'pt-BR' });
            const bricksBuilder = mp.bricks();

            window.paymentBrickController = await bricksBuilder.create(
              'payment',
              'paymentBrick_container',
              {
                initialization: {
                  amount: Number(finalOrderTotal.toFixed(2)),
                  payer: {
                    email: customerEmail,
                    firstName: customerName.split(' ')[0] || 'Cliente',
                    lastName: customerName.split(' ').slice(1).join(' ') || 'Lavistore',
                    identification: {
                      type: 'CPF',
                      number: customerCpf.replace(/\D/g, '') || '12345678900'
                    }
                  }
                },
                customization: {
                  paymentMethods: {
                    creditCard: 'all',
                    bankTransfer: ['pix'],
                    maxInstallments: 12
                  },
                  visual: {
                    style: {
                      theme: 'default'
                    }
                  }
                },
                callbacks: {
                  onReady: () => {
                    setIsBrickReady(true);
                  },
                  onSubmit: ({ selectedPaymentMethod, formData }: any) => {
                    return new Promise((resolve, reject) => {
                      executeMercadoPagoPayment({
                        ...formData,
                        selectedPaymentMethod
                      })
                        .then(() => resolve(undefined))
                        .catch((err) => reject(err));
                    });
                  },
                  onError: (error: any) => {
                    console.warn('[Mercado Pago Brick] Evento de erro:', error);
                  }
                }
              }
            );
          } catch (initErr) {
            console.warn('[Mercado Pago] Aviso na inicialização do Brick:', initErr);
          }
        }
      }
    };

    if (brickActive) {
      timer = setTimeout(tryInitBrick, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, brickActive, mpConfig, finalOrderTotal]);

  // Processamento unificado no Mercado Pago (Payment Brick ou Formulário Seguro Transparente)
  const executeMercadoPagoPayment = async (customFormData?: any) => {
    setIsProcessing(true);
    setPaymentErrorMessage(null);

    const cleanCpf = customerCpf.replace(/\D/g, '') || '12345678900';
    const isPix = paymentMethod === 'pix' || customFormData?.selectedPaymentMethod === 'bank_transfer';
    const chosenInstallments = Number(customFormData?.installments || installments || 1);

    const baseOrderData: OrderData = {
      orderId: `LAVI-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('pt-BR'),
      customerName,
      customerEmail,
      customerPhone,
      customerCpf,
      address: `${street}, ${number} ${complement ? complement + ' ' : ''}- ${district}, ${city}/${state} - CEP: ${cep}`,
      paymentMethod: isPix ? 'PIX Instantâneo (Mercado Pago)' : `Cartão de Crédito (${chosenInstallments}x) - Mercado Pago`,
      shippingMethod: selectedOption ? `${selectedOption.carrier} (${selectedOption.name})` : 'Correios PAC',
      shippingDeadline: selectedOption?.deadline || '3 a 6 dias úteis',
      items,
      subtotal,
      discountAmount: currentDiscountAmount + pixDiscount,
      couponApplied: checkoutCoupon || null,
      isFreeShippingApplied: isFreeShippingCoupon,
      shippingCost: finalShippingCost,
      total: finalOrderTotal,
      hidePrices,
      notes: orderNotes
    };

    try {
      let finalToken = customFormData?.token;
      let finalPaymentMethodId = customFormData?.payment_method_id || (isPix ? 'pix' : 'visa');
      let finalIssuerId = customFormData?.issuer_id;

      // Se for Cartão de Crédito e não veio com token do Payment Brick, tokeniza os dados do cartão de forma segura
      if (!isPix && !finalToken) {
        const cleanCard = cardNumber.replace(/\D/g, '');
        const cleanCvv = cardCvv.replace(/\D/g, '');
        const [expMonth, expYearRaw] = cardExpiry.split('/').map((s) => s.trim());

        if (!cleanCard || cleanCard.length < 13) {
          setPaymentErrorMessage('Por favor, informe o número completo do cartão de crédito (13 a 19 dígitos).');
          setIsProcessing(false);
          return;
        }

        if (!cardHolder.trim()) {
          setPaymentErrorMessage('Por favor, informe o nome do titular como impresso no cartão.');
          setIsProcessing(false);
          return;
        }

        if (!expMonth || !expYearRaw) {
          setPaymentErrorMessage('Por favor, informe a validade do cartão no formato MM/AA.');
          setIsProcessing(false);
          return;
        }

        if (!cleanCvv || cleanCvv.length < 3) {
          setPaymentErrorMessage('Por favor, informe o código de segurança (CVV) do cartão (3 ou 4 dígitos).');
          setIsProcessing(false);
          return;
        }

        // Tokenização real na API oficial do Mercado Pago via endpoint seguro
        const tokenResp = await fetch('/api/mercadopago/tokenize_card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: cleanCard,
            cardholderName: cardHolder,
            cardExpirationMonth: expMonth,
            cardExpirationYear: expYearRaw,
            securityCode: cleanCvv,
            identificationNumber: cleanCpf
          })
        });

        const tokenData = await tokenResp.json();

        if (!tokenResp.ok || !tokenData.token) {
          setPaymentErrorMessage(tokenData.error || 'Dados do cartão incorretos ou não autorizados pelo Mercado Pago.');
          setIsProcessing(false);
          return;
        }

        finalToken = tokenData.token;
        if (tokenData.payment_method_id) {
          finalPaymentMethodId = tokenData.payment_method_id;
        }
      }

      const payload = {
        token: finalToken,
        payment_method_id: finalPaymentMethodId,
        issuer_id: finalIssuerId,
        transaction_amount: Number(finalOrderTotal.toFixed(2)),
        installments: chosenInstallments,
        payer: {
          email: customerEmail,
          first_name: customerName.split(' ')[0] || 'Cliente',
          last_name: customerName.split(' ').slice(1).join(' ') || 'Lavistore',
          identification: {
            type: 'CPF',
            number: cleanCpf
          }
        },
        orderData: baseOrderData
      };

      const response = await fetch('/api/mercadopago/process_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'O pagamento não foi autorizado pelo banco emissor do cartão.';
        setPaymentErrorMessage(errorMsg);
        setIsProcessing(false);
        return;
      }

      // Efeito de confetes florais SOMENTE quando o pagamento for realmente aprovado / pedido confirmado
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#C084FC', '#F472B6', '#FBCFE8', '#DDD6FE', '#FDE047']
      });

      onOrderSuccess(result.order || baseOrderData);
    } catch (err: any) {
      console.error('[Checkout] Erro ao processar no Mercado Pago:', err);
      setPaymentErrorMessage(err.message || 'Falha ao processar pagamento com o Mercado Pago. Por favor, verifique os dados ou tente com outro cartão/PIX.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Finalizar Pedido
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    executeMercadoPagoPayment();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in font-['Comfortaa']">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-purple-100 relative text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-200">
              <Flower2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Playfair_Display'] font-bold text-lg text-purple-950">Finalizar Compra Encantada</h3>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-purple-600 font-medium">Ambiente 100% Seguro com Criptografia SSL</p>
                {melhorEnvioStatus && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    melhorEnvioStatus.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {melhorEnvioStatus.configured ? 'Melhor Envio Real Conectado' : 'Melhor Envio Ativo'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            id="btn-close-checkout-modal"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-purple-100 text-purple-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePlaceOrder} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Coluna Esquerda: Formulário */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Etapa 1: Dados de Contato */}
              <div className="bg-purple-50/40 p-4 sm:p-5 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h4 className="font-bold text-sm text-purple-950">Dados de Contato</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">E-mail para Rastreio</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">WhatsApp / Celular</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                </div>
              </div>

              {/* Etapa 2: Endereço de Entrega & Cotação Real de Frete via Melhor Envio */}
              <div className="bg-purple-50/40 p-4 sm:p-5 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <h4 className="font-bold text-sm text-purple-950">Endereço de Entrega & Frete Real</h4>
                  </div>
                  <span className="text-[10px] text-purple-600 flex items-center gap-1 font-semibold">
                    <Truck className="w-3.5 h-3.5 text-pink-500" />
                    Melhor Envio
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-purple-900 block">CEP de Destino</label>
                      {isLoadingAddress && (
                        <span className="text-[9px] text-pink-600 font-medium flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buscando...
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        id="checkout_address_cep"
                        required
                        value={cep}
                        maxLength={9}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value);
                          setCep(formatted);
                          if (setExternalCep) setExternalCep(formatted);
                          if (isValidCep(formatted)) {
                            fetchAddress(formatted);
                            fetchShipping(formatted);
                          }
                        }}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 font-bold focus:ring-2 focus:ring-pink-400"
                      />
                    </div>
                    {addressNotice && !isLoadingAddress && (
                      <p className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        {addressNotice}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Rua / Avenida</label>
                    <input
                      type="text"
                      id="checkout_address_street"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Nome da rua ou avenida"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Número</label>
                    <input
                      type="text"
                      id="checkout_address_number"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Nº"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Complemento</label>
                    <input
                      type="text"
                      id="checkout_address_complement"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Bloco, etc."
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Bairro</label>
                    <input
                      type="text"
                      id="checkout_address_district"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Bairro"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Cidade</label>
                    <input
                      type="text"
                      id="checkout_address_city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      id="checkout_address_state"
                      required
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 font-bold uppercase focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                </div>

                {/* Opções de Frete Retornadas pelo Melhor Envio */}
                <div className="mt-3 pt-3 border-t border-purple-200/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-purple-900 block">
                      Opções Reais de Envio Disponíveis:
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchShipping(cep)}
                      disabled={isLoadingShipping}
                      className="text-[10px] text-pink-600 hover:text-pink-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {isLoadingShipping ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔄 Atualizar Frete'}
                    </button>
                  </div>

                  {shippingError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{shippingError}</span>
                    </div>
                  )}

                  {isLoadingShipping ? (
                    <div className="p-4 bg-white/70 rounded-2xl border border-purple-100 flex items-center justify-center gap-2 text-purple-800 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      <span>Consultando cotações no Melhor Envio (Correios & Jadlog)...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(shippingOptions.length > 0 ? shippingOptions : [
                        { id: 'melhor-envio-correios-pac', name: 'Correios PAC', carrier: 'Correios', deadline: '3 a 6 dias úteis', price: 12.90 },
                        { id: 'melhor-envio-jadlog-package', name: 'Jadlog .Package', carrier: 'Jadlog', deadline: '2 a 4 dias úteis', price: 14.90 },
                        { id: 'melhor-envio-correios-sedex', name: 'Correios SEDEX', carrier: 'Correios', deadline: '1 a 2 dias úteis', price: 22.90 }
                      ]).map(ship => {
                        const isSelected = selectedOption?.id === ship.id || (selectedOption?.name === ship.name && selectedOption?.carrier === ship.carrier);

                        return (
                          <div
                            key={ship.id}
                            onClick={() => {
                              setSelectedOption(ship as any);
                              if (setExternalSelectedShipping) {
                                setExternalSelectedShipping(ship as any);
                              }
                            }}
                            className={`p-3 rounded-2xl border cursor-pointer text-xs transition-all relative ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/90 ring-2 ring-purple-300 shadow-xs'
                                : 'border-purple-200 bg-white hover:bg-purple-50/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-purple-950 font-bold">{ship.name}</p>
                                  <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-md font-semibold">
                                    {ship.carrier}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">Prazo: {ship.deadline}</p>
                              </div>
                              <input
                                type="radio"
                                name="checkout_shipping_option"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedOption(ship as any);
                                  if (setExternalSelectedShipping) setExternalSelectedShipping(ship as any);
                                }}
                                className="accent-purple-600 mt-1 cursor-pointer"
                              />
                            </div>

                            <div className="mt-2 pt-1 border-t border-purple-100/70 flex items-baseline justify-between">
                              <span className="text-[10px] text-slate-500">Valor do frete:</span>
                              {isFreeShippingEligible ? (
                                <div className="text-right">
                                  <span className="text-[10px] line-through text-slate-400 mr-1.5">
                                    R$ {ship.price.toFixed(2)}
                                  </span>
                                  <span className="text-xs font-extrabold text-emerald-600">
                                    R$ 0,00 {isFreeShippingCoupon ? '(Cupom) 🎁' : 'GRÁTIS 🚚'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-extrabold text-pink-600">
                                  R$ {ship.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isFreeShippingCoupon && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Cupom <strong>{checkoutCoupon || 'FRETE GRÁTIS'}</strong> ativo: O valor do frete foi zerado para R$ 0,00! 🌸
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Etapa 3: Forma de Pagamento */}
              <div className="bg-purple-50/40 p-4 sm:p-5 rounded-2xl border border-purple-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h4 className="font-bold text-sm text-purple-950">Forma de Pagamento</h4>
                </div>

                {paymentErrorMessage && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-rose-900">Pagamento não autorizado:</p>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">{paymentErrorMessage}</p>
                      <p className="text-[11px] text-rose-700">
                        Dica: Se preferir, você pode selecionar a opção <strong>PIX Instantâneo</strong> com 5% de desconto automático.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('pix');
                    }}
                    className={`py-3.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'border-pink-500 bg-pink-50 text-pink-900 ring-2 ring-pink-300 shadow-xs'
                        : 'border-purple-200 bg-white text-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-pink-600" />
                    <span className="text-xs">PIX Instantâneo</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">+5% OFF • Mercado Pago</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('credit');
                    }}
                    className={`py-3.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'credit'
                        ? 'border-purple-600 bg-purple-100 text-purple-950 ring-2 ring-purple-300 shadow-xs'
                        : 'border-purple-200 bg-white text-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <span className="text-xs">Cartão de Crédito</span>
                    <span className="text-[9px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">Mercado Pago até 12x</span>
                  </button>
                </div>

                {/* Container Oficial Mercado Pago Payment Brick (quando ativado) */}
                <div id="paymentBrick_container" className="empty:hidden my-2"></div>

                {paymentMethod === 'pix' && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>PIX Mercado Pago • 5% OFF Automático</span>
                      </p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Aprovação em Segundos
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Ao clicar em <strong>Confirmar e Finalizar Pedido</strong>, o Mercado Pago gerará dinamicamente o <strong>QR Code oficial</strong> e a chave <strong>Pix Copia e Cola</strong> com o valor exato do pedido (R$ {finalOrderTotal.toFixed(2)} já com frete e descontos).
                    </p>

                    <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
                      <span>Total cobrado via PIX:</span>
                      <strong className="text-emerald-700 text-sm font-bold">R$ {finalOrderTotal.toFixed(2)}</strong>
                    </div>

                    {!brickActive && (
                      <button
                        type="button"
                        onClick={() => setBrickActive(true)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ativar componente visual Mercado Pago Payment Brick</span>
                      </button>
                    )}
                  </div>
                )}

                {paymentMethod === 'credit' && (
                  <div className="p-4 bg-purple-50/80 rounded-2xl border-2 border-purple-200 text-xs text-purple-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-purple-950">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Checkout Transparente Mercado Pago</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Criptografia PCI-DSS
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      Preencha os dados do seu cartão diretamente no site com total segurança. O pagamento é processado instantaneamente pela infraestrutura oficial do Mercado Pago.
                    </p>

                    {/* Campos Seguros de Cartão Direto no Site */}
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Número do Cartão de Crédito
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <CreditCard className="w-4 h-4 text-purple-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Nome do Titular (Como impresso no cartão)
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="Nome impresso no cartão"
                          className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs uppercase font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Validade (MM/AA)
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/AA"
                            maxLength={5}
                            className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            CVV (Código de Segurança)
                          </label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="CVV"
                            maxLength={4}
                            className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      </div>

                      {/* Parcelamento Dinâmico Mercado Pago */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Quantidade de Parcelas (Mercado Pago em até 12x)
                        </label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                        >
                          <option value="1">1x de R$ {finalOrderTotal.toFixed(2)} (à vista)</option>
                          <option value="2">2x de R$ {(finalOrderTotal / 2).toFixed(2)} sem juros</option>
                          <option value="3">3x de R$ {(finalOrderTotal / 3).toFixed(2)} sem juros</option>
                          <option value="4">4x de R$ {(finalOrderTotal / 4).toFixed(2)}</option>
                          <option value="6">6x de R$ {(finalOrderTotal / 6).toFixed(2)}</option>
                          <option value="10">10x de R$ {(finalOrderTotal / 10).toFixed(2)}</option>
                          <option value="12">12x de R$ {(finalOrderTotal / 12).toFixed(2)}</option>
                        </select>
                      </div>
                    </div>

                    {!brickActive && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setBrickActive(true)}
                          className="text-[10px] text-purple-700 hover:text-purple-900 underline font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Carregar componente visual nativo Mercado Pago Payment Brick</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-purple-200/60">
                      <span>Processador oficial: Mercado Pago</span>
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Transação Protegida
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Opções de Presente */}
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-bold text-pink-950">Omitir valores na nota fiscal para presente?</span>
                </div>
                <input
                  type="checkbox"
                  checked={hidePrices}
                  onChange={(e) => setHidePrices(e.target.checked)}
                  className="w-4 h-4 text-pink-500 rounded accent-pink-500 cursor-pointer"
                />
              </div>

            </div>

            {/* Coluna Direita: Resumo do Pedido com Campo de Cupom Integrado */}
            <div className="lg:col-span-5 bg-gradient-to-br from-purple-950 to-purple-900 text-white p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl self-start sticky top-20">
              <h4 className="font-['Playfair_Display'] font-bold text-base text-purple-100 border-b border-purple-800 pb-3">
                Resumo do Pedido ({items.length} itens)
              </h4>

              {/* Lista de Itens */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-purple-800/60">
                    <div className="truncate max-w-[190px]">
                      <p className="font-medium text-purple-100 truncate">{item.quantity}x {item.product.name}</p>
                      {item.selectedColor && <span className="text-[8px] text-purple-300">({item.selectedColor})</span>}
                    </div>
                    <span className="font-bold text-pink-300">
                      R$ {((item.product.price + (item.isGiftWrapped ? 5.90 : 0)) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* CAMPO DE CUPOM NO CHECKOUT */}
              <div className="bg-purple-900/60 p-3 rounded-2xl border border-purple-800 space-y-2">
                <label className="text-[11px] font-bold text-pink-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-pink-400" />
                  <span>Possui um cupom de desconto ou frete grátis?</span>
                </label>

                {checkoutCoupon ? (
                  <div className="flex items-center justify-between bg-pink-500/20 px-3 py-2 rounded-xl border border-pink-400/40 text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-pink-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Cupom Ativo: <strong>{checkoutCoupon}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] text-rose-300 hover:text-rose-100 underline font-bold cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponInputText}
                      onChange={(e) => setCouponInputText(e.target.value)}
                      placeholder="Ex: FRETEGRATIS ou LAVI10"
                      className="flex-1 px-3 py-1.5 bg-purple-950/80 border border-purple-700 rounded-xl text-xs text-white placeholder-purple-400 uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs"
                    >
                      Aplicar
                    </button>
                  </div>
                )}

                {couponFeedback && (
                  <p className={`text-[10px] font-semibold ${couponFeedback.isError ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {couponFeedback.message}
                  </p>
                )}
              </div>

              {/* Detalhes de Preço */}
              <div className="space-y-1.5 text-xs text-purple-200 border-t border-purple-800/80 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>

                {currentDiscountAmount > 0 && (
                  <div className="flex justify-between text-pink-300 font-semibold">
                    <span>Desconto do Cupom ({checkoutCoupon}):</span>
                    <span>- R$ {currentDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                {pixDiscount > 0 && (
                  <div className="flex justify-between text-emerald-300 font-semibold">
                    <span>Desconto Especial PIX (5%):</span>
                    <span>- R$ {pixDiscount.toFixed(2)}</span>
                  </div>
                )}

                {/* Linha de Frete com indicação clara de cupom zerado */}
                <div className="flex justify-between items-center">
                  <span>
                    Frete ({selectedOption ? selectedOption.carrier : 'Melhor Envio'}):
                  </span>
                  <div>
                    {isFreeShippingEligible ? (
                      <div className="text-right">
                        {baseShippingCost > 0 && (
                          <span className="text-[10px] line-through text-purple-400 mr-1.5">
                            R$ {baseShippingCost.toFixed(2)}
                          </span>
                        )}
                        <span className="text-emerald-300 font-extrabold text-xs">
                          R$ 0,00 {isFreeShippingCoupon ? '(Cupom Frete Grátis) 🎁' : 'GRÁTIS 🚚'}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-white">
                        R$ {finalShippingCost.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-purple-800 text-sm">
                  <span className="font-bold text-white">Total Final:</span>
                  <span className="text-2xl font-extrabold text-pink-400">
                    R$ {finalOrderTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Alerta de erro de pagamento na coluna de finalização */}
              {paymentErrorMessage && (
                <div className="p-3 bg-rose-950/90 border border-rose-400/80 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-rose-300 block">Pagamento recusado:</span>
                    <span className="text-[11px] text-rose-200 leading-tight block">{paymentErrorMessage}</span>
                  </div>
                </div>
              )}

              {/* Botão de Finalização */}
              <button
                type="submit"
                id="btn-confirm-order"
                disabled={isProcessing}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <span>Preparando seu pacotinho perfumado... 🌸</span>
                ) : (
                  <>
                    <Flower2 className="w-4 h-4" />
                    <span>Confirmar e Finalizar Pedido</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-purple-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {onOpenReturnPolicy ? (
                  <button
                    type="button"
                    id="btn-checkout-open-return-policy"
                    onClick={onOpenReturnPolicy}
                    className="hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Garantia de Entrega & Troca Fácil (CDC 7 dias) • Ver regras
                  </button>
                ) : (
                  <span>Garantia de Entrega & Troca Fácil Lavistore</span>
                )}
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};
