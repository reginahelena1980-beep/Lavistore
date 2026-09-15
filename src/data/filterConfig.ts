import { FilterBarConfig } from '../types';

export const DEFAULT_FILTER_BAR_CONFIG: FilterBarConfig = {
  showPriceFilter: true,
  priceFilterTitle: 'Valor:',
  priceRanges: [
    {
      id: 'under50',
      label: 'Até R$ 50',
      minPrice: 0,
      maxPrice: 50,
      enabled: true,
      colorTheme: 'amber',
    },
    {
      id: 'under100',
      label: 'R$ 50 a R$ 100',
      minPrice: 50,
      maxPrice: 100,
      enabled: true,
      colorTheme: 'orange',
    },
    {
      id: 'above100',
      label: 'Acima de R$ 100',
      minPrice: 100,
      maxPrice: null,
      enabled: true,
      colorTheme: 'cyan',
    },
  ],
  showSortFilter: true,
  sortFilterTitle: 'Ordenar:',
  enabledSortOptions: {
    featured: true,
    rating: true,
    priceAsc: true,
    priceDesc: true,
    nameAsc: true,
  },
};
