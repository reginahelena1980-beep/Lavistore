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
  Share2,
  Ruler,
  Palette,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Product } from '../types';
import { playEquipSound, playClickSound } from '../utils/soundSystem';

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
      playClickSound();
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#09101F] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(6,182,212,0.3)] border border-cyan-500/40 relative text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-product-modal"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#050A14]/90 hover:bg-[#0E172C] text-slate-300 hover:text-cyan-300 border border-cyan-500/30 flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-8">
          
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-6 space-y-4">
            <div className={`relative aspect-square rounded-2xl overflow-hidden border border-cyan-500/30 shadow-inner ${
              product.imageFit === 'contain' ? 'bg-[#040813] flex items-center justify-center p-3' : 'bg-[#050914]'
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
                <span className="absolute top-3 left-3 bg-[#050A14]/90 backdrop-blur-xs text-cyan-300 text-xs font-bold px-3 py-1 rounded-full shadow-md border border-cyan-400/40 flex items-center gap-1.5 font-['Cinzel',serif]">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
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
                    onClick={() => {
                      playClickSound();
                      setActiveImageIdx(idx);
                    }}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImageIdx === idx ? 'border-cyan-400 scale-105 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'border-cyan-500/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Brand Perks Pill */}
            <div className="bg-[#050A15] rounded-2xl p-3.5 border border-cyan-500/25 space-y-2 text-xs text-slate-300 font-['Cinzel',serif]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-cyan-200">Embalagem especial com Selo do Rei Pálido.</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Garantia & Proteção do Guardião (CDC 7 dias).</span>
                </div>
                {onOpenReturnPolicy && (
                  <button
                    type="button"
                    id="btn-product-open-return-policy"
                    onClick={onOpenReturnPolicy}
                    className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 text-[11px] cursor-pointer"
                  >
                    Ver política de garantia
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
                <div className="flex items-center gap-1.5 text-amber-400 text-xs">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-200">{product.rating}</span>
                  <span className="text-slate-400">({product.reviewCount} avaliações reais)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Compartilhar"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      onToggleFavorite(product);
                    }}
                    className="p-2 rounded-full hover:bg-cyan-950/60 text-slate-300 hover:text-pink-400 transition-colors cursor-pointer"
                    title="Favoritar"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>
                </div>
              </div>

              {copiedLink && (
                <div className="bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs py-1 px-3 rounded-lg mb-2 text-center animate-in fade-in">
                  Link copiado com sucesso! 🧭
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <h2 className="font-['Cinzel',serif] text-xl sm:text-2xl font-bold text-white leading-snug">
                  {product.name}
                </h2>
              </div>

              {/* Pricing */}
              <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] font-['Cinzel',serif]">
                  R$ {effectivePrice.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-slate-500 line-through">
                    R$ {product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-xs font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  em até 3x de R$ {(effectivePrice / 3).toFixed(2)} sem juros
                </span>
              </div>

              {/* Stock status */}
              <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
                {isOutOfStock ? (
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold bg-rose-950/70 px-2.5 py-1 rounded-lg border border-rose-500/40 font-['Cinzel',serif]">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Esgotado</span>
                  </div>
                ) : isAdminMode ? (
                  <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Em estoque: {effectiveStock} un. disponíveis{activeSizeVariant ? ` (${activeSizeVariant.label})` : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Disponível no inventário para envio imediato</span>
                  </div>
                )}
              </div>

              {/* Size Selector (If product has sizes/variants) */}
              {hasSizeOption && product.sizes && product.sizes.length > 0 && (
                <div className={`mt-4 p-3.5 rounded-2xl transition-all space-y-2.5 ${
                  validationAttempted && !isSizeSelected
                    ? 'border-2 border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/40 shadow-sm'
                    : 'border border-cyan-500/30 bg-[#060B17]'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap font-['Cinzel',serif]">
                      <Ruler className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Selecione o Tamanho / Medida:</span>
                      {activeSizeVariant ? (
                        <span className="text-cyan-300 font-extrabold ml-1 bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-500/40">
                          {activeSizeVariant.label}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          validationAttempted && !isSizeSelected
                            ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border-amber-500/50'
                        }`}>
                          * Obrigatório escolher
                        </span>
                      )}
                    </label>
                    <span className="text-[9px] text-cyan-400 font-semibold bg-[#0A1224] px-2 py-0.5 rounded-full border border-cyan-500/30">
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
                            playClickSound();
                            setSelectedSizeId(sz.id);
                            setQuantity(1);
                          }}
                          className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center min-w-[70px] cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105 border-cyan-300'
                              : isSoldOut
                                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50 line-through'
                                : 'bg-[#0C1527] hover:bg-cyan-950 text-slate-200 border border-cyan-500/30 hover:border-cyan-400 shadow-2xs'
                          }`}
                        >
                          <span>{sz.label}</span>
                          {product.sizePricingMode === 'custom' && sz.price && sz.price !== product.price && (
                            <span className={`text-[8px] ${isSelected ? 'text-slate-900 font-black' : 'text-cyan-400 font-black'}`}>
                              R$ {sz.price.toFixed(2)}
                            </span>
                          )}
                          {isSoldOut && (
                            <span className="text-[7px] font-normal text-slate-500">Esgotado</span>
                          )}
                          {!isSoldOut && sz.stock <= 3 && isAdminMode && (
                            <span className={`text-[7px] font-extrabold ${isSelected ? 'text-slate-900' : 'text-amber-400'}`}>
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
              <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {product.description}
              </p>

              {/* Color Grid Selection if any */}
              {hasColorOption && product.colors && product.colors.length > 0 && (
                <div className={`mt-4 space-y-2.5 p-3.5 rounded-2xl transition-all shadow-2xs ${
                  validationAttempted && !isColorSelected
                    ? 'border-2 border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/40 shadow-sm'
                    : 'border border-cyan-500/30 bg-[#060B17]'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap font-['Cinzel',serif]">
                      <Palette className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Grade de Cores / Estampas:</span>
                      {selectedColor ? (
                        <span className="font-extrabold text-xs text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/40 shadow-2xs ml-1">
                          {selectedColor}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          validationAttempted && !isColorSelected
                            ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border-amber-500/50'
                        }`}>
                          * Obrigatório escolher
                        </span>
                      )}
                    </label>
                    <span className="text-[9px] text-cyan-400 font-semibold bg-[#0A1224] px-2 py-0.5 rounded-full border border-cyan-500/30">
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
                          onClick={() => {
                            playClickSound();
                            setSelectedColor(c.name);
                          }}
                          className={`group relative p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2.5 text-left cursor-pointer ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200 ring-2 ring-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                              : 'border-cyan-500/20 bg-[#0B1426] hover:bg-cyan-950/40 text-slate-300'
                          }`}
                        >
                          {c.imageUrl ? (
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/30 shrink-0 bg-slate-900 shadow-2xs">
                              <img
                                src={c.imageUrl}
                                alt={c.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                            </div>
                          ) : (
                            <div 
                              className={`w-7 h-7 rounded-lg border border-cyan-500/40 shrink-0 shadow-2xs flex items-center justify-center ${c.bgClass || 'bg-cyan-600'}`}
                              style={c.hex ? { backgroundColor: c.hex } : undefined}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <span className={`block font-bold text-xs truncate ${isSelected ? 'text-cyan-200' : 'text-slate-200'}`}>
                              {c.name}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Features List */}
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-bold text-cyan-300 font-['Cinzel',serif]">Destaques da relíquia:</p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {product.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                  {product.dimensions && (
                    <li className="flex items-center gap-2 text-cyan-200 font-medium">
                      <span className="text-cyan-400">📏</span>
                      <span>Dimensões: {product.dimensions}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Gift Wrapping Option Checkbox */}
              <div className="mt-4 p-3 bg-[#060B17] rounded-2xl border border-cyan-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gift className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-100 font-['Cinzel',serif]">Embalagem Mística de Presente?</p>
                    <p className="text-[11px] text-slate-400">Inclui lacre de cera, selo do Rei Pálido e cartão de aventureiro</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="checkbox-gift-wrap"
                  checked={isGiftWrapped}
                  onChange={(e) => setIsGiftWrapped(e.target.checked)}
                  className="w-5 h-5 text-cyan-500 rounded-md border-cyan-500/40 focus:ring-cyan-400 cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Validation Warning Alert */}
              {validationAttempted && !canProceed && (
                <div className="mt-3 p-3 bg-rose-950/80 border border-rose-500 rounded-2xl flex items-center gap-2.5 text-rose-200 text-xs font-bold animate-in fade-in shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
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
            <div className="pt-4 border-t border-cyan-500/20 flex items-center gap-3">
              <div className="flex items-center border border-cyan-500/30 rounded-2xl bg-[#060B17] p-1">
                <button
                  onClick={() => {
                    playClickSound();
                    setQuantity(Math.max(1, quantity - 1));
                  }}
                  disabled={isOutOfStock || !canProceed}
                  className="w-8 h-8 rounded-xl bg-[#0D162B] hover:bg-cyan-950 text-slate-200 font-bold flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-sm text-cyan-300 font-['Cinzel',serif]">
                  {quantity}
                </span>
                <button
                  onClick={() => {
                    playClickSound();
                    setQuantity(Math.min(effectiveStock, quantity + 1));
                  }}
                  disabled={isOutOfStock || !canProceed}
                  className="w-8 h-8 rounded-xl bg-[#0D162B] hover:bg-cyan-950 text-slate-200 font-bold flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
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

                  playEquipSound();
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
                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-98 cursor-pointer font-['Cinzel',serif] ${
                  isOutOfStock
                    ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed shadow-none'
                    : !canProceed
                      ? 'bg-gradient-to-r from-amber-500 via-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.6)] font-black'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>
                  {isOutOfStock 
                    ? (product.hasSizes ? 'Tamanho Esgotado' : 'Esgotado') 
                    : !canProceed
                      ? (!isSizeSelected && !isColorSelected
                          ? 'Selecione Tamanho e Cor'
                          : !isSizeSelected
                            ? 'Selecione o Tamanho'
                            : 'Selecione a Cor')
                      : `Adicionar ao Inventário • R$ ${(effectivePrice * quantity + (isGiftWrapped ? 5.90 : 0)).toFixed(2)}`}
                </span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
