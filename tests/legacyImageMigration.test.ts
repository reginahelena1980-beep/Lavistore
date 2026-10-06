/**
 * BATERIA DE TESTES OBRIGATÓRIOS - FASE E
 * Migração Segura de Imagens Legadas Base64 para Firebase Storage
 */

import { Product, BiProductCalculatedRecord } from '../src/types';
import { 
  migrateLegacyProductImages, 
  detectLegacyBase64Images,
  SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES,
  dataUrlToBlob,
  computeDataUrlHash,
  buildDeterministicStoragePath
} from '../src/services/legacyImageMigrationService';
import { mergeBiRecordsNonDestructive } from '../src/utils/productGroupingEngine';

// Amostra válida de Base64 JPEG de 1x1 pixel
const SAMPLE_BASE64_JPEG_1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const SAMPLE_BASE64_PNG_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SAMPLE_BASE64_WEBP_3 = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

async function runAllTests() {
  console.log('====================================================');
  console.log('INICIANDO EXECUÇÃO DOS 12 TESTES OBRIGATÓRIOS (FASE E)');
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

  // Mock de uploader do Firebase Storage
  const mockStorageUploader = async (blob: Blob, path: string, mimeType: string): Promise<string> => {
    return `https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media&token=test-token`;
  };

  // Mock de Firestore saver
  const mockFirestoreSaverSuccess = async () => true;
  const mockFirestoreSaverFailure = async () => false;

  // ----------------------------------------------------
  // TEST 1: Product with HTTPS image -> migration leaves it completely unchanged
  // ----------------------------------------------------
  try {
    const httpsProd: Product = {
      id: 'prod-https-1',
      name: 'Caneta Decorada Fofa',
      category: 'canetas-marcadores',
      price: 15.9,
      stock: 10,
      rating: 5,
      reviewCount: 3,
      images: ['https://images.unsplash.com/photo-test-1', 'https://images.unsplash.com/photo-test-2'],
      description: 'Caneta fofa',
      features: ['Gel'],
      isPublished: true
    };

    const res1 = await migrateLegacyProductImages([httpsProd], [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    assert(
      res1.legacyFound === 0 &&
      res1.uploadedSuccessfully === 0 &&
      res1.migratedProducts[0].images[0] === 'https://images.unsplash.com/photo-test-1' &&
      res1.migratedProducts[0].images[1] === 'https://images.unsplash.com/photo-test-2',
      'TEST 1: Product with HTTPS image -> migration leaves it completely unchanged'
    );
  } catch (err: any) {
    assert(false, 'TEST 1', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Product with one Base64 image
  // -> image uploads to Firebase Storage
  // -> getDownloadURL returns HTTPS URL
  // -> Product.images contains HTTPS URL
  // ----------------------------------------------------
  try {
    const base64Prod: Product = {
      id: 'prod-b64-1',
      name: 'Caderno de Flores',
      category: 'cadernos-planners',
      price: 49.9,
      stock: 8,
      rating: 5,
      reviewCount: 1,
      images: [SAMPLE_BASE64_JPEG_1],
      description: 'Caderno floral lindo',
      features: ['Capa dura'],
      isPublished: true
    };

    const res2 = await migrateLegacyProductImages([base64Prod], [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    const newUrl = res2.migratedProducts[0].images[0];
    assert(
      res2.legacyFound === 1 &&
      res2.uploadedSuccessfully === 1 &&
      res2.failedCount === 0 &&
      newUrl.startsWith('https://') &&
      !newUrl.startsWith('data:image/'),
      'TEST 2: Product with one Base64 image -> migrated to HTTPS URL'
    );
  } catch (err: any) {
    assert(false, 'TEST 2', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Product with multiple Base64 images
  // -> every image is migrated independently
  // ----------------------------------------------------
  try {
    const multiB64Prod: Product = {
      id: 'prod-multi-1',
      name: 'Kit Mimos Variados',
      category: 'acessorios-mimos',
      price: 89.9,
      stock: 5,
      rating: 5,
      reviewCount: 2,
      images: [SAMPLE_BASE64_JPEG_1, SAMPLE_BASE64_PNG_2, SAMPLE_BASE64_WEBP_3],
      description: 'Kit completo',
      features: ['Mimo especial'],
      isPublished: true
    };

    const uploadedPaths: string[] = [];
    const trackingUploader = async (blob: Blob, path: string, mimeType: string) => {
      uploadedPaths.push(path);
      return `https://firebasestorage.googleapis.com/${path}`;
    };

    const res3 = await migrateLegacyProductImages([multiB64Prod], [], {
      storageUploader: trackingUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    const allHttps = res3.migratedProducts[0].images.every(url => url.startsWith('https://'));
    assert(
      res3.legacyFound === 3 &&
      res3.uploadedSuccessfully === 3 &&
      uploadedPaths.length === 3 &&
      allHttps &&
      new Set(res3.migratedProducts[0].images).size === 3,
      'TEST 3: Product with multiple Base64 images -> each migrated independently'
    );
  } catch (err: any) {
    assert(false, 'TEST 3', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: One Storage upload fails
  // -> original Base64 remains for that image
  // -> other successful images remain migrated in memory
  // -> failure is reported
  // ----------------------------------------------------
  try {
    const failProd: Product = {
      id: 'prod-fail-1',
      name: 'Caneca Floral Dupla',
      category: 'acessorios-mimos',
      price: 42.0,
      stock: 4,
      rating: 4,
      reviewCount: 1,
      images: [SAMPLE_BASE64_JPEG_1, SAMPLE_BASE64_PNG_2],
      description: 'Caneca linda',
      features: ['Porcelana'],
      isPublished: true
    };

    let callCount = 0;
    const partialFailUploader = async (blob: Blob, path: string, mimeType: string) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('STORAGE_TIMEOUT: Erro simulado no segundo upload');
      }
      return `https://firebasestorage.googleapis.com/${path}`;
    };

    const res4 = await migrateLegacyProductImages([failProd], [], {
      storageUploader: partialFailUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    assert(
      res4.uploadedSuccessfully === 1 &&
      res4.failedCount === 1 &&
      res4.failedImages.length === 1 &&
      res4.migratedProducts[0].images[0].startsWith('https://') &&
      res4.migratedProducts[0].images[1] === SAMPLE_BASE64_PNG_2,
      'TEST 4: One Storage upload fails -> Base64 remains for failed image and failure is reported'
    );
  } catch (err: any) {
    assert(false, 'TEST 4', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: BI record references migrated product
  // -> vitrineImageUrl is updated to the corresponding HTTPS URL
  // ----------------------------------------------------
  try {
    const pProd: Product = {
      id: 'prod-bi-sync-1',
      name: 'Planner Anual Florescer',
      category: 'cadernos-planners',
      price: 79.9,
      stock: 12,
      rating: 5,
      reviewCount: 5,
      images: [SAMPLE_BASE64_JPEG_1],
      description: 'Planner floral',
      features: ['12 meses'],
      isPublished: true
    };

    const biRec: BiProductCalculatedRecord = {
      id: 'bi-row-1',
      ano: 2026,
      mes: 'Janeiro',
      produto: 'Planner Anual Florescer',
      tamCor: 'Único',
      descricao: 'Planner floral',
      vitrineProductId: 'prod-bi-sync-1',
      vitrineImageUrl: SAMPLE_BASE64_JPEG_1,
      vitrineCategory: 'cadernos-planners',
      vitrineTag: 'Destaque',
      publishedToVitrine: true,
      autoHideWhenOutOfStock: true,
      quantidadeComprada: 12,
      quantidadeVendida: 0,
      saldoEstoqueQtd: 12,
      custoTotal: 240,
      custoUnitario: 20,
      precoVenda: 79.9,
      vendaTotal: 0,
      custoVenda: 0,
      lucroBruto: 0,
      custoEstoque: 240,
      margemLucro: 74.9,
      markupReal: 299.5,
      faturamentoPlanejado: 958.8,
      lucroPlanejado: 718.8,
      margemPlanejada: 74.9,
      atingimentoMeta: 0,
      rentabilidade: 0,
      statusEstoque: 'ok'
    };

    const res5 = await migrateLegacyProductImages([pProd], [biRec], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    const expectedHttps = res5.migratedProducts[0].images[0];
    const biHttps = res5.migratedBiRecords?.[0].vitrineImageUrl;

    assert(
      biHttps !== undefined &&
      biHttps === expectedHttps &&
      biHttps.startsWith('https://'),
      'TEST 5: BI record references migrated product -> vitrineImageUrl updated to HTTPS URL'
    );
  } catch (err: any) {
    assert(false, 'TEST 5', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Product publication metadata
  // -> isPublished remains unchanged
  // ----------------------------------------------------
  try {
    const pPub: Product = {
      id: 'prod-pub-1',
      name: 'Mimo Ativo',
      category: 'geral',
      price: 25.0,
      stock: 5,
      rating: 5,
      reviewCount: 1,
      images: [SAMPLE_BASE64_JPEG_1],
      description: '',
      features: [],
      isPublished: true
    };

    const pUnpub: Product = {
      id: 'prod-unpub-1',
      name: 'Mimo Pausado',
      category: 'geral',
      price: 30.0,
      stock: 0,
      rating: 4,
      reviewCount: 0,
      images: [SAMPLE_BASE64_PNG_2],
      description: '',
      features: [],
      isPublished: false
    };

    const res6 = await migrateLegacyProductImages([pPub, pUnpub], [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    assert(
      res6.migratedProducts[0].isPublished === true &&
      res6.migratedProducts[1].isPublished === false,
      'TEST 6: Product publication metadata -> isPublished remains strictly unchanged'
    );
  } catch (err: any) {
    assert(false, 'TEST 6', err.message);
  }

  // ----------------------------------------------------
  // TEST 7: BI metadata
  // -> publishedToVitrine, vitrineProductId, category, tag and IDs remain unchanged
  // ----------------------------------------------------
  try {
    const biMetadataTest: BiProductCalculatedRecord = {
      id: 'bi-stable-id-99',
      ano: 2026,
      mes: 'Janeiro',
      produto: 'Caneca Exclusiva Lilás',
      tamCor: 'M',
      descricao: 'Caneca',
      vitrineProductId: 'prod-lilac-99',
      vitrineCategory: 'acessorios-mimos',
      vitrineTag: 'Edição Limitada 💜',
      publishedToVitrine: true,
      autoHideWhenOutOfStock: false,
      vitrineImageUrl: SAMPLE_BASE64_JPEG_1,
      quantidadeComprada: 10,
      quantidadeVendida: 2,
      saldoEstoqueQtd: 8,
      custoTotal: 150,
      custoUnitario: 15,
      precoVenda: 45,
      vendaTotal: 90,
      custoVenda: 30,
      lucroBruto: 60,
      custoEstoque: 120,
      margemLucro: 66.6,
      markupReal: 200,
      faturamentoPlanejado: 450,
      lucroPlanejado: 300,
      margemPlanejada: 66.6,
      atingimentoMeta: 20,
      rentabilidade: 40,
      statusEstoque: 'ok'
    };

    const pLilac: Product = {
      id: 'prod-lilac-99',
      name: 'Caneca Exclusiva Lilás',
      category: 'acessorios-mimos',
      price: 45,
      stock: 8,
      rating: 5,
      reviewCount: 1,
      images: [SAMPLE_BASE64_JPEG_1],
      description: '',
      features: [],
      isPublished: true
    };

    const res7 = await migrateLegacyProductImages([pLilac], [biMetadataTest], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    const mBi = res7.migratedBiRecords![0];
    assert(
      mBi.id === 'bi-stable-id-99' &&
      mBi.vitrineProductId === 'prod-lilac-99' &&
      mBi.vitrineCategory === 'acessorios-mimos' &&
      mBi.vitrineTag === 'Edição Limitada 💜' &&
      mBi.publishedToVitrine === true &&
      mBi.autoHideWhenOutOfStock === false &&
      mBi.quantidadeComprada === 10 &&
      mBi.saldoEstoqueQtd === 8,
      'TEST 7: BI metadata -> publishedToVitrine, vitrineProductId, category, tag and IDs remain unchanged'
    );
  } catch (err: any) {
    assert(false, 'TEST 7', err.message);
  }

  // ----------------------------------------------------
  // TEST 8: Products count before migration === products count after migration
  // ----------------------------------------------------
  try {
    const listProducts: Product[] = Array.from({ length: 7 }, (_, i) => ({
      id: `prod-count-${i}`,
      name: `Mimo Número ${i}`,
      category: 'geral',
      price: 20 + i,
      stock: 5,
      rating: 5,
      reviewCount: 1,
      images: [i % 2 === 0 ? SAMPLE_BASE64_JPEG_1 : 'https://images.unsplash.com/already-https'],
      description: 'Desc',
      features: [],
      isPublished: true
    }));

    const res8 = await migrateLegacyProductImages(listProducts, [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    assert(
      listProducts.length === res8.migratedProducts.length &&
      res8.migratedProducts.length === 7,
      'TEST 8: Products count before migration === products count after migration'
    );
  } catch (err: any) {
    assert(false, 'TEST 8', err.message);
  }

  // ----------------------------------------------------
  // TEST 9: Estimated document size after migration is below safe threshold before attempting Firestore write
  // ----------------------------------------------------
  try {
    const pSizeTest: Product = {
      id: 'prod-size-1',
      name: 'Produto para Teste de Tamanho',
      category: 'geral',
      price: 25.0,
      stock: 10,
      rating: 5,
      reviewCount: 1,
      images: [SAMPLE_BASE64_JPEG_1],
      description: '',
      features: [],
      isPublished: true
    };

    const res9 = await migrateLegacyProductImages([pSizeTest], [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    assert(
      res9.afterSizeBytes < SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES &&
      res9.afterSizeBytes < 1048576,
      `TEST 9: Estimated document size (${res9.afterSizeBytes} B) is safely below 850 KB (${SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES} B)`
    );
  } catch (err: any) {
    assert(false, 'TEST 9', err.message);
  }

  // ----------------------------------------------------
  // TEST 10: Final Firestore save fails -> no false success message is shown
  // ----------------------------------------------------
  try {
    const pSaveFail: Product = {
      id: 'prod-save-fail',
      name: 'Produto Falha Firestore',
      category: 'geral',
      price: 35.0,
      stock: 2,
      rating: 5,
      reviewCount: 0,
      images: [SAMPLE_BASE64_JPEG_1],
      description: '',
      features: [],
      isPublished: true
    };

    const res10 = await migrateLegacyProductImages([pSaveFail], [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverFailure // Simula falha na gravação final
    });

    assert(
      res10.success === false &&
      res10.firestoreSaved === false &&
      res10.errorMessage !== undefined,
      'TEST 10: Final Firestore save fails -> no false success is claimed and error is reported'
    );
  } catch (err: any) {
    assert(false, 'TEST 10', err.message);
  }

  // ----------------------------------------------------
  // TEST 11: Reload after successful migration
  // -> images still appear
  // -> products remain published/unpublished exactly as before
  // ----------------------------------------------------
  try {
    const initialList: Product[] = [
      {
        id: 'p-reload-1',
        name: 'Mimo Publicado',
        category: 'geral',
        price: 29.9,
        stock: 5,
        rating: 5,
        reviewCount: 1,
        images: [SAMPLE_BASE64_JPEG_1],
        description: 'D',
        features: [],
        isPublished: true
      },
      {
        id: 'p-reload-2',
        name: 'Mimo Oculto',
        category: 'geral',
        price: 39.9,
        stock: 0,
        rating: 5,
        reviewCount: 1,
        images: [SAMPLE_BASE64_PNG_2],
        description: 'D',
        features: [],
        isPublished: false
      }
    ];

    const migrationRun = await migrateLegacyProductImages(initialList, [], {
      storageUploader: mockStorageUploader,
      firestoreSaver: mockFirestoreSaverSuccess
    });

    // Simula recarga salvando e re-lendo os produtos serializados
    const serializedState = JSON.stringify(migrationRun.migratedProducts);
    const reloadedProducts: Product[] = JSON.parse(serializedState);

    assert(
      reloadedProducts.length === 2 &&
      reloadedProducts[0].isPublished === true &&
      reloadedProducts[1].isPublished === false &&
      reloadedProducts[0].images[0].startsWith('https://') &&
      reloadedProducts[1].images[0].startsWith('https://'),
      'TEST 11: Reload after migration -> images persist as HTTPS and publication states match'
    );
  } catch (err: any) {
    assert(false, 'TEST 11', err.message);
  }

  // ----------------------------------------------------
  // TEST 12: Synchronize Google Sheets after successful migration
  // -> HTTPS image URLs survive because of the previously implemented non-destructive merge
  // ----------------------------------------------------
  try {
    const existingMigratedBiRecord: BiProductCalculatedRecord = {
      id: 'bi-sheets-sync-1',
      ano: 2026,
      mes: 'Janeiro',
      produto: 'Kit Flores Lavistore',
      tamCor: 'Único',
      descricao: 'Kit Flores',
      vitrineProductId: 'prod-floral-kit-1',
      vitrineImageUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/products/legacy.jpg',
      vitrineCategory: 'acessorios-mimos',
      vitrineTag: 'Mais Vendido 🌸',
      publishedToVitrine: true,
      autoHideWhenOutOfStock: true,
      quantidadeComprada: 20,
      quantidadeVendida: 5,
      saldoEstoqueQtd: 15,
      custoTotal: 300,
      custoUnitario: 15,
      precoVenda: 49.9,
      vendaTotal: 249.5,
      custoVenda: 75,
      lucroBruto: 174.5,
      custoEstoque: 225,
      margemLucro: 69.9,
      markupReal: 232.6,
      faturamentoPlanejado: 998,
      lucroPlanejado: 698,
      margemPlanejada: 69.9,
      atingimentoMeta: 25,
      rentabilidade: 58.1,
      statusEstoque: 'ok'
    };

    // Linha bruta que acabou de ser puxada da planilha Google Sheets (sem campos de vitrine)
    const incomingFromGoogleSheets: BiProductCalculatedRecord = {
      id: 'bi-sheets-sync-1',
      ano: 2026,
      mes: 'Janeiro',
      produto: 'Kit Flores Lavistore',
      tamCor: 'Único',
      descricao: 'Kit Flores',
      quantidadeComprada: 25, // Estoque atualizado na planilha
      quantidadeVendida: 7,
      saldoEstoqueQtd: 18,
      custoTotal: 375,
      custoUnitario: 15,
      precoVenda: 49.9,
      vendaTotal: 349.3,
      custoVenda: 105,
      lucroBruto: 244.3,
      custoEstoque: 270,
      margemLucro: 69.9,
      markupReal: 232.6,
      faturamentoPlanejado: 1247.5,
      lucroPlanejado: 872.5,
      margemPlanejada: 69.9,
      atingimentoMeta: 28,
      rentabilidade: 65.1,
      statusEstoque: 'ok'
    };

    const mergedBi = mergeBiRecordsNonDestructive(
      [incomingFromGoogleSheets],
      [existingMigratedBiRecord]
    );

    assert(
      mergedBi.length === 1 &&
      mergedBi[0].vitrineImageUrl === 'https://firebasestorage.googleapis.com/v0/b/bucket/o/products/legacy.jpg' &&
      mergedBi[0].publishedToVitrine === true &&
      mergedBi[0].vitrineTag === 'Mais Vendido 🌸' &&
      mergedBi[0].saldoEstoqueQtd === 18, // Estoque atualizado da planilha preservando vitrineImageUrl
      'TEST 12: Synchronize Google Sheets after migration -> HTTPS image URLs survive non-destructive merge'
    );
  } catch (err: any) {
    assert(false, 'TEST 12', err.message);
  }

  // ----------------------------------------------------
  // RESUMO FINAL
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`RESULTADO FINAL DOS TESTES: ${passed} PASSOU, ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
