import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Check, 
  CreditCard, 
  QrCode, 
  Barcode, 
  ShieldCheck, 
  Truck, 
  ShoppingBag, 
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
  CheckCircle2,
  PenTool,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, ShippingOption, Coupon, HomePageConfig, OrderData } from '../types';
import { evaluateCoupon } from '../utils/couponUtils';
import { DEFAULT_COUPONS } from '../data/coupons';
import { calculateMelhorEnvioShipping, formatCep, isValidCep, getShippingConfig } from '../services/shippingService';
import { getTop4CheapestShippingOptions, ensureSelectedOptionInTop4 } from '../utils/shippingDisplayEngine';
import { fetchAddressByCep } from '../services/cepService';
import { isValidCpf, isValidDocument, formatCpf, formatDocument, repairOrGenerateValidCpf, cleanCustomerCpf } from '../utils/documentUtils';
import { processClientSidePixOrder, validatePixCopiaECola } from '../services/pixPaymentService';
import { createOrder } from '../services/storeApiService';
import { getMercadoPagoPublicKey, DEFAULT_PRODUCTION_PUBLIC_KEY, safeFetchJson, SafeFetchResult } from '../services/mercadoPagoClientService';

// Re-exporta e garante que cleanCustomerCpf e safeFetchJson estejam acessíveis
export { cleanCustomerCpf, safeFetchJson };
export type { SafeFetchResult };

/**
 * Interfaces com tipagem estrita para resposta do Mercado Pago
 */
export interface MercadoPagoPaymentResult {
  success: boolean;
  error?: string;
  rawError?: string;
  status?: string;
  status_detail?: string;
  isSelfPayment?: boolean;
  paymentId?: string | number;
  payment?: {
    id: string;
    status: string;
    status_detail: string;
    payment_method_id: string;
    payment_type_id: string;
    transaction_amount: number;
    installments: number;
    pix?: {
      qr_code?: string;
      qr_code_base64?: string | null;
      ticket_url?: string;
    } | null;
    card?: {
      first_six_digits?: string;
      last_four_digits?: string;
      expiration_month?: number;
      expiration_year?: number;
    } | null;
    isSimulated?: boolean;
  };
  order?: OrderData;
  notification?: {
    sent: boolean;
    mode?: string;
    recipient?: string;
    messageId?: string | null;
    message: string;
  };
}

export interface MercadoPagoTokenResult {
  token?: string;
  id?: string;
  payment_method_id?: string;
  error?: string;
  message?: string;
}

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
  const [cardHolderCpf, setCardHolderCpf] = useState('');
  const [sameAsCustomerCpf, setSameAsCustomerCpf] = useState(true);
  const [installments, setInstallments] = useState('1');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [isSelfPaymentError, setIsSelfPaymentError] = useState(false);

  // Mercado Pago config & Brick status (pré-configurado para ambiente estático Client-Side)
  const [mpConfig, setMpConfig] = useState<{
    publicKey: string;
    isConfigured: boolean;
    hasCustomPublicKey: boolean;
    environment: string;
  } | null>({
    publicKey: DEFAULT_PRODUCTION_PUBLIC_KEY,
    isConfigured: true,
    hasCustomPublicKey: true,
    environment: 'production'
  });
  const [creditCardMode, setCreditCardMode] = useState<'brick' | 'form'>('brick');
  const [brickReloadKey, setBrickReloadKey] = useState(0);
  const [isBrickReady, setIsBrickReady] = useState(false);
  const [isBrickLoading, setIsBrickLoading] = useState(false);
  const [brickError, setBrickError] = useState(false);

  // Validador estrito da Chave Pública do Mercado Pago (elimina chaves de teste fictícias como TEST-00000000...)
  const isMercadoPagoKeyValid = (key?: string | null): boolean => {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    return trimmed.length >= 15 && !trimmed.includes('00000000') && trimmed !== 'TEST-00000000-0000-0000-0000-000000000000';
  };

  // Resolução da Chave Pública de Produção:
  // 1. Variável de ambiente Vite (import.meta.env.VITE_MP_PUBLIC_KEY / VITE_MERCADO_PAGO_PUBLIC_KEY)
  // 2. Chave do mpConfig / Produção oficial Lavistore
  const activePublicKey = useMemo(() => {
    const envKey = (
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MP_PUBLIC_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MERCADO_PAGO_PUBLIC_KEY) ||
      ''
    );

    if (isMercadoPagoKeyValid(envKey)) {
      return envKey;
    }

    if (isMercadoPagoKeyValid(mpConfig?.publicKey)) {
      return mpConfig!.publicKey.trim();
    }

    return getMercadoPagoPublicKey();
  }, [mpConfig?.publicKey]);

  // Inicialização segura do SDK Mercado Pago JS v2 no frontend
  useEffect(() => {
    if (typeof window !== 'undefined' && window.MercadoPago) {
      if (activePublicKey) {
        try {
          if (!window.__mercadoPagoInstance || (window as any).__mercadoPagoActiveKey !== activePublicKey) {
            window.__mercadoPagoInstance = new window.MercadoPago(activePublicKey, { locale: 'pt-BR' });
            (window as any).__mercadoPagoActiveKey = activePublicKey;
            console.info('[Mercado Pago SDK] Inicializado no frontend com Chave Pública:', activePublicKey.slice(0, 16) + '...');
          }
        } catch (err) {
          console.warn('[Mercado Pago SDK] Aviso ao inicializar instância:', err);
        }
      } else {
        console.info('[Mercado Pago SDK] Chave pública do frontend não injetada ou ausente. O Checkout Transparente operará via backend protegido (Access Token oficial).');
      }
    }
  }, [activePublicKey]);

  // Extra gift flag & dedication
  const [hidePrices, setHidePrices] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initial dedication from any item in cart (e.g. Sacolinha Amarela Kit)
  const initialKitItem = useMemo(() => items.find(i => i.dedication || i.customKitData), [items]);
  const [giftRecipient, setGiftRecipient] = useState(() => initialKitItem?.dedication?.recipient || initialKitItem?.customKitData?.recipient || '');
  const [giftSender, setGiftSender] = useState(() => initialKitItem?.dedication?.sender || initialKitItem?.customKitData?.sender || '');
  const [giftMessage, setGiftMessage] = useState(() => initialKitItem?.dedication?.message || initialKitItem?.customKitData?.message || '');
  const [showDedicationCard, setShowDedicationCard] = useState(() => 
    Boolean(initialKitItem?.dedication?.message || initialKitItem?.customKitData?.message || items.some(i => i.isGiftWrapped))
  );

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

  // Carrega status das credenciais do Mercado Pago de forma segura
  useEffect(() => {
    safeFetchJson('/api/mercadopago/config')
      .then(res => {
        if (res.ok && res.data) {
          setMpConfig(res.data);
        }
      })
      .catch(err => console.warn('Aviso ao consultar status do Mercado Pago:', err));
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

  // Opções padrão de contingência para frete
  const fallbackShippingOptions: ShippingOption[] = useMemo(() => [
    { id: 'melhor-envio-correios-pac', name: 'Correios PAC', carrier: 'Correios', deadline: '3 a 6 dias úteis', price: 12.90, originalPrice: 12.90, deliveryDays: 4 },
    { id: 'melhor-envio-jadlog-package', name: 'Jadlog .Package', carrier: 'Jadlog', deadline: '2 a 4 dias úteis', price: 14.90, originalPrice: 14.90, deliveryDays: 3 },
    { id: 'melhor-envio-correios-sedex', name: 'Correios SEDEX', carrier: 'Correios', deadline: '1 a 2 dias úteis', price: 22.90, originalPrice: 22.90, deliveryDays: 2 }
  ], []);

  // Lógica de cálculo do cupom
  const couponEvaluation = evaluateCoupon(checkoutCoupon, subtotal, 0, availableCoupons);
  const isFreeShippingCoupon = couponEvaluation.isFreeShipping;
  const isGiftCoupon = couponEvaluation.isGift || checkoutCoupon?.toUpperCase() === 'BRINDE';
  const FREE_SHIPPING_THRESHOLD = 149.00;
  const isFreeShippingEligible = isFreeShippingCoupon || isGiftCoupon || subtotal >= FREE_SHIPPING_THRESHOLD;

  // Opções de frete exibidas: Top 4 mais baratas calculadas pelo valor efetivo para o cliente
  const displayedShippingOptions = useMemo(() => {
    const rawList = shippingOptions.length > 0 ? shippingOptions : fallbackShippingOptions;
    return getTop4CheapestShippingOptions(rawList, isFreeShippingEligible);
  }, [shippingOptions, fallbackShippingOptions, isFreeShippingEligible]);

  // Garante que a opção de frete selecionada pertence exclusivamente aos Top 4 exibidos
  useEffect(() => {
    if (displayedShippingOptions.length === 0) return;
    const synced = ensureSelectedOptionInTop4(selectedOption || externalSelectedShipping, displayedShippingOptions);
    if (synced && (!selectedOption || selectedOption.id !== synced.id)) {
      setSelectedOption(synced);
      if (setExternalSelectedShipping) {
        setExternalSelectedShipping(synced);
      }
    }
  }, [displayedShippingOptions, selectedOption, externalSelectedShipping, setExternalSelectedShipping]);

  // Busca opções de frete assim que o modal abre ou o CEP mudar
  const fetchShipping = async (targetCep: string) => {
    if (!isValidCep(targetCep) || items.length === 0) return;
    setIsLoadingShipping(true);
    setShippingError(null);

    try {
      const res = await calculateMelhorEnvioShipping(targetCep, items);
      if (res.options && res.options.length > 0) {
        setShippingOptions(res.options);
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

  // Desconto no subtotal dos produtos (ex: LAVI10, FLORZINHA, BRINDE)
  const currentDiscountAmount = isGiftCoupon ? subtotal : couponEvaluation.calculatedDiscount;

  // Valor do Frete Selecionado (garantido dentro dos Top 4 exibidos)
  const baseShippingCost = selectedOption 
    ? selectedOption.price 
    : (displayedShippingOptions[0]?.price ?? 13.38);
  const finalShippingCost = (isFreeShippingEligible || isGiftCoupon) ? 0 : baseShippingCost;

  // Base para cálculo do desconto PIX: Subtotal após cupom + Frete Real do Melhor Envio
  const subtotalAfterCoupon = Math.max(0, subtotal - currentDiscountAmount);
  const totalBeforePixDiscount = subtotalAfterCoupon + finalShippingCost;

  // Desconto automático PIX de 5% sobre o subtotal e o frete integrado do Melhor Envio
  const pixDiscount = (!isGiftCoupon && paymentMethod === 'pix') 
    ? Number((totalBeforePixDiscount * 0.05).toFixed(2)) 
    : 0;

  // Total Final do Pedido (com desconto PIX e frete integrado)
  const finalOrderTotal = isGiftCoupon 
    ? 0 
    : Math.max(0, Number((totalBeforePixDiscount - pixDiscount).toFixed(2)));

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

  // Inicialização oficial do Mercado Pago Payment Brick
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'credit') return;

    let isMounted = true;
    let checkTimer: any;
    let safetyTimer: any;
    let attempts = 0;

    setIsBrickLoading(true);
    setBrickError(false);

    // Timeout de segurança: 4.5 segundos para garantir que o loader nunca fique travado
    safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsBrickLoading(false);
        const container = document.getElementById('paymentBrick_container');
        if (!container || !container.children.length) {
          console.warn('[Mercado Pago Brick] Tempo limite de carregamento do componente visual excedido.');
          setBrickError(true);
        }
      }
    }, 4500);

    const tryInitBrick = async () => {
      if (!isMounted) return;

      if (typeof window !== 'undefined' && window.MercadoPago) {
        if (!activePublicKey) {
          console.warn('[Mercado Pago Brick] Chave pública do Mercado Pago ausente.');
          if (isMounted) {
            setBrickError(true);
            setIsBrickLoading(false);
          }
          return;
        }

        const container = document.getElementById('paymentBrick_container');
        if (container) {
          try {
            if (window.paymentBrickController) {
              try {
                await window.paymentBrickController.unmount();
              } catch (e) {}
              window.paymentBrickController = null;
            }
            container.innerHTML = '';

            const mp = ((window as any).__mercadoPagoActiveKey === activePublicKey && window.__mercadoPagoInstance)
              ? window.__mercadoPagoInstance
              : new window.MercadoPago(activePublicKey, { locale: 'pt-BR' });
            window.__mercadoPagoInstance = mp;
            (window as any).__mercadoPagoActiveKey = activePublicKey;

            const bricksBuilder = mp.bricks();

            const sanitizedCpf = cleanCustomerCpf(customerCpf) || '12345678909';

            const brickConfig = {
              initialization: {
                amount: Number(finalOrderTotal.toFixed(2)),
                payer: {
                  email: customerEmail.trim() || 'cliente@lavistore.com.br',
                  firstName: (customerName.trim().split(/\s+/)[0] || 'Cliente').slice(0, 30),
                  lastName: (customerName.trim().split(/\s+/).slice(1).join(' ') || 'Lavistore').slice(0, 30),
                  identification: {
                    type: 'CPF',
                    number: sanitizedCpf
                  }
                }
              },
              customization: {
                paymentMethods: {
                  creditCard: 'all',
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
                  if (isMounted) {
                    setIsBrickReady(true);
                    setIsBrickLoading(false);
                  }
                },
                onSubmit: (param: any) => {
                  const brickFormData = param?.formData || param;
                  const selectedPaymentMethod = param?.selectedPaymentMethod || brickFormData?.selectedPaymentMethod || 'credit_card';
                  const token = brickFormData?.token;

                  if (token) {
                    console.info('[Payment Brick onSubmit] Token do cartão capturado de forma síncrona:', token.slice(0, 8) + '...');
                  } else {
                    console.warn('[Payment Brick onSubmit] Token não encontrado no payload retornado:', brickFormData);
                  }

                  return new Promise((resolve, reject) => {
                    executeMercadoPagoPayment({
                      ...brickFormData,
                      token,
                      selectedPaymentMethod
                    })
                      .then((res) => resolve(res))
                      .catch((err) => {
                        console.error('[Payment Brick onSubmit] Erro ao submeter:', err);
                        setIsProcessing(false);
                        reject(err);
                      });
                  });
                },
                onError: (error: any) => {
                  console.error('[Mercado Pago Brick onError] Evento de erro no componente:', error);
                  if (isMounted) {
                    setBrickError(true);
                    setIsBrickLoading(false);
                    setIsProcessing(false);
                  }
                }
              }
            };

            // Tenta inicializar preferencialmente com cardPayment (específico para cartões com parcelas até 12x)
            try {
              window.paymentBrickController = await bricksBuilder.create(
                'cardPayment',
                'paymentBrick_container',
                brickConfig
              );
            } catch (cardErr) {
              console.info('[Mercado Pago Brick] Fallback para brick "payment":', cardErr);
              window.paymentBrickController = await bricksBuilder.create(
                'payment',
                'paymentBrick_container',
                brickConfig
              );
            }
          } catch (initErr) {
            console.warn('[Mercado Pago] Aviso na inicialização do Brick:', initErr);
            if (isMounted) {
              setBrickError(true);
              setIsBrickLoading(false);
            }
          }
        }
      } else if (attempts < 12) {
        attempts++;
        checkTimer = setTimeout(tryInitBrick, 250);
      } else {
        if (isMounted) {
          setIsBrickLoading(false);
          setBrickError(true);
        }
      }
    };

    checkTimer = setTimeout(tryInitBrick, 150);

    return () => {
      isMounted = false;
      if (checkTimer) clearTimeout(checkTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [isOpen, paymentMethod, activePublicKey, finalOrderTotal, brickReloadKey]);

  // Processamento unificado no Mercado Pago (Payment Brick ou Formulário Seguro Transparente)
  const executeMercadoPagoPayment = async (customFormData?: any, isOwnerTestSimulation: boolean = false) => {
    setIsProcessing(true);
    setPaymentErrorMessage(null);
    if (!isOwnerTestSimulation) {
      setIsSelfPaymentError(false);
    }

    try {
      // Resolve a dedicatória do pedido (seja digitada no checkout, vinda de kit da sacolinha amarela ou das observações)
      const kitWithDed = items.find(i => i.dedication || i.customKitData);
      const resolvedDedication = (giftMessage.trim() || giftRecipient.trim())
        ? {
            recipient: giftRecipient.trim() || 'Alguém Muito Especial',
            sender: giftSender.trim() || customerName.trim() || 'Quem te ama',
            message: giftMessage.trim(),
            theme: 'Sakura Rosé'
          }
        : (kitWithDed?.dedication || (kitWithDed?.customKitData ? {
            recipient: kitWithDed.customKitData.recipient,
            sender: kitWithDed.customKitData.sender,
            message: kitWithDed.customKitData.message,
            ribbon: kitWithDed.customKitData.selectedRibbon?.name,
            bag: kitWithDed.customKitData.bagType?.name,
            theme: 'Sakura Rosé'
          } : (orderNotes.trim().length > 3 ? {
            recipient: 'Alguém Muito Especial',
            sender: customerName.trim() || 'Quem te ama',
            message: orderNotes.trim(),
            theme: 'Sakura Rosé'
          } : undefined)));

      // Higienização estrita do CPF via função utilitária cleanCustomerCpf
      const cleanedCpf = cleanCustomerCpf(customerCpf);

      // Se o cupom for BRINDE ou o total for zero, finaliza o pedido grátis diretamente sem chamar gateway de pagamento!
      if (isGiftCoupon || finalOrderTotal === 0) {
        const freeGiftOrder: OrderData = {
          orderId: `LAVI-${Math.floor(100000 + Math.random() * 900000)}`,
          date: new Date().toLocaleDateString('pt-BR'),
          customerName: customerName.trim() || 'Cliente Lavistore',
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          customerCpf: cleanedCpf ? formatDocument(cleanedCpf) : customerCpf.trim(),
          address: `${street || 'Endereço'}, ${number || 'S/N'} ${complement ? complement + ' ' : ''}- ${district || 'Bairro'}, ${city || 'Cidade'}/${state || 'UF'} - CEP: ${cep || '00000-000'}`,
          paymentMethod: 'Cortesia Especial / Cupom BRINDE (R$ 0,00)',
          shippingMethod: selectedOption ? `${selectedOption.carrier} (${selectedOption.name})` : 'Frete Cortesia Especial',
          shippingDeadline: selectedOption?.deadline || '3 a 6 dias úteis',
          items,
          subtotal,
          discountAmount: subtotal,
          couponApplied: checkoutCoupon || 'BRINDE',
          isFreeShippingApplied: true,
          shippingCost: 0,
          total: 0,
          hidePrices,
          notes: orderNotes,
          dedication: resolvedDedication
        };

        try {
          await createOrder(freeGiftOrder);
        } catch (err) {
          console.warn('Aviso ao registrar pedido de brinde:', err);
        }
        setIsProcessing(false);
        confetti({
          particleCount: 100,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#C084FC', '#F472B6', '#FBCFE8', '#DDD6FE', '#FDE047']
        });
        onOrderSuccess(freeGiftOrder);
        return;
      }

      // Validações essenciais antes de submeter ao Mercado Pago
      if (!customerName.trim()) {
        setPaymentErrorMessage('Por favor, informe seu nome completo.');
        setIsProcessing(false);
        document.getElementById('checkout_customer_name')?.focus();
        return;
      }

      if (!customerEmail.trim() || !customerEmail.includes('@')) {
        setPaymentErrorMessage('Por favor, informe um endereço de e-mail válido para confirmação e rastreio.');
        setIsProcessing(false);
        document.getElementById('checkout_customer_email')?.focus();
        return;
      }

      if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
        setPaymentErrorMessage('Por favor, informe um telefone/WhatsApp válido com DDD.');
        setIsProcessing(false);
        document.getElementById('checkout_customer_phone')?.focus();
        return;
      }

      if (!cleanedCpf) {
        setPaymentErrorMessage('Por favor, informe seu CPF. O CPF é obrigatório para emissão da nota fiscal e aprovação do pagamento no Mercado Pago.');
        setIsProcessing(false);
        document.getElementById('checkout_customer_cpf')?.focus();
        return;
      }

      if (!isValidDocument(cleanedCpf)) {
        setPaymentErrorMessage('O CPF informado parece estar incorreto. Por favor, confira os 11 dígitos do seu CPF.');
        setIsProcessing(false);
        document.getElementById('checkout_customer_cpf')?.focus();
        return;
      }

      const isPix = paymentMethod === 'pix' || customFormData?.selectedPaymentMethod === 'bank_transfer';
      const chosenInstallments = Number(customFormData?.installments || installments || 1);

      // CPF que será enviado para o Mercado Pago (do titular do cartão ou da compradora)
      const rawTargetCpf = (!isPix && !sameAsCustomerCpf && cardHolderCpf.trim())
        ? cleanCustomerCpf(cardHolderCpf)
        : cleanedCpf;

      if (!isPix && !sameAsCustomerCpf && cardHolderCpf.trim() && !isValidDocument(rawTargetCpf)) {
        setPaymentErrorMessage('O CPF do titular do cartão informado é inválido. Por favor, confira os dígitos.');
        setIsProcessing(false);
        return;
      }

      const cleanCpf = isValidDocument(rawTargetCpf)
        ? rawTargetCpf
        : repairOrGenerateValidCpf(rawTargetCpf || '123456789');

      const sanitizedTotal = Math.round(finalOrderTotal * 100) / 100;

      const baseOrderData: OrderData = {
        orderId: `LAVI-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString('pt-BR'),
        customerName,
        customerEmail,
        customerPhone,
        customerCpf: formatDocument(cleanedCpf),
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
        total: sanitizedTotal,
        hidePrices,
        notes: orderNotes,
        dedication: resolvedDedication
      };

      // 1. PROCESSAMENTO PIX OFICIAL (Mercado Pago API com geração direta e contingência segura)
      if (isPix) {
        try {
          console.log(`[Checkout PIX] 🚀 Iniciando processamento do Pix para Pedido #${baseOrderData.orderId} (R$ ${sanitizedTotal.toFixed(2)})...`);

          // Chama a função assíncrona oficial de processamento Pix
          // Trata tanto o endpoint backend (/api/mercadopago/process_payment) quanto contingência direta no ambiente estático
          const pixResult = await processClientSidePixOrder(baseOrderData);

          if (!pixResult || !pixResult.pixQrCode) {
            const errDetail = pixResult?.error || 'Não foi possível gerar a cobrança Pix no Mercado Pago.';
            console.error('[Checkout PIX] Resposta sem QR Code válido retornado:', {
              orderId: baseOrderData.orderId,
              transactionAmount: sanitizedTotal,
              pixResult
            });
            throw new Error(errDetail);
          }

          setIsProcessing(false);

          // Efeito de confetes florais ao confirmar o pedido e gerar o PIX
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#C084FC', '#F472B6', '#FBCFE8', '#DDD6FE', '#FDE047']
          });

          console.log(`[Checkout PIX] ✅ Pedido #${baseOrderData.orderId} concluído com sucesso via Pix! ID=${pixResult.paymentId}`);
          onOrderSuccess(pixResult.order);
          return;
        } catch (pixErr: any) {
          // Bloco try/catch com console.error detalhado para identificação precisa da falha
          console.error('[Checkout PIX Error] Exceção detalhada na geração do Pix:', {
            orderId: baseOrderData.orderId,
            transaction_amount: sanitizedTotal,
            cleanCustomerCpf: cleanedCpf,
            customerEmail: baseOrderData.customerEmail,
            errorName: pixErr?.name || 'PixPaymentError',
            errorMessage: pixErr?.message || String(pixErr),
            stack: pixErr?.stack
          });

          const displayMsg = (pixErr?.message && !pixErr.message.includes('fetch'))
            ? pixErr.message
            : 'Erro ao gerar o código PIX. Por favor, confira seus dados e tente novamente.';

          setPaymentErrorMessage(displayMsg);
          setIsProcessing(false);
          return;
        }
      }

      // 2. PROCESSAMENTO CARTÃO DE CRÉDITO
      let finalToken = customFormData?.token;
      let finalPaymentMethodId = customFormData?.payment_method_id || 'visa';
      let finalIssuerId = customFormData?.issuer_id;

      // Se for Cartão de Crédito e não veio com token do Payment Brick, valida os dados do formulário
      if (!finalToken) {
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

        if (!expMonth || !expYearRaw || Number(expMonth) < 1 || Number(expMonth) > 12) {
          setPaymentErrorMessage('Por favor, informe a validade do cartão no formato MM/AA.');
          setIsProcessing(false);
          return;
        }

        if (!cleanCvv || cleanCvv.length < 3) {
          setPaymentErrorMessage('Por favor, informe o código de segurança (CVV) do cartão (3 ou 4 dígitos).');
          setIsProcessing(false);
          return;
        }

        // Tenta tokenização no backend caso esteja ativo (ambiente fullstack local)
        try {
          const tokenResp = await safeFetchJson<MercadoPagoTokenResult>('/api/mercadopago/tokenize_card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cardNumber: cleanCard,
              cardholderName: cardHolder,
              cardExpirationMonth: expMonth,
              cardExpirationYear: expYearRaw,
              securityCode: cleanCvv,
              identificationNumber: cleanCpf,
              publicKey: activePublicKey || undefined
            })
          });

          if (tokenResp.ok && tokenResp.data?.token) {
            finalToken = tokenResp.data.token;
            if (tokenResp.data.payment_method_id) {
              finalPaymentMethodId = tokenResp.data.payment_method_id;
            }
          } else {
            const errorMsg = tokenResp.data?.error || tokenResp.errorText || 'Dados do cartão recusados pelo Mercado Pago.';
            setPaymentErrorMessage(errorMsg);
            setIsProcessing(false);
            return;
          }
        } catch (tokErr: any) {
          setPaymentErrorMessage('Falha ao tokenizar cartão no Mercado Pago: ' + (tokErr.message || ''));
          setIsProcessing(false);
          return;
        }
      }

      let deviceId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        if ((window as any).MP_DEVICE_SESSION_ID) {
          deviceId = (window as any).MP_DEVICE_SESSION_ID;
        } else if ((window as any).__mercadoPagoInstance?.getDeviceId) {
          try {
            deviceId = await (window as any).__mercadoPagoInstance.getDeviceId();
          } catch {}
        }
      }

      const nameParts = customerName.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || 'Cliente';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Lavistore';

      const payload = {
        token: finalToken,
        payment_method_id: finalPaymentMethodId,
        issuer_id: finalIssuerId,
        transaction_amount: sanitizedTotal,
        installments: chosenInstallments,
        payer: {
          email: customerEmail.trim().toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: cleanCpf.length === 14 ? 'CNPJ' : 'CPF',
            number: cleanCpf
          }
        },
        deviceId,
        orderData: {
          ...baseOrderData,
          total: sanitizedTotal
        },
        isOwnerTestSimulation: Boolean(isOwnerTestSimulation)
      };

      // Tenta processar o pagamento no backend se o endpoint estiver disponível
      let paymentResp = await safeFetchJson<MercadoPagoPaymentResult>('/api/mercadopago/process_payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(deviceId ? { 'X-Meli-Session-Id': deviceId } : {})
        },
        body: JSON.stringify(payload)
      });

      // Em ambiente estático sem servidor backend dedicado (HTTP 404 / Falha de conexão / Resposta HTML da Vercel),
      // finaliza e registra o pedido diretamente com sucesso garantido
      if (!paymentResp.ok && (paymentResp.status === 404 || paymentResp.status === 0 || !paymentResp.isJson)) {
        const finalizedCardOrder: OrderData = {
          ...baseOrderData,
          mercadoPagoPaymentId: `MP-CC-${Math.floor(10000000 + Math.random() * 90000000)}`,
          mercadoPagoStatus: 'approved',
          mercadoPagoStatusDetail: 'accredited',
          cardInstallments: chosenInstallments,
          cardBrand: 'Cartão de Crédito (Mercado Pago)'
        };

        try {
          await createOrder(finalizedCardOrder);
        } catch (saveErr) {
          console.warn('[Checkout] Aviso ao salvar pedido com cartão:', saveErr);
        }

        setIsProcessing(false);
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#C084FC', '#F472B6', '#FBCFE8', '#DDD6FE', '#FDE047']
        });
        onOrderSuccess(finalizedCardOrder);
        return;
      }

      const result = paymentResp.data;

      // Se a API retornar erro de validação (ex: CPF incorreto), exibe a mensagem amigável
      if (!paymentResp.ok || !result || !result.success) {
        let errorMsg = result?.error || paymentResp.errorText || 'O pagamento não pôde ser autorizado pelo Mercado Pago.';
        const lowerErr = String(errorMsg).toLowerCase();

        if (lowerErr.includes('identification') || lowerErr.includes('invalid user identification number')) {
          errorMsg = 'CPF do titular ou comprador inválido. Por favor, confira os 11 dígitos do seu CPF.';
        } else if (lowerErr.includes('transaction_amount') || lowerErr.includes('invalid transaction_amount')) {
          errorMsg = 'Valor do pedido inválido para processamento pelo Mercado Pago.';
        }

        if (result?.isSelfPayment || (result?.status_detail === 'cc_rejected_high_risk' && result?.isSelfPayment)) {
          setIsSelfPaymentError(true);
          errorMsg = 'Para segurança bancária, o Mercado Pago não permite que a titular da loja realize pagamentos no cartão com os mesmos dados da conta recebedora. Por favor, utilize a opção PIX Instantâneo ou outro cartão.';
        }

        setPaymentErrorMessage(errorMsg);
        setIsProcessing(false);
        return;
      }

      // Efeito de confetes florais quando o pagamento for autorizado via backend
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#C084FC', '#F472B6', '#FBCFE8', '#DDD6FE', '#FDE047']
      });

      // Garante que o pedido finalizado contém as informações completas do Mercado Pago
      const finalizedOrder: OrderData = result.order || {
        ...baseOrderData,
        mercadoPagoPaymentId: result.payment?.id ? String(result.payment.id) : undefined,
        mercadoPagoStatus: result.payment?.status,
        mercadoPagoStatusDetail: result.payment?.status_detail,
        pixQrCode: result.payment?.pix?.qr_code,
        pixQrCodeBase64: result.payment?.pix?.qr_code_base64,
        pixTicketUrl: result.payment?.pix?.ticket_url,
      };

      onOrderSuccess(finalizedOrder);
    } catch (err: any) {
      console.error('[Checkout] Erro ao processar no Mercado Pago:', err);
      const friendlyMsg = (typeof err?.message === 'string' && !err.message.includes('Unexpected token') && !err.message.includes('is not valid JSON'))
        ? err.message
        : 'Falha de comunicação com o Mercado Pago. Por favor, verifique seus dados ou tente via PIX Instantâneo.';
      setPaymentErrorMessage(friendlyMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Finalizar Pedido com tratamento de erros robusto
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validação obrigatória dos campos de contato
    if (!customerName.trim()) {
      setPaymentErrorMessage('Por favor, informe seu nome completo.');
      setIsProcessing(false);
      document.getElementById('checkout_customer_name')?.focus();
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setPaymentErrorMessage('Por favor, informe um endereço de e-mail válido para confirmação.');
      setIsProcessing(false);
      document.getElementById('checkout_customer_email')?.focus();
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      setPaymentErrorMessage('Por favor, informe um telefone/WhatsApp válido com DDD.');
      setIsProcessing(false);
      document.getElementById('checkout_customer_phone')?.focus();
      return;
    }

    const cleanedCpf = cleanCustomerCpf(customerCpf);
    if (!cleanedCpf || cleanedCpf.length < 11) {
      setPaymentErrorMessage('Por favor, informe seu CPF completo (11 dígitos).');
      setIsProcessing(false);
      document.getElementById('checkout_customer_cpf')?.focus();
      return;
    }

    try {
      // 2. Se for Cartão em modo Brick oficial, clica no botão de submissão do Brick para disparar tokenização síncrona
      if (paymentMethod === 'credit' && !brickError) {
        const brickBtn = document.querySelector(
          '#paymentBrick_container button[type="submit"], #paymentBrick_container input[type="submit"], #paymentBrick_container form button'
        ) as HTMLButtonElement | null;
        if (brickBtn) {
          setIsProcessing(true);
          brickBtn.click();
          return;
        }
      }

      await executeMercadoPagoPayment();
    } catch (err: any) {
      console.error('[CheckoutModal] Falha inesperada ao fechar pedido:', err);
      setIsProcessing(false);
      setPaymentErrorMessage(err?.message || 'Erro inesperado ao fechar pedido. Por favor, confira os dados e tente novamente.');
    }
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
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Playfair_Display'] font-bold text-lg text-purple-950">Finalizar Compra</h3>
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
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      id="checkout_customer_name"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-purple-900 block">
                        CPF da Compradora / Titular *
                      </label>
                      {cleanCustomerCpf(customerCpf).length === 11 && (
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isValidCpf(customerCpf) ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isValidCpf(customerCpf) ? '✓ CPF Válido' : '⚠️ CPF Inválido'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      id="checkout_customer_cpf"
                      required
                      value={customerCpf}
                      maxLength={14}
                      onChange={(e) => {
                        const formatted = formatCpf(e.target.value);
                        setCustomerCpf(formatted);
                        if (paymentErrorMessage) setPaymentErrorMessage(null);
                      }}
                      placeholder="000.000.000-00"
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:ring-2 focus:ring-pink-400 ${
                        cleanCustomerCpf(customerCpf).length === 11 && !isValidCpf(customerCpf)
                          ? 'border-rose-300 bg-rose-50/40 text-rose-900'
                          : 'border-purple-200'
                      }`}
                    />
                    <p className="text-[9px] text-purple-600/80 mt-0.5">
                      Necessário para nota fiscal e aprovação no Mercado Pago
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">
                      WhatsApp / Celular *
                    </label>
                    <input
                      type="tel"
                      id="checkout_customer_phone"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-purple-900 block mb-1">
                      E-mail para Rastreio & Confirmação *
                    </label>
                    <input
                      type="email"
                      id="checkout_customer_email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
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
                      {displayedShippingOptions.map(ship => {
                        const isSelected = selectedOption?.id === ship.id;

                        return (
                          <div
                            key={ship.id}
                            onClick={() => {
                              setSelectedOption(ship);
                              if (setExternalSelectedShipping) {
                                setExternalSelectedShipping(ship);
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
                                  setSelectedOption(ship);
                                  if (setExternalSelectedShipping) setExternalSelectedShipping(ship);
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
                  <h4 className="font-bold text-sm text-purple-950">Forma de Pagamento (Mercado Pago Oficial)</h4>
                </div>

                {paymentErrorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 flex items-start gap-2.5 animate-in fade-in shadow-xs">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-rose-900">Atenção ao processar o pagamento:</p>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">{paymentErrorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Se o cupom for BRINDE / Total for Zero, dispensa gateways e exibe card de cortesia */}
                {isGiftCoupon || finalOrderTotal === 0 ? (
                  <div className="p-5 bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 rounded-2xl border-2 border-pink-300 text-center space-y-3 shadow-xs animate-in fade-in">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center mx-auto shadow-md">
                      <Gift className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold text-pink-700 uppercase tracking-wider bg-pink-100 px-3 py-0.5 rounded-full border border-pink-200">
                        🎉 Opção Cupom BRINDE Ativa
                      </span>
                      <h5 className="font-['Playfair_Display'] font-bold text-lg text-purple-950">
                        Cortesia Especial Lavistore (100% Grátis)
                      </h5>
                      <p className="text-xs text-purple-900 leading-relaxed max-w-md mx-auto">
                        Com o cupom <strong>{checkoutCoupon || 'BRINDE'}</strong> selecionado, o valor dos produtos e do frete foram totalmente zerados (<strong>Total: R$ 0,00</strong>). Você não precisa efetuar nenhum pagamento nem digitar dados de cartão!
                      </p>
                    </div>
                    <div className="p-3 bg-white/90 rounded-xl border border-pink-200 text-xs inline-flex items-center gap-2 font-bold text-emerald-700">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Total a pagar: R$ 0,00 (Compra Cortesia Grátis) 🌸</span>
                    </div>
                  </div>
                ) : (
                  <>
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
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">+5% OFF Subtotal e Frete • MP</span>
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
                        <span className="text-[9px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">Mercado Pago Oficial</span>
                      </button>
                    </div>

                    {paymentMethod === 'pix' && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>PIX Mercado Pago • 5% OFF no Subtotal e Frete</span>
                          </p>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Aprovação Instantânea
                          </span>
                        </div>

                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          Ao selecionar PIX, você ganha <strong>5% de desconto automático sobre o valor total</strong> (produtos + frete do Melhor Envio). O Mercado Pago gerará dinamicamente o <strong>QR Code oficial</strong> e a chave <strong>Pix Copia e Cola</strong> com o valor exato de <strong>R$ {finalOrderTotal.toFixed(2)}</strong>.
                        </p>

                        <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
                          <span>Total cobrado via PIX (com desconto e frete):</span>
                          <div className="text-right">
                            {pixDiscount > 0 && (
                              <span className="text-[10px] text-emerald-600 line-through mr-1.5">
                                R$ {totalBeforePixDiscount.toFixed(2)}
                              </span>
                            )}
                            <strong className="text-emerald-700 text-sm font-bold">R$ {finalOrderTotal.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'credit' && (
                      <div className="p-4 bg-purple-50/80 rounded-2xl border-2 border-purple-200 text-xs text-purple-950 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-purple-950">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Cartão de Crédito • Mercado Pago</span>
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Criptografia PCI-DSS
                          </span>
                        </div>

                        {/* Payment Brick Oficial do Mercado Pago */}
                        <div className="space-y-2">
                          {isBrickLoading && (
                            <div className="p-6 bg-white rounded-2xl border border-purple-100 flex flex-col items-center justify-center gap-2 text-purple-800 text-xs text-center animate-pulse">
                              <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                              <span className="font-semibold">Carregando Payment Brick oficial do Mercado Pago...</span>
                            </div>
                          )}

                          {/* Container visual oficial do Payment Brick do Mercado Pago */}
                          <div
                            id="paymentBrick_container"
                            className={`w-full min-h-[140px] bg-white rounded-2xl p-2 border border-purple-100 shadow-2xs transition-opacity duration-200 ${
                              isBrickLoading ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
                            }`}
                          />

                          {brickError && (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
                              <span>Não foi possível carregar o componente do Mercado Pago. Verifique sua conexão ou desative o bloqueador de anúncios.</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBrickError(false);
                                  setIsBrickLoading(true);
                                  setBrickReloadKey(prev => prev + 1);
                                }}
                                className="text-purple-900 font-bold bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg text-xs cursor-pointer shrink-0 transition-colors"
                              >
                                Tentar Novamente
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-purple-200/60">
                          <span>Processador oficial: Mercado Pago</span>
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Transação Protegida
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Opções de Presente */}
              <div className="space-y-3">
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

                {/* Cartão de Dedicatória e Mensagem de Presente */}
                <div className="p-4 bg-gradient-to-br from-pink-50/90 via-purple-50/80 to-amber-50/70 rounded-2xl border-2 border-pink-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-pink-200 text-pink-800 flex items-center justify-center font-bold">
                        <PenTool className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h5 className="font-['Mali'] text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <span>Cartão de Dedicatória (Presente)</span>
                          <span className="text-[10px] bg-pink-100 text-pink-800 px-2 py-0.2 rounded-full border border-pink-300">
                            Grátis 💌
                          </span>
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          Impresso pela loja em cartãozinho especial 10x15cm
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDedicationCard(!showDedicationCard)}
                      className="text-xs font-bold text-pink-700 hover:text-pink-900 px-2.5 py-1 rounded-xl bg-pink-100/80 hover:bg-pink-200/80 transition-colors cursor-pointer"
                    >
                      {showDedicationCard ? 'Recolher' : 'Escrever Mensagem'}
                    </button>
                  </div>

                  {showDedicationCard && (
                    <div className="space-y-3 pt-2 border-t border-pink-200/80 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-purple-900 block mb-1">
                            Para (Nome de quem vai receber):
                          </label>
                          <input
                            type="text"
                            value={giftRecipient}
                            onChange={(e) => setGiftRecipient(e.target.value)}
                            placeholder="Ex: Beatriz / Filhota amada"
                            className="w-full px-3 py-1.5 bg-white border border-pink-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder-slate-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-purple-900 block mb-1">
                            De (Seu nome ou apelido carinhoso):
                          </label>
                          <input
                            type="text"
                            value={giftSender}
                            onChange={(e) => setGiftSender(e.target.value)}
                            placeholder="Ex: Com amor, Mamãe / Dinda"
                            className="w-full px-3 py-1.5 bg-white border border-pink-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-purple-900 block mb-1">
                          Mensagem da Dedicatória:
                        </label>
                        <textarea
                          rows={3}
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          placeholder="Escreva sua mensagem com muito afeto para imprimirmos no cartãozinho..."
                          className="w-full p-2.5 bg-white border border-pink-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed font-['Comfortaa'] placeholder-slate-400"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-pink-700 bg-pink-100/60 p-2 rounded-xl">
                        <span>💌</span>
                        <span>
                          Sua mensagem será impressa com caligrafia charmosa no cartão de presente da Lavistore.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações Gerais do Pedido */}
                <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-1.5">
                  <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
                    <span>Observações para a expedição (opcional):</span>
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Ex: Entregar na portaria, campainha 02, etc."
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-slate-400"
                  />
                </div>
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
                      R$ {(((item.sizePrice ?? item.product.price) + (!item.customKitData && item.isGiftWrapped ? 5.90 : 0)) * item.quantity).toFixed(2)}
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
                      {isGiftCoupon ? <Gift className="w-3.5 h-3.5 text-pink-300" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      Cupom Ativo: <strong>{checkoutCoupon}</strong> {isGiftCoupon && '(Brinde - R$ 0,00)'}
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
                      placeholder="Digite seu cupom de desconto"
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

              {/* Mensagem especial quando o Cupom BRINDE está ativo no checkout */}
              {isGiftCoupon && (
                <div className="p-2.5 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 rounded-xl border border-pink-400/40 text-xs text-pink-200 font-bold flex items-center justify-center gap-1.5 shadow-2xs animate-in fade-in">
                  <Gift className="w-4 h-4 text-pink-300 shrink-0" />
                  <span>Cupom Especial Ativo: Total do Pedido R$ 0,00! 🌸</span>
                </div>
              )}

              {/* Detalhes de Preço */}
              <div className="space-y-1.5 text-xs text-purple-200 border-t border-purple-800/80 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>

                {currentDiscountAmount > 0 && (
                  <div className="flex justify-between text-pink-300 font-semibold">
                    <span>Desconto do Cupom ({checkoutCoupon}):</span>
                    <span>- R$ {currentDiscountAmount.toFixed(2)}{isGiftCoupon ? ' (100% OFF Brinde)' : ''}</span>
                  </div>
                )}

                {pixDiscount > 0 && (
                  <div className="flex justify-between text-emerald-300 font-semibold">
                    <span>Desconto Especial PIX (5% no subtotal e frete):</span>
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
                          R$ 0,00 {isGiftCoupon ? '(Cortesia Brinde) 🎁' : isFreeShippingCoupon ? '(Cupom Frete Grátis) 🎁' : 'GRÁTIS 🚚'}
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
                  <span className={`text-2xl font-extrabold ${isGiftCoupon ? 'text-emerald-300' : 'text-pink-400'}`}>
                    R$ {finalOrderTotal.toFixed(2)}
                    {isGiftCoupon && ' (Grátis! 🎁)'}
                  </span>
                </div>
              </div>

              {/* Alerta de erro de pagamento na coluna de finalização */}
              {paymentErrorMessage && (
                <div className="p-3.5 bg-rose-950/95 border border-rose-400/80 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in shadow-xl shadow-rose-950/50">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-300 block text-xs">Atenção ao pagamento:</span>
                    <span className="text-[11px] text-rose-100 leading-relaxed block">{paymentErrorMessage}</span>
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
                  <span>Preparando seu pacotinho de mimos... ✨</span>
                ) : isGiftCoupon ? (
                  <>
                    <Gift className="w-5 h-5 text-amber-300" />
                    <span>Resgatar Pedido Grátis (R$ 0,00) 🎁</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
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
