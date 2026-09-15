import React from 'react';
import { Sparkles, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { FilterBarConfig, Category } from '../types';

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
    { id: 'under50', label: 'Até R$ 50', enabled: true, minPrice: 0, maxPrice: 50 },
    { id: 'under100', label: 'R$ 50 a R$ 100', enabled: true, minPrice: 50, maxPrice: 100 },
    { id: 'above100', label: 'Acima de R$ 100', enabled: true, minPrice: 100, maxPrice: null },
  ]).filter(r => r.enabled);

  const priceFilterTitle = config?.priceFilterTitle || 'Valor:';
  const sortFilterTitle = config?.sortFilterTitle || 'Ordenar:';

  const enabledSortOptions = config?.enabledSortOptions || {
    featured: true,
    rating: true,
    priceAsc: true,
    priceDesc: true,
    nameAsc: true,
  };

  return (
    <div className="space-y-3">
      {/* Category Pills Row - Delicate & Minimalist Quick Navigation */}
      {categories && categories.length > 0 && onSelectCategory && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950 text-amber-300 font-semibold shadow-xs border border-purple-900'
                    : 'bg-white/85 text-purple-900/90 font-medium hover:text-purple-950 hover:bg-amber-50/70 border border-purple-100/70 hover:border-amber-300/80 shadow-2xs'
                }`}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span>{cat.name}</span>
                {cat.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      isSelected
                        ? 'bg-amber-300/20 text-amber-300 border border-amber-300/30'
                        : 'bg-amber-100/80 text-purple-950 border border-amber-200/70'
                    }`}
                  >
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter and Sort Toolbar - Delicate & Minimalist Layout */}
      {(showPriceFilter || showSortFilter) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 bg-white/75 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-purple-100/70 shadow-2xs text-xs">
          
          {/* Price Range Filter - Single unified dropdown element */}
          {showPriceFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="select-price-filter" className="flex items-center gap-1.5 text-purple-900/90 font-medium cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold">{priceFilterTitle}</span>
              </label>

              <div className="relative inline-flex items-center">
                <select
                  id="select-price-filter"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  aria-label={priceFilterTitle}
                  className={`appearance-none rounded-xl pl-3 pr-8 py-1.5 text-xs font-medium cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-amber-300/60 shadow-2xs ${
                    priceFilter !== 'all'
                      ? 'bg-amber-50/90 border border-amber-300 text-purple-950 font-semibold'
                      : 'bg-white/95 border border-purple-100/90 hover:border-purple-300 text-purple-950'
                  }`}
                >
                  <option value="all">Todos os valores</option>
                  {enabledPriceRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 pointer-events-none" />
              </div>

              {/* Delicate Clear Filter Pill */}
              {priceFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setPriceFilter('all')}
                  className="inline-flex items-center gap-1 text-[11px] text-purple-700/80 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50/80 transition-colors font-medium cursor-pointer"
                  title="Limpar filtro de valor"
                >
                  <X className="w-3 h-3 text-rose-500" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          )}

          {/* Sort Selector Dropdown */}
          {showSortFilter && (
            <div className="flex items-center gap-2 ml-auto">
              <label htmlFor="select-sort-by" className="flex items-center gap-1.5 text-purple-900/90 font-medium cursor-pointer">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="text-xs font-semibold">{sortFilterTitle}</span>
              </label>

              <div className="relative inline-flex items-center">
                <select
                  id="select-sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Ordenar produtos"
                  className="appearance-none bg-white/95 border border-purple-100/90 hover:border-purple-300 rounded-xl pl-3 pr-8 py-1.5 text-xs text-purple-950 font-medium focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer shadow-2xs transition-all"
                >
                  {enabledSortOptions.featured && (
                    <option value="featured">Destaques & Novidades</option>
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
                <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
