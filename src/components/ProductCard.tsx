import React from 'react';
import { Heart, Star, ShoppingBag, Eye, Zap } from 'lucide-react';
import { Product } from '../types';
import { playClickSound, playEquipSound } from '../utils/soundSystem';

interface ProductCardProps {
  product: Product;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
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
  const isOutOfStock = (product.stock ?? 0) <= 0;
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const handleCardClick = () => {
    playClickSound();
    onOpenProduct(product);
  };

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group bg-[#09101F]/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-cyan-500/25 hover:border-cyan-400/80 shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all duration-300 flex flex-col overflow-hidden relative"
    >
      {/* Image and Top Badges */}
      <div 
        className={`relative aspect-square overflow-hidden cursor-pointer ${
          product.imageFit === 'contain' 
            ? 'bg-[#040813] p-3 flex items-center justify-center' 
            : 'bg-[#050914]'
        }`} 
        onClick={handleCardClick}
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
          className={`w-full h-full group-hover:scale-108 transition-transform duration-500 ${isOutOfStock ? 'opacity-60' : ''}`}
          loading="lazy"
        />

        {/* Gradient overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09101F] via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />

        {/* Badges on Top Left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {isOutOfStock ? (
            <span className="bg-rose-950/90 text-rose-300 text-[9px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md border border-rose-500/60 tracking-wide uppercase font-['Cinzel',serif]">
              Esgotado
            </span>
          ) : product.stock > 0 && product.stock <= 5 ? (
            <span className="bg-cyan-950/90 text-cyan-300 text-[8px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md border border-cyan-400 tracking-wide flex items-center gap-1 animate-pulse">
              <span>⚡ Restam {product.stock} un.</span>
            </span>
          ) : product.tag ? (
            <span className="bg-[#050B17]/90 backdrop-blur-xs text-cyan-300 text-[8px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-xs border border-cyan-500/40 flex items-center gap-1 font-['Cinzel',serif]">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>{product.tag}</span>
            </span>
          ) : null}

          {discountPercent && !isOutOfStock && (
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[8px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full shadow-xs self-start border border-amber-300/60 font-['Cinzel',serif]">
              -{discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Favorite Wishlist Button */}
        <button
          id={`btn-fav-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            playClickSound();
            onToggleFavorite(product);
          }}
          aria-label="Adicionar aos favoritos"
          className="absolute top-2.5 right-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#050A14]/80 backdrop-blur-xs text-slate-300 hover:text-pink-400 hover:bg-[#081020] flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-90 z-10 border border-cyan-500/30"
        >
          <Heart 
            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors ${
              isFavorite ? 'text-pink-500 fill-pink-500' : 'text-slate-300'
            }`} 
          />
        </button>

        {/* Quick View Button on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#050A14]/90 backdrop-blur-md text-cyan-300 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg border border-cyan-400/50 flex items-center gap-1.5 hover:bg-cyan-950/80 font-['Cinzel',serif]"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Examinar Item</span>
        </button>
      </div>

      {/* Content Info */}
      <div className="p-3.5 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Rating and Color Preview */}
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-slate-200">{product.rating}</span>
              <span className="text-slate-400 text-[11px]">({product.reviewCount})</span>
            </div>

            {/* Colors Preview */}
            {product.colors && product.colors.length > 1 && (
              <div className="flex items-center gap-1" title={`${product.colors.length} cores/estampas disponíveis`}>
                {product.colors.slice(0, 4).map((col, idx) => (
                  <span
                    key={col.id || idx}
                    className={`w-2.5 h-2.5 rounded-full border border-cyan-500/40 shadow-2xs overflow-hidden inline-block ${col.bgClass || 'bg-cyan-600'}`}
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
            onClick={handleCardClick}
            className="font-['Cinzel',serif] font-bold text-xs sm:text-sm text-slate-100 line-clamp-2 hover:text-cyan-300 cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          {/* Admin-only Stock Status Badge */}
          {isAdminMode && (
            <div className="mt-2 flex items-center justify-between gap-1.5 pt-1 border-t border-dashed border-cyan-500/30">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                product.stock > 5
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : product.stock > 0
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  product.stock > 5 ? 'bg-emerald-400' : product.stock > 0 ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                <span>{product.stock > 0 ? `Estoque: ${product.stock} un.` : 'Estoque Zerado'}</span>
              </span>

              {product.hasSizes && product.sizes && (
                <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded-md border border-cyan-500/40">
                  {product.sizes.length} tam.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between gap-2">
          <div>
            {product.originalPrice && (
              <span className="text-[11px] text-slate-400 line-through block font-medium">
                R$ {product.originalPrice.toFixed(2)}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-cyan-300 font-['Cinzel',serif]">R$</span>
              <span className="text-base sm:text-lg font-extrabold text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] font-['Cinzel',serif]">
                {product.price.toFixed(2)}
              </span>
            </div>
          </div>

          {(() => {
            const hasOptions = Boolean(
              (product.hasSizes && product.sizes && product.sizes.length > 0) ||
              (product.colors && product.colors.length > 0)
            );

            return (
              <button
                id={`btn-add-cart-${product.id}`}
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOutOfStock) {
                    if (hasOptions) {
                      handleCardClick();
                    } else {
                      playEquipSound();
                      onAddToCart(product);
                    }
                  }
                }}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl font-['Cinzel',serif] font-bold text-xs transition-all duration-300 flex items-center gap-1.5 shadow-md border cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                    : hasOptions
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95'
                      : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border-cyan-400/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95'
                }`}
                title={
                  isOutOfStock 
                    ? 'Produto Esgotado' 
                    : hasOptions 
                      ? 'Selecione variações (tamanho/cor)' 
                      : 'Adicionar ao Inventário'
                }
              >
                <ShoppingBag className={`w-4 h-4 ${isOutOfStock ? 'text-slate-500' : 'text-current'} transition-colors`} />
                <span className="hidden sm:inline">
                  {isOutOfStock ? 'Esgotado' : hasOptions ? 'Opções' : 'Equipar'}
                </span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
