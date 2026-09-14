import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Gift, 
  Truck, 
  Tag, 
  ArrowRight, 
  Sparkles,
  Loader2,
  Check,
  MapPin,
  Shield,
  Zap,
  Gamepad2
} from 'lucide-react';
import { CartItem, ShippingOption, Coupon } from '../types';
import { evaluateCoupon } from '../utils/couponUtils';
import { DEFAULT_COUPONS } from '../data/coupons';
import { calculateMelhorEnvioShipping, formatCep, isValidCep } from '../services/shippingService';
import { playClickSound, playLootSound } from '../utils/soundSystem';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, color?: string, size?: string) => void;
  onRemoveItem: (productId: string, color?: string, size?: string) => void;
  onProceedToCheckout: () => void;
  appliedCoupon: string | null;
  setAppliedCoupon: (coupon: string | null) => void;
  discountAmount: number;
  selectedShippingOption?: ShippingOption | null;
  setSelectedShippingOption?: (option: ShippingOption | null) => void;
  destinationCep?: string;
  setDestinationCep?: (cep: string) => void;
  availableCoupons?: Coupon[];
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  appliedCoupon,
  setAppliedCoupon,
  discountAmount,
  selectedShippingOption,
  setSelectedShippingOption,
  destinationCep: externalCep,
  setDestinationCep: setExternalCep,
  availableCoupons = DEFAULT_COUPONS
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // CEP & Frete Melhor Envio
  const [localCep, setLocalCep] = useState(externalCep || '');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingNotice, setShippingNotice] = useState<string | null>(null);

  useEffect(() => {
    if (externalCep && externalCep !== localCep) {
      setLocalCep(externalCep);
    }
  }, [externalCep]);

  if (!isOpen) return null;

  const FREE_SHIPPING_THRESHOLD = 149.00;

  const subtotal = items.reduce((acc, item) => {
    const unitPrice = item.sizePrice ?? item.product.price;
    const itemCost = unitPrice * item.quantity;
    const wrapCost = item.isGiftWrapped ? 5.90 * item.quantity : 0;
    return acc + itemCost + wrapCost;
  }, 0);

  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const couponEval = evaluateCoupon(appliedCoupon, subtotal, 0, availableCoupons);
  const isFreeShippingCoupon = couponEval.isFreeShipping;
  const isGiftCoupon = couponEval.isGift || appliedCoupon?.toUpperCase() === 'BRINDE';
  const isFreeShippingEligible = isFreeShippingCoupon || isGiftCoupon || subtotal >= FREE_SHIPPING_THRESHOLD;

  const rawShippingCost = selectedShippingOption ? selectedShippingOption.price : 0;
  const effectiveShippingCost = isFreeShippingEligible ? 0 : rawShippingCost;

  const finalTotal = isGiftCoupon ? 0 : Math.max(0, subtotal - discountAmount + effectiveShippingCost);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const evalResult = evaluateCoupon(couponInput, subtotal, 0, availableCoupons);
    if (evalResult.isValid) {
      playLootSound();
      setAppliedCoupon(evalResult.code);
      setCouponMessage({ text: evalResult.message, isError: false });
      setCouponInput('');
    } else {
      setCouponMessage({ text: evalResult.message, isError: true });
    }
  };

  const handleCalculateShipping = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidCep(localCep)) {
      setShippingError('Digite um CEP válido com 8 números (ex: 01310-100)');
      return;
    }

    if (items.length === 0) {
      setShippingError('Seu inventário está vazio.');
      return;
    }

    setIsLoadingShipping(true);
    setShippingError(null);
    setShippingNotice(null);

    try {
      if (setExternalCep) {
        setExternalCep(localCep);
      }

      const result = await calculateMelhorEnvioShipping(localCep, items);
      if (result.options && result.options.length > 0) {
        setShippingOptions(result.options);
        if (!selectedShippingOption || !result.options.some(o => o.id === selectedShippingOption.id)) {
          const cheapest = [...result.options].sort((a, b) => a.price - b.price)[0];
          if (setSelectedShippingOption) {
            setSelectedShippingOption(cheapest);
          }
        }
        if (result.isSimulated) {
          setShippingNotice(result.message || 'Cotação calculada para este CEP.');
        }
      } else {
        setShippingError('Nenhuma opção de rota disponível para este CEP.');
      }
    } catch (err: any) {
      setShippingError(err.message || 'Não foi possível cotar o frete no momento.');
    } finally {
      setIsLoadingShipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-['Cinzel',serif]">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#09101F] text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border-l border-cyan-500/30 animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-cyan-500/25 flex items-center justify-between bg-[#060B17]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Inventário de Drops</h3>
                <span className="text-xs text-cyan-400 font-medium">({items.length} {items.length === 1 ? 'relíquia' : 'relíquias'})</span>
              </div>
            </div>

            <button
              id="btn-close-cart-drawer"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Meter */}
          <div className="p-3.5 bg-[#050A14] border-b border-cyan-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold text-slate-200">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                {isFreeShippingCoupon ? (
                  <strong className="text-emerald-400">Cupom Frete Grátis Ativo! 🚚✨</strong>
                ) : amountToFreeShipping === 0 ? (
                  <strong className="text-emerald-400">Teletransporte Gratuito Ativado! 🛡️</strong>
                ) : (
                  <span>Faltam <strong>R$ {amountToFreeShipping.toFixed(2)}</strong> para Teletransporte Grátis</span>
                )}
              </span>
              <span className="text-[11px] font-bold text-cyan-400">
                {isFreeShippingCoupon ? '100%' : `${Math.round(freeShippingProgress)}%`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: isFreeShippingCoupon ? '100%' : `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#060B17] flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Gamepad2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">Seu inventário está vazio</h4>
                  <p className="text-xs text-slate-400 max-w-xs font-['Plus_Jakarta_Sans',sans-serif]">
                    Desbrave a vitrine da Unlocked Door e colete relíquias épicas para a sua guilda!
                  </p>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer"
                >
                  Desbravar a Vitrine ⚔️
                </button>
              </div>
            ) : (
              <>
                {items.map((item, index) => {
                  const itemUnitPrice = item.sizePrice ?? item.product.price;
                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedColor || 'def'}-${item.selectedSize || 'def'}-${index}`}
                      className="p-3 bg-[#060B17] rounded-2xl border border-cyan-500/25 flex gap-3 relative hover:border-cyan-400/60 transition-colors"
                    >
                      {/* Thumbnail */}
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-xl border border-cyan-500/30 shrink-0 bg-slate-950"
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() => {
                                playClickSound();
                                onRemoveItem(item.product.id, item.selectedColor, item.selectedSize);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Remover relíquia"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Variants Badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selectedSize && (
                              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-500/40">
                                Tam: <strong>{item.selectedSize}</strong>
                              </span>
                            )}
                            {item.selectedColor && (
                              <span className="text-[10px] text-slate-300 bg-[#0A1224] px-2 py-0.5 rounded-md border border-cyan-500/30">
                                Cor: <strong>{item.selectedColor}</strong>
                              </span>
                            )}
                          </div>

                          {item.isGiftWrapped && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded-md mt-1 border border-cyan-500/30">
                              <Gift className="w-2.5 h-2.5 text-cyan-400" />
                              <span>Embalagem Mística (+R$ 5,90)</span>
                            </span>
                          )}
                        </div>

                        {/* Quantity & Unit Price */}
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-cyan-500/20">
                          <div className="flex items-center border border-cyan-500/30 rounded-xl bg-[#09101F] p-0.5">
                            <button
                              onClick={() => {
                                playClickSound();
                                onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize);
                              }}
                              className="w-6 h-6 rounded-lg bg-[#0C1527] hover:bg-cyan-950 text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-cyan-300">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => {
                                playClickSound();
                                onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize);
                              }}
                              className="w-6 h-6 rounded-lg bg-[#0C1527] hover:bg-cyan-950 text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <span className="text-xs sm:text-sm font-extrabold text-cyan-400">
                            R$ {((itemUnitPrice + (item.isGiftWrapped ? 5.90 : 0)) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Seção de Frete Real - API Melhor Envio */}
                <div className="p-3.5 bg-[#060B17] rounded-2xl border border-cyan-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Calcular Rota de Envio (Melhor Envio):</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      Correios & Jadlog
                    </span>
                  </div>

                  <form onSubmit={handleCalculateShipping} className="flex gap-2">
                    <input
                      type="text"
                      value={localCep}
                      onChange={(e) => setLocalCep(formatCep(e.target.value))}
                      placeholder="00000-000"
                      maxLength={9}
                      className="flex-1 px-3 py-1.5 bg-[#09101F] border border-cyan-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 text-center font-bold tracking-wider"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingShipping}
                      className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                    >
                      {isLoadingShipping ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Calculando...</span>
                        </>
                      ) : (
                        <span>Calcular</span>
                      )}
                    </button>
                  </form>

                  {shippingError && (
                    <p className="text-[11px] text-rose-400 font-medium">{shippingError}</p>
                  )}

                  {shippingNotice && (
                    <p className="text-[10px] text-cyan-400/80">{shippingNotice}</p>
                  )}

                  {shippingOptions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {shippingOptions.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            selectedShippingOption?.id === opt.id
                              ? 'border-cyan-400 bg-cyan-950/60 text-white'
                              : 'border-cyan-500/20 bg-[#09101F] text-slate-300 hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="shippingOption"
                              checked={selectedShippingOption?.id === opt.id}
                              onChange={() => {
                                playClickSound();
                                setSelectedShippingOption && setSelectedShippingOption(opt);
                              }}
                              className="text-cyan-500 focus:ring-cyan-400 cursor-pointer accent-cyan-500"
                            />
                            <div>
                              <span className="font-bold text-xs">{opt.name}</span>
                              <span className="text-[10px] text-slate-400 ml-1.5">({opt.deliveryTime})</span>
                            </div>
                          </div>
                          <span className="font-bold text-cyan-300">
                            {isFreeShippingEligible ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2)}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer / Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-cyan-500/25 bg-[#060B17] space-y-4">
              
              {/* Cupom de Desconto */}
              <div className="space-y-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Digite o código do cupom aqui"
                      className="w-full pl-8 pr-3 py-2 bg-[#09101F] border border-cyan-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Aplicar
                  </button>
                </form>

                {couponMessage && (
                  <p className={`text-[11px] font-medium ${couponMessage.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {couponMessage.text}
                  </p>
                )}

                {/* Badges de Cupons Rápidos */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400">Drops rápidos:</span>
                  <button
                    type="button"
                    onClick={() => {
                      playLootSound();
                      setAppliedCoupon('UNLOCKED10');
                      setCouponMessage({ text: 'Cupom UNLOCKED10 aplicado! 10% OFF ⚔️', isError: false });
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-cyan-500/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 cursor-pointer"
                  >
                    🎟️ UNLOCKED10
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playLootSound();
                      setAppliedCoupon('BOSS20');
                      setCouponMessage({ text: 'Cupom BOSS20 aplicado! 20% OFF 🐉', isError: false });
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-cyan-500/40 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 cursor-pointer"
                  >
                    🐉 BOSS20
                  </button>
                </div>
              </div>

              {/* Detalhamento de Valores */}
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-cyan-500/20 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal das relíquias:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center font-semibold px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/70 text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cupom ({appliedCoupon}):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span>- R$ {discountAmount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput('');
                          setCouponMessage({ text: 'Cupom removido.', isError: false });
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}

                {/* Frete */}
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Frete {selectedShippingOption ? `(${selectedShippingOption.name})` : ''}:
                    </span>
                  </span>
                  <div>
                    {isFreeShippingEligible ? (
                      <span className="text-emerald-400 font-bold">
                        GRÁTIS 🚚
                      </span>
                    ) : selectedShippingOption ? (
                      <span className="font-semibold text-white">
                        R$ {selectedShippingOption.price.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-cyan-400 italic">
                        Calcule acima ou no checkout
                      </span>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline pt-2 border-t border-cyan-500/20 text-sm">
                  <span className="font-bold text-white">Total do Inventário:</span>
                  <span className="text-xl font-extrabold text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                    R$ {finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botão Finalizar */}
              <button
                id="btn-drawer-checkout"
                onClick={() => {
                  playLootSound();
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <span>Forjar Pedido & Concluir</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Melhor Envio Conectado • Garantia do Guardião (7 dias CDC)</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
