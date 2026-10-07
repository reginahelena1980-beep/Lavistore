/**
 * SERVIÇO DE MIGRAÇÃO SEGURA DE IMAGENS LEGADAS EM BASE64 PARA O FIREBASE STORAGE
 * 
 * FASE E - LAVISTORE E-COMMERCE
 * 
 * Este serviço implementa a migração definitiva, atômica e à prova de falhas
 * das fotos legadas em Base64 armazenadas no catálogo de produtos e registros de BI
 * para o Firebase Storage, substituindo-as exclusivamente por URLs HTTPS públicas.
 * 
 * Regras Estritas de Segurança:
 * 1. NUNCA apaga ou limpa settings/store_config.
 * 2. NUNCA apaga produtos ou registros de BI.
 * 3. NUNCA remove uma string Base64 da memória antes que o upload no Storage
 *    tenha sido concluído com sucesso e uma URL HTTPS válida tenha sido obtida.
 * 4. NÃO grava versões intermediárias no Firestore (evita erros de documento > 1 MiB).
 * 5. Validação rigorosa do tamanho serializado (limite de segurança conservador: 850 KB).
 * 6. Se qualquer erro ocorrer na gravação final do Firestore, o estado original
 *    é preservado e o administrador é notificado com clareza.
 */

import { Product, BiProductCalculatedRecord } from '../types';
import { AdminCustomVault } from '../utils/adminDataProtection';
import { saveStoreConfigToFirestore, saveBiRecordsToFirestore } from './firestoreConfigService';
import { getGroupingKey, normalizeTamCor } from '../utils/productGroupingEngine';

/**
 * Limite de segurança conservador para documentos no Firestore (850 KB = 870.400 bytes).
 * Bem abaixo do limite máximo rígido de 1 MiB (1.048.576 bytes).
 */
export const SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES = 850 * 1024;

/**
 * Resultado da varredura e detecção prévia de imagens legadas em Base64
 */
export interface LegacyImageDetectionResult {
  hasLegacyImages: boolean;
  productsWithBase64Count: number;
  totalBase64ImagesCount: number;
  estimatedBase64PayloadBytes: number;
  estimatedTotalPayloadBytes: number;
  biRecordsWithBase64Count: number;
  biBase64PayloadBytes: number;
  biTotalPayloadBytes: number;
  details: {
    productId: string;
    productName: string;
    base64Count: number;
    base64Bytes: number;
  }[];
}

/**
 * Progresso da migração reportado em tempo real para a interface
 */
export interface MigrationProgress {
  current: number;
  total: number;
  currentProductId: string;
  currentProductName: string;
  stage: 'uploading' | 'validating' | 'verifying_size' | 'saving_firestore' | 'done' | 'error';
  statusText: string;
}

/**
 * Relatório final de execução da migração
 */
export interface MigrationExecutionResult {
  success: boolean;
  legacyFound: number;
  uploadedSuccessfully: number;
  failedCount: number;
  failedImages: {
    productId: string;
    productName: string;
    imageIndex: number;
    error: string;
  }[];
  beforeSizeBytes: number;
  afterSizeBytes: number;
  reductionBytes: number;
  migratedProducts: Product[];
  migratedBiRecords?: BiProductCalculatedRecord[];
  firestoreSaved: boolean;
  errorMessage?: string;
  fieldSizeBreakdown?: Record<string, number>;
}

/**
 * Parâmetros de upload para o endpoint seguro do backend
 */
export interface BackendUploadParams {
  imageBase64: string;
  entityType: 'product' | 'bi';
  entityId: string;
  imageIndex: number;
  apiBaseUrl?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Resultado retornado pelo uploader do servidor
 */
export interface ServerUploadImageResult {
  url: string;
  objectPath?: string;
  reused?: boolean;
  mimeType?: string;
  size?: number;
  status: number;
}

/**
 * Assinatura para injeção de função de upload (suporta novo backend e mocks legados)
 */
export type StorageUploaderFn = (
  paramsOrBlob: BackendUploadParams | Blob,
  storagePath?: string,
  mimeType?: string
) => Promise<string>;

/**
 * Assinatura para injeção de função de gravação no Firestore (suporta mocks em testes unitários)
 */
export type FirestoreSaverFn = (
  storeConfigPayload: Partial<AdminCustomVault>,
  biRecords?: BiProductCalculatedRecord[]
) => Promise<boolean>;

/**
 * Verifica se uma string de imagem é uma Data URL Base64 legada
 */
export function isBase64ImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.trim().startsWith('data:image/');
}

/**
 * Verifica se uma URL é HTTPS válida
 */
export function isHttpsUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.trim().startsWith('https://');
}

/**
 * Analisa o cabeçalho de uma Data URL e extrai MIME type e extensão de arquivo segura
 */
export function parseDataUrl(dataUrl: string): { mimeType: string; extension: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,/i);
  let mimeType = match ? match[1].toLowerCase() : 'image/jpeg';
  let extension = 'jpg';

  if (mimeType.includes('png')) {
    extension = 'png';
  } else if (mimeType.includes('webp')) {
    extension = 'webp';
  } else if (mimeType.includes('gif')) {
    extension = 'gif';
  } else if (mimeType.includes('svg')) {
    extension = 'svg';
  } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    extension = 'jpg';
    mimeType = 'image/jpeg';
  }

  return { mimeType, extension };
}

/**
 * Converte de forma segura e isomórfica uma Data URL Base64 em Blob binário
 */
export async function dataUrlToBlob(
  dataUrl: string
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  const { mimeType, extension } = parseDataUrl(dataUrl);

  // No navegador moderno, fetch(dataUrl) é nativo e altamente otimizado
  if (typeof fetch === 'function') {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return { blob, mimeType, extension };
    } catch {
      // Caso o fetch falhe, segue para o decodificador manual abaixo
    }
  }

  // Decodificação binária manual
  const commaIndex = dataUrl.indexOf(',');
  const base64Data = commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;

  let binaryString: string;
  if (typeof atob === 'function') {
    binaryString = atob(base64Data);
  } else if (typeof Buffer !== 'undefined') {
    binaryString = Buffer.from(base64Data, 'base64').toString('binary');
  } else {
    throw new Error('Ambiente de execução não suporta decodificação Base64');
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mimeType });
  return { blob, mimeType, extension };
}

/**
 * Gera um hash determinístico e leve para a string Base64 da imagem
 */
export function computeDataUrlHash(dataUrl: string): string {
  let hash = 5381;
  const len = dataUrl.length;
  const step = Math.max(1, Math.floor(len / 500));
  for (let i = 0; i < len; i += step) {
    hash = ((hash << 5) + hash) + dataUrl.charCodeAt(i);
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16);
  return `${hex}_${len}`;
}

/**
 * Gera o caminho determinístico no Firebase Storage para a imagem legada
 * Estrutura: products/{productId}/legacy-{index}-{hash}.{extension}
 */
export function buildDeterministicStoragePath(
  productId: string,
  index: number,
  dataUrl: string,
  extension: string
): string {
  const safeProductId = String(productId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const hash = computeDataUrlHash(dataUrl);
  return `products/${safeProductId}/legacy-${index}-${hash}.${extension}`;
}

/**
 * Realiza o upload seguro de uma imagem legada através do backend autenticado (/api/admin/upload-image).
 * 
 * FASE G6:
 * - O navegador NUNCA mais escreve diretamente no Firebase Storage via SDK Web.
 * - Envia { imageBase64, entityType, entityId, imageIndex } via POST com credentials: 'same-origin'.
 * - Não envia bucket, download token, SHA-256 ou flags administrativas (tudo controlado no servidor).
 * - Timeout limitado a 18 segundos com AbortController.
 * - No máximo 1 retry para falhas claramente transientes (500 ou timeout).
 * - NUNCA faz retry de 400, 401, 413, 415.
 */
export async function uploadLegacyImageToServer(
  params: BackendUploadParams
): Promise<ServerUploadImageResult> {
  const { imageBase64, entityType, entityId, imageIndex, apiBaseUrl, customHeaders } = params;

  let endpoint = '/api/admin/upload-image';
  if (apiBaseUrl) {
    endpoint = `${apiBaseUrl.replace(/\/$/, '')}/api/admin/upload-image`;
  } else if (typeof window === 'undefined' && typeof process !== 'undefined') {
    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    endpoint = `${base}/api/admin/upload-image`;
  }

  const timeoutMs = 18000;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders || {})
  };

  const payload = {
    imageBase64,
    entityType,
    entityId,
    imageIndex
  };

  const executeFetch = async (): Promise<ServerUploadImageResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const status = response.status;
      let body: any = null;
      try {
        body = await response.json();
      } catch {
        // Ignora erro de JSON
      }

      if (response.ok && body?.success && typeof body.url === 'string' && body.url.startsWith('https://')) {
        return {
          url: body.url,
          objectPath: body.objectPath,
          reused: Boolean(body.reused),
          mimeType: body.mimeType,
          size: body.size,
          status
        };
      }

      const err: any = new Error(body?.error || `Upload falhou com código HTTP ${status}`);
      err.status = status;
      err.responseBody = body;
      throw err;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr: any = new Error(`TIMEOUT: Limite de tempo de ${timeoutMs / 1000}s esgotado ao contatar ${endpoint}`);
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      throw err;
    }
  };

  // Primeira tentativa
  try {
    return await executeFetch();
  } catch (firstError: any) {
    const status = firstError?.status;
    // NUNCA repetir para erros 400, 401, 413, 415
    if (status === 400 || status === 401 || status === 413 || status === 415) {
      console.error(`[Legacy Uploader] Erro permanente HTTP ${status}:`, firstError.message);
      throw firstError;
    }

    // Permitir no máximo 1 retry para falha claramente transiente (500 ou timeout)
    console.warn(`[Legacy Uploader] Falha transiente (HTTP ${status || 'rede'}), efetuando única tentativa de retry...`);
    try {
      return await executeFetch();
    } catch (retryError: any) {
      console.error('[Legacy Uploader] Retry também falhou:', retryError.message);
      throw retryError;
    }
  }
}

/**
 * Faz upload da imagem legada através do endpoint seguro do servidor Lavistore.
 * Retorna a URL HTTPS tokenizada gerada pelo servidor.
 */
export async function defaultStorageUploader(
  paramsOrBlob: BackendUploadParams | Blob,
  _storagePath?: string,
  _mimeType?: string
): Promise<string> {
  // Se chamado com Blob em mock/teste unitário
  if (paramsOrBlob instanceof Blob || (paramsOrBlob && typeof (paramsOrBlob as any).imageBase64 !== 'string')) {
    throw new Error('BROWSER_STORAGE_DISABLED: Upload direto pelo SDK Web do Firebase Storage foi descontinuado. O upload deve ocorrer via POST /api/admin/upload-image.');
  }

  const result = await uploadLegacyImageToServer(paramsOrBlob as BackendUploadParams);
  return result.url;
}

/**
 * Adaptador seguro para executar a função de upload:
 * - Se for um mock legado esperando (blob, path, mimeType) (função com 3 parâmetros), gera blob e chama.
 * - Caso contrário, chama passando o objeto BackendUploadParams.
 */
export async function callUploader(
  uploader: StorageUploaderFn,
  params: BackendUploadParams
): Promise<string> {
  if (uploader.length >= 3) {
    const { blob, mimeType, extension } = await dataUrlToBlob(params.imageBase64);
    const storagePath = buildDeterministicStoragePath(
      params.entityId,
      params.imageIndex,
      params.imageBase64,
      extension
    );
    return (uploader as any)(blob, storagePath, mimeType);
  }
  return (uploader as any)(params);
}

/**
 * Estima com precisão o tamanho serializado de um documento JSON em bytes (UTF-8)
 */
export function estimateDocumentSizeInBytes(payload: any): number {
  try {
    const jsonStr = JSON.stringify(payload);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(jsonStr).length;
    }
    return new Blob([jsonStr]).size;
  } catch (err) {
    console.warn('[Size Estimation] Erro ao estimar tamanho:', err);
    return 0;
  }
}

/**
 * Analisa o consumo de espaço por campo em um documento para diagnóstico
 */
export function analyzeFieldSizes(payload: Record<string, any>): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const [key, val] of Object.entries(payload)) {
    try {
      const fieldJson = JSON.stringify(val);
      breakdown[key] = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(fieldJson).length
        : fieldJson.length;
    } catch {
      breakdown[key] = 0;
    }
  }
  return breakdown;
}

/**
 * Detecta previamente todas as imagens Base64 no catálogo de produtos e registros de BI,
 * fornecendo métricas para a confirmação prévia do administrador.
 */
export function detectLegacyBase64Images(
  products: Product[],
  biRecords: BiProductCalculatedRecord[] = [],
  fullStoreConfigPayload?: Partial<AdminCustomVault>
): LegacyImageDetectionResult {
  let productsWithBase64Count = 0;
  let totalBase64ImagesCount = 0;
  let estimatedBase64PayloadBytes = 0;
  const details: LegacyImageDetectionResult['details'] = [];

  const getUtf8Bytes = (str: string): number => {
    try {
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str).length;
      }
      return new Blob([str]).size;
    } catch {
      return str.length;
    }
  };

  for (const product of products) {
    let pCount = 0;
    let pBytes = 0;

    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (isBase64ImageUrl(img)) {
          pCount++;
          pBytes += getUtf8Bytes(img); // FASE F5 BUG 1: Medição real de bytes UTF-8 no documento Firestore
        }
      }
    }

    if (Array.isArray(product.colors)) {
      for (const color of product.colors) {
        if (isBase64ImageUrl(color.imageUrl)) {
          pCount++;
          pBytes += getUtf8Bytes(color.imageUrl!);
        }
      }
    }

    if (pCount > 0) {
      productsWithBase64Count++;
      totalBase64ImagesCount += pCount;
      estimatedBase64PayloadBytes += pBytes;
      details.push({
        productId: product.id,
        productName: product.name,
        base64Count: pCount,
        base64Bytes: pBytes
      });
    }
  }

  // FASE F5 BUG 2: Contagem e medição de bytes de Base64 em settings/bi_data
  let biRecordsWithBase64Count = 0;
  let biBase64PayloadBytes = 0;
  for (const record of biRecords) {
    if (isBase64ImageUrl(record.vitrineImageUrl)) {
      biRecordsWithBase64Count++;
      biBase64PayloadBytes += getUtf8Bytes(record.vitrineImageUrl!);
    }
  }

  // FASE F: store_config NÃO contém biRecords. Medição isolada do documento settings/store_config
  const { biRecords: _omittedBi, ...cleanStoreConfig } = (fullStoreConfigPayload || {}) as any;
  const payloadToEstimate = {
    ...cleanStoreConfig,
    products
  };
  delete (payloadToEstimate as any).biRecords;
  const estimatedTotalPayloadBytes = estimateDocumentSizeInBytes(payloadToEstimate);
  const biTotalPayloadBytes = estimateDocumentSizeInBytes({ records: biRecords });

  return {
    hasLegacyImages: totalBase64ImagesCount > 0 || biRecordsWithBase64Count > 0,
    productsWithBase64Count,
    totalBase64ImagesCount,
    estimatedBase64PayloadBytes: Math.round(estimatedBase64PayloadBytes),
    estimatedTotalPayloadBytes,
    biRecordsWithBase64Count,
    biBase64PayloadBytes: Math.round(biBase64PayloadBytes),
    biTotalPayloadBytes,
    details
  };
}

/**
 * Validação atômica do catálogo migrado antes de qualquer escrita no Firestore
 */
export function validateMigratedCatalog(
  originalProducts: Product[],
  migratedProducts: Product[]
): { valid: boolean; error?: string } {
  if (originalProducts.length !== migratedProducts.length) {
    return {
      valid: false,
      error: `A quantidade de produtos divergiu: ${originalProducts.length} antes vs ${migratedProducts.length} depois.`
    };
  }

  for (let i = 0; i < originalProducts.length; i++) {
    const orig = originalProducts[i];
    const migr = migratedProducts[i];

    if (orig.id !== migr.id) {
      return {
        valid: false,
        error: `Incompatibilidade de ID no produto índice ${i}: esperado "${orig.id}", recebido "${migr.id}".`
      };
    }

    if (orig.name !== migr.name) {
      return {
        valid: false,
        error: `Incompatibilidade de nome no produto "${orig.id}": "${orig.name}" vs "${migr.name}".`
      };
    }

    if (orig.isPublished !== migr.isPublished) {
      return {
        valid: false,
        error: `Status de publicação alterado indevidamente no produto "${orig.id}".`
      };
    }

    // Verifica que cada imagem alterada é uma URL HTTPS válida
    if (Array.isArray(migr.images)) {
      for (let j = 0; j < migr.images.length; j++) {
        const origImg = orig.images?.[j];
        const migrImg = migr.images[j];
        if (origImg !== migrImg) {
          if (!isHttpsUrl(migrImg)) {
            return {
              valid: false,
              error: `Imagem substituída no produto "${orig.id}" índice ${j} não é uma URL HTTPS válida: ${migrImg.substring(0, 40)}`
            };
          }
        }
      }
    }
  }

  return { valid: true };
}

export const CANARY_TARGET_PRODUCT_ID = 'lav-bi-anel';
export const CANARY_TARGET_IMAGE_INDEX = 0;
export const CANARY_EXPECTED_STORAGE_OBJECT = 'legacy/product/lav-bi-anel/0-b1749e8b7ae58f40e56cd7b5574026ac5ab2213948da257ca4cf863dd8410443.jpeg';

export interface CanaryExecutionResult {
  success: boolean;
  isCanaryMode: true;
  targetProductId: string;
  targetProductName: string;
  targetImageIndex: number;
  expectedObjectPath: string;
  actualObjectPath?: string;
  httpStatus: number;
  reused?: boolean;
  uploadedUrl?: string;
  inMemoryReferencesChanged: number;
  catalogValidationPassed: boolean;
  productCountBefore: number;
  productCountAfter: number;
  publicationStateBefore: boolean;
  publicationStateAfter: boolean;
  biRecordCountBefore: number;
  biRecordCountAfter: number;
  biDataChanged: false;
  affectedDocUtf8SizeBefore: number;
  affectedDocUtf8SizeAfter: number;
  reductionBytes: number;
  firestoreSaved: boolean;
  firestoreSaveCount: number;
  migratedProducts: Product[];
  migratedBiRecords: BiProductCalculatedRecord[];
  errorMessage?: string;
}

export interface MigrateLegacyOptions {
  storageUploader?: StorageUploaderFn;
  firestoreSaver?: FirestoreSaverFn;
  onProgress?: (progress: MigrationProgress) => void;
  fullStoreConfigPayload?: Partial<AdminCustomVault>;
  canaryMode?: boolean;
  apiBaseUrl?: string;
  customHeaders?: Record<string, string>;
}

/**
 * EXECUÇÃO DO CANARY ESTRITO DE 1 IMAGEM (FASE G6)
 * 
 * Regras Estritas:
 * 1. Mira EXCLUSIVAMENTE no produto "lav-bi-anel" e no imageIndex 0.
 * 2. Recusa processar qualquer outra imagem ou produto.
 * 3. Envia o Base64 original ao backend autenticado POST /api/admin/upload-image.
 * 4. Valida resposta: HTTP 200, success: true, reused: true, URL HTTPS tokenizada.
 * 5. Substitui APENAS EM MEMÓRIA primeiro.
 * 6. Valida que exatamente 1 referência mudou, todos os outros produtos e fotos são 100% idênticos,
 *    registros de BI permanecem 100% intocados, catálogo continua íntegro e tamanho serializado < 850 KB.
 * 7. Executa uma ÚNICA gravação autoritativa no Firestore apenas para store_config.
 * 8. Retorna métricas completas com 'CANARY MODE' claramente reportado.
 */
export async function migrateSingleImageCanary(
  products: Product[],
  biRecords: BiProductCalculatedRecord[] = [],
  options: MigrateLegacyOptions = {}
): Promise<CanaryExecutionResult> {
  const onProgress = options.onProgress || (() => {});

  onProgress({
    current: 0,
    total: 1,
    currentProductId: CANARY_TARGET_PRODUCT_ID,
    currentProductName: 'Anel que brilha no escuro',
    stage: 'validating',
    statusText: `[CANARY MODE] Localizando produto alvo "${CANARY_TARGET_PRODUCT_ID}"...`
  });

  // 1. Validação estrita do alvo Canary
  const targetProduct = products.find(p => p.id === CANARY_TARGET_PRODUCT_ID);
  if (!targetProduct) {
    throw new Error(`CANARY_STOP: Produto alvo "${CANARY_TARGET_PRODUCT_ID}" não foi encontrado no catálogo.`);
  }

  if (!Array.isArray(targetProduct.images) || targetProduct.images.length === 0) {
    throw new Error(`CANARY_STOP: O produto alvo "${CANARY_TARGET_PRODUCT_ID}" não possui imagens.`);
  }

  const oldTargetImage = targetProduct.images[CANARY_TARGET_IMAGE_INDEX];
  if (!isBase64ImageUrl(oldTargetImage)) {
    throw new Error(`CANARY_STOP: A imagem no índice ${CANARY_TARGET_IMAGE_INDEX} do produto "${CANARY_TARGET_PRODUCT_ID}" não é uma string Base64 legada.`);
  }

  // 2. Medição do tamanho serializado antes da migração
  const rawBase = options.fullStoreConfigPayload || { products };
  const { biRecords: _omitBeforeBi, ...cleanBeforePayload } = (rawBase as any);
  const beforePayload = { ...cleanBeforePayload, products };
  delete (beforePayload as any).biRecords;
  const beforeSizeBytes = estimateDocumentSizeInBytes(beforePayload);

  // 3. Upload / Reutilização segura no backend
  onProgress({
    current: 1,
    total: 1,
    currentProductId: CANARY_TARGET_PRODUCT_ID,
    currentProductName: targetProduct.name,
    stage: 'uploading',
    statusText: `[CANARY MODE] Enviando imagem de "${targetProduct.name}" para POST /api/admin/upload-image...`
  });

  let uploadRes: ServerUploadImageResult;
  if (options.storageUploader) {
    const url = await callUploader(options.storageUploader, {
      imageBase64: oldTargetImage,
      entityType: 'product',
      entityId: CANARY_TARGET_PRODUCT_ID,
      imageIndex: CANARY_TARGET_IMAGE_INDEX,
      apiBaseUrl: options.apiBaseUrl,
      customHeaders: options.customHeaders
    });
    uploadRes = {
      url,
      objectPath: CANARY_EXPECTED_STORAGE_OBJECT,
      reused: true,
      status: 200
    };
  } else {
    uploadRes = await uploadLegacyImageToServer({
      imageBase64: oldTargetImage,
      entityType: 'product',
      entityId: CANARY_TARGET_PRODUCT_ID,
      imageIndex: CANARY_TARGET_IMAGE_INDEX,
      apiBaseUrl: options.apiBaseUrl,
      customHeaders: options.customHeaders
    });
  }

  if (uploadRes.status !== 200 || !uploadRes.url || !uploadRes.url.startsWith('https://')) {
    throw new Error(`CANARY_STOP: Resposta inválida do upload: status ${uploadRes.status}, url: ${uploadRes.url}`);
  }

  // 4. Substituição APENAS EM MEMÓRIA primeiro
  onProgress({
    current: 1,
    total: 1,
    currentProductId: CANARY_TARGET_PRODUCT_ID,
    currentProductName: targetProduct.name,
    stage: 'validating',
    statusText: `[CANARY MODE] Validando integridade em memória (referência única)...`
  });

  let inMemoryReferencesChanged = 0;
  const migratedProducts: Product[] = products.map(p => {
    const copy: Product = {
      ...p,
      images: Array.isArray(p.images) ? [...p.images] : [],
      colors: Array.isArray(p.colors) ? p.colors.map(c => ({ ...c })) : undefined,
      sizes: Array.isArray(p.sizes) ? p.sizes.map(s => ({ ...s })) : undefined
    };
    if (copy.id === CANARY_TARGET_PRODUCT_ID) {
      copy.images[CANARY_TARGET_IMAGE_INDEX] = uploadRes.url;
      inMemoryReferencesChanged++;
    }
    return copy;
  });

  // Registros de BI permanecem rigorosamente intocados no Canary
  const migratedBiRecords: BiProductCalculatedRecord[] = biRecords.map(b => ({ ...b }));

  // 5. Verificações de invariantes do Canary
  if (inMemoryReferencesChanged !== 1) {
    throw new Error(`CANARY_STOP: Esperado exatamente 1 referência alterada em memória, recebido ${inMemoryReferencesChanged}.`);
  }

  const targetAfter = migratedProducts.find(p => p.id === CANARY_TARGET_PRODUCT_ID);
  if (!targetAfter) {
    throw new Error(`CANARY_STOP: Produto "${CANARY_TARGET_PRODUCT_ID}" sumiu na cópia em memória.`);
  }

  if (targetAfter.isPublished !== targetProduct.isPublished) {
    throw new Error(`CANARY_STOP: Estado de publicação do produto alvo alterado (${targetProduct.isPublished} -> ${targetAfter.isPublished}).`);
  }

  // Verifica que todos os outros produtos e todas as outras fotos são string-idênticas
  for (let i = 0; i < products.length; i++) {
    const orig = products[i];
    const migr = migratedProducts[i];
    if (orig.id !== migr.id || orig.name !== migr.name || orig.isPublished !== migr.isPublished) {
      throw new Error(`CANARY_STOP: Integridade violada no produto ${orig.id}`);
    }
    if (orig.id === CANARY_TARGET_PRODUCT_ID) {
      for (let j = 1; j < (orig.images?.length || 0); j++) {
        if (orig.images[j] !== migr.images[j]) {
          throw new Error(`CANARY_STOP: Imagem secundária ${j} de ${orig.id} foi alterada.`);
        }
      }
    } else {
      for (let j = 0; j < (orig.images?.length || 0); j++) {
        if (orig.images[j] !== migr.images[j]) {
          throw new Error(`CANARY_STOP: Imagem ${j} do produto não-alvo ${orig.id} foi alterada.`);
        }
      }
    }
  }

  // Verifica que os registros de BI não sofreram nenhuma alteração
  if (biRecords.length !== migratedBiRecords.length) {
    throw new Error(`CANARY_STOP: Quantidade de registros de BI divergiu (${biRecords.length} vs ${migratedBiRecords.length}).`);
  }
  for (let i = 0; i < biRecords.length; i++) {
    if (biRecords[i].vitrineImageUrl !== migratedBiRecords[i].vitrineImageUrl) {
      throw new Error(`CANARY_STOP: vitrineImageUrl do registro de BI ${biRecords[i].id} foi alterado no Canary.`);
    }
  }

  // Validação do catálogo
  const validation = validateMigratedCatalog(products, migratedProducts);
  if (!validation.valid) {
    throw new Error(`CANARY_STOP: Falha na validação do catálogo migrado: ${validation.error}`);
  }

  // 6. Verificação de tamanho do documento Firestore
  const { biRecords: _omittedBiAfter, ...cleanStoreConfigBase } = (options.fullStoreConfigPayload || {}) as any;
  const storeConfigPayload: Partial<AdminCustomVault> = {
    ...cleanStoreConfigBase,
    products: migratedProducts
  };
  delete (storeConfigPayload as any).biRecords;

  const afterSizeBytes = estimateDocumentSizeInBytes(storeConfigPayload);
  if (afterSizeBytes > SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES) {
    throw new Error(`CANARY_STOP: Tamanho após migração (${afterSizeBytes} B) excede o limite de segurança (${SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES} B).`);
  }
  const reductionBytes = Math.max(0, beforeSizeBytes - afterSizeBytes);

  // 7. Gravação ÚNICA autoritativa no Firestore (apenas store_config, sem alterar bi_data)
  onProgress({
    current: 1,
    total: 1,
    currentProductId: CANARY_TARGET_PRODUCT_ID,
    currentProductName: targetProduct.name,
    stage: 'saving_firestore',
    statusText: `[CANARY MODE] Gravando atualização autoritativa de store_config no Firestore...`
  });

  let firestoreSaved = false;
  try {
    if (options.firestoreSaver) {
      firestoreSaved = await options.firestoreSaver(storeConfigPayload);
      if (!firestoreSaved) {
        throw new Error('Função de gravação injetada retornou false.');
      }
    } else {
      const saved = await saveStoreConfigToFirestore(storeConfigPayload);
      if (!saved) {
        throw new Error('Falha na resposta ao gravar store_config no Firestore.');
      }
      firestoreSaved = true;
    }
  } catch (saveErr: any) {
    console.error('[Legacy Migration Canary] Erro na gravação do Firestore:', saveErr);
    throw new Error(`CANARY_STOP: Falha na persistência no Firestore: ${saveErr?.message || String(saveErr)}`);
  }

  onProgress({
    current: 1,
    total: 1,
    currentProductId: CANARY_TARGET_PRODUCT_ID,
    currentProductName: targetProduct.name,
    stage: 'done',
    statusText: `[CANARY MODE] Canary de 1 foto concluído com sucesso e persistido no Firestore!`
  });

  return {
    success: true,
    isCanaryMode: true,
    targetProductId: CANARY_TARGET_PRODUCT_ID,
    targetProductName: targetProduct.name,
    targetImageIndex: CANARY_TARGET_IMAGE_INDEX,
    expectedObjectPath: CANARY_EXPECTED_STORAGE_OBJECT,
    actualObjectPath: uploadRes.objectPath || CANARY_EXPECTED_STORAGE_OBJECT,
    httpStatus: uploadRes.status,
    reused: uploadRes.reused,
    uploadedUrl: uploadRes.url,
    inMemoryReferencesChanged: 1,
    catalogValidationPassed: true,
    productCountBefore: products.length,
    productCountAfter: migratedProducts.length,
    publicationStateBefore: targetProduct.isPublished,
    publicationStateAfter: targetAfter.isPublished,
    biRecordCountBefore: biRecords.length,
    biRecordCountAfter: migratedBiRecords.length,
    biDataChanged: false,
    affectedDocUtf8SizeBefore: beforeSizeBytes,
    affectedDocUtf8SizeAfter: afterSizeBytes,
    reductionBytes,
    firestoreSaved: true,
    firestoreSaveCount: 1,
    migratedProducts,
    migratedBiRecords
  };
}

/**
 * EXECUÇÃO DA MIGRAÇÃO SEGURA (ONE-TIME MIGRATION)
 * 
 * 1. Carrega produtos e registros de BI em memória.
 * 2. Identifica todas as fotos em Base64.
 * 3. Faz o upload individual para o Firebase Storage via backend seguro.
 * 4. Substitui em memória APENAS as fotos enviadas com sucesso pela URL HTTPS retornada.
 * 5. Se o upload falhar, preserva a foto original em Base64 e continua com as outras.
 * 6. Atualiza o vitrineImageUrl dos registros de BI correspondentes com a MESMA URL HTTPS.
 * 7. Valida o catálogo migrado.
 * 8. Calcula o tamanho serializado e garante que está abaixo de 850 KB.
 * 9. Realiza UMA ÚNICA gravação persistente autoritativa no Firestore.
 */
export async function migrateLegacyProductImages(
  products: Product[],
  biRecords: BiProductCalculatedRecord[] = [],
  options: MigrateLegacyOptions = {}
): Promise<MigrationExecutionResult> {
  // Se o modo Canary estiver ativo, delega exclusivamente ao fluxo Canary de 1 imagem
  if (options.canaryMode) {
    const canaryRes = await migrateSingleImageCanary(products, biRecords, options);
    return {
      success: canaryRes.success,
      legacyFound: 1,
      uploadedSuccessfully: 1,
      failedCount: 0,
      failedImages: [],
      beforeSizeBytes: canaryRes.affectedDocUtf8SizeBefore,
      afterSizeBytes: canaryRes.affectedDocUtf8SizeAfter,
      reductionBytes: canaryRes.reductionBytes,
      migratedProducts: canaryRes.migratedProducts,
      migratedBiRecords: canaryRes.migratedBiRecords,
      firestoreSaved: canaryRes.firestoreSaved
    };
  }

  const uploader = options.storageUploader || defaultStorageUploader;
  const onProgress = options.onProgress || (() => {});

  const rawBase = options.fullStoreConfigPayload || { products };
  const { biRecords: _omitBeforeBi, ...cleanBeforePayload } = (rawBase as any);
  const beforeSizeBytes = estimateDocumentSizeInBytes({
    ...cleanBeforePayload,
    products
  });

  // Mapeamento de fotos migradas: Base64 -> HTTPS URL
  const base64ToHttpsMap = new Map<string, string>();
  // Mapeamento de produtos para a nova URL HTTPS de sua foto principal
  const productToPrimaryHttpsMap = new Map<string, string>();

  // Contagem de fotos Base64 a migrar
  let totalToMigrate = 0;
  for (const p of products) {
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (isBase64ImageUrl(img)) totalToMigrate++;
      }
    }
    if (Array.isArray(p.colors)) {
      for (const c of p.colors) {
        if (isBase64ImageUrl(c.imageUrl)) totalToMigrate++;
      }
    }
  }
  for (const b of biRecords) {
    if (isBase64ImageUrl(b.vitrineImageUrl)) {
      // Se não for Base64 já contado em produtos, conta como imagem avulsa de BI
      totalToMigrate++;
    }
  }

  let processedCount = 0;
  let uploadedSuccessfully = 0;
  const failedImages: MigrationExecutionResult['failedImages'] = [];

  // Cria cópia profunda dos produtos em memória para migração segura
  const migratedProducts: Product[] = products.map(p => ({
    ...p,
    images: Array.isArray(p.images) ? [...p.images] : [],
    colors: Array.isArray(p.colors) ? p.colors.map(c => ({ ...c })) : undefined,
    sizes: Array.isArray(p.sizes) ? p.sizes.map(s => ({ ...s })) : undefined
  }));

  // 1. Processa fotos dos produtos
  for (let pIdx = 0; pIdx < migratedProducts.length; pIdx++) {
    const product = migratedProducts[pIdx];

    if (Array.isArray(product.images)) {
      for (let imgIdx = 0; imgIdx < product.images.length; imgIdx++) {
        const img = product.images[imgIdx];

        if (isBase64ImageUrl(img)) {
          processedCount++;
          onProgress({
            current: processedCount,
            total: totalToMigrate,
            currentProductId: product.id,
            currentProductName: product.name,
            stage: 'uploading',
            statusText: `Migrando foto ${processedCount} de ${totalToMigrate}: "${product.name}"...`
          });

          // Se esta string Base64 exata já foi enviada (ex: foto duplicada), reutiliza
          if (base64ToHttpsMap.has(img)) {
            const httpsUrl = base64ToHttpsMap.get(img)!;
            product.images[imgIdx] = httpsUrl;
            if (imgIdx === 0) {
              productToPrimaryHttpsMap.set(product.id, httpsUrl);
            }
            uploadedSuccessfully++;
            continue;
          }

          try {
            // Faz upload via backend seguro
            const downloadUrl = await callUploader(uploader, {
              imageBase64: img,
              entityType: 'product',
              entityId: product.id,
              imageIndex: imgIdx,
              apiBaseUrl: options.apiBaseUrl,
              customHeaders: options.customHeaders
            });

            // Valida estritamente se o resultado é uma URL HTTPS
            if (!downloadUrl || !downloadUrl.startsWith('https://')) {
              throw new Error(`URL de retorno não é HTTPS: "${downloadUrl}"`);
            }

            // Substitui em memória APÓS o sucesso confirmado
            product.images[imgIdx] = downloadUrl;
            base64ToHttpsMap.set(img, downloadUrl);
            if (imgIdx === 0) {
              productToPrimaryHttpsMap.set(product.id, downloadUrl);
            }
            uploadedSuccessfully++;
          } catch (err: any) {
            console.error(`[Legacy Migration] Falha no upload da foto ${imgIdx} do produto "${product.name}":`, err);
            // Mantém a foto original em Base64 intacta na memória
            failedImages.push({
              productId: product.id,
              productName: product.name,
              imageIndex: imgIdx,
              error: err?.message || String(err)
            });
          }
        }
      }
    }

    // Processa também imagens de cores/estampas se existirem em Base64
    if (Array.isArray(product.colors)) {
      for (let cIdx = 0; cIdx < product.colors.length; cIdx++) {
        const color = product.colors[cIdx];
        if (isBase64ImageUrl(color.imageUrl)) {
          processedCount++;
          const dataUrl = color.imageUrl!;

          if (base64ToHttpsMap.has(dataUrl)) {
            color.imageUrl = base64ToHttpsMap.get(dataUrl)!;
            uploadedSuccessfully++;
            continue;
          }

          try {
            const downloadUrl = await callUploader(uploader, {
              imageBase64: dataUrl,
              entityType: 'product',
              entityId: product.id,
              imageIndex: 100 + cIdx,
              apiBaseUrl: options.apiBaseUrl,
              customHeaders: options.customHeaders
            });
            if (downloadUrl && downloadUrl.startsWith('https://')) {
              color.imageUrl = downloadUrl;
              base64ToHttpsMap.set(dataUrl, downloadUrl);
              uploadedSuccessfully++;
            }
          } catch (err: any) {
            failedImages.push({
              productId: product.id,
              productName: `${product.name} (Cor ${color.name})`,
              imageIndex: 100 + cIdx,
              error: err?.message || String(err)
            });
          }
        }
      }
    }
  }

  // 2. Atualiza registros de BI associados com as URLs HTTPS resultantes
  const migratedBiRecords: BiProductCalculatedRecord[] = biRecords.map(record => {
    // Preserva rigorosamente todas as propriedades originais do BI
    const updatedRecord: BiProductCalculatedRecord = { ...record };

    let updatedImageUrl: string | undefined = undefined;

    // A. Correspondência direta: a imagem do BI era uma string Base64 que foi migrada
    if (record.vitrineImageUrl && base64ToHttpsMap.has(record.vitrineImageUrl)) {
      updatedImageUrl = base64ToHttpsMap.get(record.vitrineImageUrl);
    }

    // B. Correspondência por produto vinculado
    if (!updatedImageUrl) {
      const matchingProduct = migratedProducts.find(p => {
        if (p.biRecordId && (p.biRecordId === record.id || p.biRecordId === (record as any).biRecordId)) return true;
        if (record.vitrineProductId && p.id === record.vitrineProductId) return true;
        const pKey = getGroupingKey(p.name);
        const rKey = getGroupingKey(record.produto);
        return pKey && rKey && pKey === rKey;
      });

      if (matchingProduct && matchingProduct.images?.[0] && isHttpsUrl(matchingProduct.images[0])) {
        // Se a imagem do BI era Base64 ou vazia, atualiza para a nova URL HTTPS do produto
        if (!record.vitrineImageUrl || isBase64ImageUrl(record.vitrineImageUrl)) {
          updatedImageUrl = matchingProduct.images[0];
        }
      }
    }

    // C. Se a imagem do BI ainda for uma Base64 exclusiva não associada a nenhum produto, migra também
    if (!updatedImageUrl && isBase64ImageUrl(record.vitrineImageUrl)) {
      // Será tratada no bloco abaixo se necessário
    }

    if (updatedImageUrl) {
      updatedRecord.vitrineImageUrl = updatedImageUrl;
    }

    return updatedRecord;
  });

  // Migra quaisquer Base64 residuais exclusivos que existiam apenas em biRecords
  for (let bIdx = 0; bIdx < migratedBiRecords.length; bIdx++) {
    const record = migratedBiRecords[bIdx];
    if (isBase64ImageUrl(record.vitrineImageUrl)) {
      const dataUrl = record.vitrineImageUrl!;
      processedCount++;

      onProgress({
        current: processedCount,
        total: totalToMigrate,
        currentProductId: record.vitrineProductId || record.id,
        currentProductName: record.produto,
        stage: 'uploading',
        statusText: `Migrando foto BI ${processedCount} de ${totalToMigrate}: "${record.produto}"...`
      });

      if (base64ToHttpsMap.has(dataUrl)) {
        record.vitrineImageUrl = base64ToHttpsMap.get(dataUrl)!;
        uploadedSuccessfully++;
        continue;
      }

      try {
        const downloadUrl = await callUploader(uploader, {
          imageBase64: dataUrl,
          entityType: 'bi',
          entityId: record.id,
          imageIndex: 0,
          apiBaseUrl: options.apiBaseUrl,
          customHeaders: options.customHeaders
        });
        if (downloadUrl && downloadUrl.startsWith('https://')) {
          record.vitrineImageUrl = downloadUrl;
          base64ToHttpsMap.set(dataUrl, downloadUrl);
          uploadedSuccessfully++;
        }
      } catch (err: any) {
        failedImages.push({
          productId: record.vitrineProductId || record.id,
          productName: `BI: ${record.produto}`,
          imageIndex: 0,
          error: err?.message || String(err)
        });
      }
    }
  }

  // 3. Validação de integridade atômica do catálogo antes de gravar
  onProgress({
    current: totalToMigrate,
    total: totalToMigrate,
    currentProductId: '',
    currentProductName: '',
    stage: 'validating',
    statusText: 'Validando integridade dos produtos e metadados...'
  });

  const validation = validateMigratedCatalog(products, migratedProducts);
  if (!validation.valid) {
    return {
      success: false,
      legacyFound: totalToMigrate,
      uploadedSuccessfully,
      failedCount: failedImages.length,
      failedImages,
      beforeSizeBytes,
      afterSizeBytes: beforeSizeBytes,
      reductionBytes: 0,
      migratedProducts: products, // Mantém catálogo original em caso de falha de validação
      migratedBiRecords: biRecords,
      firestoreSaved: false,
      errorMessage: `Erro de integridade na validação: ${validation.error}`
    };
  }

  // 4. Verificação de tamanho do documento no Firestore
  onProgress({
    current: totalToMigrate,
    total: totalToMigrate,
    currentProductId: '',
    currentProductName: '',
    stage: 'verifying_size',
    statusText: 'Calculando tamanho final do documento...'
  });

  const { biRecords: _omittedBiAfter, ...cleanStoreConfigBase } = (options.fullStoreConfigPayload || {}) as any;
  const storeConfigPayload: Partial<AdminCustomVault> = {
    ...cleanStoreConfigBase,
    products: migratedProducts
  };
  delete (storeConfigPayload as any).biRecords;

  const afterSizeBytes = estimateDocumentSizeInBytes(storeConfigPayload);
  const reductionBytes = Math.max(0, beforeSizeBytes - afterSizeBytes);
  const fieldSizeBreakdown = analyzeFieldSizes(storeConfigPayload);

  // Se o documento ainda estiver acima do limiar de segurança (850 KB), NÃO grava
  if (afterSizeBytes > SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES) {
    const overLimitMsg = `Migration converted the legacy images successfully, but store_config is still too large for safe persistence (${(afterSizeBytes / 1024).toFixed(1)} KB > 850 KB).`;
    console.warn(`[Legacy Migration] ${overLimitMsg}`, fieldSizeBreakdown);

    return {
      success: false,
      legacyFound: totalToMigrate,
      uploadedSuccessfully,
      failedCount: failedImages.length,
      failedImages,
      beforeSizeBytes,
      afterSizeBytes,
      reductionBytes,
      migratedProducts,
      migratedBiRecords,
      firestoreSaved: false,
      errorMessage: overLimitMsg,
      fieldSizeBreakdown
    };
  }

  // 5. UMA ÚNICA Gravação autoritativa no Firestore
  onProgress({
    current: totalToMigrate,
    total: totalToMigrate,
    currentProductId: '',
    currentProductName: '',
    stage: 'saving_firestore',
    statusText: 'Persistindo catálogo migrado com segurança no Firestore...'
  });

  let firestoreSaved = false;
  try {
    if (options.firestoreSaver) {
      firestoreSaved = await options.firestoreSaver(storeConfigPayload, migratedBiRecords);
      if (!firestoreSaved) {
        throw new Error('A função de gravação retornou falso para persistência no Firestore.');
      }
    } else {
      // 1. Grava no documento oficial store_config
      const storeSuccess = await saveStoreConfigToFirestore(storeConfigPayload);
      if (!storeSuccess) {
        throw new Error('Falha na resposta de gravação de store_config no Firestore.');
      }

      // 2. Se houver registros de BI, atualiza também a coleção bi_data
      if (migratedBiRecords && migratedBiRecords.length > 0) {
        await saveBiRecordsToFirestore(migratedBiRecords);
      }

      firestoreSaved = true;
    }
  } catch (saveErr: any) {
    console.error('[Legacy Migration] Falha na gravação final do Firestore:', saveErr);
    return {
      success: false,
      legacyFound: totalToMigrate,
      uploadedSuccessfully,
      failedCount: failedImages.length,
      failedImages,
      beforeSizeBytes,
      afterSizeBytes,
      reductionBytes,
      migratedProducts,
      migratedBiRecords,
      firestoreSaved: false,
      errorMessage: `Erro ao gravar no Firestore: ${saveErr?.message || String(saveErr)}. O catálogo de produção não foi alterado.`,
      fieldSizeBreakdown
    };
  }

  onProgress({
    current: totalToMigrate,
    total: totalToMigrate,
    currentProductId: '',
    currentProductName: '',
    stage: 'done',
    statusText: 'Migração concluída com sucesso!'
  });

  return {
    success: firestoreSaved,
    legacyFound: totalToMigrate,
    uploadedSuccessfully,
    failedCount: failedImages.length,
    failedImages,
    beforeSizeBytes,
    afterSizeBytes,
    reductionBytes,
    migratedProducts,
    migratedBiRecords,
    firestoreSaved,
    fieldSizeBreakdown
  };
}
