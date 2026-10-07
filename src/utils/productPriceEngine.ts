import { Product } from '../types';

/**
 * Retorna o preço efetivo que o cliente realmente paga pelo produto.
 * 
 * Regra de Preço Efetivo:
 * - O campo `product.price` representa o preço promocional/atual de venda oficial.
 * - O campo `product.originalPrice` é o preço de tabela/riscado (de referência).
 * - Caso o produto possua variações (tamanhos/cores) com modo de preço personalizado ('custom'),
 *   retorna o menor preço disponível dentre as opções em estoque (ou cadastradas).
 */
export function getProductEffectivePrice(product: Product): number {
  if (!product) return 0;

  if (product.hasSizes && Array.isArray(product.sizes) && product.sizes.length > 0 && product.sizePricingMode === 'custom') {
    const inStockVariants = product.sizes.filter(s => (s.stock ?? 0) > 0 && typeof s.price === 'number' && s.price > 0);
    if (inStockVariants.length > 0) {
      return Math.min(...inStockVariants.map(s => s.price!));
    }
    const pricedVariants = product.sizes.filter(s => typeof s.price === 'number' && s.price > 0);
    if (pricedVariants.length > 0) {
      return Math.min(...pricedVariants.map(s => s.price!));
    }
  }

  return typeof product.price === 'number' && !isNaN(product.price) ? product.price : 0;
}

/**
 * Ordena a lista de produtos de acordo com a modalidade selecionada.
 */
export function sortProducts(products: Product[], sortBy: string): Product[] {
  const list = [...products];

  if (sortBy === 'price-asc') {
    return list.sort((a, b) => getProductEffectivePrice(a) - getProductEffectivePrice(b));
  } else if (sortBy === 'price-desc') {
    return list.sort((a, b) => getProductEffectivePrice(b) - getProductEffectivePrice(a));
  } else if (sortBy === 'rating') {
    return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'name-asc') {
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // 'featured' preserva a ordenação padrão de vitrine/destaques
  return list;
}
