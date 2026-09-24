import React from 'react';
import { Sparkles, Gift, Heart, ArrowRight, ShoppingBag, Edit3, Plus, Star } from 'lucide-react';
import { ActiveTab, HomePageConfig } from '../types';
import heroDefaultProductImg from '../assets/images/lavistore_hero_1788110245812.jpg';
import { TrioFlowersIcon } from './LavistoreLogo';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';

interface HeroBannerProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectCategory: (categoryId: string) => void;
  heroImage?: string;
  heroBadge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  imageFit?: 'cover' | 'contain';
  imageScale?: number;
  imagePosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  imagePositionX?: number;
  imagePositionY?: number;
  bannerHeight?: 'compact' | 'medium' | 'large';
  config?: HomePageConfig;
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
  isConfigLoading?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ 
  setActiveTab, 
  onSelectCategory,
  heroImage,
  heroBadge,
  heroTitle,
  heroSubtitle,
  imageFit = 'cover',
  imageScale = 100,
  imagePosition = 'center',
  imagePositionX,
  imagePositionY,
  bannerHeight = 'medium',
  config,
  isAdminEditing = false,
  onEditField,
  isConfigLoading = false
}) => {
  const currentHeroImage = heroImage || heroDefaultProductImg;
  const currentBadge = config?.heroBadge?.text?.trim() || heroBadge || '';
  const badgeSize = config?.heroBadge?.fontSize || 'xs';
  const badgeBold = config?.heroBadge?.isBold ?? true;

  const currentTitle = config?.heroTitle?.text?.trim() || heroTitle || '';
  const titleSize = config?.heroTitle?.fontSize || '4xl';
  const titleBold = config?.heroTitle?.isBold ?? true;

  const btnPrimaryText = config?.heroBtnPrimary?.text?.trim() || (isAdminEditing ? 'Explorar produtos' : 'Explorar nossos produtos');
  const btnPrimarySize = config?.heroBtnPrimary?.fontSize || 'sm';
  const btnPrimaryBold = config?.heroBtnPrimary?.isBold ?? true;

  const trust1Text = config?.heroTrust1?.text?.trim() || '';
  const trust2Text = config?.heroTrust2?.text?.trim() || '';
  const trust3Text = config?.heroTrust3?.text?.trim() || '';

  const hasAnyTrust = Boolean(trust1Text || trust2Text || trust3Text);

  // Compute banner sizing class to guarantee perfect proportions on all screens including fullscreen
  const sizeClasses = {
    compact: 'max-w-[340px] aspect-square sm:max-w-[380px]',
    medium: 'max-w-[400px] aspect-4/3 sm:max-w-[480px]',
    large: 'max-w-[460px] aspect-4/3 sm:max-w-[540px]',
  }[bannerHeight] || 'max-w-[400px] aspect-4/3 sm:max-w-[480px]';

  // Compute object position style
  const numPosX = typeof imagePositionX === 'number' 
    ? imagePositionX 
    : (imagePosition === 'left' ? 0 : imagePosition === 'right' ? 100 : 50);
  const numPosY = typeof imagePositionY === 'number' 
    ? imagePositionY 
    : (imagePosition === 'top' ? 0 : imagePosition === 'bottom' ? 100 : 50);
  const scale = (imageScale || 100) / 100;

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#FDE8EB]/80 via-[#FFFBEB]/90 to-[#E0F2FE]/70 border-b border-amber-100/60 py-12 md:py-18">
      {/* Soft pastel ambient blurs */}
      <div className="absolute top-0 left-0 -ml-20 -mt-20 w-80 h-80 rounded-full bg-rose-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            
            {isConfigLoading ? (
              <div className="space-y-4">
                <div className="h-7 w-48 rounded-full bg-white/70 animate-pulse inline-block" />
                <div className="h-14 w-full max-w-md rounded-2xl bg-purple-200/50 animate-pulse" />
                <div className="h-10 w-44 rounded-full bg-amber-200/50 animate-pulse" />
                <div className="flex gap-4 pt-4">
                  <div className="h-4 w-28 rounded bg-purple-200/40 animate-pulse" />
                  <div className="h-4 w-28 rounded bg-purple-200/40 animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Top Badge with Palette Indicator */}
                {(currentBadge || isAdminEditing) && (
                  <div>
                    <div 
                      onClick={() => isAdminEditing && onEditField && onEditField('heroBadge', 'Hero - Selo Superior')}
                      className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 border-2 border-amber-200 shadow-2xs text-purple-950 tracking-wide backdrop-blur-md relative ${getFontSizeClass(badgeSize, 'text-xs')} ${getFontWeightClass(badgeBold, true)} ${isAdminEditing ? 'cursor-pointer hover:ring-2 hover:ring-amber-400' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] shadow-2xs" title="Céu Turquesa" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] shadow-2xs" title="Pêssego Quente" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15] shadow-2xs" title="Amarelo Solar" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-2xs" title="Rosa Afeto" />
                      </div>
                      <span className="text-slate-300">|</span>
                      <span>{currentBadge || 'Selo de Destaque'}</span>
                      {isAdminEditing && <Edit3 className="w-3 h-3 text-amber-600 ml-1 inline" />}
                    </div>
                  </div>
                )}

                {/* Main Title */}
                {(currentTitle || isAdminEditing) && (
                  <div>
                    <h1 
                      onClick={() => isAdminEditing && onEditField && onEditField('heroTitle', 'Hero - Título Principal')}
                      className={`font-['Mali'] text-purple-950 leading-[1.2] max-w-xl mx-auto lg:mx-0 ${getFontSizeClass(titleSize, 'text-4xl sm:text-5xl')} ${getFontWeightClass(titleBold, true)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
                    >
                      {currentTitle.includes('mimos') ? (
                        <>
                          {currentTitle.split('mimos')[0]}
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#06B6D4]">
                            mimos{currentTitle.split('mimos')[1]}
                          </span>
                        </>
                      ) : (
                        currentTitle || 'Título Principal do Banner'
                      )}
                    </h1>
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-6 sm:pt-8 font-['Comfortaa']">
                  {/* Primary Button */}
                  <button
                    id="btn-hero-explore"
                    onClick={() => {
                      if (isAdminEditing && onEditField) {
                        onEditField('heroBtnPrimary', 'Hero - Botão Primário');
                        return;
                      }
                      setActiveTab('catalog');
                      onSelectCategory('todos');
                      const catElem = document.getElementById('catalog-section');
                      if (catElem) catElem.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-6 sm:px-7 py-3 rounded-full bg-gradient-to-r from-[#FDE8E8] via-[#FEF3C7] to-[#FED7AA] hover:from-[#FEE2E2] hover:via-[#FDE68A] hover:to-[#FDBA74] text-purple-950 font-bold border-2 border-amber-200/90 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2.5 ${getFontSizeClass(btnPrimarySize, 'text-sm')} ${getFontWeightClass(btnPrimaryBold, true)}`}
                  >
                    <Plus className="w-4 h-4 text-purple-900 font-bold" />
                    <span className="text-purple-950">{btnPrimaryText}</span>
                    <ArrowRight className="w-4 h-4 text-purple-900" />
                    {isAdminEditing && <Edit3 className="w-3.5 h-3.5 ml-1 text-purple-700" />}
                  </button>
                </div>

                {/* Trust Badges */}
                {(hasAnyTrust || isAdminEditing) && (
                  <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-purple-950 font-medium">
                    {(trust1Text || isAdminEditing) && (
                      <div 
                        onClick={() => isAdminEditing && onEditField && onEditField('heroTrust1', 'Hero - Destaque 1')}
                        className={`flex items-center gap-2 ${isAdminEditing ? 'cursor-pointer hover:underline' : ''}`}
                      >
                        <Gift className="w-4 h-4 text-purple-950 stroke-[1.8]" />
                        <span className={`${getFontSizeClass(config?.heroTrust1?.fontSize, 'text-xs')} ${getFontWeightClass(config?.heroTrust1?.isBold, true)}`}>{trust1Text || 'Destaque 1'}</span>
                      </div>
                    )}
                    {(trust2Text || isAdminEditing) && (
                      <div 
                        onClick={() => isAdminEditing && onEditField && onEditField('heroTrust2', 'Hero - Destaque 2')}
                        className={`flex items-center gap-2 ${isAdminEditing ? 'cursor-pointer hover:underline' : ''}`}
                      >
                        <Heart className="w-4 h-4 text-purple-950 stroke-[1.8]" />
                        <span className={`${getFontSizeClass(config?.heroTrust2?.fontSize, 'text-xs')} ${getFontWeightClass(config?.heroTrust2?.isBold, true)}`}>{trust2Text || 'Destaque 2'}</span>
                      </div>
                    )}
                    {(trust3Text || isAdminEditing) && (
                      <div 
                        onClick={() => isAdminEditing && onEditField && onEditField('heroTrust3', 'Hero - Destaque 3')}
                        className={`flex items-center gap-2 ${isAdminEditing ? 'cursor-pointer hover:underline' : ''}`}
                      >
                        <Star className="w-4 h-4 text-purple-950 stroke-[1.8]" />
                        <span className={`${getFontSizeClass(config?.heroTrust3?.fontSize, 'text-xs')} ${getFontWeightClass(config?.heroTrust3?.isBold, true)}`}>{trust3Text || 'Destaque 3'}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Image Showcase */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
            <div className={`relative w-full ${sizeClasses} mx-auto lg:mr-0`}>
              
              {/* Clean showcase card frame */}
              <div className="relative w-full h-full rounded-[28px] sm:rounded-[34px] overflow-hidden shadow-xl shadow-purple-950/10 border-4 border-white bg-white flex items-center justify-center">
                <img
                  src={currentHeroImage}
                  alt="Destaque Principal Lavistore - Presentes Criativos e Mimos Fofos"
                  referrerPolicy="no-referrer"
                  style={{
                    objectFit: imageFit,
                    objectPosition: `${numPosX}% ${numPosY}%`,
                    transform: scale !== 1 ? `scale(${scale})` : undefined,
                    transformOrigin: `${numPosX}% ${numPosY}%`,
                  }}
                  className="w-full h-full transition-transform duration-500 select-none object-cover"
                />
              </div>

              {/* Bottom-left Overlapping Flower Mascots Vector Drawing */}
              <div className="absolute -bottom-6 -left-6 z-20 drop-shadow-lg transform -rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-300 pointer-events-none">
                <TrioFlowersIcon size={96} className="w-20 h-20 sm:w-24 sm:h-24" />
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

