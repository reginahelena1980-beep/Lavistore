import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Heart, 
  ShoppingBag, 
  X, 
  Menu,
  Volume2,
  VolumeX,
  Shield,
  Compass,
  Sparkles,
  Swords
} from 'lucide-react';
import { ActiveTab, Product, HomePageConfig } from '../types';
import { UnlockedDoorLogo } from './UnlockedDoorLogo';
import { isSoundEnabled, setSoundEnabled, playClickSound } from '../utils/soundSystem';

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
  onOpenBossFights?: () => void;
  onNavigateToAdmin?: () => void;
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
  onOpenBossFights,
  onNavigateToAdmin
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundActive, setSoundActiveState] = useState<boolean>(true);

  useEffect(() => {
    setSoundActiveState(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const nextState = !soundActive;
    setSoundEnabled(nextState);
    setSoundActiveState(nextState);
    if (nextState) {
      playClickSound();
    }
  };

  // Filtered search suggestions
  const searchResults = searchQuery.trim().length > 1 
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tag && p.tag.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 4)
    : [];

  const handleScrollToVitrine = () => {
    setActiveTab('catalog');
    onSelectCategory('todos');
    const elem = document.getElementById('catalog-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 600, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#050914]/95 backdrop-blur-md border-b border-cyan-500/20 shadow-xl font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar: ENTER. EXPLORE. DISCOVER. | SONS ATIVOS • PAINEL ADMIN */}
      <div className="bg-[#03060E] border-b border-cyan-500/20 text-slate-300 text-xs py-1 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-center flex-wrap">
          
          {/* Left: Tagline bullet */}
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span className="font-['Cinzel',serif] tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-cyan-200/90 uppercase">
              ENTER. EXPLORE. DISCOVER.
            </span>
          </div>

          {/* Right: Audio control & Admin Panel link */}
          <div className="flex items-center gap-4 text-[11px] sm:text-xs font-semibold">
            {/* Audio Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={handleToggleSound}
              className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100 transition-colors uppercase tracking-wider cursor-pointer"
              title="Ativar/Desativar efeitos sonoros da loja"
            >
              {soundActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>SONS ATIVOS</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">SONS MUTADOS</span>
                </>
              )}
            </button>

            <span className="text-slate-600">•</span>

            {/* Admin Panel Link */}
            <button
              id="btn-header-admin-panel"
              onClick={() => {
                if (onNavigateToAdmin) {
                  onNavigateToAdmin();
                } else {
                  setActiveTab('admin');
                }
              }}
              className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 transition-colors uppercase tracking-wider cursor-pointer border border-cyan-500/30 px-2 py-0.5 rounded-md hover:border-cyan-400 bg-cyan-950/40"
              title="Acessar Gestão Financeira, Estoque e Produtos"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>PAINEL ADMIN</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Bar: Logo, Search, Wishlist, Cart */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-16 gap-4">
          
          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-3">
            <button 
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Unlocked Door Brand Logo */}
            <div 
              onClick={() => {
                setActiveTab('catalog');
                onSelectCategory('todos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer transition-transform duration-300 hover:scale-[1.01] active:scale-95"
            >
              <UnlockedDoorLogo variant="horizontal" size="md" />
            </div>
          </div>

          {/* Center: Search Bar with Cyan Glow (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg relative mx-4">
            <div className="relative w-full">
              <input
                id="search-input-desktop"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="BUSCAR COLECIONÁVEIS, ESTÁTUAS, DADOS, ROUPAS GA..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#0A1120] hover:bg-[#0E172C] focus:bg-[#0B1426] border border-cyan-500/30 focus:border-cyan-400 rounded-full text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] font-medium tracking-wide uppercase"
              />
              <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5 pointer-events-none" />
              {searchQuery && (
                <button
                  id="btn-clear-search-desktop"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-cyan-300 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#09101F] rounded-2xl shadow-2xl border border-cyan-500/40 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-bold text-cyan-300 px-3 py-1.5 uppercase tracking-widest flex items-center justify-between border-b border-cyan-500/20">
                  <span>Itens Encontrados ({searchResults.length})</span>
                </p>
                <div className="divide-y divide-cyan-950/60 mt-1">
                  {searchResults.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        onOpenProduct(item);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-cyan-950/40 rounded-xl cursor-pointer transition-colors"
                    >
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-cyan-500/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate">{item.name}</p>
                        <p className="text-[11px] text-cyan-400 font-bold">R$ {item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Wishlist & Cart Controls */}
          <div className="flex items-center gap-3">
            {/* Search toggle mobile */}
            <button
              id="btn-toggle-search-mobile"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
              aria-label="Buscar produtos"
            >
              <Search className="w-5 h-5 text-cyan-400" />
            </button>

            {/* Wishlist Button */}
            <button
              id="btn-open-favorites"
              onClick={onOpenFavorites}
              className="relative p-2.5 rounded-2xl bg-[#09101E] border border-cyan-500/25 hover:border-cyan-400/60 text-slate-300 hover:text-pink-400 transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Lista de Desejos / Inventário"
            >
              <Heart className={`w-5 h-5 ${favoritesCount > 0 ? 'text-pink-500 fill-pink-500' : 'text-slate-300'}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart Button with Count and Price */}
            <button
              id="btn-open-cart"
              onClick={onOpenCart}
              className="flex items-center gap-2 bg-[#09101E] hover:bg-[#0D172B] border border-cyan-400/50 hover:border-cyan-300 text-white px-3.5 py-2 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300 active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="font-bold text-xs text-slate-100 font-['Cinzel',serif] tracking-wider">
                R$ {cartTotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Expansion */}
        {isSearchOpen && (
          <div className="md:hidden pb-3 animate-in fade-in">
            <div className="relative">
              <input
                id="search-input-mobile"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar colecionáveis, itens RPG..."
                className="w-full pl-10 pr-10 py-2 bg-[#0A1120] border border-cyan-500/40 rounded-full text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                autoFocus
              />
              <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-2.5" />
              {searchQuery && (
                <button
                  id="btn-clear-search-mobile"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Thematic RPG Navigation Bar (Desktop) */}
        {/* Pattern: [ HOME ] -> [ MAP EXPLORAR ] -> [ LISTA DE DESEJOS INVENTÁRIO ] -> [ BOSS FIGHTS FRETE GRÁTIS & CUPONS ] */}
        <nav className="hidden md:flex items-center justify-center gap-2.5 py-1.5 border-t border-cyan-500/20 text-xs font-semibold tracking-wider font-['Cinzel',serif]">
          {/* 1. HOME */}
          <button
            id="nav-tab-home"
            onClick={() => {
              setActiveTab('catalog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-2 border ${
              activeTab === 'catalog'
                ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'border-transparent text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400/80" />
            <span className="font-bold">HOME</span>
          </button>

          <span className="text-slate-600 select-none">→</span>

          {/* 2. MAP (EXPLORAR VITRINE) */}
          <button
            id="nav-tab-map"
            onClick={handleScrollToVitrine}
            className="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/30"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>MAP</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
              EXPLORAR
            </span>
          </button>

          <span className="text-slate-600 select-none">→</span>

          {/* 3. LISTA DE DESEJOS (INVENTÁRIO) */}
          <button
            id="nav-tab-wishlist"
            onClick={onOpenFavorites}
            className="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/30"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>LISTA DE DESEJOS</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
              INVENTÁRIO
            </span>
          </button>

          <span className="text-slate-600 select-none">→</span>

          {/* 4. BOSS FIGHTS (FRETE GRÁTIS & CUPONS) */}
          <button
            id="nav-tab-boss-fights"
            onClick={() => {
              if (onOpenBossFights) {
                onOpenBossFights();
              }
            }}
            className="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 border border-transparent hover:border-amber-500/40"
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">BOSS FIGHTS</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
              FRETE GRÁTIS & CUPONS
            </span>
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-cyan-500/20 space-y-1.5 animate-in fade-in font-['Cinzel',serif] text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('catalog');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-cyan-950/40 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>HOME</span>
            </button>

            <button
              onClick={() => {
                handleScrollToVitrine();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-cyan-950/40 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>MAP (EXPLORAR VITRINE)</span>
              </div>
              <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">EXPLORAR</span>
            </button>

            <button
              onClick={() => {
                onOpenFavorites();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-cyan-950/40 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                <span>LISTA DE DESEJOS</span>
              </div>
              <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">INVENTÁRIO</span>
            </button>

            <button
              onClick={() => {
                if (onOpenBossFights) onOpenBossFights();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-amber-300 hover:bg-amber-950/40 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>BOSS FIGHTS</span>
              </div>
              <span className="text-[9px] bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40 text-amber-300">CUPONS</span>
            </button>

            {onOpenReturnPolicy && (
              <button
                type="button"
                onClick={() => {
                  onOpenReturnPolicy();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-cyan-300 hover:bg-cyan-950/40 flex items-center gap-2 border-t border-cyan-500/20 mt-1 cursor-pointer font-bold"
              >
                <span>🛡️ Garantia do Guardião (CDC 7 dias)</span>
              </button>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
