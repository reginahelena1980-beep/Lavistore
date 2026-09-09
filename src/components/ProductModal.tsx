import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  ShoppingBag, 
  Star, 
  Gift, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Flower2, 
  Share2,
  Ruler,
  Palette,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product, 
    quantity: number, 
    selectedColor?: string, 
    isGiftWrapped?: boolean,
    selectedSize?: string,
    sizePrice?: number
  ) => void;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  isAdminMode?: boolean;
  onOpenReturnPolicy?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  isAdminMode = false,
  onOpenReturnPolicy,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>(undefined);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state when product changes
  React.useEffect(() => {
    if (product) {
      setActiveImageIdx(0);
      setQuantity(1);
      setSelectedColor(undefined);
      setSelectedSizeId(undefined);
      setValidationAttempted(false);
      setIsGiftWrapped(false);
    }
  }, [product?.id]);

  if (!product) return null;

  // Additional options detection
  const hasSizeOption = Boolean(product.hasSizes && product.sizes && product.sizes.length > 0);
  const hasColorOption = Boolean(product.colors && product.colors.length > 0);

  // Option selection requirements
  const isSizeSelected = !hasSizeOption || Boolean(selectedSizeId);
  const isColorSelected = !hasColorOption || Boolean(selectedColor);
  const canProceed = isSizeSelected && isColorSelected;

  // Active Size Info
  const activeSizeVariant = (hasSizeOption && selectedSizeId)
    ? product.sizes?.find(s => s.id === selectedSizeId)
    : undefined;

  const effectivePrice = activeSizeVariant?.price ?? product.price;

  const totalSizesStock = hasSizeOption
    ? (product.sizes?.reduce((acc, s) => acc + (s.stock || 0), 0) ?? 0)
    : product.stock;

  const effectiveStock = hasSizeOption
    ? (activeSizeVariant ? activeSizeVariant.stock : totalSizesStock)
    : product.stock;

  const isOutOfStock = hasSizeOption
    ? (selectedSizeId ? (activeSizeVariant ? activeSizeVariant.stock <= 0 : false) : totalSizesStock <= 0)
    : product.stock <= 0;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-purple-100 relative text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-product-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-purple-100 text-purple-900 flex items-center justify-center shadow-md transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-8">
          
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-6 space-y-4">
            <div className={`relative aspect-square rounded-2xl overflow-hidden border border-purple-100 shadow-inner ${
              product.imageFit === 'contain' ? 'bg-gradient-to-br from-purple-50 via-amber-50/50 to-pink-50 flex items-center justify-center p-3' : 'bg-purple-50'
            }`}>
              <img
                src={product.images[activeImageIdx] || product.images[0]}
                alt={product.name}
                referrerPolicy="no-referrer"
                style={{
                  objectFit: product.imageFit || 'cover',
                  objectPosition: product.imagePosition === 'top' 
                    ? 'top center' 
                    : product.imagePosition === 'bottom' 
                      ? 'bottom center' 
                      : 'center center',
                  transform: product.imageScale && product.imageScale !== 100 
                    ? `scale(${product.imageScale / 100})` 
                    : undefined,
                }}
                className="w-full h-full transition-transform duration-300"
              />
              {product.tag && (
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-purple-900 text-xs font-bold px-3 py-1 rounded-full shadow-xs border border-purple-100 flex items-center gap-1.5">
                  <Flower2 className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
                  <span>{product.tag}</span>
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIdx === idx ? 'border-pink-500 scale-105 shadow-xs' : 'border-purple-100 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Brand Perks Pill */}
            <div className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-100 space-y-2 text-xs text-purple-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-semibold">Embalagem especial perfumada.</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Garantia de 7 dias (CDC) ou seu dinheiro de volta.</span>
                </div>
                {onOpenReturnPolicy && (
                  <button
                    type="button"
                    id="btn-product-open-return-policy"
                    onClick={onOpenReturnPolicy}
                    className="text-pink-600 hover:text-pink-700 font-bold underline underline-offset-2 text-[11px] cursor-pointer"
                  >
                    Ver política de troca
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Product Information */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-5">
            <div>
              {/* Reviews & Actions */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-amber-500 text-xs">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">{product.rating}</span>
                  <span className="text-slate-500">({product.reviewCount} avaliações reais)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full hover:bg-purple-50 text-purple-700 transition-colors"
                    title="Compartilhar"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleFavorite(product)}
                    className="p-2 rounded-full hover:bg-pink-50 text-pink-600 transition-colors"
                    title="Favoritar"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>
                </div>
              </div>

              {copiedLink && (
                <div className="bg-pink-100 text-pink-800 text-xs py-1 px-3 rounded-lg mb-2 text-center animate-in fade-in">
                  Link copiado com sucesso! 🌸
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950 leading-snug">
                  {product.name}
                </h2>
              </div>

              {/* Pricing */}
              <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-pink-600">
                  R$ {effectivePrice.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    R$ {product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  em até 3x de R$ {(effectivePrice / 3).toFixed(2)} sem juros
                </span>
              </div>

              {/* Stock status */}
              <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
                {isOutOfStock ? (
                  <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Esgotado</span>
                  </div>
                ) : isAdminMode ? (
                  <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Em estoque: {effectiveStock} un. disponíveis{activeSizeVariant ? ` (${activeSizeVariant.label})` : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Disponível para envio imediato</span>
                  </div>
                )}
              </div>

              {/* Size Selector (If product has sizes/variants) */}
              {hasSizeOption && product.sizes && product.sizes.length > 0 && (
                <div className={`mt-4 p-3.5 rounded-2xl transition-all space-y-2.5 ${
                  validationAttempted && !isSizeSelected
                    ? 'border-2 border-rose-400 bg-rose-50/70 ring-2 ring-rose-200/70 shadow-sm'
                    : 'border border-pink-200 bg-pink-50/50'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 flex-wrap">
                      <Ruler className="w-4 h-4 text-pink-600 shrink-0" />
                      <span>Selecione o Tamanho / Medida:</span>
                      {activeSizeVariant ? (
                        <span className="text-pink-600 font-extrabold ml-1 bg-pink-100 px-2 py-0.5 rounded-lg border border-pink-200">
                          {activeSizeVariant.label}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          validationAttempted && !isSizeSelected
                            ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          * Obrigatório escolher
                        </span>
                      )}
                    </label>
                    <span className="text-[8px] text-purple-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-pink-200">
                      {product.sizes.length} opções disponíveis
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((sz) => {
                      const isSelected = selectedSizeId === sz.id;
                      const isSoldOut = sz.stock <= 0;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => {
                            setSelectedSizeId(sz.id);
                            setQuantity(1);
                          }}
                          className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center min-w-[70px] cursor-pointer ${
                            isSelected
                              ? 'bg-pink-500 text-white shadow-md ring-2 ring-pink-300 scale-105 border-transparent'
                              : isSoldOut
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 line-through'
                                : 'bg-white hover:bg-pink-100/70 text-purple-950 border border-purple-200 hover:border-pink-300 shadow-2xs'
                          }`}
                        >
                          <span>{sz.label}</span>
                          {product.sizePricingMode === 'custom' && sz.price && sz.price !== product.price && (
                            <span className={`text-[8px] ${isSelected ? 'text-pink-100' : 'text-rose-600 font-black'}`}>
                              R$ {sz.price.toFixed(2)}
                            </span>
                          )}
                          {isSoldOut && (
                            <span className="text-[7px] font-normal text-slate-400">Esgotado</span>
                          )}
                          {!isSoldOut && sz.stock <= 3 && isAdminMode && (
                            <span className={`text-[7px] font-extrabold ${isSelected ? 'text-amber-200' : 'text-amber-600'}`}>
                              Resta {sz.stock}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-['Quicksand'] font-medium">
                {product.description}
              </p>

              {/* Color Grid Selection if any */}
              {hasColorOption && product.colors && product.colors.length > 0 && (
                <div className={`mt-4 space-y-2.5 p-3.5 rounded-2xl transition-all shadow-2xs ${
                  validationAttempted && !isColorSelected
                    ? 'border-2 border-rose-400 bg-rose-50/70 ring-2 ring-rose-200/70 shadow-sm'
                    : 'border border-pink-200/80 bg-gradient-to-br from-amber-50/40 via-white to-pink-50/40'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 flex-wrap">
                      <Palette className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span>Grade de Cores / Estampas:</span>
                      {selectedColor ? (
                        <span className="font-extrabold text-xs text-pink-600 bg-pink-100/90 px-2.5 py-0.5 rounded-lg border border-pink-200 shadow-2xs ml-1">
                          {selectedColor}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          validationAttempted && !isColorSelected
                            ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          * Obrigatório escolher
                        </span>
                      )}
                    </label>
                    <span className="text-[8px] text-purple-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-pink-200">
                      {product.colors.length} {product.colors.length === 1 ? 'opção' : 'opções'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.colors.map((c) => {
                      const isSelected = selectedColor === c.name;
                      return (
                        <button
                          key={c.id || c.name}
                          type="button"
                          onClick={() => setSelectedColor(c.name)}
                          className={`group relative p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2.5 text-left cursor-pointer ${
                            isSelected
                              ? 'border-pink-500 bg-pink-50/90 text-pink-950 ring-2 ring-pink-300 shadow-xs'
                              : 'border-purple-100 bg-white hover:bg-pink-50/40 hover:border-pink-200 text-slate-700 shadow-2xs'
                          }`}
                        >
                          {/* Color Image or Swatch */}
                          {c.imageUrl ? (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-purple-200 shrink-0 bg-slate-100 shadow-2xs">
                              <img
                                src={c.imageUrl}
                                alt={c.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                            </div>
                          ) : (
                            <div 
                              className={`w-7 h-7 rounded-lg border border-purple-200 shrink-0 shadow-2xs flex items-center justify-center ${c.bgClass || 'bg-pink-200'}`}
                              style={c.hex ? { backgroundColor: c.hex } : undefined}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <span className={`block font-bold text-xs truncate ${isSelected ? 'text-pink-950' : 'text-purple-950'}`}>
                              {c.name}
                            </span>
                            {c.imageUrl ? (
                              <span className="text-[9px] text-slate-400 block font-normal">Foto da cor</span>
                            ) : c.hex ? (
                              <span className="text-[9px] text-slate-400 block font-mono uppercase">{c.hex}</span>
                            ) : null}
                          </div>

                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 shadow-2xs" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Features List */}
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-bold text-purple-900">Destaques do produto:</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {product.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                  {product.dimensions && (
                    <li className="flex items-center gap-2 text-purple-800 font-medium">
                      <span className="text-pink-500">📏</span>
                      <span>Dimensões: {product.dimensions}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Gift Wrapping Option Checkbox */}
              <div className="mt-4 p-3 bg-pink-50/70 rounded-2xl border border-pink-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gift className="w-5 h-5 text-pink-500" />
                  <div>
                    <p className="text-xs font-bold text-pink-950">Embalagem para Presente Floral?</p>
                    <p className="text-[11px] text-pink-700">Inclui laço de cetim, papel de seda e cartãozinho</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="checkbox-gift-wrap"
                  checked={isGiftWrapped}
                  onChange={(e) => setIsGiftWrapped(e.target.checked)}
                  className="w-5 h-5 text-pink-500 rounded-md border-pink-300 focus:ring-pink-400 cursor-pointer accent-pink-500"
                />
              </div>
              {/* Validation Warning Alert */}
              {validationAttempted && !canProceed && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-bold animate-in fade-in shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {!isSizeSelected && !isColorSelected
                      ? 'Por favor, selecione um tamanho e uma cor para continuar com a compra.'
                      : !isSizeSelected
                        ? 'Por favor, selecione um tamanho para continuar com a compra.'
                        : 'Por favor, selecione uma cor / estampa para continuar com a compra.'}
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar: Quantity & Add to Cart */}
            <div className="pt-4 border-t border-purple-100 flex items-center gap-3">
              <div className="flex items-center border border-purple-200 rounded-2xl bg-purple-50/50 p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock || !canProceed}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-purple-100 text-purple-900 font-bold flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-sm text-purple-950">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                  disabled={isOutOfStock || !canProceed}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-purple-100 text-purple-900 font-bold flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  +
                </button>
              </div>

              <button
                id="btn-add-modal-to-cart"
                disabled={isOutOfStock}
                onClick={() => {
                  if (!canProceed) {
                    setValidationAttempted(true);
                    return;
                  }
                  if (isOutOfStock) return;

                  onAddToCart(
                    product, 
                    quantity, 
                    selectedColor, 
                    isGiftWrapped,
                    activeSizeVariant?.label,
                    activeSizeVariant?.price ?? product.price
                  );
                  onClose();
                }}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-98 cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : !canProceed
                      ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 hover:from-amber-500 hover:to-pink-600 text-white shadow-pink-200'
                      : 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-700 hover:to-pink-600 text-white shadow-purple-200'
                }`}
              >
                <ShoppingBag className="w-5 h-5 text-white" />
                <span>
                  {isOutOfStock 
                    ? (product.hasSizes ? 'Tamanho Esgotado' : 'Esgotado') 
                    : !canProceed
                      ? (!isSizeSelected && !isColorSelected
                          ? 'Selecione Tamanho e Cor'
                          : !isSizeSelected
                            ? 'Selecione o Tamanho'
                            : 'Selecione a Cor')
                      : `Adicionar à Sacola • R$ ${(effectivePrice * quantity + (isGiftWrapped ? 5.90 : 0)).toFixed(2)}`}
                </span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
