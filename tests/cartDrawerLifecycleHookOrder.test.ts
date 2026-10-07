/**
 * SUÍTE DE TESTES DE REGRESSÃO: CARTDRAWER LIFECYCLE & REACT HOOK ORDER (HOTFIX ERROR #310)
 * 
 * Valida o ciclo completo de renderização do CartDrawer:
 * 1. render CartDrawer with isOpen=false;
 * 2. rerender same component with isOpen=true;
 * 3. no React hook-order error occurs (#310);
 * 4. close again (isOpen=false);
 * 5. reopen again (isOpen=true);
 * 6. no hook-order error occurs;
 * 7. Top 4 shipping behavior remains correct;
 * 8. selected shipping synchronization remains correct.
 */

import { JSDOM } from 'jsdom';

// Configura ambiente DOM simulado antes de carregar o React
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { 
  url: 'http://localhost:3000' 
});

(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CartDrawer } from '../src/components/CartDrawer';
import { CartItem, ShippingOption, Coupon } from '../src/types';
import { getTop4CheapestShippingOptions, ensureSelectedOptionInTop4 } from '../src/utils/shippingDisplayEngine';

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
console.log('INICIANDO TESTES: CARTDRAWER HOOK ORDER & LIFECYCLE');
console.log('====================================================');

const mockItems: CartItem[] = [
  {
    product: {
      id: 'prod-lavanda',
      name: 'Sabonete Artesanal Lavanda Real',
      description: 'Aroma relaxante',
      price: 28.90,
      images: ['https://lavistore.com.br/lavanda.jpg'],
      category: 'sabonetes',
      rating: 5,
      reviewCount: 12,
      features: ['100% natural'],
      stock: 10
    },
    quantity: 2
  }
];

const mockShippingQuotes: ShippingOption[] = [
  { id: 'jad-1', name: 'Jadlog .Package', price: 21.50, deadline: '5 dias úteis', carrier: 'Jadlog' },
  { id: 'jad-2', name: '.Com', price: 24.10, deadline: '3 dias úteis', carrier: 'Jadlog' },
  { id: 'cor-1', name: 'PAC', price: 27.80, deadline: '7 dias úteis', carrier: 'Correios' },
  { id: 'cor-2', name: 'SEDEX', price: 34.00, deadline: '2 dias úteis', carrier: 'Correios' },
  { id: 'jad-3', name: 'Jadlog Expresso', price: 39.90, deadline: '1 dia útil', carrier: 'Jadlog' },
  { id: 'cor-3', name: 'Mini Envios', price: 15.00, deadline: '9 dias úteis', carrier: 'Correios' },
];

async function runCartDrawerLifecycleSuite() {
  const rootEl = dom.window.document.getElementById('root');
  const root = createRoot(rootEl!);

  let currentSelectedOption: ShippingOption | null = null;
  let hookOrderErrors: string[] = [];

  // Captura erros de console / react error boundary
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || JSON.stringify(a)))).join(' ');
    if (msg.includes('Rendered more hooks') || msg.includes('rendered fewer hooks') || msg.includes('310')) {
      hookOrderErrors.push(msg);
    }
    // Suprime mensagens ruidosas esperadas durante testes
    if (!msg.includes('act(...)') && !msg.includes('Rendered more hooks')) {
      originalConsoleError(...args);
    }
  };

  try {
    // 1. RENDER COM isOpen = false
    console.log('\n--- ETAPA 1: Renderizar CartDrawer Fechado (isOpen=false) ---');
    await act(async () => {
      root.render(React.createElement(CartDrawer, {
        isOpen: false,
        onClose: () => {},
        items: mockItems,
        onUpdateQuantity: () => {},
        onRemoveItem: () => {},
        onProceedToCheckout: () => {},
        appliedCoupon: null,
        setAppliedCoupon: () => {},
        discountAmount: 0,
        selectedShippingOption: currentSelectedOption,
        setSelectedShippingOption: (opt) => { currentSelectedOption = opt; }
      }));
    });

    assert(rootEl?.innerHTML === '', 'TEST 1: CartDrawer com isOpen=false retorna null no DOM');
    assert(hookOrderErrors.length === 0, 'TEST 1b: Nenhum erro de hook na montagem fechada');

    // 2. RERENDER COM isOpen = true (ABERTURA DO CARRINHO)
    console.log('\n--- ETAPA 2: Re-renderizar CartDrawer Aberto (isOpen=true) ---');
    await act(async () => {
      root.render(React.createElement(CartDrawer, {
        isOpen: true,
        onClose: () => {},
        items: mockItems,
        onUpdateQuantity: () => {},
        onRemoveItem: () => {},
        onProceedToCheckout: () => {},
        appliedCoupon: null,
        setAppliedCoupon: () => {},
        discountAmount: 0,
        selectedShippingOption: currentSelectedOption,
        setSelectedShippingOption: (opt) => { currentSelectedOption = opt; }
      }));
    });

    assert(rootEl?.innerHTML.includes('Sua Sacola de Mimos') === true, 'TEST 2: CartDrawer aberto renderiza título e conteúdo');
    assert(rootEl?.innerHTML.includes('Sabonete Artesanal Lavanda Real') === true, 'TEST 2b: Item mockado aparece no drawer aberto');
    assert(hookOrderErrors.length === 0, 'TEST 3: SEM ERRO REACT #310 na transição fechado -> aberto');

    // 3. RERENDER COM isOpen = false (FECHAMENTO)
    console.log('\n--- ETAPA 3: Re-renderizar CartDrawer Fechado novamente (isOpen=false) ---');
    await act(async () => {
      root.render(React.createElement(CartDrawer, {
        isOpen: false,
        onClose: () => {},
        items: mockItems,
        onUpdateQuantity: () => {},
        onRemoveItem: () => {},
        onProceedToCheckout: () => {},
        appliedCoupon: null,
        setAppliedCoupon: () => {},
        discountAmount: 0,
        selectedShippingOption: currentSelectedOption,
        setSelectedShippingOption: (opt) => { currentSelectedOption = opt; }
      }));
    });

    assert(rootEl?.innerHTML === '', 'TEST 4: CartDrawer fecha limpo novamente');
    assert(hookOrderErrors.length === 0, 'TEST 4b: Nenhum erro de hook na transição aberto -> fechado');

    // 4. RERENDER COM isOpen = true (REABERTURA DO CARRINHO)
    console.log('\n--- ETAPA 4: Reabrir CartDrawer (isOpen=true) ---');
    await act(async () => {
      root.render(React.createElement(CartDrawer, {
        isOpen: true,
        onClose: () => {},
        items: mockItems,
        onUpdateQuantity: () => {},
        onRemoveItem: () => {},
        onProceedToCheckout: () => {},
        appliedCoupon: null,
        setAppliedCoupon: () => {},
        discountAmount: 0,
        selectedShippingOption: currentSelectedOption,
        setSelectedShippingOption: (opt) => { currentSelectedOption = opt; }
      }));
    });

    assert(rootEl?.innerHTML.includes('Sua Sacola de Mimos') === true, 'TEST 5: CartDrawer reabre com sucesso');
    assert(hookOrderErrors.length === 0, 'TEST 6: SEM ERRO REACT #310 na reabertura do drawer');

    // 5. TESTE DE TOP 4 SHIPPING DISPLAY BEHAVIOR
    console.log('\n--- ETAPA 5: Validação do Top 4 Frete no CartDrawer ---');
    const top4Options = getTop4CheapestShippingOptions(mockShippingQuotes, false);
    assert(top4Options.length === 4, 'TEST 7a: getTop4CheapestShippingOptions retorna estritamente 4 opções de 6');
    assert(top4Options[0].id === 'cor-3', 'TEST 7b: Opção mais barata (Mini Envios R$ 15,00) está em 1º');
    assert(top4Options[1].id === 'jad-1', 'TEST 7c: 2ª opção mais barata (Jadlog .Package R$ 21,50) está em 2º');
    assert(top4Options[2].id === 'jad-2', 'TEST 7d: 3ª opção (Jadlog .Com R$ 24,10) está em 3º');
    assert(top4Options[3].id === 'cor-1', 'TEST 7e: 4ª opção (Correios PAC R$ 27,80) está em 4º');
    assert(!top4Options.some(o => o.id === 'cor-2'), 'TEST 7f: 5ª opção mais cara (SEDEX R$ 34,00) foi excluída do Top 4');
    assert(!top4Options.some(o => o.id === 'jad-3'), 'TEST 7g: 6ª opção mais cara (Jadlog Expresso R$ 39,90) foi excluída do Top 4');

    // 6. TESTE DE SINCRONIZAÇÃO DA OPÇÃO SELECIONADA
    console.log('\n--- ETAPA 6: Validação de Sincronização do Frete Selecionado ---');
    // Caso A: opção já está no Top 4 -> permanece inalterada
    const syncedInTop4 = ensureSelectedOptionInTop4(top4Options[1], top4Options);
    assert(syncedInTop4?.id === 'jad-1', 'TEST 8a: Opção pertencente ao Top 4 permanece selecionada');

    // Caso B: opção fora do Top 4 (ex: SEDEX cor-2) -> sincroniza automaticamente com o Top 1
    const invalidSelected = mockShippingQuotes.find(o => o.id === 'cor-2')!;
    const syncedFallback = ensureSelectedOptionInTop4(invalidSelected, top4Options);
    assert(syncedFallback?.id === 'cor-3', 'TEST 8b: Opção fora do Top 4 é redirecionada para a mais barata do Top 4');

    // Caso C: nenhuma opção selecionada -> seleciona Top 1
    const syncedNull = ensureSelectedOptionInTop4(null, top4Options);
    assert(syncedNull?.id === 'cor-3', 'TEST 8c: Seleção nula é sincronizada com a opção mais barata do Top 4');

    // Caso D: lista vazia -> retorna null sem quebrar
    const syncedEmpty = ensureSelectedOptionInTop4(invalidSelected, []);
    assert(syncedEmpty === null, 'TEST 8d: Lista vazia retorna null de forma segura');

    // 7. VALIDAÇÃO DE FRETE GRÁTIS NO TOP 4
    const top4Free = getTop4CheapestShippingOptions(mockShippingQuotes, true);
    assert(top4Free.length === 4, 'TEST 9a: Com frete grátis, ainda retorna Top 4 opções');
    assert(top4Free.every(o => o.price >= 0), 'TEST 9b: Todas as opções permanecem com atributos válidos');

  } catch (error: any) {
    console.error('FATAL ERROR DURING TEST SUITE:', error);
    failed++;
  } finally {
    console.error = originalConsoleError;
  }

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSARAM, ${failed} FALHARAM`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCartDrawerLifecycleSuite();
