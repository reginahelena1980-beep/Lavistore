import React from 'react';
import { Flower2, Sparkles, Heart, Truck, ShoppingBag, Edit3 } from 'lucide-react';
import { HomePageConfig } from '../types';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';

interface BrandPerksProps {
  config?: HomePageConfig;
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
}

export const BrandPerks: React.FC<BrandPerksProps> = ({
  config,
  isAdminEditing = false,
  onEditField
}) => {
  const perks = [
    {
      icon: config?.perk1Icon ? (
        <span className="text-xl leading-none">{config.perk1Icon}</span>
      ) : (
        <ShoppingBag className="w-6 h-6 text-[#EAB308]" />
      ),
      bgIcon: 'bg-yellow-100/90 text-yellow-900 border-yellow-300',
      titleKey: 'perk1Title' as keyof HomePageConfig,
      descKey: 'perk1Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 1 - Título',
      descLabel: 'Vantagem 1 - Descrição',
      title: config?.perk1Title.text || 'Mimos Florais em Cada Sacolinha Amarela',
      titleSize: config?.perk1Title.fontSize || 'base',
      titleBold: config?.perk1Title.isBold ?? true,
      description: config?.perk1Desc.text || 'Você sempre ganha adesivos das 3 florzinhas, marcadores fofos e mini surpresas.',
      descSize: config?.perk1Desc.fontSize || 'xs',
      descBold: config?.perk1Desc.isBold ?? false
    },
    {
      icon: config?.perk2Icon ? (
        <span className="text-xl leading-none">{config.perk2Icon}</span>
      ) : (
        <Heart className="w-6 h-6 text-[#D97706] fill-amber-200" />
      ),
      bgIcon: 'bg-amber-100/90 text-amber-900 border-amber-200',
      titleKey: 'perk2Title' as keyof HomePageConfig,
      descKey: 'perk2Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 2 - Título',
      descLabel: 'Vantagem 2 - Descrição',
      title: config?.perk2Title.text || 'Cheirinho Floral & Doce',
      titleSize: config?.perk2Title.fontSize || 'base',
      titleBold: config?.perk2Title.isBold ?? true,
      description: config?.perk2Desc.text || 'Cada sacolinha amarela é borrifada artesanalmente com nossa fragrância suave de lavanda e baunilha.',
      descSize: config?.perk2Desc.fontSize || 'xs',
      descBold: config?.perk2Desc.isBold ?? false
    },
    {
      icon: config?.perk3Icon ? (
        <span className="text-xl leading-none">{config.perk3Icon}</span>
      ) : (
        <Truck className="w-6 h-6 text-[#E11D48]" />
      ),
      bgIcon: 'bg-rose-100/90 text-rose-900 border-rose-200',
      titleKey: 'perk3Title' as keyof HomePageConfig,
      descKey: 'perk3Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 3 - Título',
      descLabel: 'Vantagem 3 - Descrição',
      title: config?.perk3Title.text || 'Frete Grátis Especial',
      titleSize: config?.perk3Title.fontSize || 'base',
      titleBold: config?.perk3Title.isBold ?? true,
      description: config?.perk3Desc.text || 'Envio gratuito para todo o Brasil em compras a partir de R$ 149 com rastreamento detalhado.',
      descSize: config?.perk3Desc.fontSize || 'xs',
      descBold: config?.perk3Desc.isBold ?? false
    },
    {
      icon: config?.perk4Icon ? (
        <span className="text-xl leading-none">{config.perk4Icon}</span>
      ) : (
        <Flower2 className="w-6 h-6 text-[#EA580C] fill-orange-200" />
      ),
      bgIcon: 'bg-orange-100/90 text-orange-900 border-orange-200',
      titleKey: 'perk4Title' as keyof HomePageConfig,
      descKey: 'perk4Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 4 - Título',
      descLabel: 'Vantagem 4 - Descrição',
      title: config?.perk4Title.text || 'Feito com Amor & Afeto',
      titleSize: config?.perk4Title.fontSize || 'base',
      titleBold: config?.perk4Title.isBold ?? true,
      description: config?.perk4Desc.text || 'Produtos de papelaria selecionados a dedo com gramatura nobre e sacolinhas amarelas exclusivas.',
      descSize: config?.perk4Desc.fontSize || 'xs',
      descBold: config?.perk4Desc.isBold ?? false
    }
  ];

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
                className={`font-['Mali'] text-purple-950 mb-1 ${getFontSizeClass(p.titleSize, 'text-base')} ${getFontWeightClass(p.titleBold, true)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
              >
                {p.title}
              </h3>
              <p 
                onClick={() => isAdminEditing && onEditField && onEditField(p.descKey, p.descLabel)}
                className={`font-['Comfortaa'] text-slate-600 leading-relaxed ${getFontSizeClass(p.descSize, 'text-xs')} ${getFontWeightClass(p.descBold, false)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
              >
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


