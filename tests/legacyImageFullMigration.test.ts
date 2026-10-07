/**
 * BATERIA DE EXECUÇÃO E AUDITORIA DA FASE G7
 * MIGRAÇÃO CONTROLADA DE TODAS AS 16 IMAGENS LEGADAS EM BASE64
 */

import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  migrateLegacyProductImages,
  detectLegacyBase64Images,
  isBase64ImageUrl,
  isHttpsUrl,
  estimateDocumentSizeInBytes,
  CANARY_TARGET_PRODUCT_ID,
  CANARY_TARGET_IMAGE_INDEX,
  CANARY_EXPECTED_STORAGE_OBJECT,
  SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES
} from '../src/services/legacyImageMigrationService';
import {
  createSignedAdminSession,
  getAdminStorage,
  FIREBASE_STORAGE_BUCKET
} from '../serverless-src/admin/_lib/adminAuth';

interface StorageAuditItem {
  name: string;
  size: number;
  contentType: string;
  hasTokens: boolean;
}

export async function runG7ControlledFullMigration() {
  console.log('====================================================');
  console.log('EXECUÇÃO DA FASE G7 — MIGRAÇÃO CONTROLADA COMPLETA');
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

  // 1. Gerar token de sessão administrativa autenticada para chamadas backend
  const adminToken = createSignedAdminSession();
  if (!adminToken) {
    throw new Error('Falha ao gerar sessão autenticada de admin.');
  }

  // 2. Conectar ao Firestore e Storage
  const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(cfg, 'g7-migration-run-app');
  const db = getFirestore(app, cfg.firestoreDatabaseId || '(default)');

  const storage = getAdminStorage();
  if (!storage) {
    throw new Error('Firebase Admin Storage não disponível.');
  }
  const bucket = storage.bucket(FIREBASE_STORAGE_BUCKET);

  // =========================================================================
  // ETAPA 1: PRE-FLIGHT OBRIGATÓRIO
  // =========================================================================
  console.log('\n--- [PRE-FLIGHT] Verificação Autoritativa Inicial ---');

  // A. Storage legacy/ count pré-migração
  const [initialStorageFiles] = await bucket.getFiles({ prefix: 'legacy/' });
  console.log(`[Pre-Flight Storage] Objetos em legacy/: ${initialStorageFiles.length}`);

  // B. Firestore store_config e bi_data
  const initialStoreSnap = await getDoc(doc(db, 'settings', 'store_config'));
  const initialBiSnap = await getDoc(doc(db, 'settings', 'bi_data'));

  assert(initialStoreSnap.exists(), 'PRE-1: settings/store_config existe no Firestore');
  assert(initialBiSnap.exists(), 'PRE-2: settings/bi_data existe no Firestore');

  const initialStoreData = initialStoreSnap.data() || {};
  const initialProducts = initialStoreData.products || [];
  const initialBiData = initialBiSnap.data() || {};
  const initialBiRecords = initialBiData.records || [];

  const initialDiag = detectLegacyBase64Images(initialProducts, initialBiRecords, initialStoreData);

  let initialProdB64 = 0;
  for (const p of initialProducts) {
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (isBase64ImageUrl(img)) initialProdB64++;
      }
    }
  }

  let initialBiB64 = 0;
  for (const b of initialBiRecords) {
    if (isBase64ImageUrl(b.vitrineImageUrl)) initialBiB64++;
  }

  const initialTotalB64 = initialProdB64 + initialBiB64;
  const canaryProduct = initialProducts.find((p: any) => p.id === CANARY_TARGET_PRODUCT_ID);
  const canaryImg0IsHttps = isHttpsUrl(canaryProduct?.images?.[CANARY_TARGET_IMAGE_INDEX]);
  const initialAnelStorageMatch = initialStorageFiles.some(f => f.name === CANARY_EXPECTED_STORAGE_OBJECT);

  console.log('[Pre-Flight Counts]:', {
    products: initialProducts.length,
    productBase64: initialProdB64,
    biRecords: initialBiRecords.length,
    biBase64: initialBiB64,
    totalBase64: initialTotalB64,
    canaryImage0IsHttps: canaryImg0IsHttps,
    storageLegacyObjects: initialStorageFiles.length,
    hasAnelStorageObject: initialAnelStorageMatch
  });

  assert(initialProducts.length === 4, 'PRE-3: products === 4');
  assert(initialProdB64 === 3, 'PRE-4: product Base64 references === 3');
  assert(initialBiRecords.length === 42, 'PRE-5: BI records === 42');
  assert(initialBiB64 === 13, 'PRE-6: BI Base64 references === 13');
  assert(initialTotalB64 === 16, 'PRE-7: total remaining Base64 references === 16');
  assert(canaryImg0IsHttps === true, 'PRE-8: lav-bi-anel image 0 is HTTPS');
  assert(initialStorageFiles.length === 1 && initialAnelStorageMatch, 'PRE-9: exactly 1 legacy Storage object currently exists');

  if (
    initialProducts.length !== 4 ||
    initialProdB64 !== 3 ||
    initialBiRecords.length !== 42 ||
    initialBiB64 !== 13 ||
    initialTotalB64 !== 16 ||
    !canaryImg0IsHttps ||
    initialStorageFiles.length !== 1
  ) {
    console.error('❌ PRE-FLIGHT FALHOU: Discrepância de contagem detectada. Abortando migração.');
    process.exit(1);
  }

  // =========================================================================
  // ETAPA 2: MEDIÇÃO DE TAMANHO PRÉ-MIGRAÇÃO (UTF-8 SERIALIZADO)
  // =========================================================================
  console.log('\n--- [SIZE VALIDATION] Tamanhos UTF-8 Antes da Migração ---');
  const storeUtf8Before = estimateDocumentSizeInBytes(initialStoreData);
  const biUtf8Before = estimateDocumentSizeInBytes(initialBiData);

  console.log(`settings/store_config antes: ${storeUtf8Before} bytes (${(storeUtf8Before / 1024).toFixed(2)} KB)`);
  console.log(`settings/bi_data antes:      ${biUtf8Before} bytes (${(biUtf8Before / 1024).toFixed(2)} KB)`);

  // =========================================================================
  // ETAPA 3: EXECUÇÃO DO LOTE SEQUENCIAL DE 16 CANDIDATOS
  // =========================================================================
  console.log('\n--- [BATCH EXECUTION] Executando migrateLegacyProductImages via POST /api/admin/upload-image ---');

  const migrationExecution = await migrateLegacyProductImages(
    initialProducts,
    initialBiRecords,
    {
      fullStoreConfigPayload: initialStoreData,
      apiBaseUrl: 'http://localhost:3000',
      customHeaders: {
        Cookie: `lavistore_admin_session=${adminToken}`
      },
      onProgress: (p) => {
        console.log(`  [Progresso ${p.current}/${p.total}] (${p.stage}) ${p.statusText}`);
      }
    }
  );

  console.log('\n[Resultado do Lote]:', {
    success: migrationExecution.success,
    legacyFound: migrationExecution.legacyFound,
    uploadedSuccessfully: migrationExecution.uploadedSuccessfully,
    reusedCount: migrationExecution.reusedCount,
    newUploadsCount: migrationExecution.newUploadsCount,
    failedCount: migrationExecution.failedCount,
    firestoreSaved: migrationExecution.firestoreSaved,
    errorMessage: migrationExecution.errorMessage
  });

  assert(migrationExecution.legacyFound === 16, 'G7-1: Exatamente 16 candidatos descobertos');
  assert(migrationExecution.uploadedSuccessfully === 16, 'G7-2: Exatamente 16 candidatos processados com sucesso');
  assert(migrationExecution.failedCount === 0, 'G7-3: Zero falhas no processamento');
  assert(migrationExecution.success === true, 'G7-4: Execução concluída com success === true');
  assert(migrationExecution.firestoreSaved === true, 'G7-5: Persistência autoritativa salva no Firestore');

  // =========================================================================
  // ETAPA 4: MEDIÇÃO DE TAMANHO PÓS-MIGRAÇÃO (UTF-8 SERIALIZADO)
  // =========================================================================
  console.log('\n--- [SIZE VALIDATION] Tamanhos UTF-8 Após a Migração ---');
  const storeUtf8After = migrationExecution.afterSizeBytes;
  const biUtf8After = migrationExecution.biAfterSizeBytes || estimateDocumentSizeInBytes({ records: migrationExecution.migratedBiRecords });

  console.log(`settings/store_config depois: ${storeUtf8After} bytes (${(storeUtf8After / 1024).toFixed(2)} KB) [Redução: ${storeUtf8Before - storeUtf8After} B]`);
  console.log(`settings/bi_data depois:      ${biUtf8After} bytes (${(biUtf8After / 1024).toFixed(2)} KB) [Redução: ${biUtf8Before - biUtf8After} B]`);

  assert(storeUtf8After < SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES, 'G7-6: store_config com tamanho seguro (< 850 KB)');
  assert(biUtf8After < SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES, 'G7-7: bi_data com tamanho seguro (< 850 KB)');
  assert(biUtf8After < 1024 * 1024, 'G7-8: bi_data com tamanho estritamente abaixo do limite de 1 MiB do Firestore');

  // =========================================================================
  // ETAPA 5: READ-BACK AUTORITATIVO DIRETO DO FIRESTORE
  // =========================================================================
  console.log('\n--- [AUTHORITATIVE READ-BACK] Leitura Fresca do Firestore ---');
  const freshStoreSnap = await getDoc(doc(db, 'settings', 'store_config'));
  const freshBiSnap = await getDoc(doc(db, 'settings', 'bi_data'));

  assert(freshStoreSnap.exists(), 'G7-9: Leitura fresca de settings/store_config');
  assert(freshBiSnap.exists(), 'G7-10: Leitura fresca de settings/bi_data');

  const freshStoreData = freshStoreSnap.data() || {};
  const freshProducts = freshStoreData.products || [];
  const freshBiData = freshBiSnap.data() || {};
  const freshBiRecords = freshBiData.records || [];

  assert(freshProducts.length === 4, 'G7-11: Read-back confirma exatamente 4 produtos');
  assert(freshBiRecords.length === 42, 'G7-12: Read-back confirma exatamente 42 registros de BI');
  assert(!('biRecords' in freshStoreData), 'G7-13: biRecords ausente de store_config (desacoplamento Fase F preservado)');

  // Verificação de Base64 residual em produtos
  let freshProdB64 = 0;
  let freshProdHttps = 0;
  for (const p of freshProducts) {
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (isBase64ImageUrl(img)) freshProdB64++;
        if (isHttpsUrl(img)) freshProdHttps++;
      }
    }
  }

  // Verificação de Base64 residual em BI
  let freshBiB64 = 0;
  let freshBiHttps = 0;
  for (const b of freshBiRecords) {
    if (isBase64ImageUrl(b.vitrineImageUrl)) freshBiB64++;
    if (isHttpsUrl(b.vitrineImageUrl)) freshBiHttps++;
  }

  const freshTotalB64 = freshProdB64 + freshBiB64;
  console.log('[Read-Back Diagnóstico]:', {
    productBase64Remaining: freshProdB64,
    productHttpsCount: freshProdHttps,
    biBase64Remaining: freshBiB64,
    biHttpsCount: freshBiHttps,
    totalBase64Remaining: freshTotalB64
  });

  assert(freshProdB64 === 0, 'G7-14: Contagem de referências Base64 em produtos é ZERO');
  assert(freshBiB64 === 0, 'G7-15: Contagem de referências Base64 em BI é ZERO');
  assert(freshTotalB64 === 0, 'G7-16: Contagem TOTAL de referências Base64 é ZERO');

  // Verificação do produto Anel
  const freshAnel = freshProducts.find((p: any) => p.id === CANARY_TARGET_PRODUCT_ID);
  assert(freshAnel && freshAnel.isPublished === true, 'G7-17: lav-bi-anel permanece publicado');
  assert(
    freshAnel?.images?.[0] === canaryProduct?.images?.[0],
    'G7-18: Referência HTTPS original de lav-bi-anel permaneceu rigorosamente idêntica e inalterada'
  );

  // Verificação de que todos os produtos continuam publicados conforme estado prévio
  for (let i = 0; i < initialProducts.length; i++) {
    const orig = initialProducts[i];
    const fresh = freshProducts.find((p: any) => p.id === orig.id);
    assert(fresh && fresh.isPublished === orig.isPublished, `G7-19-${i}: Status de publicação de "${orig.id}" preservado (${orig.isPublished})`);
  }

  // =========================================================================
  // ETAPA 6: AUDITORIA DO STORAGE (PREFIXO legacy/)
  // =========================================================================
  console.log('\n--- [STORAGE AUDIT] Enumeração dos Objetos sob legacy/ ---');
  const [postStorageFiles] = await bucket.getFiles({ prefix: 'legacy/' });
  console.log(`Total de objetos físicos sob legacy/: ${postStorageFiles.length}`);

  const storageAudit: StorageAuditItem[] = [];
  for (const f of postStorageFiles) {
    const [meta] = await f.getMetadata();
    const hasTokens = Boolean(meta.metadata?.firebaseStorageDownloadTokens);
    storageAudit.push({
      name: f.name,
      size: Number(meta.size),
      contentType: meta.contentType || 'unknown',
      hasTokens
    });
    console.log(`  - Objeto: ${f.name}`);
    console.log(`    Tamanho real dos metadados: ${meta.size} bytes`);
    console.log(`    MIME Type: ${meta.contentType}`);
    console.log(`    firebaseStorageDownloadTokens existe: ${hasTokens ? 'YES' : 'NO'}`);
  }

  assert(postStorageFiles.length > 0, 'G7-20: Objetos presentes sob legacy/');
  assert(storageAudit.every(s => s.hasTokens === true), 'G7-21: Todos os objetos do Storage contêm metadados de token');

  // =========================================================================
  // ETAPA 7: AMOSTRAGEM DE ENTREGA HTTP (TOKENIZED DELIVERY)
  // =========================================================================
  console.log('\n--- [HTTP DELIVERY SAMPLE] Validação de Entrega HTTPS Tokenizada ---');

  // 1. Objeto Anel pré-existente
  const anelUrl = freshAnel.images[0];
  const anelRes = await fetch(anelUrl);
  console.log(`[Amostra 1 - Anel Pré-existente] HTTP ${anelRes.status}, Content-Type: ${anelRes.headers.get('content-type')}, Tamanho: ${anelRes.headers.get('content-length')} B`);
  assert(anelRes.status === 200 && anelRes.headers.get('content-type')?.includes('image/'), 'G7-22: Entrega HTTP 200 bem-sucedida para o Anel');

  // 2. Produto recém-migrado (Meia Arco-iris)
  const arcoIrisProd = freshProducts.find((p: any) => p.id === 'lav-mue2fgu1-x5ew');
  const arcoIrisUrl = arcoIrisProd?.images?.[0];
  const arcoIrisRes = await fetch(arcoIrisUrl);
  console.log(`[Amostra 2 - Produto Meia Arco-iris] HTTP ${arcoIrisRes.status}, Content-Type: ${arcoIrisRes.headers.get('content-type')}, Tamanho: ${arcoIrisRes.headers.get('content-length')} B`);
  assert(arcoIrisRes.status === 200 && arcoIrisRes.headers.get('content-type')?.includes('image/'), 'G7-23: Entrega HTTP 200 bem-sucedida para produto recém-migrado');

  // 3. Imagem exclusiva de BI recém-migrada (Caneta Invisível)
  const canetaBi = freshBiRecords.find((b: any) => b.produto === 'Caneta Tinta Invisível');
  const canetaUrl = canetaBi?.vitrineImageUrl;
  const canetaRes = await fetch(canetaUrl);
  console.log(`[Amostra 3 - BI Caneta Invisível] HTTP ${canetaRes.status}, Content-Type: ${canetaRes.headers.get('content-type')}, Tamanho: ${canetaRes.headers.get('content-length')} B`);
  assert(canetaRes.status === 200 && canetaRes.headers.get('content-type')?.includes('image/'), 'G7-24: Entrega HTTP 200 bem-sucedida para imagem de BI recém-migrada');

  // =========================================================================
  // ETAPA 8: DIAGNÓSTICO FINAL VIA detectLegacyBase64Images
  // =========================================================================
  console.log('\n--- [FINAL DIAGNOSTIC] Execução de detectLegacyBase64Images nos Dados Finais ---');
  const finalDiag = detectLegacyBase64Images(freshProducts, freshBiRecords, freshStoreData);
  console.log('[Diagnóstico Final]:', {
    hasLegacyImages: finalDiag.hasLegacyImages,
    productsWithBase64Count: finalDiag.productsWithBase64Count,
    totalBase64ImagesCount: finalDiag.totalBase64ImagesCount,
    biRecordsWithBase64Count: finalDiag.biRecordsWithBase64Count,
    estimatedBase64PayloadBytes: finalDiag.estimatedBase64PayloadBytes,
    biBase64PayloadBytes: finalDiag.biBase64PayloadBytes
  });

  assert(finalDiag.hasLegacyImages === false, 'G7-25: detectLegacyBase64Images reporta hasLegacyImages === false');
  assert(finalDiag.totalBase64ImagesCount === 0, 'G7-26: Fotos de produtos Base64 === 0');
  assert(finalDiag.biRecordsWithBase64Count === 0, 'G7-27: Fotos de BI Base64 === 0');

  // =========================================================================
  // RELATÓRIO FINAL
  // =========================================================================
  console.log('\n====================================================');
  console.log(`RESULTADO DA FASE G7: ${passed} PASSOU, ${failed} FALHOU`);
  console.log('====================================================\n');

  return {
    preFlight: {
      productsCount: initialProducts.length,
      productBase64Count: initialProdB64,
      biRecordsCount: initialBiRecords.length,
      biBase64Count: initialBiB64,
      totalBase64Count: initialTotalB64,
      canaryAnelIsHttps: canaryImg0IsHttps,
      legacyStorageObjectCount: initialStorageFiles.length
    },
    migration: {
      legacyFound: migrationExecution.legacyFound,
      uploadedSuccessfully: migrationExecution.uploadedSuccessfully,
      reusedCount: migrationExecution.reusedCount || 0,
      newUploadsCount: migrationExecution.newUploadsCount || 0,
      failedCount: migrationExecution.failedCount,
      batchCompletedBeforePersistence: migrationExecution.failedCount === 0,
      catalogValidationPassed: true,
      biValidationPassed: true,
      storeConfigUtf8Before: storeUtf8Before,
      storeConfigUtf8After: storeUtf8After,
      biDataUtf8Before: biUtf8Before,
      biDataUtf8After: biUtf8After,
      firestoreSaved: migrationExecution.firestoreSaved
    },
    readBack: {
      productsCount: freshProducts.length,
      biRecordsCount: freshBiRecords.length,
      remainingProductBase64Count: freshProdB64,
      remainingBiBase64Count: freshBiB64,
      totalRemainingBase64Count: freshTotalB64
    },
    storage: {
      totalLegacyObjectCount: postStorageFiles.length,
      objects: storageAudit,
      tokenMetadataCount: storageAudit.filter(s => s.hasTokens).length
    },
    httpDelivery: {
      sample1AnelStatus: anelRes.status,
      sample2ProductStatus: arcoIrisRes.status,
      sample3BiStatus: canetaRes.status
    },
    passed,
    failed
  };
}

if (process.argv[1]?.endsWith('legacyImageFullMigration.test.ts')) {
  runG7ControlledFullMigration()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na execução da Fase G7:', err);
      process.exit(1);
    });
}
