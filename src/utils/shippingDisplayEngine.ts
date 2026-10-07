import { ShippingOption } from '../types';

/**
 * Verifica se uma cotação de frete é elegível/válida conforme as regras da loja
 */
export function isShippingOptionEligible(option: ShippingOption | null | undefined): boolean {
  if (!option || !option.id) return false;
  if (option.error) return false;
  if (typeof option.price !== 'number' || isNaN(option.price) || option.price < 0) return false;
  return true;
}

/**
 * Extrai a estimativa de prazo em dias para comparação determinística
 */
export function getDeliveryDays(option: ShippingOption): number {
  if (typeof option.deliveryDays === 'number' && !isNaN(option.deliveryDays)) {
    return option.deliveryDays;
  }
  if (option.deadline) {
    const matches = option.deadline.match(/\d+/g);
    if (matches && matches.length > 0) {
      // Se houver intervalo como "1 a 2 dias" ou "3 a 6 dias", utiliza o prazo mínimo/inicial
      return parseInt(matches[0], 10);
    }
  }
  return 999;
}

/**
 * Determina o valor efetivo que o cliente realmente paga pelo frete
 * (considerando cupom de frete grátis, cupom BRINDE ou regra de frete grátis por subtotal)
 */
export function calculateEffectiveShippingPrice(
  option: ShippingOption,
  isFreeShippingEligible: boolean
): number {
  if (isFreeShippingEligible) {
    return 0;
  }
  return typeof option.price === 'number' && !isNaN(option.price) ? option.price : 0;
}

/**
 * Retorna as 4 opções de frete mais baratas elegíveis, ordenadas pelo preço efetivo para o cliente
 * 
 * Regras estritas de desempate:
 * 1. Menor preço efetivo para o cliente (lower effective customer price);
 * 2. Menor prazo de entrega estimado (shorter delivery estimate);
 * 3. Menor preço original/bruto cotado (lower original/raw quoted price);
 * 4. Ordem original estável ou ID alfabético como desempate final.
 */
export function getTop4CheapestShippingOptions(
  options: ShippingOption[],
  isFreeShippingEligible: boolean
): ShippingOption[] {
  if (!Array.isArray(options)) return [];

  const eligible = options.filter(isShippingOptionEligible);

  const sorted = [...eligible].sort((a, b) => {
    // 1. Menor preço efetivo para o cliente
    const effA = calculateEffectiveShippingPrice(a, isFreeShippingEligible);
    const effB = calculateEffectiveShippingPrice(b, isFreeShippingEligible);
    if (effA !== effB) {
      return effA - effB;
    }

    // 2. Menor prazo estimado de entrega (dias úteis)
    const daysA = getDeliveryDays(a);
    const daysB = getDeliveryDays(b);
    if (daysA !== daysB) {
      return daysA - daysB;
    }

    // 3. Menor preço original/bruto cotado
    const rawPriceA = typeof a.originalPrice === 'number' ? a.originalPrice : a.price;
    const rawPriceB = typeof b.originalPrice === 'number' ? b.originalPrice : b.price;
    if (rawPriceA !== rawPriceB) {
      return rawPriceA - rawPriceB;
    }

    // 4. Ordem original do array ou ID como desempate final estável
    const idxA = options.indexOf(a);
    const idxB = options.indexOf(b);
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
      return idxA - idxB;
    }

    return String(a.id).localeCompare(String(b.id));
  });

  return sorted.slice(0, 4);
}

/**
 * Garante que a opção de frete selecionada pertence exclusivamente à lista exibida dos Top 4.
 * Se a opção anterior cair fora dos Top 4 ou for nula, seleciona a primeira opção (mais vantajosa).
 */
export function ensureSelectedOptionInTop4(
  currentSelected: ShippingOption | null | undefined,
  top4Options: ShippingOption[]
): ShippingOption | null {
  if (!top4Options || top4Options.length === 0) {
    return null;
  }

  if (currentSelected) {
    const match = top4Options.find(o => 
      o.id === currentSelected.id ||
      (o.name.toLowerCase() === currentSelected.name.toLowerCase() && o.carrier.toLowerCase() === currentSelected.carrier.toLowerCase())
    );
    if (match) {
      return match;
    }
  }

  return top4Options[0];
}
