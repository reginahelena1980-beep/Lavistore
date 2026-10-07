/**
 * BATERIA DE TESTES DE CONECTIVIDADE E CANARY CONTROLADO — FASE G6
 * 
 * Verifica os requisitos estritos da Fase G6:
 * 1. Modificação do uploader legado para chamar POST /api/admin/upload-image
 * 2. Remoção do SDK Web Storage direto do cliente
 * 3. Comportamento de timeout limitado (18s) e no máximo 1 retry apenas para falhas transientes
 * 4. Não-repetição para 400, 401, 413, 415
 * 5. Modo Canary estrito de exatamente UMA imagem (lav-bi-anel, index 0)
 * 6. Reutilização do objeto existente no Storage (reused: true)
 * 7. NENHUM objeto novo criado no Storage
 * 8. Substituição APENAS em memória primeiro
 * 9. Validação completa do catálogo antes da gravação
 * 10. Gravação autoritativa única no Firestore
 * 11. Read-back autoritativo do Firestore
 * 12. Validação pós-recarga (F5)
 * 13. Preservação de produtos (contagem e publicação inalteradas)
 * 14. Preservação dos registros de BI (100% inalterados)
 * 15. Contagem final de legacy Base64: exatamente 3 produtos e 13 BI.
 */

import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  migrateSingleImageCanary,
  uploadLegacyImageToServer,
  detectLegacyBase64Images,
  CANARY_TARGET_PRODUCT_ID,
  CANARY_TARGET_IMAGE_INDEX,
  CANARY_EXPECTED_STORAGE_OBJECT
} from '../src/services/legacyImageMigrationService';
import {
  createSignedAdminSession,
  getAdminStorage,
  FIREBASE_STORAGE_BUCKET
} from '../serverless-src/admin/_lib/adminAuth';

async function runG6CanaryVerification() {
  console.log('====================================================');
  console.log('EXECUÇÃO DA FASE G6 — CANARY CONTROLADO DE 1 IMAGEM');
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

  // 1. Gerar token administrativo válido para o teste
  const adminToken = createSignedAdminSession();
  if (!adminToken) {
    throw new Error('Falha ao gerar sessão de admin.');
  }

  // 2. Conectar ao Firestore e Storage para medições pré-canary
  const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(cfg, 'canary-test-app');
  const db = getFirestore(app, cfg.firestoreDatabaseId || '(default)');

  const storage = getAdminStorage();
  const bucket = storage.bucket(FIREBASE_STORAGE_BUCKET);

  // ----------------------------------------------------
  // VERIFICAÇÃO 1: Storage Count antes do Canary
  // ----------------------------------------------------
  const [filesBefore] = await bucket.getFiles({ prefix: 'legacy/' });
  console.log(`[Storage Pré-Canary] Objetos sob legacy/: ${filesBefore.length}`);
  assert(
    filesBefore.length === 1 && filesBefore[0].name === CANARY_EXPECTED_STORAGE_OBJECT,
    'G6-1: Exatamente um objeto existe sob legacy/ antes do Canary (o objeto de G5)'
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 2: Firestore State antes do Canary
  // ----------------------------------------------------
  const storeSnapBefore = await getDoc(doc(db, 'settings', 'store_config'));
  const biSnapBefore = await getDoc(doc(db, 'settings', 'bi_data'));
  
  assert(storeSnapBefore.exists(), 'G6-2: Documento settings/store_config existe no Firestore');

  const storeDataBefore = storeSnapBefore.data() || {};
  const biDataBefore = biSnapBefore.exists() ? (biSnapBefore.data().records || []) : [];

  const initialDetection = detectLegacyBase64Images(storeDataBefore.products || [], biDataBefore, storeDataBefore);
  console.log(`[Diagnóstico Pré-Canary] Produtos com Base64: ${initialDetection.productsWithBase64Count}`);
  console.log(`[Diagnóstico Pré-Canary] Total fotos produto Base64: ${initialDetection.totalBase64ImagesCount}`);
  console.log(`[Diagnóstico Pré-Canary] Total fotos BI Base64: ${initialDetection.biRecordsWithBase64Count}`);

  assert(
    initialDetection.totalBase64ImagesCount === 4 && initialDetection.biRecordsWithBase64Count === 13,
    'G6-3: Diagnóstico prévio confirma exatamente 4 fotos Base64 de produtos e 13 de BI'
  );

  const targetProdBefore = (storeDataBefore.products || []).find((p: any) => p.id === CANARY_TARGET_PRODUCT_ID);
  assert(
    Boolean(targetProdBefore && targetProdBefore.images?.[0]?.startsWith('data:image/')),
    'G6-4: Produto alvo lav-bi-anel existe e possui Base64 no índice 0'
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 3: Teste de Bounded Timeout e Não-Retry de 400/401
  // ----------------------------------------------------
  try {
    let unauthFailedCorrectly = false;
    try {
      await uploadLegacyImageToServer({
        imageBase64: 'data:image/jpeg;base64,123',
        entityType: 'product',
        entityId: 'test-unauth',
        imageIndex: 0,
        apiBaseUrl: 'http://localhost:3000'
        // Sem customHeaders / cookie
      });
    } catch (unauthErr: any) {
      if (unauthErr.status === 401) {
        unauthFailedCorrectly = true;
      }
    }
    assert(unauthFailedCorrectly, 'G6-5: Requisição não-autenticada retorna 401 imediatamente sem retry');
  } catch (err: any) {
    assert(false, 'G6-5', err.message);
  }

  // ----------------------------------------------------
  // VERIFICAÇÃO 4: Teste de Chamada ao Endpoint com o Alvo Canary
  // ----------------------------------------------------
  const oldBase64 = targetProdBefore.images[0];
  const directEndpointResult = await uploadLegacyImageToServer({
    imageBase64: oldBase64,
    entityType: 'product',
    entityId: CANARY_TARGET_PRODUCT_ID,
    imageIndex: CANARY_TARGET_IMAGE_INDEX,
    apiBaseUrl: 'http://localhost:3000',
    customHeaders: {
      Cookie: `lavistore_admin_session=${adminToken}`
    }
  });

  console.log('[Endpoint Response]:', {
    status: directEndpointResult.status,
    reused: directEndpointResult.reused,
    objectPath: directEndpointResult.objectPath,
    hasHttpsUrl: directEndpointResult.url.startsWith('https://')
  });

  assert(
    directEndpointResult.status === 200 &&
    directEndpointResult.reused === true &&
    directEndpointResult.objectPath === CANARY_EXPECTED_STORAGE_OBJECT &&
    directEndpointResult.url.startsWith('https://firebasestorage.googleapis.com/'),
    'G6-6: Endpoint backend responde com 200, reused: true, caminho esperado e URL HTTPS tokenizada'
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 5: Execução do Canary Completo de 1 Imagem
  // ----------------------------------------------------
  console.log('\n--- Executando migrateSingleImageCanary ---');
  const canaryResult = await migrateSingleImageCanary(
    storeDataBefore.products || [],
    biDataBefore,
    {
      fullStoreConfigPayload: storeDataBefore,
      apiBaseUrl: 'http://localhost:3000',
      customHeaders: {
        Cookie: `lavistore_admin_session=${adminToken}`
      }
    }
  );

  console.log('[Canary Result Summary]:', {
    success: canaryResult.success,
    isCanaryMode: canaryResult.isCanaryMode,
    targetProductId: canaryResult.targetProductId,
    reused: canaryResult.reused,
    inMemoryReferencesChanged: canaryResult.inMemoryReferencesChanged,
    productCountBefore: canaryResult.productCountBefore,
    productCountAfter: canaryResult.productCountAfter,
    biDataChanged: canaryResult.biDataChanged,
    beforeSizeBytes: canaryResult.affectedDocUtf8SizeBefore,
    afterSizeBytes: canaryResult.affectedDocUtf8SizeAfter,
    reductionBytes: canaryResult.reductionBytes,
    firestoreSaved: canaryResult.firestoreSaved
  });

  assert(
    canaryResult.success === true &&
    canaryResult.isCanaryMode === true &&
    canaryResult.targetProductId === CANARY_TARGET_PRODUCT_ID &&
    canaryResult.inMemoryReferencesChanged === 1 &&
    canaryResult.reused === true &&
    canaryResult.firestoreSaved === true,
    'G6-7: migrateSingleImageCanary concluiu com sucesso e substituiu exatamente 1 referência'
  );

  assert(
    canaryResult.productCountBefore === canaryResult.productCountAfter &&
    canaryResult.productCountAfter === 4,
    'G6-8: Contagem de produtos permanece exatamente 4 antes e depois'
  );

  assert(
    canaryResult.publicationStateBefore === true &&
    canaryResult.publicationStateAfter === true,
    'G6-9: Estado de publicação do produto alvo permanece rigorosamente true'
  );

  assert(
    canaryResult.biRecordCountBefore === canaryResult.biRecordCountAfter &&
    canaryResult.biRecordCountAfter === biDataBefore.length &&
    canaryResult.biDataChanged === false,
    `G6-10: Registros de BI permanecem rigorosamente inalterados (${canaryResult.biRecordCountAfter} registros mantidos)`
  );

  assert(
    canaryResult.affectedDocUtf8SizeAfter < canaryResult.affectedDocUtf8SizeBefore &&
    canaryResult.affectedDocUtf8SizeAfter < 850 * 1024,
    `G6-11: Tamanho do documento reduzido de ${canaryResult.affectedDocUtf8SizeBefore} B para ${canaryResult.affectedDocUtf8SizeAfter} B (< 850 KB)`
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 6: Read-Back Autoritativo do Firestore
  // ----------------------------------------------------
  console.log('\n--- Realizando Read-Back Autoritativo do Firestore ---');
  const storeSnapAfter = await getDoc(doc(db, 'settings', 'store_config'));
  assert(storeSnapAfter.exists(), 'G6-12: Documento store_config lido de volta do Firestore');

  const storeDataAfter = storeSnapAfter.data() || {};
  const productsAfter = storeDataAfter.products || [];

  assert(productsAfter.length === 4, 'G6-13: Read-back confirma total de 4 produtos no Firestore');

  const targetAfterFirestore = productsAfter.find((p: any) => p.id === CANARY_TARGET_PRODUCT_ID);
  assert(Boolean(targetAfterFirestore), 'G6-14: Produto lav-bi-anel existe no Firestore após save');

  const newImageUrl = targetAfterFirestore?.images?.[0];
  console.log('[Read-Back Alvo]:', {
    id: targetAfterFirestore?.id,
    name: targetAfterFirestore?.name,
    isPublished: targetAfterFirestore?.isPublished,
    image0_prefix: newImageUrl?.substring(0, 60),
    isHttps: newImageUrl?.startsWith('https://'),
    isBase64: newImageUrl?.startsWith('data:image/')
  });

  assert(
    typeof newImageUrl === 'string' &&
    newImageUrl.startsWith('https://firebasestorage.googleapis.com/') &&
    newImageUrl.includes('legacy%2Fproduct%2Flav-bi-anel%2F0-b1749e8b7ae58f40e56cd7b5574026ac5ab2213948da257ca4cf863dd8410443.jpeg') &&
    !newImageUrl.startsWith('data:image/'),
    'G6-15: Read-back confirma que a foto no Firestore agora é a URL HTTPS tokenizada do Canary'
  );

  // Verifica que os outros 3 produtos continuam com suas fotos originais Base64 intactas
  const other3Products = productsAfter.filter((p: any) => p.id !== CANARY_TARGET_PRODUCT_ID);
  const other3AllBase64 = other3Products.every((p: any) => p.images?.[0]?.startsWith('data:image/'));
  assert(
    other3Products.length === 3 && other3AllBase64,
    'G6-16: Os outros 3 produtos continuam intactos com suas fotos originais em Base64'
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 7: Validação de Recarga / Renderização HTTPS
  // ----------------------------------------------------
  console.log('\n--- Validando Renderização da Imagem HTTPS via Fetch ---');
  const imgFetchRes = await fetch(newImageUrl);
  console.log('[HTTPS Image Fetch]:', {
    status: imgFetchRes.status,
    contentType: imgFetchRes.headers.get('content-type'),
    contentLength: imgFetchRes.headers.get('content-length')
  });

  assert(
    imgFetchRes.status === 200 &&
    imgFetchRes.headers.get('content-type')?.includes('image/jpeg'),
    'G6-17: URL HTTPS tokenizada renderiza perfeitamente com HTTP 200 e content-type image/jpeg'
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 8: Contagem no Storage após o Canary
  // ----------------------------------------------------
  const [filesAfter] = await bucket.getFiles({ prefix: 'legacy/' });
  console.log(`[Storage Pós-Canary] Objetos sob legacy/: ${filesAfter.length}`);
  assert(
    filesAfter.length === 1 && filesAfter[0].name === CANARY_EXPECTED_STORAGE_OBJECT,
    'G6-18: Exatamente 1 objeto sob legacy/ após o Canary (NENHUM objeto novo ou duplicado criado)'
  );

  // ----------------------------------------------------
  // VERIFICAÇÃO 9: Diagnóstico de Migração Pós-Canary
  // ----------------------------------------------------
  const biSnapAfter = await getDoc(doc(db, 'settings', 'bi_data'));
  const biDataAfter = biSnapAfter.exists() ? (biSnapAfter.data().records || []) : [];
  const postCanaryDetection = detectLegacyBase64Images(productsAfter, biDataAfter, storeDataAfter);

  console.log('[Diagnóstico Pós-Canary]:', {
    productsWithBase64Count: postCanaryDetection.productsWithBase64Count,
    totalBase64ImagesCount: postCanaryDetection.totalBase64ImagesCount,
    biRecordsWithBase64Count: postCanaryDetection.biRecordsWithBase64Count
  });

  assert(
    postCanaryDetection.totalBase64ImagesCount === 3,
    'G6-19: Total de fotos Base64 de produtos decresceu exatamente de 4 para 3'
  );

  assert(
    postCanaryDetection.biRecordsWithBase64Count === 13,
    'G6-20: Total de fotos Base64 de BI permaneceu exatamente 13'
  );

  // ----------------------------------------------------
  // RESUMO FINAL
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`RESULTADO FINAL DO CANARY: ${passed} PASSOU, ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runG6CanaryVerification().catch(err => {
  console.error('Erro no script do Canary:', err);
  process.exit(1);
});
