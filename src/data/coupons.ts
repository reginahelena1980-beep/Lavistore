import { Coupon } from '../types';
import storeState from './store_state.json';

export const DEFAULT_COUPONS: Coupon[] = (storeState && Array.isArray(storeState.coupons) && storeState.coupons.length > 0)
  ? (storeState.coupons as unknown as Coupon[])
  : [
  {
    id: 'coupon-frete-gratis',
    code: 'FRETEGRATIS',
    description: 'Frete Grátis garantido para todo o Brasil (zera o valor da transportadora)',
    type: 'free_shipping',
    discountValue: 0,
    minOrderValue: 0,
    isActive: true,
    timesUsed: 142,
    createdAt: '2026-01-15'
  },
  {
    id: 'coupon-lavi10',
    code: 'LAVI10',
    description: '10% de desconto no valor total dos produtos',
    type: 'percentage',
    discountValue: 10,
    minOrderValue: 0,
    isActive: true,
    timesUsed: 98,
    createdAt: '2026-02-01'
  },
  {
    id: 'coupon-florzinha',
    code: 'FLORZINHA',
    description: '15% de desconto especial em toda a loja com muito carinho',
    type: 'percentage',
    discountValue: 15,
    minOrderValue: 0,
    isActive: true,
    timesUsed: 65,
    createdAt: '2026-02-14'
  },
  {
    id: 'coupon-primeira-compra',
    code: 'PRIMEIRACOMPRA',
    description: 'R$ 15,00 de desconto de boas-vindas para pedidos acima de R$ 50,00',
    type: 'fixed',
    discountValue: 15.00,
    minOrderValue: 50.00,
    isActive: true,
    timesUsed: 83,
    createdAt: '2026-03-01'
  }
];
