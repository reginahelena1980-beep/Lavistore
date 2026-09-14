import React from 'react';
import { X, Heart, ShoppingBag, Trash2, Sparkles, BookmarkCheck } from 'lucide-react';
import { Product } from '../types';
import { playClickSound, playEquipSound } from '../utils/soundSystem';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Product[];
  onRemoveFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onAddToCart,
  onOpenProduct
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-['Cinzel',serif]">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#09101F] text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border-l border-cyan-500/30 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-cyan-500/25 flex items-center justify-between bg-[#060B17]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-950/70 text-pink-400 flex items-center justify-center border border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Lista de Desejos & Relíquias</h3>
                <span className="text-xs text-cyan-400 font-medium">({favorites.length} {favorites.length === 1 ? 'item salvo' : 'itens salvos'})</span>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {favorites.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#060B17] flex items-center justify-center text-pink-400 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                  <BookmarkCheck className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Nenhuma relíquia guardada</h4>
                <p className="text-xs text-slate-400 max-w-xs font-['Plus_Jakarta_Sans',sans-serif]">
                  Marque com coração as armas, dados e colecionáveis que você deseja forjar depois!
                </p>
              </div>
            ) : (
              favorites.map((product) => (
                <div
                  key={product.id}
                  className="p-3 bg-[#060B17] rounded-2xl border border-cyan-500/25 flex items-center gap-3 hover:border-cyan-400/60 transition-colors"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      playClickSound();
                      onOpenProduct(product);
                      onClose();
                    }}
                    className="w-16 h-16 object-cover rounded-xl border border-cyan-500/30 cursor-pointer bg-slate-950 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 
                      onClick={() => {
                        playClickSound();
                        onOpenProduct(product);
                        onClose();
                      }}
                      className="text-xs font-bold text-white truncate cursor-pointer hover:text-cyan-300"
                    >
                      {product.name}
                    </h4>
                    <span className="text-xs font-bold text-cyan-400 block mt-0.5">
                      R$ {product.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      {(() => {
                        const hasOptions = Boolean(
                          (product.hasSizes && product.sizes && product.sizes.length > 0) ||
                          (product.colors && product.colors.length > 0)
                        );
                        return (
                          <button
                            disabled={product.stock <= 0}
                            onClick={() => {
                              if (product.stock > 0) {
                                if (hasOptions) {
                                  playClickSound();
                                  onOpenProduct(product);
                                  onClose();
                                } else {
                                  playEquipSound();
                                  onAddToCart(product);
                                }
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
                              product.stock <= 0
                                ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                            }`}
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>
                              {product.stock <= 0 
                                ? 'Esgotado' 
                                : hasOptions 
                                  ? 'Ver Opções' 
                                  : 'Equipar Item'}
                            </span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => {
                          playClickSound();
                          onRemoveFavorite(product);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Remover dos desejos"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
