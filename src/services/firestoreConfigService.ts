/**
 * SERVIÇO DE CONFIGURAÇÃO E DADOS EM TEMPO REAL NO FIRESTORE (LAVISTORE)
 * 
 * Arquitetura de Sincronização em Nuvem:
 * 1. Ouvintes em Tempo Real (onSnapshot) para sincronização instantânea entre múltiplos dispositivos e usuários
 * 2. Operações assíncronas estritas (getDoc, getDocs, setDoc, updateDoc, deleteDoc)
 * 3. Sanitização contra valores 'undefined'
 * 4. Tratamento de erros estruturado através de handleFirestoreError
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { 
  getFirestoreDb, 
  isFirebaseReady, 
  handleFirestoreError, 
  OperationType, 
  removeUndefinedFields 
} from './firebase';
import { AdminCustomVault } from '../utils/adminDataProtection';
import { OrderData, NewsletterLead, BiProductCalculatedRecord, Product } from '../types';

export const FIRESTORE_SETTINGS_COLLECTION = 'settings';
export const FIRESTORE_STORE_CONFIG_DOC = 'store_config';
export const FIRESTORE_ORDERS_COLLECTION = 'orders';
export const FIRESTORE_LEADS_COLLECTION = 'newsletter_leads';
export const FIRESTORE_BI_COLLECTION = 'bi_records';

export interface FirestoreLoadResult {
  exists: boolean;
  data: Partial<AdminCustomVault> | null;
  source: 'firestore' | 'none';
}

/**
 * Registra um ouvinte em tempo real (onSnapshot) para as configurações e catálogo da loja.
 * Qualquer alteração feita pelo Administrador (produtos, preços, estoque, banner, frases)
 * reflete INSTANTANEAMENTE para todos os usuários e dispositivos conectados.
 */
export function subscribeToStoreConfig(
  callback: (data: Partial<AdminCustomVault>) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    console.warn('[Firestore] Firebase não está pronto para registrar listener em tempo real.');
    return () => {};
  }

  const path = `${FIRESTORE_SETTINGS_COLLECTION}/${FIRESTORE_STORE_CONFIG_DOC}`;
  const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);

  const unsubscribe = onSnapshot(
    configDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const rawData = docSnap.data() as Partial<AdminCustomVault>;
        callback(rawData);
      }
    },
    (error) => {
      console.warn('[Firestore onSnapshot] Erro ao escutar store_config:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}

/**
 * Carrega a configuração soberana do Firestore (leitura direta com getDoc).
 */
export async function loadStoreConfigFromFirestore(): Promise<FirestoreLoadResult> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    return { exists: false, data: null, source: 'none' };
  }

  const path = `${FIRESTORE_SETTINGS_COLLECTION}/${FIRESTORE_STORE_CONFIG_DOC}`;
  try {
    const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AdminCustomVault>;
      return {
        exists: true,
        data,
        source: 'firestore'
      };
    }
    return {
      exists: false,
      data: null,
      source: 'firestore'
    };
  } catch (error: any) {
    console.warn('[Firestore getDoc] Falha na leitura de store_config:', error?.message || error);
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch {
      // Ignora para permitir fallback de contingência
    }
    return { exists: false, data: null, source: 'none' };
  }
}

/**
 * Salva as configurações e catálogo no Firestore.
 * Utiliza setDoc com merge e sanitização profunda para garantir persistência global.
 */
export async function saveStoreConfigToFirestore(payload: Partial<AdminCustomVault>): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    console.warn('[Firestore] Banco não inicializado para gravação.');
    return false;
  }

  const path = `${FIRESTORE_SETTINGS_COLLECTION}/${FIRESTORE_STORE_CONFIG_DOC}`;
  try {
    const configDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    const sanitizedData = removeUndefinedFields({
      ...payload,
      isLockedByAdmin: true,
      lastAdminSavedAt: payload.lastAdminSavedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await setDoc(configDocRef, sanitizedData, { merge: true });
    console.info('[Firestore] 🛡️ Dados da loja salvos e sincronizados com sucesso no Firestore.');
    return true;
  } catch (error: any) {
    console.error('[Firestore setDoc] Erro ao gravar store_config:', error?.message || error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/* =========================================================================
 * PEDIDOS (ORDERS) - Real-Time & Operações Firestore
 * ========================================================================= */

/**
 * Registra ouvinte em tempo real para os pedidos da loja
 */
export function subscribeToOrders(
  callback: (orders: OrderData[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    return () => {};
  }

  const ordersCol = collection(db, FIRESTORE_ORDERS_COLLECTION);
  const q = query(ordersCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: OrderData[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as OrderData;
        orders.push({ ...data, orderId: data.orderId || d.id });
      });
      callback(orders);
    },
    (error) => {
      console.warn('[Firestore onSnapshot Orders]:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, FIRESTORE_ORDERS_COLLECTION);
    }
  );
}

/**
 * Busca a lista de pedidos do Firestore
 */
export async function fetchOrdersFromFirestore(): Promise<OrderData[]> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return [];

  try {
    const ordersCol = collection(db, FIRESTORE_ORDERS_COLLECTION);
    const snapshot = await getDocs(ordersCol);
    const orders: OrderData[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as OrderData;
      orders.push({ ...data, orderId: data.orderId || d.id });
    });
    return orders.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (error: any) {
    console.warn('[Firestore getDocs Orders]:', error);
    handleFirestoreError(error, OperationType.LIST, FIRESTORE_ORDERS_COLLECTION);
  }
}

/**
 * Grava um novo pedido ou atualiza pedido existente no Firestore
 */
export async function saveOrderToFirestore(order: OrderData): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return false;

  const orderId = order.orderId || `lav-order-${Date.now()}`;
  const path = `${FIRESTORE_ORDERS_COLLECTION}/${orderId}`;

  try {
    const orderDocRef = doc(db, FIRESTORE_ORDERS_COLLECTION, orderId);
    const sanitizedOrder = removeUndefinedFields({
      ...order,
      orderId,
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await setDoc(orderDocRef, sanitizedOrder, { merge: true });
    return true;
  } catch (error: any) {
    console.error('[Firestore setDoc Order]:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Atualiza status ou rastreamento de um pedido no Firestore
 */
export async function updateOrderStatusInFirestore(
  orderId: string, 
  customStatus?: string, 
  trackingCode?: string
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return false;

  const path = `${FIRESTORE_ORDERS_COLLECTION}/${orderId}`;
  try {
    const orderDocRef = doc(db, FIRESTORE_ORDERS_COLLECTION, orderId);
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (customStatus !== undefined) updatePayload.customStatus = customStatus;
    if (trackingCode !== undefined) updatePayload.trackingCode = trackingCode;

    await updateDoc(orderDocRef, updatePayload);
    return true;
  } catch (error: any) {
    console.error('[Firestore updateDoc Order]:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Remove todos os pedidos do Firestore
 */
export async function clearAllOrdersFromFirestore(): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return false;

  try {
    const ordersCol = collection(db, FIRESTORE_ORDERS_COLLECTION);
    const snapshot = await getDocs(ordersCol);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (error: any) {
    console.error('[Firestore clearAllOrders]:', error);
    handleFirestoreError(error, OperationType.DELETE, FIRESTORE_ORDERS_COLLECTION);
  }
}

/* =========================================================================
 * NEWSLETTER LEADS - Real-Time & Operações Firestore
 * ========================================================================= */

/**
 * Registra ouvinte em tempo real para os leads do Clube de Mimos
 */
export function subscribeToNewsletterLeads(
  callback: (leads: NewsletterLead[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    return () => {};
  }

  const leadsCol = collection(db, FIRESTORE_LEADS_COLLECTION);

  return onSnapshot(
    leadsCol,
    (snapshot) => {
      const leads: NewsletterLead[] = [];
      snapshot.forEach((d) => {
        leads.push({ ...(d.data() as NewsletterLead), id: d.id });
      });
      callback(leads.sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()));
    },
    (error) => {
      console.warn('[Firestore onSnapshot Leads]:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, FIRESTORE_LEADS_COLLECTION);
    }
  );
}

/**
 * Busca leads de newsletter diretamente do Firestore
 */
export async function fetchNewsletterLeadsFromFirestore(): Promise<NewsletterLead[]> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return [];

  try {
    const leadsCol = collection(db, FIRESTORE_LEADS_COLLECTION);
    const snapshot = await getDocs(leadsCol);
    const leads: NewsletterLead[] = [];
    snapshot.forEach((d) => {
      leads.push({ ...(d.data() as NewsletterLead), id: d.id });
    });
    return leads.sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
  } catch (error: any) {
    console.warn('[Firestore getDocs Leads]:', error);
    handleFirestoreError(error, OperationType.LIST, FIRESTORE_LEADS_COLLECTION);
  }
}

/**
 * Salva um novo lead de newsletter no Firestore
 */
export async function saveNewsletterLeadToFirestore(lead: NewsletterLead): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return false;

  const leadId = lead.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `${FIRESTORE_LEADS_COLLECTION}/${leadId}`;

  try {
    const leadDocRef = doc(db, FIRESTORE_LEADS_COLLECTION, leadId);
    const sanitizedLead = removeUndefinedFields({
      ...lead,
      id: leadId,
      registeredAt: lead.registeredAt || new Date().toISOString()
    });
    await setDoc(leadDocRef, sanitizedLead, { merge: true });
    return true;
  } catch (error: any) {
    console.error('[Firestore setDoc Lead]:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui um lead da newsletter no Firestore
 */
export async function deleteNewsletterLeadFromFirestore(leadId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return false;

  const path = `${FIRESTORE_LEADS_COLLECTION}/${leadId}`;
  try {
    const leadDocRef = doc(db, FIRESTORE_LEADS_COLLECTION, leadId);
    await deleteDoc(leadDocRef);
    return true;
  } catch (error: any) {
    console.error('[Firestore deleteDoc Lead]:', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* =========================================================================
 * REGISTROS DE BI FINANCEIRO - Real-Time & Operações Firestore
 * ========================================================================= */

/**
 * Registra ouvinte em tempo real para os registros do BI Financeiro
 */
export function subscribeToBiRecords(
  callback: (records: BiProductCalculatedRecord[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    return () => {};
  }

  const biDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, 'bi_data');

  return onSnapshot(
    biDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.records)) {
          callback(data.records);
        }
      }
    },
    (error) => {
      console.warn('[Firestore onSnapshot BI]:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `${FIRESTORE_SETTINGS_COLLECTION}/bi_data`);
    }
  );
}

/**
 * Busca registros de BI do Firestore
 */
export async function fetchBiRecordsFromFirestore(): Promise<BiProductCalculatedRecord[]> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return [];

  try {
    const biDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, 'bi_data');
    const snap = await getDoc(biDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.records)) {
        return data.records;
      }
    }
    return [];
  } catch (error: any) {
    console.warn('[Firestore getDoc BI]:', error);
    handleFirestoreError(error, OperationType.GET, `${FIRESTORE_SETTINGS_COLLECTION}/bi_data`);
  }
}

/**
 * Salva registros de BI no Firestore
 */
export async function saveBiRecordsToFirestore(records: BiProductCalculatedRecord[]): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return false;

  const path = `${FIRESTORE_SETTINGS_COLLECTION}/bi_data`;
  try {
    const biDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, 'bi_data');
    const sanitized = removeUndefinedFields({
      records,
      updatedAt: new Date().toISOString()
    });
    await setDoc(biDocRef, sanitized, { merge: true });
    return true;
  } catch (error: any) {
    console.error('[Firestore saveBiRecords]:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
