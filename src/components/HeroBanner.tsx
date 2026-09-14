import React, { useState } from 'react';
import { 
  Compass, 
  Sparkles, 
  ShieldCheck, 
  Gem, 
  Package, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Zap,
  Key
} from 'lucide-react';
import { HomePageConfig } from '../types';
import { playPortalSound, playClickSound } from '../utils/soundSystem';
import mysticPortalImage from '../assets/images/mystic_portal_gate_1789255699782.jpg';

interface HeroBannerProps {
  onShopNow?: () => void;
  setActiveTab?: (tab: string) => void;
  onSelectCategory?: (category: string) => void;
  config?: HomePageConfig;
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
  [key: string]: any;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onShopNow,
  setActiveTab,
  onSelectCategory,
  config,
  isAdminEditing = false,
  onEditField,
}) => {
  const [portalHovered, setPortalHovered] = useState(false);
  const [portalWarpActive, setPortalWarpActive] = useState(false);

  const triggerShopAction = () => {
    if (typeof onShopNow === 'function') {
      onShopNow();
    } else {
      if (typeof setActiveTab === 'function') {
        setActiveTab('catalog');
      }
      const catalogEl = document.getElementById('catalog-section');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handlePortalClick = () => {
    playPortalSound();
    setPortalWarpActive(true);
    setTimeout(() => {
      setPortalWarpActive(false);
      triggerShopAction();
    }, 450);
  };

  const handleButtonShopClick = () => {
    playPortalSound();
    triggerShopAction();
  };

  // Image source: configured custom image or the generated mystic portal
  const heroImageSrc = config?.bannerImageUrl || mysticPortalImage;

  return (
    <div className="relative overflow-hidden bg-[#060914] text-slate-100 border-b border-cyan-500/20 lg:h-[calc(100vh-120px)] lg:min-h-[460px] lg:max-h-[calc(100vh-120px)] flex flex-col justify-between py-6 sm:py-8 lg:py-2">
      {/* Background ambient cosmic glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area - Vertically Centered */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Lore, Minimalist Typography & CTA */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-3.5 sm:space-y-4">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold tracking-widest uppercase shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>LOJA OFICIAL GAMER • ITENS & COLECIONÁVEIS</span>
            </div>

            {/* Main Title: UNLOCKED DOOR */}
            <div className="space-y-1">
              <h1 className="font-['Cinzel_Decorative',serif] text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-wider leading-none">
                UNLOCKED <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.7)]">DOOR</span>
              </h1>
              
              {/* Subtitle with dashes */}
              <div className="flex items-center gap-3 pt-1.5">
                <span className="h-[1px] w-6 bg-cyan-500/50" />
                <span className="font-['Cinzel',serif] text-xs sm:text-sm font-bold tracking-[0.25em] text-cyan-300 uppercase">
                  {config?.heroSubtitle?.text || '— BAPANADA —'}
                </span>
                <span className="h-[1px] w-6 bg-cyan-500/50" />
              </div>
            </div>

            {/* Quote / Drop Phrase */}
            <div className="border-l-2 border-cyan-400/60 pl-3.5 py-0.5">
              <p className="font-['Cinzel',serif] italic text-xs sm:text-sm text-slate-300 font-medium">
                “{config?.heroQuote?.text || 'Confira o drop da semana'}”
              </p>
            </div>

            {/* Primary Action Button: DESBRAVAR O MAPA */}
            <div className="pt-1 flex items-center gap-3 flex-wrap">
              <button
                id="btn-hero-explore-map"
                onClick={handleButtonShopClick}
                className="group relative px-7 py-3 bg-[#22D3EE] hover:bg-[#06B6D4] active:bg-[#0891B2] text-[#050811] font-['Cinzel',serif] font-bold text-xs sm:text-sm tracking-widest uppercase rounded-full shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_35px_rgba(34,211,238,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#050811] group-hover:rotate-45 transition-transform duration-500" />
                <span>DESBRAVAR O MAPA</span>
                <span className="text-sm leading-none group-hover:translate-x-1 transition-transform duration-300">➔</span>
              </button>
            </div>

            {/* Minimalist Trust Features Micro-row */}
            <div className="pt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-['Cinzel',serif] text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-200/90">
                <span className="text-cyan-400">✦</span> Metal & Resina Nobre
              </span>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-cyan-200/90">
                <span className="text-cyan-400">✦</span> Selo do Rei Pálido
              </span>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-cyan-200/90">
                <span className="text-cyan-400">🛡️</span> Proteção do Guardião
              </span>
            </div>

          </div>

          {/* RIGHT COLUMN: Interactive Mystic Portal Element (DOOR PANEL +1.5CM) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center mt-4 lg:mt-0">
            <div 
              id="hero-mystic-portal-card"
              onClick={handlePortalClick}
              onMouseEnter={() => setPortalHovered(true)}
              onMouseLeave={() => setPortalHovered(false)}
              className={`group relative w-[calc(12rem+1.5cm)] sm:w-[calc(14rem+1.5cm)] md:w-[calc(15rem+1.5cm)] lg:w-[calc(14rem+1.5cm)] xl:w-[calc(15rem+1.5cm)] aspect-[3/4] max-h-[calc(290px+1.5cm)] sm:max-h-[calc(320px+1.5cm)] lg:max-h-[calc(340px+1.5cm)] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-500 select-none shrink-0 ${
                portalWarpActive 
                  ? 'scale-95 brightness-150 border-white shadow-[0_0_50px_rgba(34,211,238,1)]'
                  : portalHovered
                    ? 'border-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.6)] scale-[1.02]'
                    : 'border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
              }`}
              title="Clique no Portal para abrir o Inventário e Vitrine!"
            >
              {/* Mystic Portal Artwork Image */}
              <img
                src={heroImageSrc}
                alt="Portal Místico Unlocked Door"
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                  portalHovered ? 'scale-108 filter contrast-110' : 'scale-100'
                }`}
              />

              {/* Radial Cyan Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#040814] via-transparent to-black/30 pointer-events-none" />

              {/* Top Hint Badge */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-cyan-400/40 text-[9px] font-bold text-cyan-300 shadow-sm">
                  <Zap className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                  <span>PORTAL</span>
                </span>

                <span className={`px-2 py-0.5 rounded-full bg-cyan-950/90 backdrop-blur-md border border-cyan-400/60 text-[9px] font-bold text-cyan-200 transition-opacity duration-300 ${portalHovered ? 'opacity-100' : 'opacity-80'}`}>
                  ENTRAR ⚡
                </span>
              </div>

              {/* Bottom Interactive Bar inside Portal */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-[#040814] via-[#040814]/90 to-transparent flex items-center justify-between z-10">
                <div>
                  <span className="text-[8px] uppercase font-bold tracking-widest text-slate-400 block font-['Cinzel',serif]">
                    PORTAL MÍSTICO
                  </span>
                  <h3 className="font-['Cinzel',serif] text-xs sm:text-sm font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] group-hover:text-cyan-100 transition-colors">
                    ABRA O INVENTÁRIO!
                  </h3>
                </div>

                {/* Keyhole Action Button */}
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-[#050A14] flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.5)] group-hover:scale-110 group-active:scale-95 transition-all">
                  <Key className="w-4 h-4 text-[#050A14]" />
                </div>
              </div>

              {/* Warp Effect overlay on click */}
              {portalWarpActive && (
                <div className="absolute inset-0 bg-cyan-400/30 backdrop-blur-xs flex items-center justify-center animate-in fade-in">
                  <div className="w-16 h-16 rounded-full border-4 border-white animate-ping" />
                </div>
              )}
            </div>

            {/* Under-portal caption */}
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-['Cinzel',serif] mt-2 tracking-wider text-center">
              ✦ Clique na porta para adentrar ao arsenal ✦
            </p>
          </div>

        </div>
      </div>

      {/* Desktop Bottom Scroll Affordance Indicator */}
      <div 
        onClick={triggerShopAction}
        className="hidden lg:flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer pb-2 pt-1 font-['Cinzel',serif] text-[11px] tracking-widest uppercase group select-none relative z-10"
        title="Explorar o Catálogo de Produtos e Colecionáveis"
      >
        <span>Explorar Arsenal & Vitrine</span>
        <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform animate-bounce" />
      </div>

    </div>
  );
};
