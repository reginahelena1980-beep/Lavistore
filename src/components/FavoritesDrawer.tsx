import React from 'react';
import { X, Heart, ShoppingBag, Trash2, Flower2 } from 'lucide-react';
import { Product } from '../types';

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
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-purple-950/50 backdrop-blur-xs transition-opacity animate-in fade-in" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-purple-100 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
              </div>
              <div>
                <h3 className="font-['Playfair_Display'] font-bold text-base text-purple-950">Seus Mimos Favoritos</h3>
                <span className="text-xs text-purple-600 font-medium">({favorites.length} {favorites.length === 1 ? 'salvo' : 'salvos'})</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-purple-100 text-purple-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {favorites.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-400">
                  <Flower2 className="w-8 h-8 fill-pink-100 text-pink-400" />
                </div>
                <h4 className="font-['Playfair_Display'] text-lg font-bold text-purple-950">Lista de Desejos Vazia</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Clique no coraçãozinho nos produtos que você amar para guardá-los aqui! 🌸
                </p>
              </div>
            ) : (
              favorites.map((product) => (
                <div
                  key={product.id}
                  className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-center gap-3 hover:border-pink-200 transition-colors"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      onOpenProduct(product);
                      onClose();
                    }}
                    className="w-16 h-16 object-cover rounded-xl border border-purple-100 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 
                      onClick={() => {
                        onOpenProduct(product);
                        onClose();
                      }}
                      className="text-xs font-bold text-purple-950 truncate cursor-pointer hover:text-pink-600"
                    >
                      {product.name}
                    </h4>
                    <span className="text-xs font-bold text-pink-600 block mt-0.5">
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
                                  onOpenProduct(product);
                                  onClose();
                                } else {
                                  onAddToCart(product);
                                }
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer ${
                              product.stock <= 0
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : hasOptions
                                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>
                              {product.stock <= 0 
                                ? 'Esgotado' 
                                : hasOptions 
                                  ? 'Escolher Opções' 
                                  : 'Mover p/ Sacola'}
                            </span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => onRemoveFavorite(product)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remover dos favoritos"
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
