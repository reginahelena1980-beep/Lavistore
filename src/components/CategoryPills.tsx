import React from 'react';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
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
  // If both are disabled, return null
  const showPriceFilter = config?.showPriceFilter ?? true;
  const showSortFilter = config?.showSortFilter ?? true;

  const enabledPriceRanges = (config?.priceRanges || [
    { id: 'under50', label: 'Até R$ 50', enabled: true, colorTheme: 'amber' },
    { id: 'under100', label: 'R$ 50 a R$ 100', enabled: true, colorTheme: 'orange' },
    { id: 'above100', label: 'Acima de R$ 100', enabled: true, colorTheme: 'cyan' },
  ]).filter(r => r.enabled);

  const priceFilterTitle = config?.priceFilterTitle || 'Filtro de valor:';
  const sortFilterTitle = config?.sortFilterTitle || 'Ordenar:';

  const enabledSortOptions = config?.enabledSortOptions || {
    featured: true,
    rating: true,
    priceAsc: true,
    priceDesc: true,
    nameAsc: true,
  };

  const getColorClasses = (colorTheme: string | undefined, isSelected: boolean) => {
    switch (colorTheme) {
      case 'rose':
        return isSelected
          ? 'bg-rose-500 text-white shadow-xs'
          : 'bg-rose-50/80 text-rose-900 hover:bg-rose-100 border border-rose-200/60';
      case 'orange':
        return isSelected
          ? 'bg-orange-500 text-white shadow-xs'
          : 'bg-orange-50/80 text-orange-950 hover:bg-orange-100 border border-orange-200/60';
      case 'cyan':
        return isSelected
          ? 'bg-cyan-600 text-white shadow-xs'
          : 'bg-cyan-50/80 text-cyan-950 hover:bg-cyan-100 border border-cyan-200/60';
      case 'purple':
        return isSelected
          ? 'bg-purple-600 text-white shadow-xs'
          : 'bg-purple-50/80 text-purple-950 hover:bg-purple-100 border border-purple-200/60';
      case 'emerald':
        return isSelected
          ? 'bg-emerald-600 text-white shadow-xs'
          : 'bg-emerald-50/80 text-emerald-950 hover:bg-emerald-100 border border-emerald-200/60';
      case 'amber':
      default:
        return isSelected
          ? 'bg-amber-500 text-white shadow-xs'
          : 'bg-amber-50/80 text-amber-950 hover:bg-amber-100 border border-amber-200/60';
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Pills Row - Quick navigation across all registered categories */}
      {categories && categories.length > 0 && onSelectCategory && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950 text-amber-300 shadow-sm scale-102 border-2 border-purple-900'
                    : 'bg-white/90 text-purple-950 hover:bg-amber-100/70 border border-amber-200/80 shadow-2xs'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                {cat.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-amber-300 text-purple-950' : 'bg-amber-100 text-purple-950 border border-amber-200'
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
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white/90 text-xs sm:text-sm shadow-xs">
          
          {/* Price Range Filter Pills */}
          {showPriceFilter && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-purple-900 font-semibold flex items-center gap-1 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{priceFilterTitle}</span>
              </span>

              {/* "Todos" default option */}
              <button
                onClick={() => setPriceFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  priceFilter === 'all'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-rose-50/80 text-rose-900 hover:bg-rose-100 border border-rose-200/60'
                }`}
              >
                Todos
              </button>

              {/* Configured & Enabled Ranges */}
              {enabledPriceRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => setPriceFilter(range.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${getColorClasses(
                    range.colorTheme,
                    priceFilter === range.id
                  )}`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}

          {/* Sort Selector Dropdown */}
          {showSortFilter && (
            <div className="flex items-center gap-2 ml-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-xs text-purple-900 font-semibold">{sortFilterTitle}</span>
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Ordenar produtos"
                className="bg-white/90 border border-purple-100 rounded-xl px-2.5 py-1 text-xs text-purple-950 font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer shadow-2xs"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
