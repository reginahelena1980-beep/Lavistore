import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Type, 
  RotateCcw, 
  Save, 
  Check, 
  Eye, 
  Bold, 
  ShoppingBag, 
  Gift, 
  Heart, 
  Truck, 
  MessageCircleHeart, 
  Send,
  Layers,
  ArrowRight,
  Edit3,
  Megaphone,
  X
} from 'lucide-react';
import { HomePageConfig, FormattedText } from '../types';
import { DEFAULT_HOME_PAGE_CONFIG, getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';

interface HomeTextManagerProps {
  config: HomePageConfig;
  onSaveConfig: (newConfig: HomePageConfig) => void;
  onResetDefaults: () => void;
  onGoToStorefront?: () => void;
}

export const HomeTextManager: React.FC<HomeTextManagerProps> = ({
  config,
  onSaveConfig,
  onResetDefaults,
  onGoToStorefront
}) => {
  const [formData, setFormData] = useState<HomePageConfig>(config);
  const [activeSectionTab, setActiveSectionTab] = useState<'announcement' | 'hero' | 'perks' | 'catalog' | 'promo' | 'newsletter'>('announcement');
  const [savedToast, setSavedToast] = useState(false);

  // Sync state if config prop updates
  useEffect(() => {
    setFormData(config);
  }, [config]);

  const fontSizes: Array<{ value: FormattedText['fontSize']; label: string }> = [
    { value: 'xs', label: 'Muito Pequena (xs)' },
    { value: 'sm', label: 'Pequena (sm)' },
    { value: 'base', label: 'Normal / Média (base)' },
    { value: 'lg', label: 'Grande (lg)' },
    { value: 'xl', label: 'Muito Grande (xl)' },
    { value: '2xl', label: 'Título 2X (2xl)' },
    { value: '3xl', label: 'Título 3X (3xl)' },
    { value: '4xl', label: 'Destaque 4X (4xl)' },
    { value: '5xl', label: 'Impacto Máximo (5xl)' }
  ];

  const updateField = (
    fieldKey: keyof HomePageConfig, 
    partial: Partial<FormattedText>
  ) => {
    setFormData(prev => {
      const current = prev[fieldKey] || { text: '', fontSize: 'base', isBold: false };
      return {
        ...prev,
        [fieldKey]: {
          ...current,
          ...partial
        }
      };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar todos os textos e fontes da Página Inicial para o padrão original da Lavistore?')) {
      setFormData(DEFAULT_HOME_PAGE_CONFIG);
      onResetDefaults();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  const renderFieldEditor = (
    fieldKey: keyof HomePageConfig,
    label: string,
    description: string,
    isTextarea: boolean = false,
    defaultFallback: string = ''
  ) => {
    const item = formData[fieldKey] || { text: defaultFallback, fontSize: 'base', isBold: false };

    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs hover:border-amber-400 transition-all space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <label className="text-xs sm:text-sm font-bold text-purple-950 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-600" />
              <span>{label}</span>
            </label>
            <p className="text-[11px] text-slate-500 font-medium">{description}</p>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Bold Toggle Button */}
            <button
              type="button"
              onClick={() => updateField(fieldKey, { isBold: !item.isBold })}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                item.isBold 
                  ? 'bg-purple-950 text-white border-purple-950 shadow-2xs' 
                  : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-50'
              }`}
              title="Alternar entre Negrito e Normal"
            >
              <Bold className="w-3.5 h-3.5" />
              <span>{item.isBold ? 'Negrito (Ativo)' : 'Normal'}</span>
            </button>
          </div>
        </div>

        {/* Text Input / Textarea */}
        {isTextarea ? (
          <textarea
            rows={3}
            value={item.text}
            onChange={(e) => updateField(fieldKey, { text: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            placeholder="Digite o texto personalizado..."
          />
        ) : (
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateField(fieldKey, { text: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            placeholder="Digite o texto personalizado..."
          />
        )}

        {/* Font Size Selector & Live Preview Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-purple-900 block">
              Tamanho da Fonte:
            </label>
            <select
              value={item.fontSize || 'base'}
              onChange={(e) => updateField(fieldKey, { fontSize: e.target.value as any })}
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-purple-950 font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {fontSizes.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 p-3 rounded-xl bg-amber-100/50 border border-amber-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-900/70 block mb-1">
              Prévia Visual do Texto:
            </span>
            <div className="truncate">
              <span className={`text-purple-950 ${getFontSizeClass(item.fontSize, 'text-base')} ${getFontWeightClass(item.isBold, false)}`}>
                {item.text || '(Vazio)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-['Comfortaa'] animate-in fade-in">
      
      {/* Header Info */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200 text-purple-950 text-xs font-bold shadow-2xs">
            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
            <span>Editor Total da Página Inicial</span>
          </div>
          <h2 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
            Edição de Textos, Tamanho de Fontes & Negrito 📝
          </h2>
          <p className="text-xs sm:text-sm text-purple-900 max-w-2xl font-medium leading-relaxed">
            Aqui você tem controle total para personalizar todas as frases, títulos, botões e selos da página inicial da Lavistore, ajustando o tamanho exato da tipografia e escolhendo se fica em <strong>Negrito</strong> ou Normal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#06B6D4] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 border-2 border-white/60 active:scale-95 transition-transform"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todos os Textos</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Restaurar Padrão</span>
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-950 p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Alterações de texto e tipografia da Página Inicial salvas com sucesso! ✨</span>
        </div>
      )}

      {/* Navigation Sub-tabs for Sections */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-amber-100/70 border-2 border-amber-300 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSectionTab('announcement')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSectionTab === 'announcement'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-amber-300" />
          <span>1. Barra de Aviso (Topo)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSectionTab('hero')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSectionTab === 'hero'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>2. Banner Principal (Hero)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSectionTab('perks')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSectionTab === 'perks'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-yellow-300" />
          <span>3. 4 Vantagens (Sacolinhas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSectionTab('catalog')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSectionTab === 'catalog'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-300" />
          <span>4. Cabeçalho do Catálogo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSectionTab('promo')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSectionTab === 'promo'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-rose-300" />
          <span>5. Banner Sacolinha Amarela</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSectionTab('newsletter')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSectionTab === 'newsletter'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-cyan-300" />
          <span>6. Clube / Newsletter</span>
        </button>
      </div>

      {/* FORM SECTIONS */}
      <form onSubmit={handleSave} className="space-y-6">

        {/* TAB 0: ANNOUNCEMENT BAR */}
        {activeSectionTab === 'announcement' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-xl font-bold text-purple-950 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              <span>Barra de Aviso / Cupom no Topo do Site</span>
            </h3>

            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div>
                  <span className="text-xs font-bold text-purple-950 block">Exibir Barra de Aviso Superior</span>
                  <span className="text-[11px] text-slate-500">Mostra a faixa de destaque no cabeçalho de todas as páginas da loja.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showAnnouncement !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, showAnnouncement: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-950"></div>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-purple-950 block">
                    Texto do Aviso / Benefício (ex: Frete Grátis e Regra)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, announcementText: 'Frete Grátis para compras acima de R$ 149,90' }))}
                    className="text-[11px] text-purple-700 hover:text-purple-950 underline font-semibold cursor-pointer"
                  >
                    Usar sugestão: Frete Grátis acima de R$ 149,90
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.announcementText !== undefined && formData.announcementText !== null ? formData.announcementText : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, announcementText: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Frete Grátis para compras acima de R$ 149,90"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-purple-950 block">
                    Código do Cupom em Destaque (Opcional)
                  </label>
                  {formData.announcementCoupon && formData.announcementCoupon.trim() !== '' ? (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, announcementCoupon: '' }))}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 cursor-pointer transition-colors"
                      title="Remover cupom e deixar apenas o aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remover / Limpar Cupom</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      ✓ Sem cupom no topo (apenas aviso de frete)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.announcementCoupon !== undefined && formData.announcementCoupon !== null ? formData.announcementCoupon : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, announcementCoupon: e.target.value.toUpperCase() }))}
                    className="w-full pl-3.5 pr-9 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Deixe em branco para NÃO exibir cupom"
                  />
                  {formData.announcementCoupon ? (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, announcementCoupon: '' }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Apagar código do cupom"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Se você não deseja cupom no topo, deixe este campo <strong>vazio</strong> ou clique em <strong>Remover / Limpar Cupom</strong>.
                </p>
              </div>

              <div className="p-4 bg-pink-50/90 rounded-2xl border-2 border-pink-200 text-center space-y-2">
                <span className="text-[10px] uppercase font-bold text-pink-700 tracking-wider block">
                  Prévia da Barra no Topo do Site:
                </span>
                <div className="text-xs sm:text-sm text-purple-900 font-medium py-1">
                  {formData.announcementText ? (
                    formData.announcementText
                  ) : (
                    <span className="italic text-slate-400">Texto do aviso em branco</span>
                  )}
                  {formData.announcementCoupon && formData.announcementCoupon.trim() !== '' ? (
                    <strong className="font-bold text-purple-950 ml-1.5 px-2 py-0.5 bg-white rounded-md border border-pink-200 shadow-2xs">
                      {formData.announcementCoupon.trim()}
                    </strong>
                  ) : null}
                </div>
                <div>
                  {!formData.announcementCoupon || formData.announcementCoupon.trim() === '' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300">
                      <Check className="w-3.5 h-3.5" />
                      Nenhum cupom será exibido no topo (apenas seu aviso)
                    </span>
                  ) : (
                    <span className="inline-block text-[11px] font-bold text-purple-800 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-200">
                      Cupom ativo na barra: {formData.announcementCoupon.trim()}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Save for Announcement Bar */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSaveConfig(formData);
                    setSavedToast(true);
                    setTimeout(() => setSavedToast(false), 3000);
                  }}
                  className="px-5 py-2.5 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>Salvar Barra Superior Agora</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* TAB 1: HERO */}
        {activeSectionTab === 'hero' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-xl font-bold text-purple-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Textos do Banner Principal (Hero)</span>
            </h3>

            <div className="space-y-4">
              {renderFieldEditor('heroBadge', 'Selo do Topo', 'Pequeno texto no topo com a paleta de 4 cores.', false, 'Presentes Criativos & Mimos com Amor 🌸')}
              {renderFieldEditor('heroTitle', 'Título Principal do Banner', 'Grande chamada de impacto para acolher a cliente.', true, 'Faça a diferença no dia de quem você ama, demonstre o seu carinho através dos nossos mimos!')}
              {renderFieldEditor('heroSubtitle', 'Subtítulo Explicativo', 'Parágrafo acolhedor que conta sobre a essência da Lavistore.', true, 'A Lavistore nasce da vontade de empreender e fazer um mundo mais divertido e colorido! Unimos presentes criativos, cheirinho doce artesanal e papelaria fofa que transformam pequenos momentos em pura alegria.')}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderFieldEditor('heroBtnPrimary', 'Botão Principal (Gradiente)', 'Texto do botão de explorar lançamentos.', false, 'Explorar Lançamentos Florais')}
                {renderFieldEditor('heroBtnSecondary', 'Botão Secundário (Amarelo)', 'Texto do botão de kit / sacolinha.', false, 'Monte sua Sacolinha de Presente')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderFieldEditor('heroTrust1', 'Destaque 1 (Cheirinho)', 'Frase de confiança 1 no rodapé do banner.', false, 'Embalagens com Cheirinho Doce')}
                {renderFieldEditor('heroTrust2', 'Destaque 2 (Brinde)', 'Frase de confiança 2 no rodapé do banner.', false, 'Brinde Floral em Todos os Pedidos')}
                {renderFieldEditor('heroTrust3', 'Destaque 3 (Artesanal)', 'Frase de confiança 3 no rodapé do banner.', false, 'Acabamento Artesanal com Amor')}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BRAND PERKS (SACOLINHAS AMARELAS) */}
        {activeSectionTab === 'perks' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-xl font-bold text-purple-950 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>4 Vantagens da Marca (Sacolinhas Amarelas & Experiência)</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.perk1Icon || DEFAULT_HOME_PAGE_CONFIG.perk1Icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, perk1Icon: e.target.value }))}
                    className="w-9 h-9 text-center bg-white border border-amber-300 rounded-lg text-sm"
                    title="Ícone / Emoji da Vantagem 1"
                  />
                  <span className="text-xs font-bold text-purple-950">Vantagem 1 (Mimos na Sacolinha)</span>
                </div>
                {renderFieldEditor('perk1Title', 'Vantagem 1 - Título', 'Título da primeira vantagem.', false, 'Mimos Florais em Cada Sacolinha Amarela')}
                {renderFieldEditor('perk1Desc', 'Vantagem 1 - Descrição', 'Descrição dos adesivos e brindes.', true, 'Você sempre ganha adesivos das 3 florzinhas, marcadores fofos e mini surpresas.')}
              </div>

              <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.perk2Icon || DEFAULT_HOME_PAGE_CONFIG.perk2Icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, perk2Icon: e.target.value }))}
                    className="w-9 h-9 text-center bg-white border border-amber-300 rounded-lg text-sm"
                    title="Ícone / Emoji da Vantagem 2"
                  />
                  <span className="text-xs font-bold text-purple-950">Vantagem 2 (Cheirinho Floral & Doce)</span>
                </div>
                {renderFieldEditor('perk2Title', 'Vantagem 2 - Título', 'Título do perfume artesanal.', false, 'Cheirinho Floral & Doce')}
                {renderFieldEditor('perk2Desc', 'Vantagem 2 - Descrição', 'Descrição da fragrância suave.', true, 'Cada sacolinha amarela é borrifada artesanalmente com nossa fragrância suave de lavanda e baunilha.')}
              </div>

              <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.perk3Icon || DEFAULT_HOME_PAGE_CONFIG.perk3Icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, perk3Icon: e.target.value }))}
                    className="w-9 h-9 text-center bg-white border border-amber-300 rounded-lg text-sm"
                    title="Ícone / Emoji da Vantagem 3"
                  />
                  <span className="text-xs font-bold text-purple-950">Vantagem 3 (Frete Grátis)</span>
                </div>
                {renderFieldEditor('perk3Title', 'Vantagem 3 - Título', 'Título de envio gratuito.', false, 'Frete Grátis Especial')}
                {renderFieldEditor('perk3Desc', 'Vantagem 3 - Descrição', 'Regras de envio e valor mínimo.', true, 'Envio gratuito para todo o Brasil em compras a partir de R$ 149 com rastreamento detalhado.')}
              </div>

              <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.perk4Icon || DEFAULT_HOME_PAGE_CONFIG.perk4Icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, perk4Icon: e.target.value }))}
                    className="w-9 h-9 text-center bg-white border border-amber-300 rounded-lg text-sm"
                    title="Ícone / Emoji da Vantagem 4"
                  />
                  <span className="text-xs font-bold text-purple-950">Vantagem 4 (Feito com Amor)</span>
                </div>
                {renderFieldEditor('perk4Title', 'Vantagem 4 - Título', 'Título do carinho artesanal.', false, 'Feito com Amor & Afeto')}
                {renderFieldEditor('perk4Desc', 'Vantagem 4 - Descrição', 'Qualidade de gramatura e papelaria.', true, 'Produtos de papelaria selecionados a dedo com gramatura nobre e sacolinhas amarelas exclusivas.')}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATALOG SECTION */}
        {activeSectionTab === 'catalog' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-xl font-bold text-purple-950 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              <span>Cabeçalho do Catálogo de Produtos</span>
            </h3>

            <div className="space-y-4">
              {renderFieldEditor('catalogTitle', 'Título da Seção de Produtos', 'Título exibido acima do catálogo.', false, 'Nossos Mimos Encantados ✨')}
              {renderFieldEditor('catalogSubtitle', 'Subtítulo da Seção de Produtos', 'Texto explicativo sobre filtros e estoque.', true, 'Encontre os mimos perfeitos com estoque atualizado em tempo real.')}
            </div>
          </div>
        )}

        {/* TAB 4: PROMO SACOLINHA BANNER */}
        {activeSectionTab === 'promo' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-xl font-bold text-purple-950 flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-500" />
              <span>Banner Promocional de Sacolinhas Amarelas (Home)</span>
            </h3>

            <div className="space-y-4">
              {renderFieldEditor('promoBadge', 'Selo do Banner', 'Pequeno texto superior do banner colorido.', false, 'Presenteie com Criatividade')}
              {renderFieldEditor('promoTitle', 'Título da Chamada de Sacolinha', 'Chamada para montar a sacolinha personalizada.', true, 'Quer montar uma sacolinha de presente personalizada?')}
              {renderFieldEditor('promoDescription', 'Descrição da Promoção', 'Detalhes da sacolinha amarela, mimos e desconto.', true, 'Escolha a sacolinha amarela exclusiva, selecione os mimos favoritos, adicione uma dedicatória e ganhe 10% de desconto no combo!')}
              {renderFieldEditor('promoButton', 'Texto do Botão CTA', 'Botão de ação rápida para ir ao montador.', false, 'Montar Sacolinha Agora')}
            </div>
          </div>
        )}

        {/* TAB 5: NEWSLETTER */}
        {activeSectionTab === 'newsletter' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-xl font-bold text-purple-950 flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-500" />
              <span>Clube de Mimos / Newsletter no Rodapé</span>
            </h3>

            <div className="space-y-4">
              {renderFieldEditor('newsletterBadge', 'Selo do Clube', 'Selo superior da caixa da newsletter.', false, 'Clube de Mimos Lavistore')}
              {renderFieldEditor('newsletterTitle', 'Título do Desconto da Newsletter', 'Oferta de 10% OFF no primeiro pedido.', false, 'Ganhe 10% OFF na sua primeira compra! 🌸')}
              {renderFieldEditor('newsletterDesc', 'Descrição da Newsletter', 'Frase convidando a cadastrar o e-mail para mimos.', true, 'Cadastre seu e-mail para receber lançamentos florais e mimos exclusivos.')}
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="pt-4 border-t border-amber-200 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            💡 As alterações serão aplicadas imediatamente na loja e salvas no navegador.
          </p>
          <button
            type="submit"
            className="px-6 py-3 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>Salvar Todas as Alterações</span>
          </button>
        </div>

      </form>
    </div>
  );
};
