/**
 * SERVIÇO DE CONFIGURAÇÃO BLINDADO DO FIRESTORE (LAVISTORE)
 * 
 * Regras Estritas de Blindagem:
 * 1. Read-First: Leitura pura via getDoc()
 * 2. NUNCA executa setDoc() ou addDoc() durante inicialização ou carregamento
 * 3. Se o documento não existir, retorna { exists: false, data: null } sem gravar nada no banco
 * 4. Gravações (setDoc) acontecem EXCLUSIVAMENTE mediante ação manual explícita do administrador no painel
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestoreDb, isFirebaseReady } from './firebase';
import { AdminCustomVault } from '../utils/adminDataProtection';

export const FIRESTORE_SETTINGS_COLLECTION = 'settings';
export const FIRESTORE_STORE_CONFIG_DOC = 'store_config';

export interface FirestoreLoadResult {
  exists: boolean;
  data: Partial<AdminCustomVault> | null;
  source: 'firestore' | 'none';
}

/**
 * Carrega a configuração do Firestore seguindo rigorosamente o padrão Read-First.
 * NUNCA executa setDoc() nem grava dados padrão/seed se o documento não existir.
 */
export async function loadStoreConfigFromFirestore(): Promise<FirestoreLoadResult> {
  if (!isFirebaseReady()) {
    return { exists: false, data: null, source: 'none' };
  }

  const db = getFirestoreDb();
  if (!db) {
    return { exists: false, data: null, source: 'none' };
  }

  try {
    const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    
    // READ-FIRST: Apenas consulta a existência do documento
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AdminCustomVault>;
      console.info('[Firestore] ✅ Configurações soberanas carregadas do Firestore com sucesso!');
      return {
        exists: true,
        data,
        source: 'firestore'
      };
    } else {
      // Documento não existe (primeira instalação absoluta da loja).
      // REGRA DE OURO: NÃO executar setDoc com dados fake/padrão!
      console.info('[Firestore] ℹ️ Documento de configuração ainda não existe no Firestore. Mantendo fallback em memória sem persistir dados fakes.');
      return {
        exists: false,
        data: null,
        source: 'firestore'
      };
    }
  } catch (error: any) {
    console.warn('[Firestore] Falha na leitura do Firestore:', error?.message || error);
    return { exists: false, data: null, source: 'none' };
  }
}

/**
 * Salva as configurações no Firestore.
 * Invocada EXCLUSIVAMENTE quando o administrador clica em "Salvar" ou "Publicar" no painel.
 */
export async function saveStoreConfigToFirestore(payload: Partial<AdminCustomVault>): Promise<boolean> {
  if (!isFirebaseReady()) {
    return false;
  }

  const db = getFirestoreDb();
  if (!db) {
    return false;
  }

  try {
    const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    const sanitizedData = {
      ...payload,
      isLockedByAdmin: true,
      lastAdminSavedAt: payload.lastAdminSavedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Gravação segura apenas sob ordem do Admin
    await setDoc(configDocRef, sanitizedData, { merge: true });
    console.info('[Firestore] 🛡️ Configurações salvas e blindadas no Firestore pelo Administrador.');
    return true;
  } catch (error: any) {
    console.error('[Firestore] Erro ao gravar no Firestore:', error?.message || error);
    return false;
  }
}
