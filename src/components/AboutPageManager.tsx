import React, { useState } from 'react';
import { 
  Sparkles, 
  Save, 
  RotateCcw, 
  Eye, 
  Heart, 
  Flower2, 
  Sun, 
  Check,
  Type,
  BookOpen,
  ShoppingBag,
  Gift
} from 'lucide-react';
import { HomePageConfig } from '../types';
import { DEFAULT_HOME_PAGE_CONFIG } from '../utils/textFormatter';

interface AboutPageManagerProps {
  config: HomePageConfig;
  onSaveConfig: (newConfig: HomePageConfig) => void;
  onResetDefaults: () => void;
  onGoToAboutPage?: () => void;
}

export const AboutPageManager: React.FC<AboutPageManagerProps> = ({
  config,
  onSaveConfig,
  onResetDefaults,
  onGoToAboutPage
}) => {
  const [formData, setFormData] = useState<HomePageConfig>(config);
  const [savedToast, setSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'hero' | 'flowers' | 'solar' | 'pillars' | 'cta'>('hero');

  const updateField = (fieldKey: keyof HomePageConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar todos os textos da página "Sobre Nós" para o padrão original?')) {
      const resetData: HomePageConfig = {
        ...formData,
        aboutHeroSlogan: DEFAULT_HOME_PAGE_CONFIG.aboutHeroSlogan,
        aboutHeroQuote: DEFAULT_HOME_PAGE_CONFIG.aboutHeroQuote,
        aboutHeroDescription: DEFAULT_HOME_PAGE_CONFIG.aboutHeroDescription,
        aboutTrioTitle: DEFAULT_HOME_PAGE_CONFIG.aboutTrioTitle,
        aboutTrioSubtitle: DEFAULT_HOME_PAGE_CONFIG.aboutTrioSubtitle,
        aboutFlower1Title: DEFAULT_HOME_PAGE_CONFIG.aboutFlower1Title,
        aboutFlower1Subtitle: DEFAULT_HOME_PAGE_CONFIG.aboutFlower1Subtitle,
        aboutFlower1Desc: DEFAULT_HOME_PAGE_CONFIG.aboutFlower1Desc,
        aboutFlower2Title: DEFAULT_HOME_PAGE_CONFIG.aboutFlower2Title,
        aboutFlower2Subtitle: DEFAULT_HOME_PAGE_CONFIG.aboutFlower2Subtitle,
        aboutFlower2Desc: DEFAULT_HOME_PAGE_CONFIG.aboutFlower2Desc,
        aboutFlower3Title: DEFAULT_HOME_PAGE_CONFIG.aboutFlower3Title,
        aboutFlower3Subtitle: DEFAULT_HOME_PAGE_CONFIG.aboutFlower3Subtitle,
        aboutFlower3Desc: DEFAULT_HOME_PAGE_CONFIG.aboutFlower3Desc,
        aboutSolarTag: DEFAULT_HOME_PAGE_CONFIG.aboutSolarTag,
        aboutSolarTitle: DEFAULT_HOME_PAGE_CONFIG.aboutSolarTitle,
        aboutSolarDesc: DEFAULT_HOME_PAGE_CONFIG.aboutSolarDesc,
        aboutSolarBtnText: DEFAULT_HOME_PAGE_CONFIG.aboutSolarBtnText,
        aboutPillarsTitle: DEFAULT_HOME_PAGE_CONFIG.aboutPillarsTitle,
        aboutPillarsSubtitle: DEFAULT_HOME_PAGE_CONFIG.aboutPillarsSubtitle,
        aboutPillar1Icon: DEFAULT_HOME_PAGE_CONFIG.aboutPillar1Icon,
        aboutPillar1Title: DEFAULT_HOME_PAGE_CONFIG.aboutPillar1Title,
        aboutPillar1Desc: DEFAULT_HOME_PAGE_CONFIG.aboutPillar1Desc,
        aboutPillar2Icon: DEFAULT_HOME_PAGE_CONFIG.aboutPillar2Icon,
        aboutPillar2Title: DEFAULT_HOME_PAGE_CONFIG.aboutPillar2Title,
        aboutPillar2Desc: DEFAULT_HOME_PAGE_CONFIG.aboutPillar2Desc,
        aboutPillar3Icon: DEFAULT_HOME_PAGE_CONFIG.aboutPillar3Icon,
        aboutPillar3Title: DEFAULT_HOME_PAGE_CONFIG.aboutPillar3Title,
        aboutPillar3Desc: DEFAULT_HOME_PAGE_CONFIG.aboutPillar3Desc,
        aboutPillar4Icon: DEFAULT_HOME_PAGE_CONFIG.aboutPillar4Icon,
        aboutPillar4Title: DEFAULT_HOME_PAGE_CONFIG.aboutPillar4Title,
        aboutPillar4Desc: DEFAULT_HOME_PAGE_CONFIG.aboutPillar4Desc,
        aboutCtaBadge: DEFAULT_HOME_PAGE_CONFIG.aboutCtaBadge,
        aboutCtaTitle: DEFAULT_HOME_PAGE_CONFIG.aboutCtaTitle,
        aboutCtaDesc: DEFAULT_HOME_PAGE_CONFIG.aboutCtaDesc,
        aboutCtaBtn1: DEFAULT_HOME_PAGE_CONFIG.aboutCtaBtn1,
        aboutCtaBtn2: DEFAULT_HOME_PAGE_CONFIG.aboutCtaBtn2,
      };
      setFormData(resetData);
      onSaveConfig(resetData);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  return (
    <div className="space-y-6 font-['Comfortaa'] animate-in fade-in">
      
      {/* Header Info */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-purple-950 text-xs font-bold uppercase tracking-wider border border-amber-300">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Editor de Conteúdo Institucional</span>
          </div>
          <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
            Página "Sobre Nós" / Nossa História
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
            Edite todos os textos, slogans, significados das seções, toques de afeto e chamadas da página institucional.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Restaurar Padrão</span>
          </button>

          {onGoToAboutPage && (
            <button
              type="button"
              onClick={onGoToAboutPage}
              className="px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 text-purple-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver na Loja</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-300"
          >
            <Save className="w-4 h-4 text-purple-950" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {savedToast && (
        <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-950 p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>Alterações da página "Sobre Nós" salvas com sucesso! ✨</span>
        </div>
      )}

      {/* Section Subtabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-amber-100/70 border-2 border-amber-300 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'hero'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>1. Slogan & Propósito</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flowers')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'flowers'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Flower2 className="w-3.5 h-3.5 text-rose-300" />
          <span>2. As 3 Florzinhas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('solar')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'solar'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-yellow-300" />
          <span>3. Miolo Amarelo Solar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pillars')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pillars'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-pink-300" />
          <span>4. 4 Toques de Afeto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cta')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'cta'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-cyan-300" />
          <span>5. Chamada Final (CTA)</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* TAB 1: HERO & SLOGAN */}
        {activeTab === 'hero' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Slogan, Frase de Impacto e Apresentação</span>
            </h3>

            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <div>
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-600" />
                  <span>Slogan Principal do Topo (H1)</span>
                </label>
                <input
                  type="text"
                  value={formData.aboutHeroSlogan || DEFAULT_HOME_PAGE_CONFIG.aboutHeroSlogan}
                  onChange={(e) => updateField('aboutHeroSlogan', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  placeholder="Escreva o slogan principal da página Sobre Nós aqui"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-600" />
                  <span>Frase / Missão em Destaque (Citação em Caixa Dourada)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.aboutHeroQuote || DEFAULT_HOME_PAGE_CONFIG.aboutHeroQuote}
                  onChange={(e) => updateField('aboutHeroQuote', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  placeholder="Escreva a frase de impacto ou missão da loja aqui"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-600" />
                  <span>Texto de Apresentação / Manifesto Completo</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.aboutHeroDescription || DEFAULT_HOME_PAGE_CONFIG.aboutHeroDescription}
                  onChange={(e) => updateField('aboutHeroDescription', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  placeholder="Escreva a história e apresentação institucional da loja aqui"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AS 3 FLORZINHAS */}
        {activeTab === 'flowers' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
                <Flower2 className="w-4 h-4 text-purple-600" />
                <span>Cabeçalho da Seção Floral</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Título da Seção</label>
                  <input
                    type="text"
                    value={formData.aboutTrioTitle || DEFAULT_HOME_PAGE_CONFIG.aboutTrioTitle}
                    onChange={(e) => updateField('aboutTrioTitle', e.target.value)}
                    placeholder="Escreva o título da primeira seção institucional aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Subtítulo da Seção</label>
                  <input
                    type="text"
                    value={formData.aboutTrioSubtitle || DEFAULT_HOME_PAGE_CONFIG.aboutTrioSubtitle}
                    onChange={(e) => updateField('aboutTrioSubtitle', e.target.value)}
                    placeholder="Escreva o subtítulo da primeira seção institucional aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 1. Flor Violeta */}
            <div className="p-5 rounded-2xl bg-purple-50/60 border-2 border-purple-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#8B5CF6] border border-amber-300" />
                <h4 className="font-bold text-xs sm:text-sm text-purple-950">Flor 01 - Violeta</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-purple-950 block mb-1">Nome da Flor</label>
                  <input
                    type="text"
                    value={formData.aboutFlower1Title || DEFAULT_HOME_PAGE_CONFIG.aboutFlower1Title}
                    onChange={(e) => updateField('aboutFlower1Title', e.target.value)}
                    placeholder="Digite o título do item 1 aqui"
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-950 block mb-1">Subtítulo / Conceito</label>
                  <input
                    type="text"
                    value={formData.aboutFlower1Subtitle || DEFAULT_HOME_PAGE_CONFIG.aboutFlower1Subtitle}
                    onChange={(e) => updateField('aboutFlower1Subtitle', e.target.value)}
                    placeholder="Digite o subtítulo do item 1 aqui"
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-purple-950 block mb-1">Descrição / Significado</label>
                <textarea
                  rows={2}
                  value={formData.aboutFlower1Desc || DEFAULT_HOME_PAGE_CONFIG.aboutFlower1Desc}
                  onChange={(e) => updateField('aboutFlower1Desc', e.target.value)}
                  placeholder="Escreva a descrição detalhada do item 1 aqui"
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs text-purple-950 font-medium"
                />
              </div>
            </div>

            {/* 2. Flor Turquesa */}
            <div className="p-5 rounded-2xl bg-cyan-50/60 border-2 border-cyan-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#06B6D4] border border-amber-300" />
                <h4 className="font-bold text-xs sm:text-sm text-cyan-950">Flor 02 - Turquesa</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-cyan-950 block mb-1">Nome da Flor</label>
                  <input
                    type="text"
                    value={formData.aboutFlower2Title || DEFAULT_HOME_PAGE_CONFIG.aboutFlower2Title}
                    onChange={(e) => updateField('aboutFlower2Title', e.target.value)}
                    placeholder="Digite o título do item 2 aqui"
                    className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-xl text-xs text-cyan-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-cyan-950 block mb-1">Subtítulo / Conceito</label>
                  <input
                    type="text"
                    value={formData.aboutFlower2Subtitle || DEFAULT_HOME_PAGE_CONFIG.aboutFlower2Subtitle}
                    onChange={(e) => updateField('aboutFlower2Subtitle', e.target.value)}
                    placeholder="Digite o subtítulo do item 2 aqui"
                    className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-xl text-xs text-cyan-950 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-cyan-950 block mb-1">Descrição / Significado</label>
                <textarea
                  rows={2}
                  value={formData.aboutFlower2Desc || DEFAULT_HOME_PAGE_CONFIG.aboutFlower2Desc}
                  onChange={(e) => updateField('aboutFlower2Desc', e.target.value)}
                  placeholder="Escreva a descrição detalhada do item 2 aqui"
                  className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-xl text-xs text-cyan-950 font-medium"
                />
              </div>
            </div>

            {/* 3. Flor Rosa */}
            <div className="p-5 rounded-2xl bg-rose-50/60 border-2 border-rose-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#F43F5E] border border-amber-300" />
                <h4 className="font-bold text-xs sm:text-sm text-rose-950">Flor 03 - Rosa</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-rose-950 block mb-1">Nome da Flor</label>
                  <input
                    type="text"
                    value={formData.aboutFlower3Title || DEFAULT_HOME_PAGE_CONFIG.aboutFlower3Title}
                    onChange={(e) => updateField('aboutFlower3Title', e.target.value)}
                    placeholder="Digite o título do item 3 aqui"
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-rose-950 block mb-1">Subtítulo / Conceito</label>
                  <input
                    type="text"
                    value={formData.aboutFlower3Subtitle || DEFAULT_HOME_PAGE_CONFIG.aboutFlower3Subtitle}
                    onChange={(e) => updateField('aboutFlower3Subtitle', e.target.value)}
                    placeholder="Digite o subtítulo do item 3 aqui"
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-950 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-rose-950 block mb-1">Descrição / Significado</label>
                <textarea
                  rows={2}
                  value={formData.aboutFlower3Desc || DEFAULT_HOME_PAGE_CONFIG.aboutFlower3Desc}
                  onChange={(e) => updateField('aboutFlower3Desc', e.target.value)}
                  placeholder="Escreva a descrição detalhada do item 3 aqui"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-950 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MIOLO AMARELO SOLAR */}
        {activeTab === 'solar' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Banner do Miolo Amarelo Solar</span>
            </h3>

            <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Tag / Selo do Banner</label>
                  <input
                    type="text"
                    value={formData.aboutSolarTag || DEFAULT_HOME_PAGE_CONFIG.aboutSolarTag}
                    onChange={(e) => updateField('aboutSolarTag', e.target.value)}
                    placeholder="Digite a etiqueta ou selo em destaque aqui"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Texto do Botão</label>
                  <input
                    type="text"
                    value={formData.aboutSolarBtnText || DEFAULT_HOME_PAGE_CONFIG.aboutSolarBtnText}
                    onChange={(e) => updateField('aboutSolarBtnText', e.target.value)}
                    placeholder="Digite o texto do botão aqui"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Título do Banner Solar</label>
                <input
                  type="text"
                  value={formData.aboutSolarTitle || DEFAULT_HOME_PAGE_CONFIG.aboutSolarTitle}
                  onChange={(e) => updateField('aboutSolarTitle', e.target.value)}
                  placeholder="Digite o título em destaque aqui"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Descrição Explicativa</label>
                <textarea
                  rows={3}
                  value={formData.aboutSolarDesc || DEFAULT_HOME_PAGE_CONFIG.aboutSolarDesc}
                  onChange={(e) => updateField('aboutSolarDesc', e.target.value)}
                  placeholder="Escreva a descrição em destaque aqui"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 4 TOQUES DE AFETO */}
        {activeTab === 'pillars' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>Cabeçalho dos 4 Toques de Afeto</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Título da Seção</label>
                  <input
                    type="text"
                    value={formData.aboutPillarsTitle || DEFAULT_HOME_PAGE_CONFIG.aboutPillarsTitle}
                    onChange={(e) => updateField('aboutPillarsTitle', e.target.value)}
                    placeholder="Digite o título dos pilares da loja aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Subtítulo da Seção</label>
                  <input
                    type="text"
                    value={formData.aboutPillarsSubtitle || DEFAULT_HOME_PAGE_CONFIG.aboutPillarsSubtitle}
                    onChange={(e) => updateField('aboutPillarsSubtitle', e.target.value)}
                    placeholder="Digite o subtítulo dos pilares da loja aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pillar 1 */}
              <div className="p-4 rounded-2xl bg-white border-2 border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.aboutPillar1Icon || DEFAULT_HOME_PAGE_CONFIG.aboutPillar1Icon}
                    onChange={(e) => updateField('aboutPillar1Icon', e.target.value)}
                    className="w-10 h-10 text-center text-lg bg-amber-100 rounded-xl border border-amber-300"
                    title="Emoji ou Ícone"
                  />
                  <input
                    type="text"
                    value={formData.aboutPillar1Title || DEFAULT_HOME_PAGE_CONFIG.aboutPillar1Title}
                    onChange={(e) => updateField('aboutPillar1Title', e.target.value)}
                    placeholder="Digite o título do pilar 1 aqui"
                    className="flex-1 px-3 py-2 bg-amber-50/40 border border-amber-200 rounded-xl text-xs font-bold text-purple-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={formData.aboutPillar1Desc || DEFAULT_HOME_PAGE_CONFIG.aboutPillar1Desc}
                  onChange={(e) => updateField('aboutPillar1Desc', e.target.value)}
                  placeholder="Escreva a descrição do pilar 1 aqui"
                  className="w-full px-3 py-2 bg-amber-50/20 border border-amber-200 rounded-xl text-xs text-slate-700"
                />
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-2xl bg-white border-2 border-yellow-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.aboutPillar2Icon || DEFAULT_HOME_PAGE_CONFIG.aboutPillar2Icon}
                    onChange={(e) => updateField('aboutPillar2Icon', e.target.value)}
                    className="w-10 h-10 text-center text-lg bg-yellow-100 rounded-xl border border-yellow-300"
                    title="Emoji ou Ícone"
                  />
                  <input
                    type="text"
                    value={formData.aboutPillar2Title || DEFAULT_HOME_PAGE_CONFIG.aboutPillar2Title}
                    onChange={(e) => updateField('aboutPillar2Title', e.target.value)}
                    placeholder="Digite o título do pilar 2 aqui"
                    className="flex-1 px-3 py-2 bg-yellow-50/40 border border-yellow-200 rounded-xl text-xs font-bold text-purple-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={formData.aboutPillar2Desc || DEFAULT_HOME_PAGE_CONFIG.aboutPillar2Desc}
                  onChange={(e) => updateField('aboutPillar2Desc', e.target.value)}
                  placeholder="Escreva a descrição do pilar 2 aqui"
                  className="w-full px-3 py-2 bg-yellow-50/20 border border-yellow-200 rounded-xl text-xs text-slate-700"
                />
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-2xl bg-white border-2 border-rose-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.aboutPillar3Icon || DEFAULT_HOME_PAGE_CONFIG.aboutPillar3Icon}
                    onChange={(e) => updateField('aboutPillar3Icon', e.target.value)}
                    className="w-10 h-10 text-center text-lg bg-rose-100 rounded-xl border border-rose-300"
                    title="Emoji ou Ícone"
                  />
                  <input
                    type="text"
                    value={formData.aboutPillar3Title || DEFAULT_HOME_PAGE_CONFIG.aboutPillar3Title}
                    onChange={(e) => updateField('aboutPillar3Title', e.target.value)}
                    placeholder="Digite o título do pilar 3 aqui"
                    className="flex-1 px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-xs font-bold text-purple-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={formData.aboutPillar3Desc || DEFAULT_HOME_PAGE_CONFIG.aboutPillar3Desc}
                  onChange={(e) => updateField('aboutPillar3Desc', e.target.value)}
                  placeholder="Escreva a descrição do pilar 3 aqui"
                  className="w-full px-3 py-2 bg-rose-50/20 border border-rose-200 rounded-xl text-xs text-slate-700"
                />
              </div>

              {/* Pillar 4 */}
              <div className="p-4 rounded-2xl bg-white border-2 border-cyan-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.aboutPillar4Icon || DEFAULT_HOME_PAGE_CONFIG.aboutPillar4Icon}
                    onChange={(e) => updateField('aboutPillar4Icon', e.target.value)}
                    className="w-10 h-10 text-center text-lg bg-cyan-100 rounded-xl border border-cyan-300"
                    title="Emoji ou Ícone"
                  />
                  <input
                    type="text"
                    value={formData.aboutPillar4Title || DEFAULT_HOME_PAGE_CONFIG.aboutPillar4Title}
                    onChange={(e) => updateField('aboutPillar4Title', e.target.value)}
                    placeholder="Digite o título do pilar 4 aqui"
                    className="flex-1 px-3 py-2 bg-cyan-50/40 border border-cyan-200 rounded-xl text-xs font-bold text-purple-950"
                  />
                </div>
                <textarea
                  rows={2}
                  value={formData.aboutPillar4Desc || DEFAULT_HOME_PAGE_CONFIG.aboutPillar4Desc}
                  onChange={(e) => updateField('aboutPillar4Desc', e.target.value)}
                  placeholder="Escreva a descrição do pilar 4 aqui"
                  className="w-full px-3 py-2 bg-cyan-50/20 border border-cyan-200 rounded-xl text-xs text-slate-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CHAMADA FINAL (CTA) */}
        {activeTab === 'cta' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              <span>Chamada Final de Ação (Rodapé da Página "Sobre Nós")</span>
            </h3>

            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Tag / Selo Superior</label>
                <input
                  type="text"
                  value={formData.aboutCtaBadge || DEFAULT_HOME_PAGE_CONFIG.aboutCtaBadge}
                  onChange={(e) => updateField('aboutCtaBadge', e.target.value)}
                  placeholder="Digite o selo da chamada final aqui"
                  className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Título de Chamada</label>
                <input
                  type="text"
                  value={formData.aboutCtaTitle || DEFAULT_HOME_PAGE_CONFIG.aboutCtaTitle}
                  onChange={(e) => updateField('aboutCtaTitle', e.target.value)}
                  placeholder="Digite o título da chamada final aqui"
                  className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Texto Convidativo</label>
                <textarea
                  rows={2}
                  value={formData.aboutCtaDesc || DEFAULT_HOME_PAGE_CONFIG.aboutCtaDesc}
                  onChange={(e) => updateField('aboutCtaDesc', e.target.value)}
                  placeholder="Escreva a descrição da chamada final aqui"
                  className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Botão Primário (Catálogo)</label>
                  <input
                    type="text"
                    value={formData.aboutCtaBtn1 || DEFAULT_HOME_PAGE_CONFIG.aboutCtaBtn1}
                    onChange={(e) => updateField('aboutCtaBtn1', e.target.value)}
                    placeholder="Digite o texto do botão 1 aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Botão Secundário (Sacolinha)</label>
                  <input
                    type="text"
                    value={formData.aboutCtaBtn2 || DEFAULT_HOME_PAGE_CONFIG.aboutCtaBtn2}
                    onChange={(e) => updateField('aboutCtaBtn2', e.target.value)}
                    placeholder="Digite o texto do botão 2 aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button at bottom */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-amber-200">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-300 cursor-pointer"
          >
            <Save className="w-4 h-4 text-purple-950" />
            <span>Salvar Todos os Textos da Página "Sobre Nós"</span>
          </button>
        </div>

      </form>
    </div>
  );
};
