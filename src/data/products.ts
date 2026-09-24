import { Product } from '../types';
import storeState from './store_state.json';

/**
 * Catálogo oficial de produtos da Lavistore.
 * Carrega diretamente os produtos, fotos reais e variações cadastradas pela proprietária no store_state.json,
 * garantindo que na versão publicada do AI Studio todos os visitantes e clientes visualizem exatamente
 * os produtos e fotos reais inseridos.
 */
const TEST_PRODUCT_IDS = new Set(['lav-74750', 'lav-15329', 'lav-03352', 'lav-01', 'lav-02']);

export const PRODUCTS: Product[] = (storeState && Array.isArray(storeState.products) && storeState.products.length > 0)
  ? (storeState.products as unknown as Product[]).filter(
      p => p && p.id && !TEST_PRODUCT_IDS.has(p.id) && !p.name?.toLowerCase().includes('teste')
    )
  : [];
