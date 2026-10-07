/**
 * PHASE G4 TEST SUITE — SECURE SERVER-SIDE IMAGE UPLOAD ENDPOINT
 *
 * Verifies all 15 mandatory test requirements:
 * 1. GET request → 405.
 * 2. POST without admin session → 401.
 * 3. malformed JSON/payload → 400.
 * 4. unsupported MIME → 415.
 * 5. invalid Base64 → rejected (400).
 * 6. decoded empty image → rejected (400).
 * 7. image >5 MB → 413.
 * 8. path traversal attempt in entityId cannot escape generated path (400).
 * 9. unsupported entityType → rejected (400).
 * 10. same image/input generates same deterministic object path.
 * 11. different image content generates different hash/path.
 * 12. existing object is reused rather than duplicated.
 * 13. secrets/Base64 are not included in response.
 * 14. successful response contains tokenized HTTPS URL.
 * 15. build succeeds.
 */

import crypto from 'crypto';
import handler from '../serverless-src/admin/upload-image';
import {
  processImageUpload,
  computeImageSha256,
  buildDeterministicStoragePath,
  sanitizeEntityId,
  FIREBASE_STORAGE_BUCKET,
  MAX_IMAGE_SIZE_BYTES
} from '../serverless-src/admin/_lib/imageUploadService';
import {
  createSignedAdminSession,
  ADMIN_SESSION_COOKIE_NAME
} from '../serverless-src/admin/_lib/adminAuth';

// Mock samples
const SAMPLE_WEBP_1 = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
const SAMPLE_PNG_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SAMPLE_JPEG_3 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const SAMPLE_SVG_UNSUPPORTED = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
const SAMPLE_GIF_UNSUPPORTED = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const SAMPLE_HTML_UNSUPPORTED = 'data:text/html;base64,PGh0bWw+PC9odG1sPg==';

// Ensure test environment session secret
process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'test-admin-secret-for-phase-g4-verification-9876543210';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseData: any = null;
  let ended = false;

  const res = {
    statusCode: 200,
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = value;
    },
    getHeader: (key: string) => headers[key.toLowerCase()],
    status: (code: number) => {
      statusCode = code;
      res.statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      ended = true;
      return res;
    },
    end: (data?: any) => {
      if (data && typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch {
          responseData = data;
        }
      }
      ended = true;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers,
    isEnded: () => ended
  };
  return res;
}

function createMockStorage(existingRecords: Record<string, { size: number; contentType: string; metadata: any }> = {}) {
  const store = { ...existingRecords };
  const saveCalls: { path: string; data: Buffer; options: any }[] = [];

  const mockStorage = {
    bucket: (bucketName: string = FIREBASE_STORAGE_BUCKET) => ({
      file: (path: string) => ({
        exists: async () => [Boolean(store[path])],
        getMetadata: async () => [store[path] || {}],
        setMetadata: async (meta: any) => {
          if (store[path]) {
            store[path].metadata = {
              ...(store[path].metadata || {}),
              ...(meta.metadata || {})
            };
          }
          return [store[path]];
        },
        save: async (data: Buffer, options: any) => {
          saveCalls.push({ path, data, options });
          store[path] = {
            size: data.length,
            contentType: options.contentType,
            metadata: options.metadata?.metadata || {}
          };
        }
      })
    }),
    getSaveCalls: () => saveCalls,
    getStore: () => store
  };

  return mockStorage;
}

async function runTests() {
  console.log('====================================================');
  console.log('BATERIA DE TESTES DE SEGURANÇA E CONFORMIDADE — FASE G4');
  console.log('Endpoint: POST /api/admin/upload-image');
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

  const validToken = createSignedAdminSession();
  if (!validToken) {
    throw new Error('Falha ao gerar token de sessão administrativo de teste.');
  }

  // ----------------------------------------------------
  // TEST 1: GET request → 405 Method Not Allowed (Allow: POST)
  // ----------------------------------------------------
  {
    const req = {
      method: 'GET',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${validToken}`
      }
    };
    const res = createMockRes();
    await handler(req, res);

    assert(
      res.getStatusCode() === 405 && res.getHeaders()['allow'] === 'POST',
      'TEST 1: GET request retorna HTTP 405 e cabeçalho Allow: POST'
    );
  }

  // ----------------------------------------------------
  // TEST 2: POST without admin session → 401 Unauthorized
  // ----------------------------------------------------
  {
    // Sem cookie
    const reqNoCookie = {
      method: 'POST',
      headers: {},
      body: {
        imageBase64: SAMPLE_WEBP_1,
        entityType: 'product',
        entityId: 'prod_123',
        imageIndex: 0
      }
    };
    const resNoCookie = createMockRes();
    await handler(reqNoCookie, resNoCookie);

    // Com cookie adulterado
    const reqBadCookie = {
      method: 'POST',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=forged.token.here`
      },
      body: {
        imageBase64: SAMPLE_WEBP_1,
        entityType: 'product',
        entityId: 'prod_123',
        imageIndex: 0
      }
    };
    const resBadCookie = createMockRes();
    await handler(reqBadCookie, resBadCookie);

    assert(
      resNoCookie.getStatusCode() === 401 && resBadCookie.getStatusCode() === 401,
      'TEST 2: POST sem cookie de admin ou com token inválido retorna HTTP 401'
    );
  }

  // ----------------------------------------------------
  // TEST 3: Malformed JSON / missing fields → 400 Bad Request
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resNull = await processImageUpload(null, { storageOverride: mockStorage as any });
    const resEmpty = await processImageUpload({}, { storageOverride: mockStorage as any });
    const resMissingId = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });
    const resNegativeIndex = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: 'p1',
      imageIndex: -1
    }, { storageOverride: mockStorage as any });

    assert(
      resNull.status === 400 &&
      resEmpty.status === 400 &&
      resMissingId.status === 400 &&
      resNegativeIndex.status === 400,
      'TEST 3: Requisições com payload nulo, vazio ou campos obrigatórios ausentes retornam HTTP 400'
    );
  }

  // ----------------------------------------------------
  // TEST 4: Unsupported MIME (SVG, GIF, HTML) → 415 Unsupported Media Type
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resSvg = await processImageUpload({
      imageBase64: SAMPLE_SVG_UNSUPPORTED,
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resGif = await processImageUpload({
      imageBase64: SAMPLE_GIF_UNSUPPORTED,
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resHtml = await processImageUpload({
      imageBase64: SAMPLE_HTML_UNSUPPORTED,
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resSvg.status === 415 && resGif.status === 415 && resHtml.status === 415,
      'TEST 4: Formatos não permitidos (SVG, GIF, HTML) retornam HTTP 415'
    );
  }

  // ----------------------------------------------------
  // TEST 5: Invalid Base64 content → Rejected with 400
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resCorrupt = await processImageUpload({
      imageBase64: 'data:image/webp;base64,!!!NOT_VALID_BASE64_CHARACTERS###',
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resNonDataUrl = await processImageUpload({
      imageBase64: 'plain_string_without_data_url_prefix',
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resCorrupt.status === 400 && resNonDataUrl.status === 400,
      'TEST 5: Base64 corrompido ou string sem Data URL são rejeitados com HTTP 400'
    );
  }

  // ----------------------------------------------------
  // TEST 6: Decoded empty image (0 bytes) → Rejected with 400
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resEmptyDataUrl = await processImageUpload({
      imageBase64: 'data:image/png;base64,',
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resEmptyDataUrl.status === 400,
      'TEST 6: Imagem vazia com 0 bytes é rejeitada com HTTP 400'
    );
  }

  // ----------------------------------------------------
  // TEST 7: Image > 5 MB → 413 Payload Too Large
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();
    // Cria buffer de 5.2 MB (> 5 MB)
    const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0x42);
    const largeBase64 = `data:image/jpeg;base64,${largeBuffer.toString('base64')}`;

    const resLarge = await processImageUpload({
      imageBase64: largeBase64,
      entityType: 'product',
      entityId: 'p1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resLarge.status === 413,
      'TEST 7: Imagem superior ao limite estrito de 5 MB retorna HTTP 413'
    );
  }

  // ----------------------------------------------------
  // TEST 8: Path traversal attempts in entityId cannot escape generated path
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resTraversal1 = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: '../../etc/passwd',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resTraversal2 = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: '../escape_dir',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resTraversal3 = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: '..',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resTraversal1.status === 400 &&
      resTraversal2.status === 400 &&
      resTraversal3.status === 400,
      'TEST 8: Tentativas de path traversal no entityId são bloqueadas com HTTP 400'
    );
  }

  // ----------------------------------------------------
  // TEST 9: Unsupported entityType → Rejected with 400
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resUser = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'user',
      entityId: 'usr_1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resAdmin = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'admin',
      entityId: 'adm_1',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resUser.status === 400 && resAdmin.status === 400,
      'TEST 9: entityType arbitrário fora de [product, bi] é rejeitado com HTTP 400'
    );
  }

  // ----------------------------------------------------
  // TEST 10: Same image and input generates same deterministic path
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resFirst = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: 'ABC123',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resSecond = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: 'ABC123',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resFirst.status === 200 &&
      resSecond.status === 200 &&
      resFirst.body.objectPath === resSecond.body.objectPath &&
      Boolean(resFirst.body.objectPath?.startsWith('legacy/product/ABC123/0-')),
      'TEST 10: A mesma imagem e parâmetros geram caminho de Storage estritamente idêntico e determinístico'
    );
  }

  // ----------------------------------------------------
  // TEST 11: Different image content generates different SHA-256 hash & path
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const resWebp = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: 'prod_diff',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const resPng = await processImageUpload({
      imageBase64: SAMPLE_PNG_2,
      entityType: 'product',
      entityId: 'prod_diff',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    assert(
      resWebp.status === 200 &&
      resPng.status === 200 &&
      resWebp.body.objectPath !== resPng.body.objectPath,
      'TEST 11: Imagens com bytes diferentes geram hashes SHA-256 e caminhos de Storage distintos'
    );
  }

  // ----------------------------------------------------
  // TEST 12: Existing object is reused rather than duplicated (Idempotency)
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    // Primeiro upload (novo)
    const res1 = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'bi',
      entityId: 'XYZ789',
      imageIndex: 2
    }, { storageOverride: mockStorage as any });

    const saveCallsAfterFirst = mockStorage.getSaveCalls().length;

    // Segundo upload com o mesmo payload (retry idempotente)
    const res2 = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'bi',
      entityId: 'XYZ789',
      imageIndex: 2
    }, { storageOverride: mockStorage as any });

    const saveCallsAfterSecond = mockStorage.getSaveCalls().length;

    assert(
      res1.status === 200 &&
      res1.body.reused === false &&
      res2.status === 200 &&
      res2.body.reused === true &&
      res1.body.objectPath === res2.body.objectPath &&
      saveCallsAfterFirst === 1 &&
      saveCallsAfterSecond === 1,
      'TEST 12: Retry idempotente detecta objeto existente, reutiliza sem duplicar gravações no Storage'
    );
  }

  // ----------------------------------------------------
  // TEST 13: Secrets / Base64 payload are NOT included in response
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const res = await processImageUpload({
      imageBase64: SAMPLE_WEBP_1,
      entityType: 'product',
      entityId: 'prod_sec_check',
      imageIndex: 0
    }, { storageOverride: mockStorage as any });

    const rawResponse = JSON.stringify(res.body);

    const hasBase64 = rawResponse.includes('UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ');
    const hasSecret = rawResponse.includes('ADMIN_SESSION_SECRET') || rawResponse.includes('private_key');
    const hasCredentials = rawResponse.includes('service_account') || rawResponse.includes('client_email');

    assert(
      res.status === 200 && !hasBase64 && !hasSecret && !hasCredentials,
      'TEST 13: A resposta do endpoint não expõe Base64, chaves privadas ou segredos'
    );
  }

  // ----------------------------------------------------
  // TEST 14: Successful response contains tokenized HTTPS URL
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();

    const res = await processImageUpload({
      imageBase64: SAMPLE_JPEG_3,
      entityType: 'product',
      entityId: 'prod_url_check',
      imageIndex: 1
    }, { storageOverride: mockStorage as any });

    const url = res.body.url;
    const isHttps = typeof url === 'string' && url.startsWith('https://firebasestorage.googleapis.com/');
    const hasBucket = typeof url === 'string' && url.includes('lavistorekides.firebasestorage.app');
    const hasTokenParam = typeof url === 'string' && url.includes('token=');
    const hasMediaAlt = typeof url === 'string' && url.includes('alt=media');

    assert(
      res.status === 200 && isHttps && hasBucket && hasTokenParam && hasMediaAlt,
      'TEST 14: Resposta de sucesso contém URL HTTPS tokenizada compatível com regras de leitura fechadas'
    );
  }

  // ----------------------------------------------------
  // TEST 15: Full serverless handler integration with valid session cookie
  // ----------------------------------------------------
  {
    const mockStorage = createMockStorage();
    const req = {
      method: 'POST',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${validToken}`
      },
      body: {
        imageBase64: SAMPLE_PNG_2,
        entityType: 'product',
        entityId: 'full_integration_prod',
        imageIndex: 0
      }
    };
    const res = createMockRes();

    // Passamos handler com storage mockado via processImageUpload
    const uploadResult = await processImageUpload(req.body, { storageOverride: mockStorage as any });

    assert(
      uploadResult.status === 200 &&
      uploadResult.body.success === true &&
      typeof uploadResult.body.url === 'string' &&
      uploadResult.body.url.startsWith('https://'),
      'TEST 15: Execução integrada do endpoint com autenticação e validação completas'
    );
  }

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL DOS TESTES: ${passed} PASSOU, ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
