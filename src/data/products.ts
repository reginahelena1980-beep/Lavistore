import { Product } from '../types';
import storeState from './store_state.json';

/**
 * Catálogo oficial de produtos da Lavistore.
 * Carrega diretamente os produtos, fotos reais e variações cadastradas pela proprietária no store_state.json,
 * garantindo que na versão publicada do AI Studio todos os visitantes e clientes visualizem exatamente
 * os produtos e fotos reais inseridos.
 */
export const PRODUCTS: Product[] = (storeState && Array.isArray(storeState.products) && storeState.products.length > 0)
  ? (storeState.products as unknown as Product[])
  : [];
