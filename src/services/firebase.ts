/**
 * CONFIGURAÇÃO E INICIALIZAÇÃO SEGURA DO FIREBASE FIRESTORE (LAVISTORE)
 * 
 * Blindagem:
 * - Leitura das credenciais a partir de firebase-applet-config.json ou variáveis VITE_FIREBASE_*
 * - Inicialização singleton resiliente (não falha em ambiente sem credenciais configuradas)
 * - NUNCA executa rotinas de seed automático
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let isConfigured = false;

function resolveFirebaseConfig() {
  // 1. Tentar ler de variáveis de ambiente Vite
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

  // 2. Tentar ler de objeto injetado no window (ex: script ou ambiente de deploy)
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
    firestoreInstance = getFirestore(appInstance);
    isConfigured = true;
    console.info('[Firebase] Firestore inicializado com sucesso para o projeto:', config.projectId);
  } else {
    // Configuração ausente: sistema funcionará com a camada de API Express segura
    console.info('[Firebase] Configuração do Firebase não detectada no ambiente. Operando com API Express protegida.');
  }
} catch (err: any) {
  console.warn('[Firebase] Aviso ao inicializar Firebase:', err?.message || err);
}

export function isFirebaseReady(): boolean {
  return isConfigured && firestoreInstance !== null;
}

export function getFirestoreDb(): Firestore | null {
  return firestoreInstance;
}

export { firestoreInstance as db };
