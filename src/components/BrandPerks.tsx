import React from 'react';
import { Sparkles, ShieldCheck, Package, Gift, Edit3, Compass } from 'lucide-react';
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
        <Gift className="w-6 h-6 text-cyan-400" />
      ),
      bgIcon: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
      titleKey: 'perk1Title' as keyof HomePageConfig,
      descKey: 'perk1Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 1 - Título',
      descLabel: 'Vantagem 1 - Descrição',
      title: config?.perk1Title?.text || 'Loot Épico em Cada Pedido',
      titleSize: config?.perk1Title?.fontSize || 'base',
      titleBold: config?.perk1Title?.isBold ?? true,
      description: config?.perk1Desc?.text || 'Você sempre ganha adesivos holográficos, mini dados RPG e surpresas arcanas exclusivas.',
      descSize: config?.perk1Desc?.fontSize || 'xs',
      descBold: config?.perk1Desc?.isBold ?? false
    },
    {
      icon: config?.perk2Icon ? (
        <span className="text-xl leading-none">{config.perk2Icon}</span>
      ) : (
        <Package className="w-6 h-6 text-amber-400" />
      ),
      bgIcon: 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      titleKey: 'perk2Title' as keyof HomePageConfig,
      descKey: 'perk2Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 2 - Título',
      descLabel: 'Vantagem 2 - Descrição',
      title: config?.perk2Title?.text || 'Embalagem com Selo do Rei Pálido',
      titleSize: config?.perk2Title?.fontSize || 'base',
      titleBold: config?.perk2Title?.isBold ?? true,
      description: config?.perk2Desc?.text || 'Itens protegidos em caixas reforçadas de colecionador e lacre com runa da Unlocked Door.',
      descSize: config?.perk2Desc?.fontSize || 'xs',
      descBold: config?.perk2Desc?.isBold ?? false
    },
    {
      icon: config?.perk3Icon ? (
        <span className="text-xl leading-none">{config.perk3Icon}</span>
      ) : (
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
      ),
      bgIcon: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
      titleKey: 'perk3Title' as keyof HomePageConfig,
      descKey: 'perk3Desc' as keyof HomePageConfig,
      titleLabel: 'Vantagem 3 - Título',
      descLabel: 'Vantagem 3 - Descrição',
      title: config?.perk3Title?.text || 'Garantia & Proteção do Guardião',
      titleSize: config?.perk3Title?.fontSize || 'base',
      titleBold: config?.perk3Title?.isBold ?? true,
      description: config?.perk3Desc?.text || 'Envio com código de rastreamento blindado e garantia incondicional de 7 dias (CDC).',
      descSize: config?.perk3Desc?.fontSize || 'xs',
      descBold: config?.perk3Desc?.isBold ?? false
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {perks.map((perk, index) => (
          <div
            key={index}
            className="group relative p-5 sm:p-6 rounded-3xl bg-[#09101F]/80 backdrop-blur-md border border-cyan-500/25 hover:border-cyan-400/80 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all duration-300 flex items-start gap-4"
          >
            {/* Icon Container */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${perk.bgIcon}`}>
              {perk.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-['Cinzel',serif] text-slate-100 ${getFontSizeClass(perk.titleSize)} ${getFontWeightClass(perk.titleBold)} tracking-wide`}>
                {perk.title}
              </h3>
              <p className={`mt-1 text-slate-400 leading-relaxed ${getFontSizeClass(perk.descSize)} ${getFontWeightClass(perk.descBold)}`}>
                {perk.description}
              </p>
            </div>

            {/* Admin visual edit triggers if in edit mode */}
            {isAdminEditing && onEditField && (
              <button
                type="button"
                onClick={() => onEditField(perk.titleKey, perk.titleLabel)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500 hover:bg-cyan-900"
                title="Editar vantagem"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
