import React, { useState } from 'react';
import { Heart, Star, ShoppingBag, Eye, Flower2, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (
    product: Product,
    quantity?: number,
    selectedColor?: string,
    isGiftWrapped?: boolean,
    selectedSize?: string,
    sizePrice?: number,
    selectedSizeId?: string,
    biRecordId?: string
  ) => void;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  isAdminMode?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenProduct,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  isAdminMode = false,
}) => {
  const hasSizes = Boolean(product.hasSizes && product.sizes && product.sizes.length > 0);
  const hasColors = Boolean(product.colors && product.colors.length > 0);

  // Seleção dinâmica do tamanho / variação ativo no card
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>(() => {
    if (hasSizes && product.sizes && product.sizes.length > 0) {
      const inStock = product.sizes.find(s => s.stock > 0);
      return inStock?.id || product.sizes[0].id;
    }
    return undefined;
  });

  const activeSizeVariant = hasSizes && product.sizes
    ? product.sizes.find(s => s.id === selectedSizeId) || product.sizes[0]
    : null;

  const currentPrice = activeSizeVariant && product.sizePricingMode === 'custom' && activeSizeVariant.price
    ? activeSizeVariant.price
    : product.price;

  const isCurrentOutOfStock = hasSizes && activeSizeVariant
    ? activeSizeVariant.stock <= 0
    : (product.stock ?? 0) <= 0;

  const isOutOfStock = (product.stock ?? 0) <= 0;
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)
    : null;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-white/90 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative"
    >
      {/* Image and Top Badges */}
      <div 
        className={`relative aspect-square overflow-hidden cursor-pointer ${
          product.imageFit === 'contain' 
            ? 'bg-gradient-to-br from-purple-50/80 via-amber-50/50 to-pink-50/80 p-2 flex items-center justify-center' 
            : 'bg-amber-50/40'
        }`} 
        onClick={() => onOpenProduct(product)}
      >
        <img
          src={product.images[0]}
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
          className={`w-full h-full group-hover:scale-108 transition-transform duration-500 ${isOutOfStock ? 'opacity-75' : ''}`}
          loading="lazy"
        />

        {/* Gradient overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges on Top Left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {/* Out of Stock tag - shown to both, but as a clean status tag without quantities */}
          {isOutOfStock ? (
            <span className="bg-rose-600 text-white text-[9px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md border border-white/70 tracking-wide uppercase">
              Esgotado
            </span>
          ) : product.stock > 0 && product.stock <= 5 ? (
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[8px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md border border-white/80 tracking-wide flex items-center gap-1 animate-pulse">
              <span>⚡ Restam {product.stock} un.</span>
            </span>
          ) : product.tag ? (
            <span className="bg-white/95 backdrop-blur-xs text-purple-950 text-[8px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-xs border border-amber-200/80 flex items-center gap-1">
              <Flower2 className="w-3 h-3 text-pink-500 fill-pink-300" />
              <span>{product.tag}</span>
            </span>
          ) : null}

          {discountPercent && !isOutOfStock && (
            <span className="bg-gradient-to-r from-[#F43F5E] to-[#FB923C] text-white text-[8px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full shadow-xs self-start border border-white/60">
              -{discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Favorite Wishlist Button */}
        <button
          id={`btn-fav-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          aria-label="Adicionar aos favoritos"
          className="absolute top-2.5 right-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-xs text-purple-800 hover:text-pink-500 hover:bg-white flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-90 z-10 border border-amber-200/60"
        >
          <Heart 
            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors ${
              isFavorite ? 'text-pink-500 fill-pink-500' : 'text-purple-600'
            }`} 
          />
        </button>

        {/* Quick View Button on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenProduct(product);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/95 backdrop-blur-xs text-purple-950 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md border-2 border-amber-200 flex items-center gap-1.5 hover:bg-amber-50"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-600" />
          <span>Espiar Detalhes</span>
        </button>
      </div>

      {/* Content Info */}
      <div className="p-3.5 sm:p-5 flex flex-col flex-1 justify-between gap-3 font-['Comfortaa']">
        <div>
          {/* Rating and Color Preview */}
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-slate-800">{product.rating}</span>
              <span className="text-slate-400 text-[11px]">({product.reviewCount})</span>
            </div>

            {/* Colors Preview */}
            {product.colors && product.colors.length > 1 && (
              <div className="flex items-center gap-1" title={`${product.colors.length} cores/estampas disponíveis`}>
                {product.colors.slice(0, 4).map((col, idx) => (
                  <span
                    key={col.id || idx}
                    className={`w-2.5 h-2.5 rounded-full border border-purple-200/80 shadow-2xs overflow-hidden inline-block ${col.bgClass || 'bg-pink-300'}`}
                    style={col.hex ? { backgroundColor: col.hex } : undefined}
                    title={col.name}
                  />
                ))}
                {product.colors.length > 4 && (
                  <span className="text-[9px] font-bold text-slate-400">
                    +{product.colors.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Product Title */}
          <h3 
            onClick={() => onOpenProduct(product)}
            className="font-semibold text-xs sm:text-sm text-purple-950 line-clamp-2 hover:text-pink-600 cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          {/* Dynamic Tam/Cor Variation Selector (Storefront Public Card) */}
          {hasSizes && product.sizes && product.sizes.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-dashed border-amber-200/90 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-purple-950 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-500" />
                  <span>Opções ({product.sizes.length}):</span>
                </span>
                {activeSizeVariant && (
                  <span className={`text-[10px] font-bold ${
                    activeSizeVariant.stock <= 0
                      ? 'text-rose-600 font-extrabold'
                      : 'text-emerald-700'
                  }`}>
                    {activeSizeVariant.stock <= 0
                      ? 'Esgotado'
                      : 'Disponível'}
                  </span>
                )}
              </div>

              {/* Botões seletores de Tam/Cor limpos e elegantes (sem quantidade numérica exposta) */}
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map((sz) => {
                  const isSelected = activeSizeVariant?.id === sz.id;
                  const isSoldOut = sz.stock <= 0;
                  return (
                    <button
                      key={sz.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSizeId(sz.id);
                      }}
                      title={`${sz.label}: ${isSoldOut ? 'Esgotado' : 'Disponível'}${sz.price ? ` - R$ ${sz.price.toFixed(2)}` : ''}`}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-xs ring-2 ring-pink-300 scale-102'
                          : isSoldOut
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-55'
                            : 'bg-white hover:bg-pink-50 text-purple-950 border-purple-200 hover:border-pink-300 shadow-2xs'
                      }`}
                    >
                      <span>{sz.label}</span>
                      {isSoldOut && (
                        <span className="text-[9px] text-slate-400 font-normal ml-1">
                          (Esgotado)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin-only Stock Status Badge */}
          {isAdminMode && (
            <div className="mt-2 flex items-center justify-between gap-1.5 pt-1 border-t border-dashed border-amber-200/80">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                product.stock > 5
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : product.stock > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  product.stock > 5 ? 'bg-emerald-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <span>{product.stock > 0 ? `Estoque Total: ${product.stock} un.` : 'Estoque Zerado'}</span>
              </span>

              {product.hasSizes && product.sizes && (
                <span className="text-[9px] font-bold text-purple-800 bg-purple-100/70 px-1.5 py-0.5 rounded-md border border-purple-200">
                  {product.sizes.length} variações
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2 border-t border-amber-100 flex items-center justify-between gap-2">
          <div>
            {product.originalPrice && (
              <span className="text-[11px] text-slate-400 line-through block font-medium">
                R$ {product.originalPrice.toFixed(2)}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-purple-900">R$</span>
              <span className="text-base sm:text-lg font-extrabold text-[#E11D48]">
                {currentPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {(() => {
            const needsModal = Boolean(hasColors && product.colors && product.colors.length > 0);
            const buttonDisabled = isCurrentOutOfStock;

            return (
              <button
                id={`btn-add-cart-${product.id}`}
                disabled={buttonDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (buttonDisabled) return;
                  if (needsModal) {
                    onOpenProduct(product);
                  } else {
                    onAddToCart(
                      product,
                      1,
                      undefined,
                      false,
                      activeSizeVariant?.label,
                      currentPrice,
                      activeSizeVariant?.id,
                      activeSizeVariant?.biRecordId
                    );
                  }
                }}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl font-bold text-xs transition-all duration-300 flex items-center gap-1.5 shadow-2xs border ${
                  buttonDisabled
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                    : needsModal
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-pink-400 active:scale-95 group/btn cursor-pointer shadow-xs'
                      : 'bg-amber-100 hover:bg-gradient-to-r hover:from-[#F43F5E] hover:via-[#FB923C] hover:to-[#06B6D4] text-purple-950 hover:text-white border-amber-300 active:scale-95 group/btn cursor-pointer'
                }`}
                title={
                  buttonDisabled 
                    ? 'Variação Esgotada' 
                    : needsModal 
                      ? 'Selecione a cor desejada' 
                      : activeSizeVariant 
                        ? `Adicionar ${product.name} (${activeSizeVariant.label}) à sacola`
                        : 'Adicionar à Sacola'
                }
              >
                <ShoppingBag className={`w-4 h-4 ${buttonDisabled ? 'text-slate-400' : needsModal ? 'text-white' : 'text-purple-900 group-hover/btn:text-white'} transition-colors`} />
                <span className="hidden sm:inline">
                  {buttonDisabled ? 'Esgotado' : needsModal ? 'Opções' : 'Adicionar'}
                </span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
