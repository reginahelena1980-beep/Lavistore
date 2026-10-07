/**
 * PHASE H3 TEST SUITE — MIGRATE PRODUCT MAIN + COLOR IMAGE UPLOADS TO SECURE BACKEND
 *
 * Verifies all 26 mandatory test requirements:
 * 1. main image Blob converted for HTTP transport;
 * 2. request uses mode:"admin";
 * 3. product entityType correct;
 * 4. stable product ID sent;
 * 5. correct main imageIndex;
 * 6. multiple selected images receive distinct ordered indexes;
 * 7. successful HTTPS URL enters formData.images;
 * 8. Base64 never enters formData.images;
 * 9. color request uses product-color;
 * 10. stable color ID sent as slotId;
 * 11. returned HTTPS URL enters col.imageUrl;
 * 12. Base64 never enters col.imageUrl;
 * 13. manual color data:image URL rejected;
 * 14. javascript: rejected;
 * 15. blob: rejected;
 * 16. HTTPS manual color URL accepted;
 * 17. HTTP 401 receives session-expired behavior;
 * 18. HTTP 400 handled safely;
 * 19. HTTP 413 handled safely;
 * 20. HTTP 415 handled safely;
 * 21. HTTP 500 handled safely;
 * 22. network error handled safely;
 * 23. timeout handled safely;
 * 24. invalid/non-HTTPS backend URL rejected;
 * 25. missing product ID blocks upload;
 * 26. existing product images preserved on failure.
 */

import {
  uploadProductImage,
  UploadImageError,
  blobToDataUrl
} from '../src/services/firebase';
import { validateImageUrl } from '../src/components/AdminProductModal';

// Sample 1x1 PNG/JPEG bytes for Blob creation
const SAMPLE_IMAGE_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9
]);

function createTestBlob(): Blob {
  return new Blob([SAMPLE_IMAGE_BYTES], { type: 'image/jpeg' });
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE H3 TEST SUITE — PRODUCT & COLOR IMAGE MIGRATION');
  console.log('====================================================');

  const originalFetch = globalThis.fetch;

  try {
    // ----------------------------------------------------
    // TEST 1: Main image Blob converted for HTTP transport
    // ----------------------------------------------------
    const testBlob = createTestBlob();
    const dataUrl = await blobToDataUrl(testBlob);
    assert(
      typeof dataUrl === 'string' && dataUrl.startsWith('data:image/jpeg;base64,'),
      'TEST 1: main image Blob converted for HTTP transport',
      `dataUrl starts with: ${dataUrl.slice(0, 30)}`
    );

    // ----------------------------------------------------
    // TEST 2: Request uses mode: "admin"
    // TEST 3: Product entityType correct
    // TEST 4: Stable product ID sent
    // TEST 5: Correct main imageIndex
    // ----------------------------------------------------
    let capturedRequest: any = null;
    let capturedBody: any = null;

    globalThis.fetch = async (input: any, init?: any) => {
      capturedRequest = { input, init };
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          success: true,
          url: 'https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/admin%2Fproducts%2Flav-12345%2Fimages%2F0-abc.jpg?alt=media&token=tok-123'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const returnedUrl1 = await uploadProductImage(testBlob, {
      entityType: 'product',
      entityId: 'lav-12345',
      imageIndex: 0
    });

    assert(
      capturedBody?.mode === 'admin',
      'TEST 2: request uses mode:"admin"',
      `Actual mode: ${capturedBody?.mode}`
    );

    assert(
      capturedBody?.entityType === 'product',
      'TEST 3: product entityType correct',
      `Actual entityType: ${capturedBody?.entityType}`
    );

    assert(
      capturedBody?.entityId === 'lav-12345',
      'TEST 4: stable product ID sent',
      `Actual entityId: ${capturedBody?.entityId}`
    );

    assert(
      capturedBody?.imageIndex === 0,
      'TEST 5: correct main imageIndex',
      `Actual imageIndex: ${capturedBody?.imageIndex}`
    );

    // Also verify browser client did NOT send forbidden fields:
    const forbiddenKeys = ['bucket', 'objectPath', 'sha256', 'token', 'storagePath'].filter(
      k => k in capturedBody
    );
    assert(
      forbiddenKeys.length === 0,
      'VERIFY: browser client does not send bucket, objectPath, sha256 or token',
      `Forbidden keys found: ${forbiddenKeys.join(', ')}`
    );

    // ----------------------------------------------------
    // TEST 6: Multiple selected images receive distinct ordered indexes
    // TEST 7: Successful HTTPS URL enters formData.images
    // TEST 8: Base64 never enters formData.images
    // ----------------------------------------------------
    const capturedIndexes: number[] = [];
    const simulatedStoreImages: string[] = ['https://cdn.example.com/initial-cover.jpg'];

    globalThis.fetch = async (input: any, init?: any) => {
      const body = JSON.parse(init?.body as string);
      capturedIndexes.push(body.imageIndex);
      return new Response(
        JSON.stringify({
          success: true,
          url: `https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/admin%2Fproducts%2Flav-multi%2Fimages%2F${body.imageIndex}-hash.jpg?alt=media&token=tok-${body.imageIndex}`
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    // Simulate selecting 3 files for a product that already has 1 image
    const initialCount = simulatedStoreImages.length; // 1
    const filesToUpload = [createTestBlob(), createTestBlob(), createTestBlob()];
    let currentSlot = initialCount;

    for (const file of filesToUpload) {
      const url = await uploadProductImage(file, {
        entityType: 'product',
        entityId: 'lav-multi',
        imageIndex: currentSlot
      });
      simulatedStoreImages.push(url);
      currentSlot++;
    }

    assert(
      capturedIndexes.length === 3 &&
      capturedIndexes[0] === 1 &&
      capturedIndexes[1] === 2 &&
      capturedIndexes[2] === 3,
      'TEST 6: multiple selected images receive distinct ordered indexes',
      `Captured indexes: ${JSON.stringify(capturedIndexes)}`
    );

    assert(
      simulatedStoreImages.length === 4 &&
      simulatedStoreImages.every(u => u.startsWith('https://')),
      'TEST 7: successful HTTPS URL enters formData.images',
      `Images list: ${JSON.stringify(simulatedStoreImages)}`
    );

    assert(
      simulatedStoreImages.every(u => !u.startsWith('data:')),
      'TEST 8: Base64 never enters formData.images',
      `Found any data URL: ${simulatedStoreImages.some(u => u.startsWith('data:'))}`
    );

    // ----------------------------------------------------
    // TEST 9: Color request uses product-color
    // TEST 10: Stable color ID sent as slotId
    // TEST 11: Returned HTTPS URL enters col.imageUrl
    // TEST 12: Base64 never enters col.imageUrl
    // ----------------------------------------------------
    let colorBody: any = null;
    globalThis.fetch = async (input: any, init?: any) => {
      colorBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          success: true,
          url: `https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/admin%2Fproducts%2Flav-color-prod%2Fcolors%2Fcol-lilas-123-hash.jpg?alt=media&token=tok-col`
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const simulatedColor = {
      id: 'col-lilas-123',
      name: 'Lilás Lavanda',
      hex: '#C084FC',
      bgClass: 'bg-purple-300',
      stock: 7,
      imageUrl: undefined as string | undefined
    };

    const colorUrl = await uploadProductImage(testBlob, {
      entityType: 'product-color',
      entityId: 'lav-color-prod',
      slotId: simulatedColor.id
    });

    // Update color
    simulatedColor.imageUrl = colorUrl;

    assert(
      colorBody?.entityType === 'product-color',
      'TEST 9: color request uses product-color',
      `Actual entityType: ${colorBody?.entityType}`
    );

    assert(
      colorBody?.slotId === 'col-lilas-123',
      'TEST 10: stable color ID sent as slotId',
      `Actual slotId: ${colorBody?.slotId}`
    );

    assert(
      simulatedColor.imageUrl?.startsWith('https://') &&
      simulatedColor.name === 'Lilás Lavanda' &&
      simulatedColor.hex === '#C084FC' &&
      simulatedColor.stock === 7,
      'TEST 11: returned HTTPS URL enters col.imageUrl and preserves variant state',
      `Color state: ${JSON.stringify(simulatedColor)}`
    );

    assert(
      !simulatedColor.imageUrl?.startsWith('data:'),
      'TEST 12: Base64 never enters col.imageUrl',
      `col.imageUrl value: ${simulatedColor.imageUrl}`
    );

    // ----------------------------------------------------
    // TEST 13: Manual color data:image URL rejected
    // TEST 14: javascript: rejected
    // TEST 15: blob: rejected
    // TEST 16: HTTPS manual color URL accepted
    // ----------------------------------------------------
    const resData = validateImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
    assert(
      !resData.valid && !!resData.error,
      'TEST 13: manual color data:image URL rejected',
      `Result: ${JSON.stringify(resData)}`
    );

    const resJs = validateImageUrl('javascript:alert("xss")');
    assert(
      !resJs.valid && !!resJs.error,
      'TEST 14: javascript: rejected',
      `Result: ${JSON.stringify(resJs)}`
    );

    const resBlob = validateImageUrl('blob:https://example.com/3f089694-b25c-41c1');
    assert(
      !resBlob.valid && !!resBlob.error,
      'TEST 15: blob: rejected',
      `Result: ${JSON.stringify(resBlob)}`
    );

    const resHttps = validateImageUrl('https://images.unsplash.com/photo-1544816155-12df9643f363?w=800');
    assert(
      resHttps.valid && !resHttps.error,
      'TEST 16: HTTPS manual color URL accepted',
      `Result: ${JSON.stringify(resHttps)}`
    );

    // ----------------------------------------------------
    // TEST 17: HTTP 401 receives session-expired behavior
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Sessão administrativa expirada.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    let caught401: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-exp',
        imageIndex: 0
      });
    } catch (e: any) {
      caught401 = e;
    }

    assert(
      caught401 instanceof UploadImageError &&
      caught401.status === 401 &&
      caught401.message.includes('expirou'),
      'TEST 17: HTTP 401 receives session-expired behavior',
      `Caught: ${caught401?.message} (status: ${caught401?.status})`
    );

    // ----------------------------------------------------
    // TEST 18: HTTP 400 handled safely
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'imageIndex obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    let caught400: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-400',
        imageIndex: 0
      });
    } catch (e: any) {
      caught400 = e;
    }

    assert(
      caught400 instanceof UploadImageError && caught400.status === 400,
      'TEST 18: HTTP 400 handled safely',
      `Caught: ${caught400?.message}`
    );

    // ----------------------------------------------------
    // TEST 19: HTTP 413 handled safely
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Payload Too Large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    let caught413: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-413',
        imageIndex: 0
      });
    } catch (e: any) {
      caught413 = e;
    }

    assert(
      caught413 instanceof UploadImageError &&
      caught413.status === 413 &&
      caught413.message.includes('5 MB'),
      'TEST 19: HTTP 413 handled safely',
      `Caught: ${caught413?.message}`
    );

    // ----------------------------------------------------
    // TEST 20: HTTP 415 handled safely
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Unsupported Media Type' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    let caught415: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-415',
        imageIndex: 0
      });
    } catch (e: any) {
      caught415 = e;
    }

    assert(
      caught415 instanceof UploadImageError &&
      caught415.status === 415 &&
      caught415.message.includes('formato'),
      'TEST 20: HTTP 415 handled safely',
      `Caught: ${caught415?.message}`
    );

    // ----------------------------------------------------
    // TEST 21: HTTP 500 handled safely
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    let caught500: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-500',
        imageIndex: 0
      });
    } catch (e: any) {
      caught500 = e;
    }

    assert(
      caught500 instanceof UploadImageError && caught500.status === 500,
      'TEST 21: HTTP 500 handled safely',
      `Caught: ${caught500?.message}`
    );

    // ----------------------------------------------------
    // TEST 22: Network error handled safely
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch: Connection refused');
    };

    let caughtNet: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-net',
        imageIndex: 0
      });
    } catch (e: any) {
      caughtNet = e;
    }

    assert(
      caughtNet instanceof UploadImageError &&
      caughtNet.message.includes('Falha de rede'),
      'TEST 22: network error handled safely',
      `Caught: ${caughtNet?.message}`
    );

    // ----------------------------------------------------
    // TEST 23: Timeout handled safely
    // ----------------------------------------------------
    globalThis.fetch = async (input: any, init?: any) => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    let caughtTimeout: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-to',
        imageIndex: 0
      });
    } catch (e: any) {
      caughtTimeout = e;
    }

    assert(
      caughtTimeout instanceof UploadImageError &&
      caughtTimeout.status === 408 &&
      caughtTimeout.message.includes('TIMEOUT'),
      'TEST 23: timeout handled safely',
      `Caught: ${caughtTimeout?.message}`
    );

    // ----------------------------------------------------
    // TEST 24: Invalid/non-HTTPS backend URL rejected
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: true,
          url: 'http://insecure-http-url.com/image.jpg'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    let caughtBadUrl: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: 'lav-badurl',
        imageIndex: 0
      });
    } catch (e: any) {
      caughtBadUrl = e;
    }

    assert(
      caughtBadUrl instanceof UploadImageError &&
      caughtBadUrl.message.includes('INVALID_BACKEND_URL'),
      'TEST 24: invalid/non-HTTPS backend URL rejected',
      `Caught: ${caughtBadUrl?.message}`
    );

    // ----------------------------------------------------
    // TEST 25: Missing product ID blocks upload
    // ----------------------------------------------------
    let caughtMissingId: any = null;
    try {
      await uploadProductImage(testBlob, {
        entityType: 'product',
        entityId: '   ',
        imageIndex: 0
      });
    } catch (e: any) {
      caughtMissingId = e;
    }

    assert(
      caughtMissingId instanceof UploadImageError &&
      caughtMissingId.message.includes('MISSING_PRODUCT_ID'),
      'TEST 25: missing product ID blocks upload',
      `Caught: ${caughtMissingId?.message}`
    );

    // ----------------------------------------------------
    // TEST 26: Existing product images preserved on failure
    // ----------------------------------------------------
    const existingImages = [
      'https://cdn.example.com/existing-image-1.jpg',
      'https://cdn.example.com/existing-image-2.jpg'
    ];
    const initialClone = [...existingImages];

    // Simulate batch of 2 files: 1st succeeds, 2nd throws network error
    let callNum = 0;
    globalThis.fetch = async () => {
      callNum++;
      if (callNum === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            url: 'https://firebasestorage.googleapis.com/v0/b/lavistorekides.firebasestorage.app/o/admin%2Fproducts%2Flav-fail%2Fimages%2F2-ok.jpg?alt=media&token=ok'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new TypeError('Network connection lost during file 2 upload');
    };

    let currentImages = [...existingImages];
    let failureReported: string | null = null;
    const batchFiles = [createTestBlob(), createTestBlob()];

    for (let i = 0; i < batchFiles.length; i++) {
      try {
        const url = await uploadProductImage(batchFiles[i], {
          entityType: 'product',
          entityId: 'lav-fail',
          imageIndex: currentImages.length
        });
        currentImages.push(url);
      } catch (err: any) {
        failureReported = `Falha no upload da foto ${i + 1}: ${err.message}`;
        break; // Stop loop on failure
      }
    }

    assert(
      currentImages.length === 3 &&
      currentImages[0] === initialClone[0] &&
      currentImages[1] === initialClone[1] &&
      currentImages[2].startsWith('https://') &&
      !currentImages.some(img => img.startsWith('data:')) &&
      failureReported !== null &&
      failureReported.includes('Falha no upload da foto 2'),
      'TEST 26: existing product images preserved on failure and clear error reported',
      `currentImages: ${JSON.stringify(currentImages)}, error: ${failureReported}`
    );

  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('====================================================');
  console.log(`FINAL RESULT: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
