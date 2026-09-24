import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Heart, 
  ShoppingBag, 
  Gift,
  Package,
  PenTool, 
  X, 
  Menu
} from 'lucide-react';
import { ActiveTab, Product, HomePageConfig } from '../types';
import { LavistoreLogo } from './LavistoreLogo';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedCategory?: string;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  products: Product[];
  onOpenProduct: (product: Product) => void;
  isAdminMode?: boolean;
  onToggleAdminMode?: () => void;
  onOpenAdminDashboard?: () => void;
  config?: HomePageConfig;
  onOpenReturnPolicy?: () => void;
  isConfigLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedCategory = 'todos',
  cartCount,
  cartTotal,
  onOpenCart,
  favoritesCount,
  onOpenFavorites,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  products,
  onOpenProduct,
  config,
  onOpenReturnPolicy,
  isConfigLoading = false
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtered search suggestions
  const searchResults = searchQuery.trim().length > 1 
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100/60 shadow-xs font-['Comfortaa']">
      {/* Top Notification Bar - Clean Soft Pink with Centered Promo */}
      {(isConfigLoading || (config?.showAnnouncement !== false && (config?.announcementText?.trim() || config?.announcementCoupon?.trim())) || onOpenReturnPolicy) && (
        <div className="bg-[#FDF2F4] border-b border-pink-100/80 text-purple-950 text-xs py-1.5 px-4 font-medium tracking-wide min-h-[30px] flex items-center">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-center flex-wrap sm:flex-nowrap w-full">
            <div className="flex-1 text-center">
              {isConfigLoading ? (
                <div className="h-3 w-64 bg-pink-200/60 rounded-full animate-pulse inline-block" />
              ) : config?.showAnnouncement !== false && (config?.announcementText?.trim() || config?.announcementCoupon?.trim()) ? (
                <span className="text-purple-900/90 text-xs font-medium">
                  {config?.announcementText?.trim() || ''}
                  {config?.announcementCoupon && config.announcementCoupon.trim() !== '' ? (
                    <strong className="font-bold text-purple-950 ml-1.5 px-2 py-0.5 bg-white/80 rounded-md border border-pink-200 shadow-2xs">
                      {config.announcementCoupon.trim()}
                    </strong>
                  ) : null}
                </span>
              ) : null}
            </div>
            {onOpenReturnPolicy && (
              <button
                type="button"
                id="btn-header-top-return-policy"
                onClick={onOpenReturnPolicy}
                className="hidden md:inline-flex items-center gap-1 text-[11px] text-pink-700 hover:text-pink-900 font-bold underline underline-offset-2 transition-colors cursor-pointer shrink-0"
                title="Direito de arrependimento em 7 dias com reembolso total (CDC)"
              >
                <span>🛡️ Troca Fácil 7 Dias (CDC)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Bar - Clean, spacious layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-22 gap-4">
          
          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-3">
            <button 
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-2xl text-purple-950 hover:bg-purple-50 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Prominent Large Brand Logo */}
            <div 
              onClick={() => {
                setActiveTab('catalog');
                onSelectCategory('todos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer transition-transform duration-300 hover:scale-[1.01] active:scale-95"
            >
              <LavistoreLogo variant="horizontal" size="md" />
            </div>
          </div>

          {/* Center: Clean Pill Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md relative mx-4">
            <div className="relative w-full">
              <input
                id="search-input-desktop"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar mimos, planners, conetas..."
                className="w-full pl-10 pr-9 py-2 bg-white hover:bg-amber-50/30 focus:bg-white border-2 border-[#FDE047] rounded-full text-xs sm:text-sm text-purple-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all shadow-2xs font-medium"
              />
              <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-3 pointer-events-none" />
              {searchQuery && (
                <button
                  id="btn-clear-search-desktop"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-amber-500 hover:text-amber-700 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <p className="text-[11px] font-bold text-purple-900 px-3 py-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Mimos Encontrados ({searchResults.length})</span>
                </p>
                <div className="divide-y divide-amber-100">
                  {searchResults.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        onOpenProduct(item);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-amber-50/80 rounded-xl cursor-pointer transition-colors"
                    >
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-purple-950 truncate">{item.name}</p>
                        <p className="text-[11px] text-pink-600 font-bold">R$ {item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Clean & Uncluttered Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Toggle on Mobile */}
            <button
              id="btn-toggle-search-mobile"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 rounded-2xl text-purple-900 hover:bg-purple-50 transition-colors"
              aria-label="Buscar produtos"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Button */}
            <button
              id="btn-open-favorites"
              onClick={onOpenFavorites}
              className="relative p-2.5 rounded-2xl text-purple-800 hover:bg-purple-50 transition-all hover:scale-105 active:scale-95"
              title="Lista de Desejos"
            >
              <Heart className={`w-5 h-5 ${favoritesCount > 0 ? 'text-pink-500 fill-pink-500' : 'text-purple-700'}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="btn-open-cart"
              onClick={onOpenCart}
              className="flex items-center gap-2 bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#FACC15] hover:opacity-95 text-white px-3.5 sm:px-4 py-2 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 border border-white/50"
              title={config?.headerCartLabel || 'Abrir Sacolinha de Mimos'}
            >
              <div className="relative">
                {config?.headerBagIconType === 'gift' ? (
                  <Gift className="w-4 h-4 text-white" />
                ) : config?.headerBagIconType === 'package' ? (
                  <Package className="w-4 h-4 text-white" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-white" />
                )}
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-300 text-purple-950 text-[8px] font-extrabold rounded-full flex items-center justify-center shadow-xs border border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {config?.headerCartLabel && (
                  <span className="hidden sm:inline font-bold text-xs text-white/95 drop-shadow-xs">
                    {config.headerCartLabel}
                  </span>
                )}
                <span className="font-bold text-xs text-white drop-shadow-xs">
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {isSearchOpen && (
          <div className="md:hidden pb-3 animate-in fade-in">
            <div className="relative">
              <input
                id="search-input-mobile"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar presentes, canetas, planners..."
                className="w-full pl-10 pr-10 py-2 bg-white border-2 border-[#FDE047] rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                autoFocus
              />
              <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-2.5" />
              {searchQuery && (
                <button
                  id="btn-clear-search-mobile"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2 text-amber-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clean & Balanced Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center justify-center gap-3 py-2 border-t border-amber-100/60 text-xs sm:text-sm font-medium">
          {/* 1. Todos os mimos */}
          <button
            id="nav-tab-catalog"
            onClick={() => {
              setActiveTab('catalog');
              onSelectCategory('todos');
            }}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs ${
              activeTab === 'catalog'
                ? 'bg-[#FEF08A] text-purple-950 font-bold shadow-2xs border border-amber-300/80'
                : 'text-slate-600 hover:text-purple-950 hover:bg-amber-50/60'
            }`}
          >
            <span>🌸 Todos os mimos</span>
          </button>

          {/* 2. Dedicatórias */}
          <button
            id="nav-tab-card-generator"
            onClick={() => setActiveTab('card-generator')}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs ${
              activeTab === 'card-generator'
                ? 'bg-[#FEF08A] text-purple-950 font-bold shadow-2xs border border-amber-300/80'
                : 'text-slate-600 hover:text-purple-950 hover:bg-amber-50/60'
            }`}
          >
            <span className="font-bold text-purple-600">%</span>
            <span>Dedicatórias</span>
          </button>

          {/* 3. Nossa história */}
          <button
            id="nav-tab-about"
            onClick={() => setActiveTab('about')}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs ${
              activeTab === 'about'
                ? 'bg-[#FEF08A] text-purple-950 font-bold shadow-2xs border border-amber-300/80'
                : 'text-slate-600 hover:text-purple-950 hover:bg-amber-50/60'
            }`}
          >
            <span className="font-bold text-amber-500">#</span>
            <span>Nossa história</span>
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-purple-100 space-y-1 animate-in fade-in font-bold">
            <button
              onClick={() => {
                setActiveTab('catalog');
                onSelectCategory('todos');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm text-purple-950 hover:bg-amber-50 flex items-center gap-2"
            >
              <span>🌸 Todos os mimos</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('card-generator');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm text-purple-950 hover:bg-amber-50 flex items-center gap-2"
            >
              <PenTool className="w-4 h-4 text-purple-500" />
              <span>💌 Dedicatórias fofas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('about');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm text-purple-950 hover:bg-amber-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>✨ Nossa história</span>
            </button>
            {onOpenReturnPolicy && (
              <button
                type="button"
                id="btn-header-mobile-return-policy"
                onClick={() => {
                  onOpenReturnPolicy();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm text-pink-700 hover:bg-pink-50 flex items-center gap-2 border-t border-purple-100 mt-1 cursor-pointer font-bold"
              >
                <span>🛡️ Troca e Devolução (CDC 7 dias)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
