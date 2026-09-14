import React from 'react';
import { Sparkles, SlidersHorizontal, Compass } from 'lucide-react';
import { FilterBarConfig, Category } from '../types';
import { playClickSound } from '../utils/soundSystem';

interface CategoryPillsProps {
  sortBy: string;
  setSortBy: (sort: string) => void;
  priceFilter: string;
  setPriceFilter: (filter: string) => void;
  categories?: Category[];
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  config?: FilterBarConfig;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  sortBy,
  setSortBy,
  priceFilter,
  setPriceFilter,
  categories,
  selectedCategory = 'todos',
  onSelectCategory,
  config
}) => {
  const showPriceFilter = config?.showPriceFilter ?? true;
  const showSortFilter = config?.showSortFilter ?? true;

  const enabledPriceRanges = (config?.priceRanges || [
    { id: 'under50', label: 'Até R$ 50', enabled: true, colorTheme: 'cyan' },
    { id: 'under100', label: 'R$ 50 a R$ 100', enabled: true, colorTheme: 'blue' },
    { id: 'above100', label: 'Acima de R$ 100', enabled: true, colorTheme: 'purple' },
  ]).filter(r => r.enabled);

  const priceFilterTitle = config?.priceFilterTitle || 'Faixa de Ouro:';
  const sortFilterTitle = config?.sortFilterTitle || 'Ordenar:';

  const enabledSortOptions = config?.enabledSortOptions || {
    featured: true,
    rating: true,
    priceAsc: true,
    priceDesc: true,
    nameAsc: true,
  };

  return (
    <div className="space-y-4 font-['Cinzel',serif]">
      {/* Category Pills Row */}
      {categories && categories.length > 0 && onSelectCategory && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  onSelectCategory(cat.id);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-102 border-2 border-cyan-300 font-black'
                    : 'bg-[#0A1224] text-slate-300 hover:text-cyan-300 hover:bg-[#0E1A33] border border-cyan-500/30'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                {cat.badge && (
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                    isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      {(showPriceFilter || showSortFilter) && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080E1C]/90 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/25 text-xs shadow-lg">
          
          {/* Price Range Filter Pills */}
          {showPriceFilter && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-cyan-300 font-bold flex items-center gap-1 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{priceFilterTitle}</span>
              </span>

              {/* "Todos" default option */}
              <button
                onClick={() => {
                  playClickSound();
                  setPriceFilter('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  priceFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-[#0C1527] text-slate-300 hover:text-cyan-300 border border-cyan-500/20'
                }`}
              >
                Todas
              </button>

              {/* Configured Ranges */}
              {enabledPriceRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => {
                    playClickSound();
                    setPriceFilter(range.id);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    priceFilter === range.id
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'bg-[#0C1527] text-slate-300 hover:text-cyan-300 border border-cyan-500/20'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}

          {/* Sort Selector Dropdown */}
          {showSortFilter && (
            <div className="flex items-center gap-2 ml-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-300 font-semibold">{sortFilterTitle}</span>
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => {
                  playClickSound();
                  setSortBy(e.target.value);
                }}
                aria-label="Ordenar produtos"
                className="bg-[#0C1527] border border-cyan-500/30 rounded-xl px-3 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer shadow-xs"
              >
                {enabledSortOptions.featured && (
                  <option value="featured">Destaques & Drops</option>
                )}
                {enabledSortOptions.rating && (
                  <option value="rating">Mais Bem Avaliados ⭐</option>
                )}
                {enabledSortOptions.priceAsc && (
                  <option value="price-asc">Menor Preço</option>
                )}
                {enabledSortOptions.priceDesc && (
                  <option value="price-desc">Maior Preço</option>
                )}
                {enabledSortOptions.nameAsc && (
                  <option value="name-asc">Nome (A a Z)</option>
                )}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
