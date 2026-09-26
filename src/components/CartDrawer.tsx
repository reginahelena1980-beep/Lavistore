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
  Flower2,
  Sparkles,
  Loader2,
  Check,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { CartItem, ShippingOption, Coupon } from '../types';
import { evaluateCoupon } from '../utils/couponUtils';
import { DEFAULT_COUPONS } from '../data/coupons';
import { calculateMelhorEnvioShipping, formatCep, isValidCep } from '../services/shippingService';

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

  // Sincroniza CEP externo
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

  // Avaliação do cupom
  const couponEval = evaluateCoupon(appliedCoupon, subtotal, 0, availableCoupons);
  const isFreeShippingCoupon = couponEval.isFreeShipping;
  const isGiftCoupon = couponEval.isGift || appliedCoupon?.toUpperCase() === 'BRINDE';
  const isFreeShippingEligible = isFreeShippingCoupon || isGiftCoupon || subtotal >= FREE_SHIPPING_THRESHOLD;

  // Valor do frete considerado
  const rawShippingCost = selectedShippingOption ? selectedShippingOption.price : 0;
  const effectiveShippingCost = isFreeShippingEligible ? 0 : rawShippingCost;

  const finalTotal = isGiftCoupon ? 0 : Math.max(0, subtotal - discountAmount + effectiveShippingCost);

  // Aplicar Cupom
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const evalResult = evaluateCoupon(couponInput, subtotal, 0, availableCoupons);
    if (evalResult.isValid) {
      setAppliedCoupon(evalResult.code);
      setCouponMessage({ text: evalResult.message, isError: false });
      setCouponInput('');
    } else {
      setCouponMessage({ text: evalResult.message, isError: true });
    }
  };

  // Calcular Frete com a API do Melhor Envio
  const handleCalculateShipping = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValidCep(localCep)) {
      setShippingError('Digite um CEP válido com 8 números (ex: 01310-100)');
      return;
    }

    if (items.length === 0) {
      setShippingError('Sua sacola está vazia.');
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
        // Seleciona a primeira opção mais em conta se nenhuma estiver selecionada
        if (!selectedShippingOption || !result.options.some(o => o.id === selectedShippingOption.id)) {
          const cheapest = [...result.options].sort((a, b) => a.price - b.price)[0];
          if (setSelectedShippingOption) {
            setSelectedShippingOption(cheapest);
          }
        }
        setShippingNotice(null);
      } else {
        setShippingError('Nenhuma opção de frete disponível para este CEP no momento.');
      }
    } catch (err: any) {
      setShippingError(err.message || 'Não foi possível cotar o frete no momento.');
    } finally {
      setIsLoadingShipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-['Comfortaa']">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-purple-950/50 backdrop-blur-xs transition-opacity animate-in fade-in" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-purple-100 animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-['Playfair_Display'] font-bold text-base text-purple-950">Sua Sacola de Mimos</h3>
                <span className="text-xs text-purple-600 font-medium">({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
              </div>
            </div>

            <button
              id="btn-close-cart-drawer"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-purple-100 text-purple-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Meter */}
          <div className="p-3.5 bg-purple-50/70 border-b border-purple-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold text-purple-900">
                <Truck className="w-3.5 h-3.5 text-pink-500" />
                {isFreeShippingCoupon ? (
                  <strong className="text-emerald-700">Cupom {appliedCoupon || 'de Frete Grátis'} Ativo! 🚚🎉</strong>
                ) : amountToFreeShipping === 0 ? (
                  <strong className="text-emerald-700">Parabéns! Você ganhou Frete Grátis! 🎉</strong>
                ) : (
                  <span>Faltam <strong>R$ {amountToFreeShipping.toFixed(2)}</strong> para Frete Grátis</span>
                )}
              </span>
              <span className="text-[11px] font-bold text-pink-600">
                {isFreeShippingCoupon ? '100%' : `${Math.round(freeShippingProgress)}%`}
              </span>
            </div>
            <div className="w-full h-2 bg-purple-200/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-pink-400 rounded-full transition-all duration-500"
                style={{ width: isFreeShippingCoupon ? '100%' : `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center text-pink-400 border border-purple-100">
                  <Flower2 className="w-10 h-10 fill-pink-100 text-pink-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-['Playfair_Display'] text-lg font-bold text-purple-950">Sua sacola está vazia</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Que tal escolher alguns mimos delicados ou montar uma caixinha personalizada?
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Explorar a Loja 🌸
                </button>
              </div>
            ) : (
              <>
                {items.map((item, index) => {
                  const itemUnitPrice = item.sizePrice ?? item.product.price;
                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedColor || 'def'}-${item.selectedSize || 'def'}-${index}`}
                      className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100/90 flex gap-3 relative hover:border-pink-200 transition-colors"
                    >
                      {/* Thumbnail */}
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-xl border border-purple-100 shrink-0"
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-xs font-bold text-purple-950 truncate max-w-[180px]">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() => onRemoveItem(item.product.id, item.selectedColor, item.selectedSize)}
                              className="text-purple-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                              title="Remover produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Variants Badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selectedSize && (
                              <span className="text-[10px] font-bold text-pink-700 bg-pink-100/80 px-2 py-0.5 rounded-md border border-pink-200">
                                Tam: <strong>{item.selectedSize}</strong>
                              </span>
                            )}
                            {item.selectedColor && (
                              <span className="text-[10px] text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200">
                                Cor: <strong>{item.selectedColor}</strong>
                              </span>
                            )}
                          </div>

                          {item.isGiftWrapped && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded-md mt-1">
                              <Gift className="w-2.5 h-2.5" />
                              <span>Embalagem Presente (+R$ 5,90)</span>
                            </span>
                          )}
                        </div>

                        {/* Quantity & Unit Price */}
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-purple-100/60">
                          <div className="flex items-center border border-purple-200 rounded-xl bg-white p-0.5">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize)}
                              className="w-6 h-6 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-purple-950">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize)}
                              className="w-6 h-6 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <span className="text-xs sm:text-sm font-extrabold text-pink-600">
                            R$ {((itemUnitPrice + (item.isGiftWrapped ? 5.90 : 0)) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Seção de Frete Real - API Melhor Envio */}
                <div className="p-3.5 bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-2xl border border-purple-100/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-pink-500" />
                      <span>Calcular Frete (Melhor Envio):</span>
                    </span>
                    <span className="text-[10px] text-purple-600 font-medium flex items-center gap-0.5">
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
                      className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400 text-center font-bold tracking-wider"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingShipping}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                    >
                      {isLoadingShipping ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cotando...</span>
                        </>
                      ) : (
                        <span>Calcular</span>
                      )}
                    </button>
                  </form>

                  {shippingError && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {shippingError}
                    </p>
                  )}

                  {shippingNotice && (
                    <p className="text-[10px] text-purple-700 bg-purple-100/60 p-1.5 rounded-lg border border-purple-200">
                      💡 {shippingNotice}
                    </p>
                  )}

                  {/* Lista de Opções de Frete Retornadas pela API */}
                  {shippingOptions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                        Opções disponíveis para o seu CEP:
                      </p>
                      <div className="space-y-1.5">
                        {shippingOptions.map(option => {
                          const isSelected = selectedShippingOption?.id === option.id;
                          const finalOptionPrice = isFreeShippingEligible ? 0 : option.price;

                          return (
                            <div
                              key={option.id}
                              onClick={() => setSelectedShippingOption && setSelectedShippingOption(option)}
                              className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'border-purple-600 bg-white ring-1 ring-purple-400 shadow-xs'
                                  : 'border-purple-200 bg-white/70 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="cart_shipping_option"
                                  checked={isSelected}
                                  onChange={() => setSelectedShippingOption && setSelectedShippingOption(option)}
                                  className="accent-purple-600 cursor-pointer"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-purple-950 text-xs">{option.name}</span>
                                    <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded-md font-semibold">
                                      {option.carrier}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 block">
                                    Prazo: {option.deadline}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                {isFreeShippingEligible ? (
                                  <div>
                                    <span className="text-[10px] line-through text-slate-400 block">
                                      R$ {option.price.toFixed(2)}
                                    </span>
                                    <span className="font-extrabold text-emerald-600 text-xs">
                                      GRÁTIS 🚚
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-extrabold text-pink-600 text-xs">
                                    R$ {option.price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer & Checkout Area */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-purple-100 space-y-3.5">
              
              {/* Formulário de Cupom de Desconto */}
              <div className="space-y-1.5">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Digite seu cupom de desconto"
                      className="w-full pl-8 pr-3 py-1.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-400 uppercase font-semibold"
                    />
                    <Tag className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Aplicar
                  </button>
                </form>

                {couponMessage && (
                  <p className={`text-[11px] font-medium ${couponMessage.isError ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {couponMessage.text}
                  </p>
                )}
              </div>

              {/* Mensagem especial quando o Cupom Cortesia/Brinde está ativo */}
              {isGiftCoupon && (
                <div className="p-2.5 bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 rounded-xl border border-pink-300 text-xs text-pink-950 font-bold flex items-center justify-center gap-1.5 shadow-2xs animate-in fade-in">
                  <Gift className="w-4 h-4 text-pink-600 shrink-0" />
                  <span>Cupom Especial Ativo: Valor da compra zerado para R$ 0,00! 🌸</span>
                </div>
              )}

              {/* Detalhamento de Valores */}
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-purple-100 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal dos itens:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>

                {/* Cupom Aplicado */}
                {appliedCoupon && (
                  <div className={`flex justify-between items-center font-semibold px-2.5 py-1.5 rounded-lg border ${
                    isGiftCoupon
                      ? 'bg-pink-100/90 text-pink-950 border-pink-300 shadow-2xs'
                      : 'bg-pink-50/70 text-pink-600 border-pink-200'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {isGiftCoupon ? <Gift className="w-3.5 h-3.5 text-pink-600" /> : <Tag className="w-3.5 h-3.5 text-pink-500" />}
                      <span>Cupom ({appliedCoupon}):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={isGiftCoupon ? 'font-bold text-pink-900' : ''}>
                        {isGiftCoupon
                          ? `- R$ ${subtotal.toFixed(2)} (100% OFF Brinde)`
                          : isFreeShippingCoupon 
                          ? 'Frete Grátis 🚚' 
                          : `- R$ ${discountAmount.toFixed(2)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput('');
                          setCouponMessage({ text: 'Cupom removido.', isError: false });
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 underline font-bold cursor-pointer"
                        title="Remover cupom"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}

                {/* Frete */}
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-purple-500" />
                    <span>
                      Frete {selectedShippingOption ? `(${selectedShippingOption.name})` : ''}:
                    </span>
                  </span>
                  <div>
                    {isFreeShippingEligible ? (
                      <div className="text-right">
                        {rawShippingCost > 0 && (
                          <span className="text-[10px] line-through text-slate-400 mr-1.5">
                            R$ {rawShippingCost.toFixed(2)}
                          </span>
                        )}
                        <span className="text-emerald-600 font-bold">
                          R$ 0,00 {isGiftCoupon ? '(Cortesia Brinde) 🎁' : isFreeShippingCoupon ? '(Cupom) 🎁' : 'GRÁTIS 🚚'}
                        </span>
                      </div>
                    ) : selectedShippingOption ? (
                      <span className="font-semibold text-slate-800">
                        R$ {selectedShippingOption.price.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-purple-600 italic">
                        Calcule acima ou no checkout
                      </span>
                    )}
                  </div>
                </div>

                {/* Total da Sacola */}
                <div className="flex justify-between items-baseline pt-2 border-t border-purple-100 text-sm">
                  <span className="font-bold text-purple-950">Total da Sacola:</span>
                  <span className={`text-xl font-extrabold ${isGiftCoupon ? 'text-emerald-700' : 'text-pink-600'}`}>
                    R$ {finalTotal.toFixed(2)}
                    {isGiftCoupon && ' (Grátis! 🎁)'}
                  </span>
                </div>
              </div>

              {/* Botão Finalizar */}
              <button
                id="btn-drawer-checkout"
                onClick={onProceedToCheckout}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-700 hover:to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-[10px] text-purple-700/80 font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>API Melhor Envio Conectada • Entrega Garantida</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
