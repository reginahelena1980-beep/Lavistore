import crypto from 'crypto';
import { getAdminStorage, FIREBASE_STORAGE_BUCKET } from './adminAuth';

export { FIREBASE_STORAGE_BUCKET };
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB decoded limit
export const ALLOWED_ENTITY_TYPES = ['product', 'bi'] as const;
export type AllowedEntityType = typeof ALLOWED_ENTITY_TYPES[number];

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export interface ProcessImageUploadResult {
  status: number;
  body: {
    success: boolean;
    url?: string;
    objectPath?: string;
    mimeType?: string;
    size?: number;
    reused?: boolean;
    error?: string;
  };
}

export interface StorageOverride {
  bucket: (name?: string) => {
    file: (path: string) => {
      exists: () => Promise<[boolean]>;
      getMetadata: () => Promise<[any]>;
      setMetadata: (metadata: any) => Promise<[any]>;
      save: (data: Buffer, options: any) => Promise<void>;
    };
  };
}

/**
 * Sanitizes entity identifier to strictly alphanumeric characters, hyphens, and underscores.
 * Blocks path traversal attempts (../, /, \, absolute paths, etc.).
 */
export function sanitizeEntityId(rawId: unknown): string {
  if (typeof rawId !== 'string') return '';
  const trimmed = rawId.trim();

  // Explicit check for path traversal patterns
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes(':') ||
    trimmed.startsWith('.')
  ) {
    return '';
  }

  // Strip any disallowed characters
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  if (sanitized.length === 0 || sanitized.length > 128) {
    return '';
  }

  return sanitized;
}

/**
 * Computes deterministic SHA-256 hash of image Buffer.
 */
export function computeImageSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Builds the deterministic storage object path for legacy image migration.
 * Format: legacy/{entityType}/{safeEntityId}/{imageIndex}-{sha256}.{extension}
 */
export function buildDeterministicStoragePath(
  entityType: AllowedEntityType,
  safeEntityId: string,
  imageIndex: number,
  sha256: string,
  extension: string
): string {
  return `legacy/${entityType}/${safeEntityId}/${imageIndex}-${sha256}.${extension}`;
}

/**
 * Constructs tokenized Firebase Storage HTTPS delivery URL compatible with closed client rules.
 */
export function buildFirebaseDownloadUrl(
  bucketName: string,
  objectPath: string,
  downloadToken: string
): string {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}

/**
 * Core image upload processor shared between Vercel serverless function and Express server.
 * Implements strict payload validation, Base64 decoding, size limits, deterministic hashing,
 * idempotency check, and Firebase download token creation.
 */
export async function processImageUpload(
  payload: any,
  options?: {
    storageOverride?: StorageOverride;
    bucketName?: string;
  }
): Promise<ProcessImageUploadResult> {
  if (!payload || typeof payload !== 'object') {
    return {
      status: 400,
      body: { success: false, error: 'Corpo da requisição inválido.' }
    };
  }

  const { imageBase64, entityType, entityId, imageIndex } = payload;

  // 1. Validate entityType
  if (!entityType || typeof entityType !== 'string') {
    return {
      status: 400,
      body: { success: false, error: 'entityType é obrigatório.' }
    };
  }

  const normalizedEntityType = entityType.trim().toLowerCase();
  if (!ALLOWED_ENTITY_TYPES.includes(normalizedEntityType as AllowedEntityType)) {
    return {
      status: 400,
      body: {
        success: false,
        error: `entityType "${entityType}" inválido. Tipos permitidos: ${ALLOWED_ENTITY_TYPES.join(', ')}.`
      }
    };
  }

  // 2. Validate and sanitize entityId (strict path traversal defense)
  if (typeof entityId !== 'string' || !entityId.trim()) {
    return {
      status: 400,
      body: { success: false, error: 'entityId é obrigatório.' }
    };
  }

  const safeEntityId = sanitizeEntityId(entityId);
  if (!safeEntityId) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'entityId inválido ou tentativa de path traversal detectada.'
      }
    };
  }

  // 3. Validate imageIndex
  if (
    imageIndex === undefined ||
    imageIndex === null ||
    typeof imageIndex === 'boolean'
  ) {
    return {
      status: 400,
      body: { success: false, error: 'imageIndex é obrigatório.' }
    };
  }

  const parsedIndex = Number(imageIndex);
  if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'imageIndex deve ser um número inteiro não-negativo (ex: 0, 1, 2).'
      }
    };
  }

  // 4. Validate imageBase64 string
  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return {
      status: 400,
      body: { success: false, error: 'imageBase64 é obrigatório.' }
    };
  }

  const trimmedImage = imageBase64.trim();
  if (!trimmedImage.startsWith('data:')) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Formato de imagem inválido. Esperado Data URL (ex: data:image/webp;base64,...).'
      }
    };
  }

  // Parse Data URL: data:<mimeType>;base64,<base64Data>
  const dataUrlMatch = trimmedImage.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!dataUrlMatch) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Data URL mal formatado ou não codificado em base64.'
      }
    };
  }

  const rawMime = dataUrlMatch[1].trim().toLowerCase();
  const rawBase64 = dataUrlMatch[2].trim();

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES[rawMime]) {
    return {
      status: 415,
      body: {
        success: false,
        error: `Tipo de mídia não suportado: "${rawMime}". Formatos aceitos: image/jpeg, image/png, image/webp.`
      }
    };
  }

  const extension = ALLOWED_MIME_TYPES[rawMime];
  const normalizedMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;

  // Validate Base64 characters
  const cleanBase64 = rawBase64.replace(/[\r\n\s]/g, '');
  if (!cleanBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    return {
      status: 400,
      body: { success: false, error: 'Conteúdo Base64 inválido ou corrompido.' }
    };
  }

  // Decode Buffer
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    return {
      status: 400,
      body: { success: false, error: 'Falha ao decodificar Base64 da imagem.' }
    };
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    return {
      status: 400,
      body: { success: false, error: 'A imagem decodificada está vazia (0 bytes).' }
    };
  }

  // Enforce maximum size (5 MB)
  if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      status: 413,
      body: {
        success: false,
        error: `Imagem muito grande (${imageBuffer.length} bytes). O limite máximo permitido é 5 MB (${MAX_IMAGE_SIZE_BYTES} bytes).`
      }
    };
  }

  // 5. Deterministic hash & Storage path
  const sha256 = computeImageSha256(imageBuffer);
  const objectPath = buildDeterministicStoragePath(
    normalizedEntityType as AllowedEntityType,
    safeEntityId,
    parsedIndex,
    sha256,
    extension
  );

  const targetBucketName = options?.bucketName || FIREBASE_STORAGE_BUCKET;

  // 6. Access Firebase Storage
  const storage = options?.storageOverride || getAdminStorage();
  if (!storage) {
    console.error('[Admin Upload Image] Firebase Admin Storage não inicializado.');
    return {
      status: 500,
      body: {
        success: false,
        error: 'Serviço de armazenamento Firebase Storage indisponível no servidor.'
      }
    };
  }

  try {
    const bucket = storage.bucket(targetBucketName);
    const file = bucket.file(objectPath);

    // 7. Check if deterministic object already exists (Idempotent retry)
    const [exists] = await file.exists();
    if (exists) {
      const [metadata] = await file.getMetadata();
      let downloadToken = metadata?.metadata?.firebaseStorageDownloadTokens;

      if (!downloadToken || typeof downloadToken !== 'string') {
        downloadToken = crypto.randomUUID();
        await file.setMetadata({
          metadata: {
            firebaseStorageDownloadTokens: downloadToken
          }
        });
      }

      const activeToken = downloadToken.split(',')[0].trim();
      const downloadUrl = buildFirebaseDownloadUrl(targetBucketName, objectPath, activeToken);

      return {
        status: 200,
        body: {
          success: true,
          url: downloadUrl,
          objectPath,
          mimeType: metadata?.contentType || normalizedMime,
          size: Number(metadata?.size) || imageBuffer.length,
          reused: true
        }
      };
    }

    // 8. Upload exactly once if not exists
    const downloadToken = crypto.randomUUID();
    await file.save(imageBuffer, {
      contentType: normalizedMime,
      metadata: {
        contentType: normalizedMime,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      },
      resumable: false
    });

    const downloadUrl = buildFirebaseDownloadUrl(targetBucketName, objectPath, downloadToken);

    return {
      status: 200,
      body: {
        success: true,
        url: downloadUrl,
        objectPath,
        mimeType: normalizedMime,
        size: imageBuffer.length,
        reused: false
      }
    };
  } catch (err: any) {
    console.error('[Admin Upload Image] Storage error:', err?.message || 'Falha desconhecida no Storage');
    return {
      status: 500,
      body: {
        success: false,
        error: 'Falha ao persistir imagem no Firebase Storage.'
      }
    };
  }
}
