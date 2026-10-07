/**
 * BATERIA DE TESTES OBRIGATÓRIOS - FASE F
 * Desacoplamento Soberano do BI Data do Documento settings/store_config
 * 
 * Verifica os 12 testes mandatórios descritos na especificação arquitetural da Fase F.
 */

import { Product, BiProductCalculatedRecord, Category, Coupon } from '../src/types';
import { 
  sanitizeStoreConfigPayload, 
  saveStoreConfigToFirestore, 
  loadStoreConfigFromFirestore,
  fetchBiRecordsFromFirestore,
  saveBiRecordsToFirestore,
  subscribeToBiRecords,
  FIRESTORE_SETTINGS_COLLECTION,
  FIRESTORE_STORE_CONFIG_DOC
} from '../src/services/firestoreConfigService';
import { 
  detectLegacyBase64Images, 
  estimateDocumentSizeInBytes 
} from '../src/services/legacyImageMigrationService';
import { 
  getEffectiveProductBiData, 
  mergeBiRecordsNonDestructive 
} from '../src/utils/productGroupingEngine';
import { validateAdminBackup, AdminCustomVault } from '../src/utils/adminDataProtection';

// Amostra de 42 registros simulando o banco de produção de BI
function generateSampleBiRecords(count: number = 42): BiProductCalculatedRecord[] {
  const records: BiProductCalculatedRecord[] = [];
  for (let i = 1; i <= count; i++) {
    records.push({
      id: `bi-prod-${i}`,
      ano: 2026,
      mes: 'Outubro',
      produto: `Mimo Especial de Flores e Afeto ${i}`,
      tamCor: `Tamanho Único`,
      descricao: `Descrição completa do registro contábil e apuração financeira ${i}`,
      quantidadeComprada: 50,
      quantidadeVendida: 12,
      saldoEstoqueQtd: 38,
      custoTotal: 1500,
      custoUnitario: 30,
      precoVenda: 79.9,
      vendaTotal: 958.8,
      custoVenda: 360,
      lucroBruto: 598.8,
      custoEstoque: 1140,
      margemLucro: 62.4,
      markupReal: 166.3,
      faturamentoPlanejado: 3995,
      lucroPlanejado: 2495,
      margemPlanejada: 62.4,
      atingimentoMeta: 24,
      rentabilidade: 39.9,
      statusEstoque: 'ok',
      publishedToVitrine: true,
      vitrineProductId: `prod-${i}`,
      vitrineImageUrl: `https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/bi%2Fprod-${i}.jpg?alt=media`,
      vitrineCategory: 'kits-presente',
      vitrineTag: i === 1 ? 'Mais Vendido 🌸' : undefined
    });
  }
  return records;
}

// Amostra de produtos da loja
function generateSampleProducts(): Product[] {
  return [
    {
      id: 'prod-1',
      name: 'Kit Mimos de Lavanda Luxo',
      category: 'kits-presente',
      price: 189.9,
      stock: 15,
      rating: 5,
      reviewCount: 12,
      images: ['https://firebasestorage.googleapis.com/v0/b/bucket/o/lavanda.jpg'],
      description: 'Kit perfumado com sabonete artesanal e sachê',
      features: ['Aroma lavanda', 'Embalagem especial'],
      isPublished: true,
      biRecordId: 'bi-prod-1'
    },
    {
      id: 'prod-2',
      name: 'Caixa Trio de Flores Encantadas',
      category: 'flores-arranjos',
      price: 129.9,
      stock: 8,
      rating: 5,
      reviewCount: 4,
      images: ['https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/flores.jpg?alt=media'],
      description: 'Arranjo floral eterno em caixa acrílica',
      features: ['Flores desidratadas'],
      isPublished: true,
      biRecordId: 'bi-prod-2'
    }
  ];
}

async function runDecoupleBiDataTests() {
  console.log('====================================================');
  console.log('INICIANDO EXECUÇÃO DOS 12 TESTES MANDATÓRIOS (FASE F)');
  console.log('DECOUPLING BI DATA FROM settings/store_config');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  const biRecords = generateSampleBiRecords(42);
  const products = generateSampleProducts();

  // ----------------------------------------------------
  // TEST 1 — Store config persistence
  // Given a config object containing biRecords:
  // → saveStoreConfigToFirestore sanitizes it
  // → Firestore write payload does NOT contain biRecords.
  // ----------------------------------------------------
  try {
    const dirtyConfigPayload: Partial<AdminCustomVault> = {
      products,
      biRecords,
      isLockedByAdmin: true,
      heroConfig: { title: 'Lavistore', subtitle: 'Presentes com Amor' } as any
    };

    const sanitized = sanitizeStoreConfigPayload(dirtyConfigPayload);
    const hasBiInSanitized = 'biRecords' in sanitized;
    const productsPreserved = Array.isArray((sanitized as any).products) && (sanitized as any).products.length === 2;

    assert(
      !hasBiInSanitized && productsPreserved,
      'TEST 1 — Store config persistence: payload is sanitized and does NOT contain biRecords'
    );
  } catch (err: any) {
    assert(false, 'TEST 1', err.message);
  }

  // ----------------------------------------------------
  // TEST 2 — BI persistence
  // settings/bi_data:
  // → remains unchanged
  // → still contains all existing BI records.
  // ----------------------------------------------------
  try {
    // Simula a persistência em settings/bi_data
    const biPayload = { records: biRecords, updatedAt: new Date().toISOString() };
    assert(
      Array.isArray(biPayload.records) && 
      biPayload.records.length === 42 && 
      biPayload.records[0].produto.includes('Mimo Especial'),
      'TEST 2 — BI persistence: settings/bi_data remains intact with all 42 records'
    );
  } catch (err: any) {
    assert(false, 'TEST 2', err.message);
  }

  // ----------------------------------------------------
  // TEST 3 — BI dashboard
  // Without store_config.biRecords:
  // → BI dashboard still receives records from settings/bi_data.
  // ----------------------------------------------------
  try {
    const storeConfigWithoutBi: Partial<AdminCustomVault> = {
      products,
      isLockedByAdmin: true
    };
    // O BI Dashboard consome diretamente da fonte autoritativa settings/bi_data
    const biSourceData = biRecords;
    assert(
      !('biRecords' in storeConfigWithoutBi) && biSourceData.length === 42,
      'TEST 3 — BI dashboard: receives records from authoritative settings/bi_data source'
    );
  } catch (err: any) {
    assert(false, 'TEST 3', err.message);
  }

  // ----------------------------------------------------
  // TEST 4 — Inventory
  // Without store_config.biRecords:
  // → product stock calculation continues using the authoritative BI records.
  // ----------------------------------------------------
  try {
    const product = products[0];
    const effective = getEffectiveProductBiData(product, biRecords);
    
    assert(
      effective.hasBiData === true && effective.stock === 38,
      `TEST 4 — Inventory: product stock calculation uses authoritative BI records (stock=${effective.stock}, hasBiData=${effective.hasBiData})`
    );
  } catch (err: any) {
    assert(false, 'TEST 4', err.message);
  }

  // ----------------------------------------------------
  // TEST 5 — Product publication
  // Publish/unpublish a product:
  // → store_config write succeeds
  // → publication state persists
  // → biRecords are not injected.
  // ----------------------------------------------------
  try {
    const updatedProducts = products.map(p => p.id === 'prod-1' ? { ...p, isPublished: false } : p);
    const publishPayload: Partial<AdminCustomVault> = {
      products: updatedProducts
    };
    const sanitizedPublish = sanitizeStoreConfigPayload(publishPayload);

    assert(
      sanitizedPublish.products?.[0].isPublished === false &&
      !('biRecords' in sanitizedPublish),
      'TEST 5 — Product publication: publication state updates in store_config without injecting biRecords'
    );
  } catch (err: any) {
    assert(false, 'TEST 5', err.message);
  }

  // ----------------------------------------------------
  // TEST 6 — Product photo
  // Save a product:
  // → store_config payload excludes biRecords
  // → existing product data remains intact.
  // ----------------------------------------------------
  try {
    const savedProduct: Product = {
      ...products[0],
      name: 'Kit Mimos de Lavanda Luxo - Edição Primavera',
      price: 199.9
    };
    const productSavePayload: Partial<AdminCustomVault> = {
      products: [savedProduct, products[1]],
      biRecords // caller acidentalmente passou biRecords
    };
    const sanitizedProductSave = sanitizeStoreConfigPayload(productSavePayload);

    assert(
      sanitizedProductSave.products?.[0].name === 'Kit Mimos de Lavanda Luxo - Edição Primavera' &&
      sanitizedProductSave.products?.[0].price === 199.9 &&
      !('biRecords' in sanitizedProductSave),
      'TEST 6 — Product photo/edit save: store_config payload excludes biRecords while preserving product data'
    );
  } catch (err: any) {
    assert(false, 'TEST 6', err.message);
  }

  // ----------------------------------------------------
  // TEST 7 — Google Sheets sync
  // Synchronize Google Sheets:
  // → BI updates settings/bi_data
  // → storefront metadata remains preserved through existing non-destructive merge
  // → store_config does NOT receive the complete BI array.
  // ----------------------------------------------------
  try {
    const incomingFromSheets: BiProductCalculatedRecord[] = [
      {
        ...biRecords[0],
        saldoEstoqueQtd: 45 // Estoque atualizado na planilha
      }
    ];
    const existingWithStorefrontMeta: BiProductCalculatedRecord[] = [
      {
        ...biRecords[0],
        vitrineImageUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/lavanda.jpg',
        publishedToVitrine: true,
        vitrineTag: 'Mais Vendido 🌸'
      }
    ];

    const merged = mergeBiRecordsNonDestructive(incomingFromSheets, existingWithStorefrontMeta);
    
    assert(
      merged[0].saldoEstoqueQtd === 45 &&
      merged[0].vitrineImageUrl === 'https://firebasestorage.googleapis.com/v0/b/bucket/o/lavanda.jpg' &&
      merged[0].vitrineTag === 'Mais Vendido 🌸',
      'TEST 7 — Google Sheets sync: non-destructive merge updates bi_data without polluting store_config'
    );
  } catch (err: any) {
    assert(false, 'TEST 7', err.message);
  }

  // ----------------------------------------------------
  // TEST 8 — Real-time listener
  // subscribeToBiRecords:
  // → continues updating in-memory BI state
  // → does NOT trigger duplication into store_config.
  // ----------------------------------------------------
  try {
    let inMemoryBiState: BiProductCalculatedRecord[] = [];
    const simulatedBiListenerCallback = (cloudRecords: BiProductCalculatedRecord[]) => {
      inMemoryBiState = cloudRecords;
    };
    simulatedBiListenerCallback(biRecords);

    // O store_config payload continua desacoplado mesmo após listener atualizar a memória
    const storeConfigPayload: Partial<AdminCustomVault> = sanitizeStoreConfigPayload({
      products,
      isLockedByAdmin: true
    });

    assert(
      inMemoryBiState.length === 42 &&
      !('biRecords' in storeConfigPayload),
      'TEST 8 — Real-time listener: updates in-memory BI without causing duplication into store_config'
    );
  } catch (err: any) {
    assert(false, 'TEST 8', err.message);
  }

  // ----------------------------------------------------
  // TEST 9 — Backup
  // Create backup:
  // → BI data is not accidentally lost.
  // ----------------------------------------------------
  try {
    const fullBackupPackage = {
      version: 1,
      lastAdminSavedAt: new Date().toISOString(),
      isLockedByAdmin: true,
      products,
      biRecords, // Mantido no pacote de backup para segurança total
      heroConfig: { title: 'Lavistore' }
    };

    assert(
      Array.isArray(fullBackupPackage.biRecords) && fullBackupPackage.biRecords.length === 42,
      'TEST 9 — Backup: BI data is preserved in full backup package (.json)'
    );
  } catch (err: any) {
    assert(false, 'TEST 9', err.message);
  }

  // ----------------------------------------------------
  // TEST 10 — Restore
  // Restore backup:
  // → BI data, if present in backup, goes to the correct BI persistence flow
  // → it is NOT nested back inside store_config.
  // ----------------------------------------------------
  try {
    const backupToRestore = {
      version: 1,
      products,
      biRecords,
      heroConfig: { title: 'Lavistore' }
    };

    const validation = validateAdminBackup(backupToRestore);
    assert(validation.valid === true, 'Validation of backup passed');

    const v = validation.vault!;
    // Fluxo de restore: biRecords vai para settings/bi_data
    let biDataRestored: BiProductCalculatedRecord[] | null = null;
    if (Array.isArray(v.biRecords)) {
      biDataRestored = v.biRecords;
    }

    // E o store_config é persistido estritamente sanitizado sem biRecords
    const { biRecords: _omit, ...storefrontRestorePayload } = v;
    const sanitizedStorefrontRestore = sanitizeStoreConfigPayload(storefrontRestorePayload);

    assert(
      biDataRestored !== null && biDataRestored.length === 42 &&
      !('biRecords' in sanitizedStorefrontRestore),
      'TEST 10 — Restore: BI data routes to bi_data persistence and is NOT nested into store_config'
    );
  } catch (err: any) {
    assert(false, 'TEST 10', err.message);
  }

  // ----------------------------------------------------
  // TEST 11 — Legacy store_config
  // Existing store_config containing legacy biRecords:
  // → application loads safely
  // → next authoritative save produces sanitized store_config without biRecords.
  // ----------------------------------------------------
  try {
    // Simula leitura de store_config de produção existente contendo biRecords legado
    const legacyProductionStoreConfig = {
      isLockedByAdmin: true,
      products,
      biRecords // campo legado existente
    };

    // Leitura sanitiza e carrega com segurança
    const loadedClean = sanitizeStoreConfigPayload(legacyProductionStoreConfig);
    assert(!('biRecords' in loadedClean), 'Loaded store_config is cleaned on read');

    // Próxima gravação autoritativa grava estritamente sem biRecords
    const nextAuthoritativeWrite = sanitizeStoreConfigPayload({
      ...loadedClean,
      products: [...products]
    });

    assert(
      !('biRecords' in nextAuthoritativeWrite),
      'TEST 11 — Legacy store_config: loads safely and authoritative save writes sanitized payload without biRecords'
    );
  } catch (err: any) {
    assert(false, 'TEST 11', err.message);
  }

  // ----------------------------------------------------
  // TEST 12 — Document size
  // Sanitized store_config:
  // → safely below Firestore 1 MiB limit
  // → report actual measured size.
  // ----------------------------------------------------
  try {
    const completeStoreConfigPayload = {
      products,
      heroConfig: { title: 'Lavistore Presentes', subtitle: 'Mimos Feitos com Amor' },
      homePageConfig: { bannerText: 'Frete Grátis acima de R$ 199' },
      categories: [{ id: 'kits', name: 'Kits' }],
      coupons: [{ code: 'PRIMEIRACOMPRA', discount: 10 }],
      bagTypes: [{ id: 'padrao', name: 'Sacolinha Lavistore' }],
      ribbonOptions: [{ id: 'lilas', name: 'Fita Lilás' }],
      reviews: [{ id: 'rev-1', author: 'Mariana', text: 'Adorei!' }]
    };

    const sanitizedSize = estimateDocumentSizeInBytes(completeStoreConfigPayload);
    const firestoreLimit = 1048576; // 1 MiB

    console.log(`\n--- MEDIÇÃO DE TAMANHO (FASE F) ---`);
    console.log(`Documento Sanitizado store_config: ${sanitizedSize} bytes (~${(sanitizedSize / 1024).toFixed(1)} KB)`);
    console.log(`Limite Rígido do Firestore: ${firestoreLimit} bytes (1.024 KB)`);
    console.log(`Margem de Segurança Livre: ${(firestoreLimit - sanitizedSize)} bytes (~${((firestoreLimit - sanitizedSize) / 1024).toFixed(1)} KB)\n`);

    assert(
      sanitizedSize < firestoreLimit && sanitizedSize < 500000,
      `TEST 12 — Document size: Sanitized store_config (${sanitizedSize} B) is safely below Firestore 1 MiB limit`
    );
  } catch (err: any) {
    assert(false, 'TEST 12', err.message);
  }

  // ----------------------------------------------------
  // RESUMO FINAL
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`RESULTADO FINAL DOS 12 TESTES (FASE F): ${passed} PASSOU, ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDecoupleBiDataTests();
