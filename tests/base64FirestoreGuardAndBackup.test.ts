/**
 * PHASE H5 TEST SUITE — CENTRALIZED BASE64 FIRESTORE GUARD,
 * BACKUP PROTECTION AND FINAL FRONTEND STORAGE CLEANUP
 *
 * Covers all 23+ required tests:
 * GUARD:
 * 1. valid HTTPS store config passes;
 * 2. heroConfig.image Base64 rejected;
 * 3. products[0].images[0] Base64 rejected;
 * 4. product color imageUrl Base64 rejected;
 * 5. bagTypes[0].image Base64 rejected;
 * 6. nested array Base64 rejected;
 * 7. uppercase/whitespace Data URL variation rejected;
 * 8. ordinary string containing "base64" but not data:image passes;
 * 9. null/undefined values handled safely;
 * 10. valid HTTPS BI image passes;
 * 11. BI Base64 image rejected;
 * 12. error identifies logical path;
 * 13. error does not contain Base64 payload;
 * 14. Firestore write callback is never reached when guard fails.
 *
 * BACKUP:
 * 15. modern HTTPS backup accepted;
 * 16. old product Base64 backup rejected;
 * 17. old hero Base64 backup rejected;
 * 18. old packaging Base64 backup rejected;
 * 19. old BI Base64 backup rejected if BI is part of backup restore;
 * 20. mixed backup containing one unsafe image rejected atomically;
 * 21. zero persistence calls occur after failed pre-validation;
 * 22. error message is user-safe;
 * 23. existing valid backup structure remains compatible.
 *
 * STORAGE CLEANUP:
 * 24. frontend firebase/storage audit verifies zero web storage dependencies.
 */

import {
  isBase64ImageUrl,
  findBase64ImagePath,
  assertNoBase64Images,
  Base64FirestoreGuardError
} from '../src/services/firestoreConfigService';
import {
  validateAdminBackup,
  validateBackupForBase64,
  AdminCustomVault
} from '../src/utils/adminDataProtection';
import fs from 'fs';
import path from 'path';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

const SAMPLE_BASE64_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const SAMPLE_BASE64_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_BASE64_WEBP = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
const SAMPLE_HTTPS_URL = 'https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/admin%2Fproducts%2Flav-01%2Fimages%2F0-abc123.webp?alt=media&token=tok-123';

console.log('====================================================');
console.log('PHASE H5 TEST SUITE — BASE64 FIRESTORE GUARD & BACKUP');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// GUARD TESTS (1 - 14)
// -----------------------------------------------------------------------------

console.log('--- 1. GUARD TESTS ---');

// TEST 1: valid HTTPS store config passes
{
  const validStoreConfig = {
    heroConfig: {
      image: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/admin%2Fbanners%2Fhero%2Fbanner.webp?alt=media',
      title: 'Lavistore Kids',
      subtitle: 'Mimos delicados'
    },
    products: [
      {
        id: 'prod-01',
        name: 'Mimo Fofo',
        images: [SAMPLE_HTTPS_URL],
        colors: [{ name: 'Rosa', hex: '#FF69B4', imageUrl: SAMPLE_HTTPS_URL }]
      }
    ],
    bagTypes: [
      { id: 'bag-kraft', name: 'Sacola Kraft', price: 4.5, image: SAMPLE_HTTPS_URL }
    ]
  };

  let threw = false;
  try {
    assertNoBase64Images(validStoreConfig);
  } catch {
    threw = true;
  }
  assert(!threw, 'TEST 1: valid HTTPS store config passes assertNoBase64Images');
}

// TEST 2: heroConfig.image Base64 rejected
{
  const unsafeHero = {
    heroConfig: {
      image: SAMPLE_BASE64_JPEG,
      title: 'Hero'
    }
  };

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(unsafeHero);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError && caughtError.path === 'heroConfig.image',
    'TEST 2: heroConfig.image Base64 rejected',
    `Expected path "heroConfig.image", got "${caughtError?.path}"`
  );
}

// TEST 3: products[0].images[0] Base64 rejected
{
  const unsafeProduct = {
    products: [
      {
        id: 'prod-01',
        images: [SAMPLE_BASE64_PNG]
      }
    ]
  };

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(unsafeProduct);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError && caughtError.path === 'products[0].images[0]',
    'TEST 3: products[0].images[0] Base64 rejected',
    `Expected path "products[0].images[0]", got "${caughtError?.path}"`
  );
}

// TEST 4: product color imageUrl Base64 rejected
{
  const unsafeColor = {
    products: [
      {
        id: 'prod-01',
        images: [SAMPLE_HTTPS_URL],
        colors: [
          { name: 'Lilás', hex: '#E6E6FA', imageUrl: SAMPLE_BASE64_WEBP }
        ]
      }
    ]
  };

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(unsafeColor);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError && caughtError.path === 'products[0].colors[0].imageUrl',
    'TEST 4: product color imageUrl Base64 rejected',
    `Expected path "products[0].colors[0].imageUrl", got "${caughtError?.path}"`
  );
}

// TEST 5: bagTypes[0].image Base64 rejected
{
  const unsafeBag = {
    bagTypes: [
      { id: 'bag-01', name: 'Sacola Presente', price: 5, image: SAMPLE_BASE64_PNG }
    ]
  };

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(unsafeBag);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError && caughtError.path === 'bagTypes[0].image',
    'TEST 5: bagTypes[0].image Base64 rejected',
    `Expected path "bagTypes[0].image", got "${caughtError?.path}"`
  );
}

// TEST 6: nested array Base64 rejected
{
  const nestedStructure = {
    categories: [
      {
        id: 'cat-1',
        subcategories: [
          {
            gallery: [SAMPLE_HTTPS_URL, SAMPLE_BASE64_JPEG]
          }
        ]
      }
    ]
  };

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(nestedStructure);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError &&
      caughtError.path === 'categories[0].subcategories[0].gallery[1]',
    'TEST 6: nested array Base64 rejected',
    `Expected "categories[0].subcategories[0].gallery[1]", got "${caughtError?.path}"`
  );
}

// TEST 7: uppercase/whitespace Data URL variation rejected
{
  const variationPayload = {
    heroConfig: {
      image: `  DATA:IMAGE/JPEG;BASE64,${SAMPLE_BASE64_JPEG.split(',')[1]}   `
    }
  };

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(variationPayload);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError && caughtError.path === 'heroConfig.image',
    'TEST 7: uppercase and whitespace Data URL variations rejected'
  );
}

// TEST 8: ordinary string containing "base64" but not data:image passes
{
  const nonImageBase64Payload = {
    description: 'This is a description mentioning base64 encoding without data:image prefix',
    sku: 'base64-prod-item-123',
    url: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/base64_encoded_file.png?alt=media',
    notes: 'Base64 is great for transport but not persistent store'
  };

  let threw = false;
  try {
    assertNoBase64Images(nonImageBase64Payload);
  } catch {
    threw = true;
  }

  assert(!threw, 'TEST 8: ordinary string containing "base64" but not data:image passes');
}

// TEST 9: null/undefined values handled safely
{
  const nullUndefinedPayload = {
    heroConfig: null,
    products: undefined,
    categories: [null, undefined, { id: 'c1', name: null }],
    meta: {
      tags: null,
      count: 0,
      active: false
    }
  };

  let threw = false;
  try {
    assertNoBase64Images(nullUndefinedPayload);
    assertNoBase64Images(null);
    assertNoBase64Images(undefined);
  } catch {
    threw = true;
  }

  assert(!threw, 'TEST 9: null/undefined/boolean/number values handled safely without error');
}

// TEST 10: valid HTTPS BI image passes
{
  const validBiRecords = [
    {
      id: 'bi-01',
      produto: 'Caneca Floral Dupla',
      imagem: SAMPLE_HTTPS_URL,
      vitrineImageUrl: SAMPLE_HTTPS_URL,
      precoVenda: 45
    },
    {
      id: 'bi-02',
      produto: 'Almofada Fofa',
      imagem: '',
      precoVenda: 30
    }
  ];

  let threw = false;
  try {
    assertNoBase64Images(validBiRecords);
  } catch {
    threw = true;
  }

  assert(!threw, 'TEST 10: valid HTTPS BI image passes assertNoBase64Images');
}

// TEST 11: BI Base64 image rejected
{
  const unsafeBiRecords = [
    {
      id: 'bi-01',
      produto: 'Caneca Floral Dupla',
      imagem: SAMPLE_HTTPS_URL
    },
    {
      id: 'bi-02',
      produto: 'Almofada Fofa',
      imagem: SAMPLE_BASE64_JPEG
    }
  ];

  let caughtError: Base64FirestoreGuardError | null = null;
  try {
    assertNoBase64Images(unsafeBiRecords);
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof Base64FirestoreGuardError && caughtError.path === '[1].imagem',
    'TEST 11: BI Base64 image rejected with logical path',
    `Expected "[1].imagem", got "${caughtError?.path}"`
  );
}

// TEST 12: error identifies logical path
{
  const deeplyNested = {
    level1: {
      level2: {
        targetArray: [
          { ok: true },
          { badImage: SAMPLE_BASE64_PNG }
        ]
      }
    }
  };

  let errorPath = '';
  try {
    assertNoBase64Images(deeplyNested);
  } catch (err: any) {
    errorPath = err.path;
  }

  assert(
    errorPath === 'level1.level2.targetArray[1].badImage',
    'TEST 12: error accurately identifies deep logical path',
    `Got "${errorPath}"`
  );
}

// TEST 13: error does not contain Base64 payload
{
  const secretOrBase64Test = {
    heroConfig: {
      image: SAMPLE_BASE64_JPEG
    }
  };

  let errorMessage = '';
  try {
    assertNoBase64Images(secretOrBase64Test);
  } catch (err: any) {
    errorMessage = err.message;
  }

  const base64BytesPart = SAMPLE_BASE64_JPEG.split(',')[1].slice(0, 30);
  const containsRawBase64 = errorMessage.includes(base64BytesPart);
  const containsPath = errorMessage.includes('heroConfig.image');
  const containsInstruction = errorMessage.includes('Upload the image to Storage before saving');

  assert(
    !containsRawBase64 && containsPath && containsInstruction,
    'TEST 13: error message does not contain Base64 contents and provides clear diagnostic'
  );
}

// TEST 14: Firestore write callback is never reached when guard fails
{
  let firestoreWriteCallbackInvoked = false;

  const mockSaveToFirestore = async (payload: any) => {
    // Defensive barrier immediately before persistence:
    assertNoBase64Images(payload);
    firestoreWriteCallbackInvoked = true;
    return true;
  };

  let caught = false;
  try {
    await mockSaveToFirestore({
      heroConfig: { image: SAMPLE_BASE64_PNG }
    });
  } catch (err: any) {
    caught = true;
  }

  assert(
    caught && !firestoreWriteCallbackInvoked,
    'TEST 14: Firestore write callback is NEVER reached when guard fails'
  );
}

// -----------------------------------------------------------------------------
// BACKUP TESTS (15 - 23)
// -----------------------------------------------------------------------------

console.log('\n--- 2. BACKUP RESTORE TESTS ---');

// TEST 15: modern HTTPS backup accepted
{
  const modernBackup = {
    version: 1,
    lastAdminSavedAt: new Date().toISOString(),
    isLockedByAdmin: true,
    heroConfig: {
      image: SAMPLE_HTTPS_URL,
      title: 'Lavistore Kids'
    },
    products: [
      {
        id: 'prod-01',
        name: 'Mimo 1',
        images: [SAMPLE_HTTPS_URL],
        colors: [{ name: 'Azul', imageUrl: SAMPLE_HTTPS_URL }]
      }
    ],
    bagTypes: [
      { id: 'bag-1', name: 'Sacola Kraft', price: 4, image: SAMPLE_HTTPS_URL }
    ],
    biRecords: [
      { id: 'bi-1', produto: 'Mimo 1', imagem: SAMPLE_HTTPS_URL }
    ]
  };

  const validation = validateAdminBackup(modernBackup);
  const b64Check = validateBackupForBase64(modernBackup);

  assert(
    validation.valid === true && b64Check.hasBase64 === false && validation.vault !== undefined,
    'TEST 15: modern HTTPS backup accepted by validateAdminBackup'
  );
}

// TEST 16: old product Base64 backup rejected
{
  const oldProductBackup = {
    version: 1,
    products: [
      {
        id: 'legacy-prod-01',
        name: 'Produto Antigo',
        images: [SAMPLE_BASE64_JPEG]
      }
    ]
  };

  const validation = validateAdminBackup(oldProductBackup);
  assert(
    validation.valid === false &&
      validation.hasBase64Images === true &&
      validation.firstBase64Path === 'products[0].images[0]',
    'TEST 16: old product Base64 backup rejected before restore',
    `Expected path "products[0].images[0]", got "${validation.firstBase64Path}"`
  );
}

// TEST 17: old hero Base64 backup rejected
{
  const oldHeroBackup = {
    version: 1,
    heroConfig: {
      image: SAMPLE_BASE64_PNG,
      title: 'Banner Antigo'
    }
  };

  const validation = validateAdminBackup(oldHeroBackup);
  assert(
    validation.valid === false &&
      validation.hasBase64Images === true &&
      validation.firstBase64Path === 'heroConfig.image',
    'TEST 17: old hero Base64 backup rejected before restore',
    `Expected path "heroConfig.image", got "${validation.firstBase64Path}"`
  );
}

// TEST 18: old packaging Base64 backup rejected
{
  const oldPackagingBackup = {
    version: 1,
    bagTypes: [
      {
        id: 'bag-old',
        name: 'Sacola Antiga',
        price: 3,
        image: SAMPLE_BASE64_WEBP
      }
    ]
  };

  const validation = validateAdminBackup(oldPackagingBackup);
  assert(
    validation.valid === false &&
      validation.hasBase64Images === true &&
      validation.firstBase64Path === 'bagTypes[0].image',
    'TEST 18: old packaging Base64 backup rejected before restore',
    `Expected path "bagTypes[0].image", got "${validation.firstBase64Path}"`
  );
}

// TEST 19: old BI Base64 backup rejected if BI is part of backup restore
{
  const oldBiBackup = {
    version: 1,
    biRecords: [
      {
        id: 'bi-old',
        produto: 'Registro Antigo',
        imagem: SAMPLE_BASE64_JPEG
      }
    ]
  };

  const validation = validateAdminBackup(oldBiBackup);
  assert(
    validation.valid === false &&
      validation.hasBase64Images === true &&
      validation.firstBase64Path === 'biRecords[0].imagem',
    'TEST 19: old BI Base64 backup rejected before restore',
    `Expected path "biRecords[0].imagem", got "${validation.firstBase64Path}"`
  );
}

// TEST 20: mixed backup containing one unsafe image rejected atomically
{
  const mixedBackup = {
    version: 1,
    products: [
      { id: 'safe-1', name: 'Safe', images: [SAMPLE_HTTPS_URL] },
      { id: 'safe-2', name: 'Safe 2', images: [SAMPLE_HTTPS_URL] },
      { id: 'unsafe-3', name: 'Unsafe', images: [SAMPLE_HTTPS_URL, SAMPLE_BASE64_PNG] }
    ],
    heroConfig: { image: SAMPLE_HTTPS_URL },
    bagTypes: [{ id: 'b1', name: 'Bag', price: 2, image: SAMPLE_HTTPS_URL }]
  };

  const validation = validateAdminBackup(mixedBackup);
  assert(
    validation.valid === false &&
      validation.hasBase64Images === true &&
      validation.firstBase64Path === 'products[2].images[1]',
    'TEST 20: mixed backup containing one unsafe image rejected atomically'
  );
}

// TEST 21: zero persistence calls occur after failed pre-validation
{
  let persistenceCallCount = 0;
  const mockPersistStoreDoc = async () => {
    persistenceCallCount++;
  };
  const mockPersistBiDoc = async () => {
    persistenceCallCount++;
  };

  // Simulating the handleRestoreFullBackup flow:
  const unsafeBackupPayload = {
    products: [{ id: 'p1', images: [SAMPLE_BASE64_JPEG] }],
    biRecords: [{ id: 'b1', imagem: SAMPLE_HTTPS_URL }]
  };

  const validation = validateAdminBackup(unsafeBackupPayload);
  if (!validation.valid || !validation.vault) {
    // Flow halts immediately, zero persistence calls!
  } else {
    await mockPersistBiDoc();
    await mockPersistStoreDoc();
  }

  assert(
    persistenceCallCount === 0,
    'TEST 21: zero persistence calls occur after failed pre-validation (atomic guarantee: count === 0)'
  );
}

// TEST 22: error message is user-safe
{
  const unsafeBackup = {
    heroConfig: { image: SAMPLE_BASE64_JPEG }
  };

  const validation = validateAdminBackup(unsafeBackup);
  const userMessage = validation.error || '';

  const expectedPortugueseLead = 'Este backup contém imagens antigas incorporadas em Base64 e não pode ser restaurado diretamente.';
  const explainsStorage = userMessage.includes('Firebase Storage');
  const base64BytesPart = SAMPLE_BASE64_JPEG.split(',')[1].slice(0, 30);
  const exposesRawData = userMessage.includes(base64BytesPart);
  const mentionsField = userMessage.includes('heroConfig.image');

  assert(
    userMessage.includes(expectedPortugueseLead) &&
      explainsStorage &&
      !exposesRawData &&
      mentionsField,
    'TEST 22: error message is user-safe, explains storage requirement and does not expose Base64 data'
  );
}

// TEST 23: existing valid backup structure remains compatible
{
  const fullFeaturedBackup = {
    version: 2,
    lastAdminSavedAt: '2026-10-07T12:00:00.000Z',
    isLockedByAdmin: true,
    products: [
      {
        id: 'lav-01',
        name: 'Mimo Teste',
        category: 'Canecas',
        price: 39.9,
        stock: 10,
        images: [SAMPLE_HTTPS_URL],
        isPublished: true,
        colors: [{ name: 'Rosa', hex: '#FF69B4', imageUrl: SAMPLE_HTTPS_URL }]
      }
    ],
    heroConfig: {
      image: SAMPLE_HTTPS_URL,
      title: 'Título',
      subtitle: 'Subtítulo'
    },
    homePageConfig: {
      heroTitle: { text: 'Olá', fontSize: 28, isBold: true }
    },
    categories: [{ id: 'c1', name: 'Canecas', active: true }],
    coupons: [{ code: 'MIMO10', discount: 10, active: true }],
    bagTypes: [{ id: 'bag-1', name: 'Sacola Kraft', price: 4, image: SAMPLE_HTTPS_URL }],
    ribbonOptions: [{ id: 'rib-1', name: 'Fita Lilás', price: 2 }],
    reviews: [{ id: 'rev-1', customerName: 'Maria', rating: 5, comment: 'Amei' }],
    filterBarConfig: { activeCategories: ['Canecas'] },
    biRecords: [
      { id: 'bi-1', produto: 'Mimo Teste', imagem: SAMPLE_HTTPS_URL, vitrineProductId: 'lav-01' }
    ]
  };

  const validation = validateAdminBackup(fullFeaturedBackup);
  assert(
    validation.valid === true &&
      validation.vault !== undefined &&
      validation.vault.products?.length === 1 &&
      validation.vault.biRecords?.length === 1 &&
      validation.vault.heroConfig?.title === 'Título' &&
      validation.vault.coupons?.length === 1,
    'TEST 23: existing valid full backup structure remains 100% compatible'
  );
}

// -----------------------------------------------------------------------------
// FRONTEND WEB STORAGE AUDIT TEST (24)
// -----------------------------------------------------------------------------

console.log('\n--- 3. FRONTEND FIREBASE WEB STORAGE AUDIT ---');

{
  const firebaseServicePath = path.resolve('src/services/firebase.ts');
  const firebaseServiceContent = fs.readFileSync(firebaseServicePath, 'utf-8');

  const importsWebStorage = firebaseServiceContent.includes("from 'firebase/storage'") ||
    firebaseServiceContent.includes('from "firebase/storage"');
  const hasStorageInstance = firebaseServiceContent.includes('storageInstance');
  const hasGetStorageInstance = firebaseServiceContent.includes('getStorageInstance');
  const hasIsFirebaseStorageReady = firebaseServiceContent.includes('isFirebaseStorageReady');

  assert(
    !importsWebStorage && !hasStorageInstance && !hasGetStorageInstance && !hasIsFirebaseStorageReady,
    'TEST 24: obsolete frontend Firebase Web Storage initialization and helpers completely removed from src/services/firebase.ts'
  );
}

console.log('\n====================================================');
console.log(`FINAL RESULT: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('====================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
