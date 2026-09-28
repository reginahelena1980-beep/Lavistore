/**
 * TESTE E VALIDAÇÃO DE INTEGRAÇÃO - MELHOR ENVIO PRODUÇÃO
 * =======================================================
 * Executar via terminal:
 *   npx tsx testMelhorEnvioToken.ts
 */

import { DEFAULT_MELHOR_ENVIO_TOKEN } from './melhorEnvioServer';

export const PRODUCTION_TOKEN = DEFAULT_MELHOR_ENVIO_TOKEN;

const BASE_URL = 'https://melhorenvio.com.br';
const USER_AGENT = 'Lavistore Kids (estilobeeadm@gmail.com)';

async function runDiagnostics() {
  console.log('================================================================');
  console.log('🚀 [LAVISTORE] TESTANDO TOKEN OFICIAL DO MELHOR ENVIO (PRODUÇÃO)');
  console.log('================================================================');

  // 1. Testa consulta da conta autenticada
  try {
    console.log('🔍 1. Consultando dados cadastrais da conta (/api/v2/me)...');
    const meRes = await fetch(`${BASE_URL}/api/v2/me`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PRODUCTION_TOKEN}`,
        'User-Agent': USER_AGENT
      }
    });

    if (!meRes.ok) {
      console.error(`❌ Erro ao consultar conta (HTTP ${meRes.status}):`, await meRes.text());
      return;
    }

    const me = await meRes.json();
    console.log('✅ CONTA AUTENTICADA COM SUCESSO:');
    console.log(`   Nome: ${me.firstname} ${me.lastname}`);
    console.log(`   E-mail: ${me.email}`);
    console.log(`   Documento: ${me.document || 'Não cadastrado'}`);
    console.log(`   Saldo na carteira: R$ ${me.balance ?? '0,00'}`);
    console.log('----------------------------------------------------------------');
  } catch (err: any) {
    console.error('❌ Falha na chamada da conta:', err.message);
    return;
  }

  // 2. Testa cotação real de frete
  try {
    console.log('📦 2. Realizando cotação oficial em tempo real (/api/v2/me/shipment/calculate)...');
    console.log('   Origem: 01001-000 (São Paulo, SP)');
    console.log('   Destino: 01310-100 (Av. Paulista, SP)');
    console.log('   Item: Caixa de mimos (16x8x22cm, 0.5kg)');

    const calcRes = await fetch(`${BASE_URL}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PRODUCTION_TOKEN}`,
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify({
        from: { postal_code: '01001000' },
        to: { postal_code: '01310100' },
        products: [
          {
            id: 'lavistore-box-teste',
            width: 16,
            height: 8,
            length: 22,
            weight: 0.5,
            insurance_value: 50.0,
            quantity: 1
          }
        ]
      })
    });

    const rates = await calcRes.json();
    if (!calcRes.ok) {
      console.error(`❌ Erro no cálculo (HTTP ${calcRes.status}):`, rates);
      return;
    }

    if (Array.isArray(rates)) {
      const valid = rates.filter(r => !r.error && (r.price || r.custom_price));
      console.log(`\n🎉 SUCESSO! ${valid.length} opções de frete retornadas pelo Melhor Envio:`);
      valid.forEach(v => {
        const company = v.company?.name || 'Transportadora';
        const price = v.custom_price || v.price;
        const days = v.custom_delivery_time || v.delivery_time;
        console.log(`   🚚 [${company}] ${v.name}: R$ ${price} (Prazo: ${days} dias úteis)`);
      });
      console.log('================================================================');
      console.log('✅ A integração do Melhor Envio em Produção está 100% OPERACIONAL!');
    }
  } catch (err: any) {
    console.error('❌ Falha no teste de cotação:', err.message);
  }
}

// Execução automática via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('testMelhorEnvioToken')) {
  runDiagnostics();
}
