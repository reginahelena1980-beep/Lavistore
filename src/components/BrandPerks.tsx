import React from 'react';
import { Flower2, Sparkles, Heart, Truck, ShoppingBag, Edit3 } from 'lucide-react';
import { HomePageConfig } from '../types';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';

interface BrandPerksProps {
  config?: HomePageConfig;
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
  isConfigLoading?: boolean;
}

export const BrandPerks: React.FC<BrandPerksProps> = ({
  config,
  isAdminEditing = false,
  onEditField,
  isConfigLoading = false
}) => {
  if (isConfigLoading) {
    return (
      <section className="py-10 bg-white/60 backdrop-blur-md border-y border-amber-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-3xl bg-white/80 border border-amber-200 flex flex-col items-center text-center animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-amber-200/50 mb-3.5" />
                <div className="h-4 w-32 bg-amber-200/50 rounded mb-2" />
                <div className="h-3 w-44 bg-amber-200/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Sanitização estrita contra textos legados em memória ou caches
  const sanitizeTitle = (val: string | undefined, defaultTitle: string) => {
    if (!val || val.includes('Mimos Florais') || val.includes('Cheirinho Floral') || val.includes('Feito com Amor')) {
      return defaultTitle;
    }
    return val.trim() || defaultTitle;
  };

  const allPerks = [
    {
      icon: (config?.perk1Icon && !config.perk1Icon.includes('🍯')) ? (
        <span className="text-xl leading-none">{config.perk1Icon}</span>
      ) : (
        <span className="text-xl leading-none">🛍️</span>
      ),
      bgIcon: 'bg-yellow-100/90 text-yellow-900 border-yellow-300',
      titleKey: 'perk1Title' as keyof HomePageConfig,
      titleLabel: 'Vantagem 1 - Título',
      title: sanitizeTitle(config?.perk1Title?.text, 'Mimos Especiais'),
      titleSize: config?.perk1Title?.fontSize || 'base',
      titleBold: config?.perk1Title?.isBold ?? true
    },
    {
      icon: (config?.perk2Icon && !config.perk2Icon.includes('🍯')) ? (
        <span className="text-xl leading-none">{config.perk2Icon}</span>
      ) : (
        <span className="text-xl leading-none">🎀</span>
      ),
      bgIcon: 'bg-amber-100/90 text-amber-900 border-amber-200',
      titleKey: 'perk2Title' as keyof HomePageConfig,
      titleLabel: 'Vantagem 2 - Título',
      title: sanitizeTitle(config?.perk2Title?.text, 'Embalagem Exclusiva'),
      titleSize: config?.perk2Title?.fontSize || 'base',
      titleBold: config?.perk2Title?.isBold ?? true
    },
    {
      icon: config?.perk3Icon ? (
        <span className="text-xl leading-none">{config.perk3Icon}</span>
      ) : (
        <span className="text-xl leading-none">🚚</span>
      ),
      bgIcon: 'bg-rose-100/90 text-rose-900 border-rose-200',
      titleKey: 'perk3Title' as keyof HomePageConfig,
      titleLabel: 'Vantagem 3 - Título',
      title: sanitizeTitle(config?.perk3Title?.text, 'Frete Grátis Especial'),
      titleSize: config?.perk3Title?.fontSize || 'base',
      titleBold: config?.perk3Title?.isBold ?? true
    },
    {
      icon: config?.perk4Icon ? (
        <span className="text-xl leading-none">{config.perk4Icon}</span>
      ) : (
        <span className="text-xl leading-none">🌸</span>
      ),
      bgIcon: 'bg-orange-100/90 text-orange-900 border-orange-200',
      titleKey: 'perk4Title' as keyof HomePageConfig,
      titleLabel: 'Vantagem 4 - Título',
      title: sanitizeTitle(config?.perk4Title?.text, 'Preço máximo: R$ 15,00'),
      titleSize: config?.perk4Title?.fontSize || 'base',
      titleBold: config?.perk4Title?.isBold ?? true
    }
  ];

  const perks = allPerks;

  if (perks.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-white/60 backdrop-blur-md border-y border-amber-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {perks.map((p, idx) => (
            <div 
              key={idx}
              className="p-5 rounded-3xl bg-white/80 backdrop-blur-sm border border-amber-200 hover:border-amber-400 hover:bg-white transition-all duration-300 flex flex-col items-center text-center group shadow-2xs hover:shadow-lg hover:shadow-amber-500/10 relative"
            >
              {isAdminEditing && onEditField && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-80 hover:opacity-100">
                  <button
                    onClick={() => onEditField(p.titleKey, p.titleLabel)}
                    className="p-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-purple-950 text-[8px] font-bold flex items-center gap-1 shadow-xs"
                    title={`Editar ${p.titleLabel}`}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className={`w-12 h-12 rounded-2xl ${p.bgIcon} shadow-xs flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300 border`}>
                {p.icon}
              </div>
              <h3 
                onClick={() => isAdminEditing && onEditField && onEditField(p.titleKey, p.titleLabel)}
                className={`font-['Mali'] text-purple-950 ${getFontSizeClass(p.titleSize, 'text-base')} ${getFontWeightClass(p.titleBold, true)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
              >
                {p.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


