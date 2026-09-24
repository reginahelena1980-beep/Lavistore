import { Coupon } from '../types';
import storeState from './store_state.json';

export const DEFAULT_COUPONS: Coupon[] = (storeState && Array.isArray(storeState.coupons) && storeState.coupons.length > 0)
  ? (storeState.coupons as unknown as Coupon[])
  : [
  {
    id: 'coupon-primeiracompra',
    code: 'PRIMEIRACOMPRA',
    description: '10% de desconto de boas-vindas na sua primeira compra!',
    type: 'percentage',
    discountValue: 10,
    minOrderValue: 0,
    isActive: true,
    timesUsed: 0,
    createdAt: '2026-03-01'
  },
  {
    id: 'coupon-fretegratis',
    code: 'FRETEGRATIS',
    description: 'Frete Grátis garantido para todo o Brasil!',
    type: 'free_shipping',
    discountValue: 0,
    minOrderValue: 150,
    isActive: true,
    timesUsed: 0,
    createdAt: '2026-03-01'
  },
  {
    id: 'coupon-florzinha',
    code: 'FLORZINHA',
    description: '15% de desconto especial em toda a loja com muito carinho',
    type: 'percentage',
    discountValue: 15,
    minOrderValue: 0,
    isActive: true,
    timesUsed: 0,
    createdAt: '2026-03-01'
  }
];
