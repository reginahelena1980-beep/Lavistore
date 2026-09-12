import { Coupon, CouponEvaluation } from '../types';
import { DEFAULT_COUPONS } from '../data/coupons';

/**
 * Utilitário de Validação e Cálculo Dinâmico de Cupons da Lavistore
 * 
 * Suporta:
 * - Cupons de Frete Grátis ('free_shipping'): zera o frete no carrinho e checkout
 * - Cupons de Porcentagem ('percentage'): calcula % de desconto no subtotal
 * - Cupons de Valor Fixo ('fixed'): deduz valor em R$ com trava no total
 * - Verificação de cupom ativo/inativo
 * - Verificação de valor mínimo de pedido
 */

export function normalizeCouponCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function evaluateCoupon(
  rawCouponCode: string | null | undefined,
  subtotal: number,
  shippingCost: number = 0,
  availableCoupons: Coupon[] = DEFAULT_COUPONS
): CouponEvaluation {
  if (!rawCouponCode || !rawCouponCode.trim()) {
    return {
      code: '',
      isValid: false,
      isFreeShipping: false,
      calculatedDiscount: 0,
      message: ''
    };
  }

  const clean = normalizeCouponCode(rawCouponCode);
  const couponList = (availableCoupons && availableCoupons.length > 0) ? availableCoupons : DEFAULT_COUPONS;

  // Busca o cupom na lista de cupons gerenciados pelo administrador
  // Também mapeia variações comuns caso o cupom FRETEGRATIS ou BRINDE exista
  const matchedCoupon = couponList.find(c => {
    const normalizedDbCode = normalizeCouponCode(c.code);
    if (normalizedDbCode === clean) return true;
    
    // Suporte a variações fonéticas se o cupom for de frete grátis
    if (c.type === 'free_shipping' && normalizedDbCode === 'FRETEGRATIS') {
      return ['FRETEGRATIS', 'FRETEZERO', 'ENVIOGRATIS', 'QUEROFRETEGRATIS'].includes(clean);
    }

    // Suporte a variações para o cupom BRINDE
    if (c.type === 'gift' || normalizedDbCode === 'BRINDE') {
      return ['BRINDE', 'MIMOBRINDE', 'BRINDEGRATIS', 'PRESENTE', 'CORTESIA'].includes(clean);
    }

    return false;
  });

  // Garantia direta do cupom oficial BRINDE mesmo se ainda não sincronizado
  if (!matchedCoupon && clean === 'BRINDE') {
    return {
      code: 'BRINDE',
      isValid: true,
      isFreeShipping: true,
      isGift: true,
      calculatedDiscount: subtotal,
      message: '🎁 Cupom BRINDE aplicado com sucesso! Compra 100% Grátis / Cortesia Especial (Valor Total: R$ 0,00).'
    };
  }

  if (!matchedCoupon) {
    // Sugestão dos cupons ativos disponíveis
    const activeHints = couponList
      .filter(c => c.isActive)
      .slice(0, 4)
      .map(c => c.code)
      .join(', ');

    return {
      code: clean,
      isValid: false,
      isFreeShipping: false,
      isGift: false,
      calculatedDiscount: 0,
      message: activeHints 
        ? `Cupom "${clean}" não encontrado. Dica: experimente ${activeHints} ✨`
        : `Cupom "${clean}" não encontrado ou expirado.`
    };
  }

  // Verificar se o cupom está ativo
  if (!matchedCoupon.isActive) {
    return {
      code: matchedCoupon.code,
      isValid: false,
      isFreeShipping: false,
      isGift: false,
      calculatedDiscount: 0,
      message: `O cupom "${matchedCoupon.code}" está temporariamente inativo ou pausado.`
    };
  }

  // 0. Tipo Brinde (Zera 100% dos produtos e do frete -> Compra R$ 0,00)
  if (matchedCoupon.type === 'gift' || clean === 'BRINDE') {
    return {
      code: matchedCoupon.code,
      isValid: true,
      isFreeShipping: true,
      isGift: true,
      calculatedDiscount: subtotal,
      message: `🎁 Cupom ${matchedCoupon.code} aplicado com sucesso! Compra 100% Grátis / Cortesia Especial (Valor Total: R$ 0,00).`
    };
  }

  // Verificar valor mínimo de pedido
  if (matchedCoupon.minOrderValue && matchedCoupon.minOrderValue > 0 && subtotal < matchedCoupon.minOrderValue) {
    const faltam = (matchedCoupon.minOrderValue - subtotal).toFixed(2);
    return {
      code: matchedCoupon.code,
      isValid: false,
      isFreeShipping: false,
      isGift: false,
      calculatedDiscount: 0,
      message: `O cupom "${matchedCoupon.code}" exige pedido mínimo de R$ ${matchedCoupon.minOrderValue.toFixed(2)}. Faltam R$ ${faltam}.`
    };
  }

  // 1. Tipo Frete Grátis
  if (matchedCoupon.type === 'free_shipping') {
    return {
      code: matchedCoupon.code,
      isValid: true,
      isFreeShipping: true,
      calculatedDiscount: 0, // O desconto é aplicado zerando o frete na tela
      message: `🌸 Cupom ${matchedCoupon.code} aplicado com sucesso! Frete Grátis garantido para seu pedido.`
    };
  }

  // 2. Tipo Porcentagem
  if (matchedCoupon.type === 'percentage') {
    const percent = matchedCoupon.discountValue || 0;
    const discount = Math.round(subtotal * (percent / 100) * 100) / 100;
    return {
      code: matchedCoupon.code,
      isValid: true,
      isFreeShipping: false,
      discountPercentage: percent,
      calculatedDiscount: discount,
      message: `✨ Cupom ${matchedCoupon.code} aplicado: ${percent}% de desconto no valor dos mimos!`
    };
  }

  // 3. Tipo Valor Fixo
  if (matchedCoupon.type === 'fixed') {
    const fixedVal = matchedCoupon.discountValue || 0;
    const discount = Math.min(subtotal, fixedVal);
    return {
      code: matchedCoupon.code,
      isValid: true,
      isFreeShipping: false,
      discountFixed: fixedVal,
      calculatedDiscount: discount,
      message: `🎀 Cupom ${matchedCoupon.code} aplicado: R$ ${fixedVal.toFixed(2)} de desconto no seu pedido!`
    };
  }

  return {
    code: clean,
    isValid: false,
    isFreeShipping: false,
    calculatedDiscount: 0,
    message: `Cupom inválido.`
  };
}

