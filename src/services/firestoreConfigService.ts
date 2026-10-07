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
  Unsubscribe,
  deleteField
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
export const FIRESTORE_LAVISTOREKIDES_COLLECTION = 'lavistorekides';
export const FIRESTORE_STORE_CONFIG_DOC = 'store_config';
export const FIRESTORE_MELHOR_ENVIO_DOC = 'melhor_envio_token';
export const FIRESTORE_ORDERS_COLLECTION = 'orders';
export const FIRESTORE_LEADS_COLLECTION = 'newsletter_leads';
export const FIRESTORE_BI_COLLECTION = 'bi_records';

export interface FirestoreLoadResult {
  exists: boolean;
  data: Partial<AdminCustomVault> | null;
  source: 'firestore' | 'none';
}

/**
 * FASE F — SANITIZAÇÃO E DESACOPLAMENTO CENTRALIZADO
 * Sanitiza defensivamente qualquer payload destinado ao documento settings/store_config,
 * garantindo que biRecords NUNCA seja incluído em store_config.
 * O banco de dados de BI permanece de forma exclusiva e soberana em settings/bi_data.
 */
export function sanitizeStoreConfigPayload<T extends Record<string, any>>(payload: T): Omit<T, 'biRecords'> {
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };
  delete (clean as any).biRecords;
  return clean;
}

/**
 * FASE H5 — CENTRALIZED BASE64 FIRESTORE GUARD
 * 
 * Classe de erro específica para violações da barreira de imagens em Base64 no Firestore.
 * Não expõe dados em Base64 nem segredos.
 */
export class Base64FirestoreGuardError extends Error {
  path: string;
  constructor(message: string, path: string) {
    super(message);
    this.name = 'Base64FirestoreGuardError';
    this.path = path;
  }
}

/**
 * Regra de detecção estrita e resiliente a variações de whitespace e case.
 * Identifica URLs de dados de imagem (ex: data:image/jpeg;base64,..., data:image/png;base64, etc.)
 * Não rejeita strings ordinárias que apenas contenham a palavra "base64" (ex: "base64-test-id", "https://.../base64").
 */
export function isBase64ImageUrl(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return val.trim().toLowerCase().startsWith('data:image/');
}

/**
 * Percorre recursivamente objetos simples, arrays e estruturas aninhadas à procura de Data URLs de imagens.
 * Retorna o caminho lógico da primeira violação encontrada (ex: "heroConfig.image", "products[0].images[0]", etc.)
 * ou null se o payload for seguro.
 */
export function findBase64ImagePath(payload: unknown, currentPath = ''): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  if (typeof payload === 'string') {
    if (isBase64ImageUrl(payload)) {
      return currentPath || 'root';
    }
    return null;
  }
  if (Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i++) {
      const itemPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
      const found = findBase64ImagePath(payload[i], itemPath);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === 'object') {
    if (payload instanceof Date) return null;
    for (const [key, value] of Object.entries(payload)) {
      const propPath = currentPath ? `${currentPath}.${key}` : key;
      const found = findBase64ImagePath(value, propPath);
      if (found) return found;
    }
    return null;
  }
  return null;
}

/**
 * Validador de barreira defensiva centralizada.
 * Bloqueia a persistência ANTES do envio ao Firestore caso qualquer Data URL de imagem seja encontrada.
 * Não altera ou limpa silenciosamente os dados; falha ruidosamente identificando o campo lógico.
 */
export function assertNoBase64Images(payload: unknown, contextPath = ''): void {
  const offendingPath = findBase64ImagePath(payload, contextPath);
  if (offendingPath) {
    throw new Base64FirestoreGuardError(
      `[BASE64_GUARD] Firestore write blocked: image Data URL detected at "${offendingPath}". Upload the image to Storage before saving.`,
      offendingPath
    );
  }
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
        // Sanitiza para garantir que a interface consuma apenas dados soberanos de vitrine
        const cleanData = sanitizeStoreConfigPayload(rawData);
        callback(cleanData);
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
      const rawData = docSnap.data() as Partial<AdminCustomVault>;
      // Sanitiza para remover qualquer resquício legado de biRecords
      const data = sanitizeStoreConfigPayload(rawData);
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
 * FASE F1 & F3: Safeguard centralizado e blindagem arquitetural.
 * O documento settings/store_config deve conter EXCLUSIVAMENTE configurações da vitrine.
 * biRecords é totalmente expurgado deste payload e eliminado do documento remoto via deleteField().
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

    // 1. Sanitização defensiva na camada de persistência
    const cleanStorefrontPayload = sanitizeStoreConfigPayload(payload);

    const sanitizedData = removeUndefinedFields({
      ...cleanStorefrontPayload,
      isLockedByAdmin: true,
      lastAdminSavedAt: payload.lastAdminSavedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Garantia explícita: biRecords NUNCA deve ser gravado como dado em store_config
    delete (sanitizedData as any).biRecords;

    // 3. FASE H5: Guarda defensiva centralizada contra imagens Base64 no payload final de store_config
    assertNoBase64Images(sanitizedData);

    // 4. FASE F3: Remoção atômica do campo legado biRecords no Firestore sem intervenção manual.
    // deleteField() remove a duplicação legada enquanto { merge: true } preserva outros campos
    // como melhorEnvioToken configurados no documento.
    const writePayload = {
      ...sanitizedData,
      biRecords: deleteField()
    };

    await setDoc(configDocRef, writePayload, { merge: true });
    console.info('[Firestore] 🛡️ Dados da loja salvos e sincronizados com sucesso no Firestore (sem duplicação de biRecords).');
    return true;
  } catch (error: any) {
    if (error instanceof Base64FirestoreGuardError) {
      console.error('[Firestore Guard Blocked]:', error.message);
      throw error;
    }
    console.error('[Firestore setDoc] Erro ao gravar store_config:', error?.message || error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Atualiza o status de publicação unificado de um produto e dos seus registros de BI no Firestore.
 * Garante sincronização imediata no documento store_config e bi_data da coleção settings.
 */
export async function updateProductPublicationStatusInFirestore(
  productId: string,
  isPublished: boolean,
  updatedProducts: Product[],
  updatedBiRecords?: BiProductCalculatedRecord[]
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    console.warn('[Firestore] Banco não inicializado para persistência de publicação.');
    return false;
  }

  try {
    // 1. Grava no documento store_config com merge (expurgando biRecords)
    const storeDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    const sanitizedStoreData = removeUndefinedFields({
      products: updatedProducts,
      isLockedByAdmin: true,
      updatedAt: new Date().toISOString(),
      biRecords: deleteField()
    });
    // FASE H5: Guarda defensiva contra Base64 na vitrine
    assertNoBase64Images(sanitizedStoreData);
    await setDoc(storeDocRef, sanitizedStoreData, { merge: true });

    // 2. Se houver registros de BI, grava no documento bi_data
    if (updatedBiRecords && updatedBiRecords.length > 0) {
      const biDocRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, 'bi_data');
      const sanitizedBiData = removeUndefinedFields({
        records: updatedBiRecords,
        updatedAt: new Date().toISOString()
      });
      // FASE H5: Guarda defensiva contra Base64 no BI
      assertNoBase64Images(sanitizedBiData);
      await setDoc(biDocRef, sanitizedBiData, { merge: true });
    }

    console.info(`[Firestore] 🚀 Status de publicação de "${productId}" sincronizado no Firestore (isPublished=${isPublished})`);
    return true;
  } catch (error: any) {
    if (error instanceof Base64FirestoreGuardError) {
      console.error('[Firestore Guard Blocked]:', error.message);
      throw error;
    }
    console.error('[Firestore updateProductPublicationStatus]:', error);
    handleFirestoreError(error, OperationType.WRITE, `${FIRESTORE_SETTINGS_COLLECTION}/${FIRESTORE_STORE_CONFIG_DOC}`);
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
    // FASE H5: Guarda defensiva centralizada contra imagens Base64 no payload final de BI
    assertNoBase64Images(sanitized);

    await setDoc(biDocRef, sanitized, { merge: true });
    return true;
  } catch (error: any) {
    if (error instanceof Base64FirestoreGuardError) {
      console.error('[Firestore Guard Blocked BI]:', error.message);
      throw error;
    }
    console.error('[Firestore saveBiRecords]:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/* =========================================================================
 * INTEGRAÇÃO MELHOR ENVIO - TOKENS & CONFIGURAÇÃO NA COLEÇÃO LAVISTOREKIDES
 * ========================================================================= */

export interface FirestoreMelhorEnvioTokenData {
  token: string;
  access_token: string;
  token_type: string;
  source: 'manual' | 'oauth' | 'firestore';
  updatedAt: string;
  updated_at: string;
  env: string;
  configured: boolean;
}

/**
 * Salva o Bearer Token do Melhor Envio diretamente no Firebase Firestore
 * na coleção solicitada "lavistorekides" (e espelho em "settings"),
 * garantindo persistência sem depender exclusivamente de rotas de API no servidor.
 */
export async function saveMelhorEnvioTokenToFirestore(token: string): Promise<boolean> {
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken || cleanToken.length < 10) {
    console.warn('[Firestore] Token inválido ou muito curto ao salvar no Firestore.');
    return false;
  }

  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) {
    console.warn('[Firestore] Banco não inicializado para gravação do token do Melhor Envio.');
    return false;
  }

  const now = new Date().toISOString();
  const tokenPayload: FirestoreMelhorEnvioTokenData = {
    token: cleanToken,
    access_token: cleanToken,
    token_type: 'Bearer',
    source: 'manual',
    updatedAt: now,
    updated_at: now,
    env: 'production',
    configured: true
  };

  try {
    // 1. Salvar na coleção lavistorekides (documento melhor_envio_token)
    const lavRef = doc(db, FIRESTORE_LAVISTOREKIDES_COLLECTION, FIRESTORE_MELHOR_ENVIO_DOC);
    await setDoc(lavRef, tokenPayload, { merge: true });

    // 2. Salvar também em lavistorekides/store_config para sincronização unificada da loja
    const lavStoreRef = doc(db, FIRESTORE_LAVISTOREKIDES_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    await setDoc(lavStoreRef, {
      melhorEnvioToken: cleanToken,
      melhorEnvioConfig: tokenPayload,
      updatedAt: now
    }, { merge: true });

    // 3. Salvar também na coleção padrão settings (store_config e melhor_envio_token)
    const settingsTokenRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_MELHOR_ENVIO_DOC);
    await setDoc(settingsTokenRef, tokenPayload, { merge: true });

    const settingsStoreRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC);
    await setDoc(settingsStoreRef, {
      melhorEnvioToken: cleanToken,
      melhorEnvioConfig: tokenPayload,
      updatedAt: now
    }, { merge: true });

    console.info(`[Firestore] 🛡️ Token do Melhor Envio gravado com sucesso nas coleções "${FIRESTORE_LAVISTOREKIDES_COLLECTION}" e "${FIRESTORE_SETTINGS_COLLECTION}".`);
    return true;
  } catch (error: any) {
    console.error('[Firestore saveMelhorEnvioTokenToFirestore] Erro:', error?.message || error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `${FIRESTORE_LAVISTOREKIDES_COLLECTION}/${FIRESTORE_MELHOR_ENVIO_DOC}`);
    } catch {
      // Ignora para permitir fallback de contingência
    }
    return false;
  }
}

/**
 * Carrega o token do Melhor Envio diretamente do Firebase Firestore,
 * consultando primeiro a coleção lavistorekides e depois settings.
 */
export async function loadMelhorEnvioTokenFromFirestore(): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return null;

  try {
    // 1. Tenta ler de lavistorekides/melhor_envio_token
    const lavDoc = await getDoc(doc(db, FIRESTORE_LAVISTOREKIDES_COLLECTION, FIRESTORE_MELHOR_ENVIO_DOC));
    if (lavDoc.exists()) {
      const data = lavDoc.data();
      const token = data?.token || data?.access_token;
      if (token && typeof token === 'string' && token.trim().length > 10) {
        return token.trim();
      }
    }

    // 2. Tenta ler de lavistorekides/store_config
    const lavStoreDoc = await getDoc(doc(db, FIRESTORE_LAVISTOREKIDES_COLLECTION, FIRESTORE_STORE_CONFIG_DOC));
    if (lavStoreDoc.exists()) {
      const data = lavStoreDoc.data();
      const token = data?.melhorEnvioToken || data?.melhorEnvioConfig?.access_token || data?.melhorEnvioConfig?.token;
      if (token && typeof token === 'string' && token.trim().length > 10) {
        return token.trim();
      }
    }

    // 3. Tenta ler de settings/melhor_envio_token
    const setDocRef = await getDoc(doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_MELHOR_ENVIO_DOC));
    if (setDocRef.exists()) {
      const data = setDocRef.data();
      const token = data?.token || data?.access_token;
      if (token && typeof token === 'string' && token.trim().length > 10) {
        return token.trim();
      }
    }

    // 4. Tenta ler de settings/store_config
    const storeDocRef = await getDoc(doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_STORE_CONFIG_DOC));
    if (storeDocRef.exists()) {
      const data = storeDocRef.data();
      const token = data?.melhorEnvioToken || data?.melhorEnvioConfig?.access_token || data?.melhorEnvioConfig?.token;
      if (token && typeof token === 'string' && token.trim().length > 10) {
        return token.trim();
      }
    }
  } catch (err: any) {
    console.warn('[Firestore loadMelhorEnvioTokenFromFirestore] Erro ao recuperar token:', err?.message || err);
  }
  return null;
}

/**
 * Registra um ouvinte em tempo real para atualizações do token do Melhor Envio
 */
export function subscribeToMelhorEnvioToken(
  callback: (token: string | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !isFirebaseReady()) return () => {};

  const lavRef = doc(db, FIRESTORE_LAVISTOREKIDES_COLLECTION, FIRESTORE_MELHOR_ENVIO_DOC);
  return onSnapshot(
    lavRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const token = data?.token || data?.access_token || null;
        callback(token);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('[Firestore subscribeToMelhorEnvioToken] Erro no listener:', error);
      if (onError) onError(error);
    }
  );
}

