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

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let isConfigured = false;

function resolveFirebaseConfig() {
  // 1. Tentar ler do arquivo oficial provisionado firebase-applet-config.json
  if (firebaseAppletConfig && (firebaseAppletConfig as any).apiKey && (firebaseAppletConfig as any).projectId) {
    return firebaseAppletConfig;
  }

  // 2. Tentar ler de variáveis de ambiente Vite
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
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

  return null;
}

try {
  const config = resolveFirebaseConfig();
  if (config && config.apiKey && config.projectId) {
    if (getApps().length === 0) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }

    try {
      firestoreInstance = initializeFirestore(appInstance, {
        ignoreUndefinedProperties: true
      }, config.firestoreDatabaseId || '(default)');
    } catch {
      // Caso já tenha sido inicializado anteriormente
      firestoreInstance = getFirestore(appInstance, config.firestoreDatabaseId || '(default)');
    }

    authInstance = getAuth(appInstance);
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

export function getFirestoreDb(): Firestore | null {
  return firestoreInstance;
}

export { firestoreInstance as db, authInstance as auth, appInstance as app };
