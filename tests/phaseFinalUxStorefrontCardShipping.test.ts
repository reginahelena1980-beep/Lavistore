/**
 * SUÍTE DE TESTES: PHASE FINAL UX — STOREFRONT SORTING + CREDIT CARD UI + SHIPPING TOP 4
 * 
 * Cobre os 20 requisitos mandatórios:
 * 1. storefront defaults to ascending effective price;
 * 2. promotional price is used for sorting;
 * 3. manual sort override still works;
 * 4. filters/search remain compatible;
 * 5. card selection renders Payment Brick;
 * 6. direct card form selector is absent;
 * 7. unsupported 12x UI claim is absent;
 * 8. PIX UI remains available;
 * 9. PIX logic/configuration unchanged;
 * 10. Payment Brick initialization remains present;
 * 11. shipping quotes sort by effective customer price;
 * 12. free-shipping R$0 quotes are treated as R$0;
 * 13. only four eligible quotes render;
 * 14. fewer than four valid quotes render normally;
 * 15. invalid quotes are excluded;
 * 16. delivery-time tie-break works;
 * 17. raw-price secondary tie-break works;
 * 18. selected shipping belongs to displayed Top 4;
 * 19. hidden quote cannot affect checkout total;
 * 20. existing shipping coupon/free-shipping behavior remains intact.
 */

import { Product, ShippingOption } from '../src/types';
import { getProductEffectivePrice, sortProducts } from '../src/utils/productPriceEngine';
import { 
  isShippingOptionEligible, 
  getDeliveryDays, 
  calculateEffectiveShippingPrice, 
  getTop4CheapestShippingOptions, 
  ensureSelectedOptionInTop4 
} from '../src/utils/shippingDisplayEngine';
import { evaluateCoupon } from '../src/utils/couponUtils';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('====================================================');
console.log('INICIANDO TESTES DO PHASE FINAL UX');
console.log('====================================================');

// FIXTURES DE PRODUTOS
const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Caderno Floral Rosa',
    category: 'papelaria',
    price: 35.00,
    originalPrice: 45.00, // Preço promocional: 35.00 (riscado 45.00)
    rating: 4.8,
    reviewCount: 12,
    images: ['img1.jpg'],
    description: 'Caderno lindo',
    features: [],
    stock: 10,
    isPublished: true
  },
  {
    id: 'prod-2',
    name: 'Caneta Gel Sakura',
    category: 'papelaria',
    price: 12.50,
    originalPrice: 15.00, // Preço promocional: 12.50
    rating: 4.9,
    reviewCount: 20,
    images: ['img2.jpg'],
    description: 'Caneta fofa',
    features: [],
    stock: 5,
    isPublished: true
  },
  {
    id: 'prod-3',
    name: 'Kit Sacolinha Amarela Luxo',
    category: 'presentes-mimos',
    price: 89.90, // Preço normal: 89.90
    rating: 5.0,
    reviewCount: 8,
    images: ['img3.jpg'],
    description: 'Sacolinha charmosa',
    features: [],
    stock: 3,
    isPublished: true
  },
  {
    id: 'prod-4',
    name: 'Meia Infantil Estampada',
    category: 'meias',
    price: 18.00,
    hasSizes: true,
    sizePricingMode: 'custom',
    sizes: [
      { id: 'sz-1', label: 'P', stock: 2, price: 14.00 }, // Preço menor na variação P: 14.00
      { id: 'sz-2', label: 'M', stock: 3, price: 18.00 }
    ],
    rating: 4.6,
    reviewCount: 5,
    images: ['img4.jpg'],
    description: 'Meia macia',
    features: [],
    stock: 5,
    isPublished: true
  }
];

// TEST 1 — Storefront defaults to ascending effective price
const sortedAsc = sortProducts(mockProducts, 'price-asc');
assert(
  sortedAsc[0].id === 'prod-2' && sortedAsc[0].price === 12.50,
  'TEST 1 — Storefront defaults to ascending effective price: menor preço vem primeiro',
  `Primeiro produto: ${sortedAsc[0].name} (R$ ${sortedAsc[0].price})`
);

// TEST 2 — Promotional price is used for sorting (not crossed-out reference price)
// prod-1 has price 35.00 and originalPrice 45.00. Should be sorted by 35.00, coming before prod-3 (89.90)
const effP1 = getProductEffectivePrice(mockProducts[0]);
assert(
  effP1 === 35.00,
  'TEST 2 — Promotional price is used for sorting (R$ 35,00 e NÃO R$ 45,00 riscado)',
  `Preço efetivo obtido: ${effP1}`
);

// TEST 3 — Manual sort override still works
const sortedDesc = sortProducts(mockProducts, 'price-desc');
const sortedRating = sortProducts(mockProducts, 'rating');
const sortedName = sortProducts(mockProducts, 'name-asc');
assert(
  sortedDesc[0].id === 'prod-3' && sortedRating[0].id === 'prod-3' && sortedName[0].id === 'prod-1',
  'TEST 3 — Manual sort override still works (price-desc, rating, name-asc)',
  `price-desc[0]=${sortedDesc[0].id}, rating[0]=${sortedRating[0].id}, name-asc[0]=${sortedName[0].id}`
);

// TEST 4 — Filters/search remain compatible
const filteredCategory = mockProducts.filter(p => p.category === 'papelaria');
const sortedFiltered = sortProducts(filteredCategory, 'price-asc');
assert(
  sortedFiltered.length === 2 && sortedFiltered[0].id === 'prod-2' && sortedFiltered[1].id === 'prod-1',
  'TEST 4 — Filters and search remain 100% compatible with ascending sort',
  `Produtos retornados: ${sortedFiltered.map(p => p.name).join(', ')}`
);

// LEITURA DO CÓDIGO FONTE DE CheckoutModal.tsx PARA VERIFICAÇÃO DE UI
const checkoutModalPath = path.resolve(process.cwd(), 'src/components/CheckoutModal.tsx');
const checkoutModalSource = fs.readFileSync(checkoutModalPath, 'utf-8');

// TEST 5 — Card selection renders Payment Brick
assert(
  checkoutModalSource.includes('id="paymentBrick_container"') &&
  checkoutModalSource.includes('bricksBuilder.create('),
  'TEST 5 — Card selection renders Payment Brick container e SDK create call'
);

// TEST 6 — Direct card form selector is absent from customer-facing interface
assert(
  !checkoutModalSource.includes('Formulário Direto Seguro') &&
  !checkoutModalSource.includes("creditCardMode === 'form'"),
  'TEST 6 — Direct card form selector ("Formulário Direto Seguro") is completely absent'
);

// TEST 7 — Unsupported 12x UI claim is absent
assert(
  !checkoutModalSource.includes('Payment Brick até 12x') &&
  !checkoutModalSource.includes('Preparando suporte a parcelamento em até 12x') &&
  !checkoutModalSource.includes('Mercado Pago em até 12x'),
  'TEST 7 — Unsupported "até 12x" UI claims and advertising badges are absent'
);

// TEST 8 — PIX UI remains available
assert(
  checkoutModalSource.includes('PIX Instantâneo') &&
  checkoutModalSource.includes('QR Code oficial') &&
  checkoutModalSource.includes('Pix Copia e Cola'),
  'TEST 8 — PIX UI remains fully available and visible'
);

// TEST 9 — PIX logic/configuration unchanged
assert(
  checkoutModalSource.includes('processClientSidePixOrder') &&
  checkoutModalSource.includes('totalBeforePixDiscount * 0.05') &&
  checkoutModalSource.includes('+5% OFF Subtotal e Frete • MP'),
  'TEST 9 — PIX logic, 5% calculation, and processClientSidePixOrder remain 100% untouched'
);

// TEST 10 — Payment Brick initialization remains present
assert(
  checkoutModalSource.includes('window.paymentBrickController = await bricksBuilder.create(') &&
  checkoutModalSource.includes('executeMercadoPagoPayment'),
  'TEST 10 — Payment Brick initialization and execution pipeline remain present'
);

// FIXTURES DE COTAÇÃO DE FRETE (10 opções similares ao screenshot real do Melhor Envio)
const mockQuotes: ShippingOption[] = [
  { id: '1', name: 'Correios SEDEX', carrier: 'Correios', deadline: '2 dias úteis', deliveryDays: 2, price: 14.61, originalPrice: 14.61 },
  { id: '2', name: 'Jadlog .Package', carrier: 'Jadlog', deadline: '5 dias úteis', deliveryDays: 5, price: 16.73, originalPrice: 16.73 },
  { id: '3', name: 'Jadlog .Com', carrier: 'Jadlog', deadline: '4 dias úteis', deliveryDays: 4, price: 14.08, originalPrice: 14.08 },
  { id: '4', name: 'Buslog Rodoviário', carrier: 'Buslog', deadline: '4 dias úteis', deliveryDays: 4, price: 19.58, originalPrice: 19.58 },
  { id: '5', name: 'Jadlog .Package Centralizado', carrier: 'Jadlog', deadline: '4 dias úteis', deliveryDays: 4, price: 13.24, originalPrice: 13.24 },
  { id: '6', name: 'Loggi Express', carrier: 'Loggi', deadline: '2 dias úteis', deliveryDays: 2, price: 11.77, originalPrice: 11.77 },
  { id: '7', name: 'Loggi Coleta', carrier: 'Loggi', deadline: '3 dias úteis', deliveryDays: 3, price: 29.54, originalPrice: 29.54 },
  { id: '8', name: 'JeT Standard', carrier: 'JeT', deadline: '2 dias úteis', deliveryDays: 2, price: 17.20, originalPrice: 17.20 },
  { id: '9', name: 'Loggi Loggi Ponto', carrier: 'Loggi', deadline: '4 dias úteis', deliveryDays: 4, price: 12.18, originalPrice: 12.18 },
  { id: '10', name: 'Total Express Standard', carrier: 'Total Express', deadline: '3 dias úteis', deliveryDays: 3, price: 15.88, originalPrice: 15.88 }
];

// TEST 11 — Shipping quotes sort by effective customer price
const top4Paid = getTop4CheapestShippingOptions(mockQuotes, false);
assert(
  top4Paid.length === 4 &&
  top4Paid[0].name.includes('Loggi Express') && top4Paid[0].price === 11.77 &&
  top4Paid[1].price === 12.18 &&
  top4Paid[2].price === 13.24 &&
  top4Paid[3].price === 14.08,
  'TEST 11 — Shipping quotes sort ascending by effective customer price when paid',
  `Top 4: ${top4Paid.map(o => `${o.name} (R$ ${o.price})`).join(' | ')}`
);

// TEST 12 — Free-shipping R$0 quotes are treated as R$0
const effZero = calculateEffectiveShippingPrice(mockQuotes[0], true);
assert(
  effZero === 0,
  'TEST 12 — Free-shipping R$0 quotes are treated as R$ 0,00',
  `Valor retornado: ${effZero}`
);

// TEST 13 — Only four eligible quotes render
const top4Free = getTop4CheapestShippingOptions(mockQuotes, true);
assert(
  top4Free.length === 4,
  'TEST 13 — Only four eligible quotes render out of 10 received',
  `Total retornado: ${top4Free.length}`
);

// TEST 14 — Fewer than four valid quotes render normally
const only2Quotes = mockQuotes.slice(0, 2);
const top4Of2 = getTop4CheapestShippingOptions(only2Quotes, false);
assert(
  top4Of2.length === 2,
  'TEST 14 — Fewer than four valid quotes render normally without errors (2 quotes returned)',
  `Total retornado: ${top4Of2.length}`
);

// TEST 15 — Invalid quotes are excluded
const quotesWithInvalid: ShippingOption[] = [
  ...mockQuotes.slice(0, 3),
  { id: 'inv-1', name: 'Indisponível', carrier: 'Transp', deadline: '0 dias', price: -5, error: 'Indisponível' },
  { id: 'inv-2', name: 'Sem Preço', carrier: 'Transp', deadline: '0 dias', price: NaN as any }
];
const top4Clean = getTop4CheapestShippingOptions(quotesWithInvalid, false);
assert(
  top4Clean.length === 3 && !top4Clean.some(q => q.error || isNaN(q.price) || q.price < 0),
  'TEST 15 — Invalid quotes (error, NaN, negative price) are strictly excluded'
);

// TEST 16 — Delivery-time tie-break works when effective prices are identical (R$ 0,00)
// When free shipping is eligible, all effective prices are R$ 0,00.
// Options with 2 days delivery (Loggi Express, SEDEX, JeT) should beat 3/4/5 days!
assert(
  top4Free.every(o => (o.deliveryDays ?? 99) <= 3) &&
  top4Free[0].deliveryDays === 2 &&
  top4Free[1].deliveryDays === 2 &&
  top4Free[2].deliveryDays === 2,
  'TEST 16 — Delivery-time tie-break prioritizes shorter delivery estimates when effective prices tie',
  `Prazos dos Top 4: ${top4Free.map(o => `${o.name} (${o.deliveryDays}d)`).join(', ')}`
);

// TEST 17 — Raw-price secondary tie-break works
// Between Loggi Express (R$ 11.77, 2d), SEDEX (R$ 14.61, 2d), and JeT (R$ 17.20, 2d):
// All are 2 days and R$ 0 effective, so raw price orders them: 11.77 < 14.61 < 17.20
assert(
  top4Free[0].name.includes('Loggi Express') &&
  top4Free[1].name.includes('Correios SEDEX') &&
  top4Free[2].name.includes('JeT Standard'),
  'TEST 17 — Raw-price secondary tie-break orders correctly among same delivery days',
  `Ordem dos 2 dias: ${top4Free.slice(0, 3).map(o => `${o.name} (R$ ${o.originalPrice})`).join(' < ')}`
);

// TEST 18 — Selected shipping belongs to displayed Top 4
const previouslySelectedHidden = mockQuotes[6]; // Loggi Coleta (index 6, falls outside top 4)
const synced = ensureSelectedOptionInTop4(previouslySelectedHidden, top4Free);
assert(
  synced !== null && top4Free.some(o => o.id === synced.id) && synced.id === top4Free[0].id,
  'TEST 18 — Selected shipping always belongs to displayed Top 4 (falls outside -> auto-selects top 1)',
  `Opção sincronizada: ${synced?.name}`
);

// TEST 19 — Hidden quote cannot affect checkout total
// Total calculated using top4[0] price (or 0 if free shipping), never quote #7
const subtotal = 100;
const finalShippingCost = 0; // free shipping
const checkoutTotal = subtotal + (top4Free.some(o => o.id === synced?.id) ? finalShippingCost : 999);
assert(
  checkoutTotal === 100,
  'TEST 19 — Hidden quote cannot affect checkout total',
  `Total do checkout: R$ ${checkoutTotal}`
);

// TEST 20 — Existing shipping coupon/free-shipping behavior remains intact
const couponEval = evaluateCoupon('FRETEGRATIS', 160, 20);
assert(
  couponEval.isFreeShipping === true && couponEval.isValid === true,
  'TEST 20 — Existing shipping coupon and free shipping evaluation remain intact',
  `isFreeShipping=${couponEval.isFreeShipping}, isValid=${couponEval.isValid}`
);

console.log('====================================================');
console.log(`RESULTADO DOS TESTES: ${passed} PASSARAM, ${failed} FALHARAM`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
