/**
 * CONFIGURAÇÃO E INICIALIZAÇÃO SEGURA DO FIREBASE FIRESTORE (LAVISTORE)
 * 
 * Blindagem:
 * - Leitura das credenciais de firebase-applet-config.json ou VITE_FIREBASE_*
 * - Inicialização com ignoreUndefinedProperties: true para tolerância total a campos opcionais
 * - Teste de conexão ativo na inicialização
 * - Tratamento estrito de erros em conformidade com o padrão FirestoreErrorInfo
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  Firestore, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBhBlBv82oIsNaJ1HVHwbuJtFMwO9c1zps",
  authDomain: "lavistorekides.firebaseapp.com",
  projectId: "lavistorekides",
  storageBucket: "lavistorekides.firebasestorage.app",
  messagingSenderId: "65714504084",
  appId: "1:65714504084:web:10a5f97e8404e6c1a04f81",
  firestoreDatabaseId: "(default)"
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let isConfigured = false;

function resolveFirebaseConfig() {
  // 1. Tentar ler do arquivo oficial provisionado firebase-applet-config.json
  if (firebaseAppletConfig && (firebaseAppletConfig as any).apiKey && (firebaseAppletConfig as any).projectId) {
    return {
      ...DEFAULT_FIREBASE_CONFIG,
      ...firebaseAppletConfig,
      storageBucket: (firebaseAppletConfig as any).storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
      firestoreDatabaseId: (firebaseAppletConfig as any).firestoreDatabaseId || '(default)'
    };
  }

  // 2. Tentar ler de variáveis de ambiente Vite
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
      firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
    };
  }

  // 3. Tentar ler de objeto injetado no window (ex: script ou ambiente de deploy)
  if (typeof window !== 'undefined') {
    const winConfig = (window as any).__FIREBASE_CONFIG__;
    if (winConfig && winConfig.apiKey && winConfig.projectId) {
      return winConfig;
    }
  }

  return DEFAULT_FIREBASE_CONFIG;
}

try {
  const config = resolveFirebaseConfig();
  if (config && config.apiKey && config.projectId) {
    if (getApps().length === 0) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }

    const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' ? config.firestoreDatabaseId : undefined;
    try {
      firestoreInstance = dbId 
        ? initializeFirestore(appInstance, { ignoreUndefinedProperties: true }, dbId)
        : initializeFirestore(appInstance, { ignoreUndefinedProperties: true });
    } catch {
      // Caso já tenha sido inicializado anteriormente
      firestoreInstance = dbId
        ? getFirestore(appInstance, dbId)
        : getFirestore(appInstance);
    }

    authInstance = getAuth(appInstance);

    if (config.storageBucket) {
      try {
        storageInstance = getStorage(appInstance, `gs://${config.storageBucket.replace(/^gs:\/\//, '')}`);
        console.info('[Firebase] Storage configurado com bucket:', config.storageBucket);
      } catch (sErr: any) {
        console.warn('[Firebase Storage] Aviso ao inicializar Storage:', sErr?.message || sErr);
      }
    }

    isConfigured = true;
    console.info('[Firebase] Firestore inicializado com sucesso para o projeto:', config.projectId);

    // Teste de conexão não-bloqueante
    testConnection();
  } else {
    console.info('[Firebase] Configuração do Firebase não detectada no ambiente. Operando com API Express de contingência.');
  }
} catch (err: any) {
  console.warn('[Firebase] Aviso ao inicializar Firebase:', err?.message || err);
}

/**
 * Validação de conectividade ativa com o Firestore
 */
export async function testConnection(): Promise<boolean> {
  if (!firestoreInstance) return false;
  try {
    await getDocFromServer(doc(firestoreInstance, 'settings', 'store_config'));
    console.info('[Firebase] ✅ Conexão ao vivo com o Firestore confirmada.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] O cliente Firestore está em modo offline no momento.');
    }
    return false;
  }
}

/**
 * Tratador padronizado de erros do Firestore com contexto estruturado
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = authInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    }
  };
  console.error('[Firebase Error] ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Utilitário recursivo para remover propriedades undefined de objetos antes da gravação no Firestore
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefinedFields(value);
      }
    }
    return result as T;
  }
  return obj;
}

export function isFirebaseReady(): boolean {
  return isConfigured && firestoreInstance !== null;
}

export function isFirebaseStorageReady(): boolean {
  return isConfigured && storageInstance !== null;
}

export function getFirestoreDb(): Firestore | null {
  return firestoreInstance;
}

export function getStorageInstance(): FirebaseStorage | null {
  return storageInstance;
}

export class UploadImageError extends Error {
  status: number;
  constructor(message: string, status: number = 0) {
    super(message);
    this.name = 'UploadImageError';
    this.status = status;
  }
}

export interface UploadProductImageOptions {
  entityType: 'product' | 'product-color';
  entityId: string;
  imageIndex?: number;
  slotId?: string;
}

export async function blobToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Falha ao converter imagem para transmissão.'));
        }
      };
      reader.onerror = () => reject(new Error('Erro na leitura da imagem para upload.'));
      reader.readAsDataURL(fileOrBlob);
    });
  }
  // Fallback para Node.js / testes
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const type = fileOrBlob.type || 'image/jpeg';
  return `data:${type};base64,${buffer.toString('base64')}`;
}

/**
 * Faz upload seguro de imagem comprimida para o backend administrativo
 * (POST /api/admin/upload-image com mode: "admin") e retorna exclusivamente
 * a URL HTTPS pública tokenizada do Firebase Admin Storage.
 * NUNCA armazena Data URL / Base64 e não utiliza o Firebase Web Storage SDK.
 */
export async function uploadProductImage(
  fileOrBlob: File | Blob,
  options: UploadProductImageOptions
): Promise<string> {
  if (!fileOrBlob) {
    throw new UploadImageError('Nenhum arquivo ou imagem fornecido para upload.', 400);
  }

  if (!options || typeof options !== 'object') {
    throw new UploadImageError('Opções semânticas de upload não fornecidas.', 400);
  }

  const entityId = options.entityId?.trim();
  if (!entityId) {
    throw new UploadImageError('MISSING_PRODUCT_ID: O identificador estável do produto (entityId) é obrigatório.', 400);
  }

  if (options.entityType === 'product') {
    if (
      options.imageIndex === undefined ||
      options.imageIndex === null ||
      typeof options.imageIndex !== 'number' ||
      !Number.isInteger(options.imageIndex) ||
      options.imageIndex < 0
    ) {
      throw new UploadImageError('INVALID_IMAGE_INDEX: O índice da imagem do produto (imageIndex) deve ser um número inteiro >= 0.', 400);
    }
  } else if (options.entityType === 'product-color') {
    if (!options.slotId || typeof options.slotId !== 'string' || !options.slotId.trim()) {
      throw new UploadImageError('INVALID_SLOT_ID: O identificador da variação de cor (slotId) é obrigatório.', 400);
    }
  } else {
    throw new UploadImageError(`INVALID_ENTITY_TYPE: Tipo de entidade não suportado: ${(options as any).entityType}`, 400);
  }

  // 1. Converte o Blob para Data URL exclusivamente em memória para transporte HTTP
  const imageBase64 = await blobToDataUrl(fileOrBlob);

  const payload: Record<string, any> = {
    mode: 'admin',
    imageBase64,
    entityType: options.entityType,
    entityId
  };

  if (options.entityType === 'product') {
    payload.imageIndex = options.imageIndex;
  } else {
    payload.slotId = options.slotId!.trim();
  }

  // 2. Timeout limitado a 20 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000);

  let response: Response;
  try {
    response = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (netErr?.name === 'AbortError') {
      throw new UploadImageError('TIMEOUT: O tempo limite de 20 segundos para envio da imagem expirou. Verifique sua conexão e tente novamente.', 408);
    }
    throw new UploadImageError(`Falha de rede ou conexão ao enviar imagem: ${netErr?.message || 'Erro de rede desconhecido'}`, 0);
  } finally {
    clearTimeout(timeoutId);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    throw new UploadImageError('Sua sessão administrativa expirou. Faça login novamente para enviar imagens.', 401);
  }

  if (response.status === 413) {
    throw new UploadImageError('A imagem selecionada excede o limite máximo permitido de 5 MB.', 413);
  }

  if (response.status === 415) {
    throw new UploadImageError('Formato de imagem não suportado. Utilize imagens no formato JPEG, PNG ou WebP.', 415);
  }

  if (response.status === 400) {
    throw new UploadImageError(data?.error || 'Dados da requisição de imagem inválidos.', 400);
  }

  if (response.status >= 500) {
    throw new UploadImageError(data?.error || 'Erro interno no servidor de upload de imagens.', response.status);
  }

  if (!response.ok) {
    throw new UploadImageError(data?.error || `Falha no upload com código HTTP ${response.status}`, response.status);
  }

  if (!data || data.success !== true) {
    throw new UploadImageError(data?.error || 'O servidor não confirmou o upload com sucesso.', response.status);
  }

  if (!data.url || typeof data.url !== 'string' || !data.url.startsWith('https://')) {
    throw new UploadImageError('INVALID_BACKEND_URL: A URL retornada pelo servidor não é uma URL HTTPS válida.', 500);
  }

  return data.url;
}

export { firestoreInstance as db, authInstance as auth, appInstance as app, storageInstance as storage };
