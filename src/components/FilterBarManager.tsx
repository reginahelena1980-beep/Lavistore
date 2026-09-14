import React from 'react';
import { 
  Sparkles, 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  Eye, 
  EyeOff,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';
import { FilterBarConfig, PriceFilterRange } from '../types';
import { DEFAULT_FILTER_BAR_CONFIG } from '../data/filterConfig';

interface FilterBarManagerProps {
  config: FilterBarConfig;
  onSaveConfig: (newConfig: FilterBarConfig) => void;
  onResetConfig: () => void;
}

export const FilterBarManager: React.FC<FilterBarManagerProps> = ({
  config,
  onSaveConfig,
  onResetConfig,
}) => {
  const [form, setForm] = React.useState<FilterBarConfig>(config || DEFAULT_FILTER_BAR_CONFIG);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  React.useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const handleSave = () => {
    onSaveConfig(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTogglePriceRange = (id: string) => {
    setForm(prev => ({
      ...prev,
      priceRanges: prev.priceRanges.map(r => 
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  };

  const handleUpdatePriceRange = (id: string, field: keyof PriceFilterRange, val: any) => {
    setForm(prev => ({
      ...prev,
      priceRanges: prev.priceRanges.map(r => {
        if (r.id !== id) return r;
        return { ...r, [field]: val };
      }),
    }));
  };

  const handleDeletePriceRange = (id: string) => {
    setForm(prev => ({
      ...prev,
      priceRanges: prev.priceRanges.filter(r => r.id !== id),
    }));
  };

  const handleAddPriceRange = () => {
    const newId = `custom_${Date.now().toString().slice(-4)}`;
    const newRange: PriceFilterRange = {
      id: newId,
      label: 'Até R$ 30',
      minPrice: 0,
      maxPrice: 30,
      enabled: true,
      colorTheme: 'purple',
    };
    setForm(prev => ({
      ...prev,
      priceRanges: [...prev.priceRanges, newRange],
    }));
  };

  const handleToggleSortOption = (optKey: keyof FilterBarConfig['enabledSortOptions']) => {
    setForm(prev => ({
      ...prev,
      enabledSortOptions: {
        ...prev.enabledSortOptions,
        [optKey]: !prev.enabledSortOptions[optKey],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 p-5 rounded-3xl border-2 border-amber-300">
        <div>
          <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-purple-700" />
            <span>Configurar Filtro de Valores & Ordenação</span>
          </h2>
          <p className="text-xs sm:text-sm text-purple-900/80 font-['Comfortaa'] mt-1">
            Habilite, desabilite ou crie faixas de preço personalizadas e escolha quais opções de ordenação aparecem na loja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetConfig}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/80 hover:bg-white text-slate-700 hover:text-purple-950 border border-amber-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-950 hover:bg-purple-900 text-amber-300 transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg transform active:scale-95"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Salvo com Sucesso! ✨</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-amber-300" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: PRICE RANGES */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
                <span>Faixas de Preço (Filtros Rápidos)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Ative, desative ou ajuste os valores mínimo e máximo de cada botão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global toggle for price bar */}
            <label className="flex items-center gap-2 text-xs font-bold text-purple-950 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showPriceFilter}
                onChange={(e) => setForm(prev => ({ ...prev, showPriceFilter: e.target.checked }))}
                className="w-4 h-4 accent-purple-600 rounded"
              />
              <span>Exibir barra de preços na loja</span>
            </label>

            <button
              type="button"
              onClick={handleAddPriceRange}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 border border-amber-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Nova Faixa</span>
            </button>
          </div>
        </div>

        {/* Title of the price filter */}
        <div className="max-w-md">
          <label className="block text-xs font-bold text-purple-950 mb-1">
            Texto do Rótulo do Filtro:
          </label>
          <input
            type="text"
            value={form.priceFilterTitle}
            onChange={(e) => setForm(prev => ({ ...prev, priceFilterTitle: e.target.value }))}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none"
            placeholder="Digite o rótulo do filtro de valor aqui"
          />
        </div>

        {/* Price Ranges Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {form.priceRanges.map((range, idx) => (
            <div
              key={range.id}
              className={`relative p-4 rounded-2xl border-2 transition-all space-y-3 ${
                range.enabled
                  ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}
            >
              {/* Header with Enable Toggle & Delete */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTogglePriceRange(range.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    range.enabled
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                  title={range.enabled ? 'Desabilitar esta faixa' : 'Habilitar esta faixa'}
                >
                  {range.enabled ? (
                    <>
                      <Eye className="w-3 h-3 text-emerald-600" />
                      <span>Ativo na Loja</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3 text-slate-500" />
                      <span>Desabilitado</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePriceRange(range.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Excluir faixa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Range Name / Label */}
              <div>
                <label className="block text-[11px] font-bold text-purple-900 mb-1">
                  Texto do Botão:
                </label>
                <input
                  type="text"
                  value={range.label}
                  onChange={(e) => handleUpdatePriceRange(range.id, 'label', e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white focus:ring-2 focus:ring-purple-400 outline-none"
                  placeholder="Digite o texto do botão da faixa aqui"
                />
              </div>

              {/* Min & Max Price Values */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Preço Mínimo (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={range.minPrice}
                    onChange={(e) => handleUpdatePriceRange(range.id, 'minPrice', Number(e.target.value) || 0)}
                    className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-amber-200 bg-white outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Preço Máximo (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Digite o preço máximo (ou deixe sem limite)"
                    value={range.maxPrice === null ? '' : range.maxPrice}
                    onChange={(e) => {
                      const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                      handleUpdatePriceRange(range.id, 'maxPrice', val);
                    }}
                    className="w-full text-xs font-medium px-2 py-1 rounded-lg border border-amber-200 bg-white outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Vazio = Sem teto</span>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Cor do Botão:
                </label>
                <select
                  value={range.colorTheme || 'amber'}
                  onChange={(e) => handleUpdatePriceRange(range.id, 'colorTheme', e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded-lg border border-amber-200 bg-white outline-none"
                >
                  <option value="rose">Rosa / Coral</option>
                  <option value="amber">Amarelo Dourado</option>
                  <option value="orange">Laranja Quente</option>
                  <option value="cyan">Azul / Ciano</option>
                  <option value="purple">Lilás / Roxo</option>
                  <option value="emerald">Verde Suave</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: SORT OPTIONS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 flex items-center justify-center text-cyan-700">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Opções de Ordenação do Catálogo
              </h3>
              <p className="text-xs text-slate-500">
                Escolha quais critérios de organização os clientes podem selecionar.
              </p>
            </div>
          </div>

          {/* Global toggle for sort */}
          <label className="flex items-center gap-2 text-xs font-bold text-purple-950 bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showSortFilter}
              onChange={(e) => setForm(prev => ({ ...prev, showSortFilter: e.target.checked }))}
              className="w-4 h-4 accent-cyan-600 rounded"
            />
            <span>Exibir seletor "Ordenar" na loja</span>
          </label>
        </div>

        {/* Title of the sort filter */}
        <div className="max-w-md">
          <label className="block text-xs font-bold text-purple-950 mb-1">
            Texto do Rótulo de Ordenação:
          </label>
          <input
            type="text"
            value={form.sortFilterTitle}
            onChange={(e) => setForm(prev => ({ ...prev, sortFilterTitle: e.target.value }))}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-cyan-200 bg-cyan-50/30 focus:bg-white focus:ring-2 focus:ring-cyan-400 outline-none"
            placeholder="Digite o rótulo de ordenação aqui"
          />
        </div>

        {/* Sort Options Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'featured', label: 'Destaques & Novidades', desc: 'Ordem padrão recomendada' },
            { key: 'rating', label: 'Mais Bem Avaliados ⭐', desc: 'Classifica pelas estrelas dos clientes' },
            { key: 'priceAsc', label: 'Menor Preço (Crescente)', desc: 'Do mimo mais barato ao mais caro' },
            { key: 'priceDesc', label: 'Maior Preço (Decrescente)', desc: 'Do mimo mais valioso ao mais barato' },
            { key: 'nameAsc', label: 'Ordem Alfabética (A-Z)', desc: 'Organiza pelo nome do produto' },
          ].map((item) => {
            const isChecked = form.enabledSortOptions[item.key as keyof FilterBarConfig['enabledSortOptions']];
            return (
              <label
                key={item.key}
                onClick={() => handleToggleSortOption(item.key as keyof FilterBarConfig['enabledSortOptions'])}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-cyan-50/40 border-cyan-300 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent onClick
                  className="mt-0.5 w-4 h-4 accent-cyan-600 rounded"
                />
                <div>
                  <p className="text-xs font-bold text-purple-950">{item.label}</p>
                  <p className="text-[10px] text-slate-500 font-['Comfortaa']">{item.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Floating / Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-purple-950 hover:bg-purple-900 text-amber-300 transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform active:scale-95"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Salvo com Sucesso! ✨</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-amber-300" />
              <span>Salvar Todas as Configurações de Filtros</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
