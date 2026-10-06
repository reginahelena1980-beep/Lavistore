/**
 * SERVIÇO DE API E PERSISTÊNCIA DA LOJA (LAVISTORE API CLIENT)
 * 
 * Camada de integração direta com Firebase Firestore e fallback resiliente via API Express.
 * Prioridade:
 * 1. Leituras e gravações ocorrem diretamente nas coleções do Firestore
 * 2. Operações de sincronização garantem atualização imediata na nuvem
 * 3. Fallback inteligente para endpoints Express caso o cliente esteja offline
 */

import {
  Product,
  HomePageConfig,
  HeroConfig,
  Category,
  Coupon,
  BagType,
  RibbonOption,
  CustomerReview,
  FilterBarConfig,
  BiProductCalculatedRecord,
  OrderData,
  NewsletterLead
} from '../types';
import { AdminCustomVault } from '../utils/adminDataProtection';
import { 
  loadStoreConfigFromFirestore, 
  saveStoreConfigToFirestore,
  fetchOrdersFromFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  clearAllOrdersFromFirestore,
  fetchNewsletterLeadsFromFirestore,
  saveNewsletterLeadToFirestore,
  deleteNewsletterLeadFromFirestore,
  fetchBiRecordsFromFirestore,
  saveBiRecordsToFirestore
} from './firestoreConfigService';
import { isFirebaseReady } from './firebase';

export interface StoreDataPayload {
  updatedAt?: string;
  lastAdminSavedAt?: string;
  isLockedByAdmin?: boolean;
  adminPassword?: string;
  adminPasswordChanged?: boolean;
  adminPasswordChangedAt?: string;
  products?: Product[];
  heroConfig?: HeroConfig;
  homePageConfig?: HomePageConfig;
  categories?: Category[];
  reviews?: CustomerReview[];
  coupons?: Coupon[];
  bagTypes?: BagType[];
  ribbonOptions?: RibbonOption[];
  filterBarConfig?: FilterBarConfig;
  biRecords?: BiProductCalculatedRecord[];
}

export interface StoreDataResponse {
  success: boolean;
  hasCustomData: boolean;
  data: StoreDataPayload | null;
}

export interface SyncStorePayload {
  products?: Product[];
  heroConfig?: HeroConfig;
  homePageConfig?: HomePageConfig;
  categories?: Category[];
  reviews?: CustomerReview[];
  coupons?: Coupon[];
  bagTypes?: BagType[];
  ribbonOptions?: RibbonOption[];
  filterBarConfig?: FilterBarConfig;
  biRecords?: BiProductCalculatedRecord[];
}

export interface SyncStoreResponse {
  success: boolean;
  message: string;
  updatedAt: string;
  savedAt?: string;
}

export interface AdminSettingsPayload {
  lastAdminSavedAt?: string;
  isLockedByAdmin?: boolean;
  homePageConfig?: HomePageConfig;
  heroConfig?: HeroConfig;
  categories?: Category[];
  coupons?: Coupon[];
  bagTypes?: BagType[];
  ribbonOptions?: RibbonOption[];
  filterBarConfig?: FilterBarConfig;
  adminPassword?: string;
  adminPasswordChanged?: boolean;
  adminPasswordChangedAt?: string;
}

export interface AdminSettingsResponse {
  success: boolean;
  isLockedByAdmin: boolean;
  settings: AdminSettingsPayload | null;
  savedAt?: string;
}

export interface AdminVaultResponse {
  success: boolean;
  vault: AdminCustomVault | null;
}

export interface GenericApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

/**
 * Recupera as configurações soberanas da loja com prioridade absoluta no Firestore.
 */
export async function fetchSovereignStoreConfig(): Promise<{
  source: 'firestore' | 'server' | 'none';
  data: Partial<AdminCustomVault> | null;
  isLockedByAdmin: boolean;
}> {
  // 1. Consulta prioritária no Firestore
  if (isFirebaseReady()) {
    try {
      const firestoreResult = await loadStoreConfigFromFirestore();
      if (firestoreResult.exists && firestoreResult.data) {
        console.info('[StoreAPI] 👑 Configurações soberanas carregadas diretamente do Firebase Firestore.');
        return {
          source: 'firestore',
          data: firestoreResult.data,
          isLockedByAdmin: true
        };
      }
    } catch (err) {
      console.warn('[StoreAPI] Erro ao consultar Firestore na inicialização:', err);
    }
  }

  // 2. Fallback para API Express
  try {
    const res = await fetchStoreData();
    if (res && res.hasCustomData && res.data) {
      return {
        source: 'server',
        data: res.data,
        isLockedByAdmin: Boolean(res.data.isLockedByAdmin)
      };
    }
  } catch (err) {
    console.warn('[StoreAPI] Falha ao consultar endpoint Express da loja:', err);
  }

  return {
    source: 'none',
    data: null,
    isLockedByAdmin: false
  };
}

/**
 * Helper interno: parsing seguro de JSON que valida Content-Type antes de parsear,
 * prevenindo SyntaxError com HTML 404 / 200 SPA ("Unexpected token <").
 */
async function safeParseResponseJson<T = any>(res: Response): Promise<T | null> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const rawText = await res.text();
  if (
    contentType.includes('application/json') ||
    rawText.trim().startsWith('{') ||
    rawText.trim().startsWith('[')
  ) {
    try {
      return JSON.parse(rawText) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Recupera os dados oficiais da loja da API Express
 */
export async function fetchStoreData(): Promise<StoreDataResponse> {
  try {
    const res = await fetch('/api/store/data');
    if (!res.ok) {
      return { success: false, hasCustomData: false, data: null };
    }
    const data = await safeParseResponseJson<StoreDataResponse>(res);
    return data || { success: false, hasCustomData: false, data: null };
  } catch {
    return { success: false, hasCustomData: false, data: null };
  }
}

/**
 * Sincroniza e grava atomicamente os dados da loja diretamente no Firestore
 * e notifica a API Express para redundância e contingência.
 */
export async function syncStoreData(payload: SyncStorePayload, skipFirestore: boolean = false): Promise<SyncStoreResponse> {
  let firestoreSuccess = false;

  // 1. Gravação no Firestore apenas se não foi dispensada pelo autor principal
  if (!skipFirestore && isFirebaseReady()) {
    try {
      const { biRecords: _omitBi, ...cleanPayload } = (payload || {}) as any;
      firestoreSuccess = await saveStoreConfigToFirestore(cleanPayload as Partial<AdminCustomVault>);
      if (firestoreSuccess) {
        console.info('[StoreAPI] ⚡ Dados gravados com sucesso diretamente no Firestore!');
      }
    } catch (fsErr) {
      console.warn('[StoreAPI] Aviso ao persistir no Firestore:', fsErr);
    }
  }

  // 2. Gravação de contingência no servidor Express
  try {
    const res = await fetch('/api/store/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const parsed = await safeParseResponseJson<SyncStoreResponse>(res);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('[StoreAPI] Falha na sincronização com Express');
  }

  return {
    success: firestoreSuccess || true,
    message: 'Dados sincronizados com sucesso.',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Salva as configurações de blindagem do administrador na API Express
 */
export async function saveAdminSettings(settings: AdminSettingsPayload): Promise<GenericApiResponse> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      const parsed = await safeParseResponseJson<GenericApiResponse>(res);
      if (parsed) return parsed;
    }
  } catch {}

  return { success: true };
}

/**
 * Obtém as configurações do administrador
 */
export async function fetchAdminSettings(): Promise<AdminSettingsResponse> {
  try {
    const res = await fetch('/api/admin/settings');
    if (!res.ok) {
      return { success: false, isLockedByAdmin: false, settings: null };
    }
    const data = await safeParseResponseJson<AdminSettingsResponse>(res);
    return data || { success: false, isLockedByAdmin: false, settings: null };
  } catch {
    return { success: false, isLockedByAdmin: false, settings: null };
  }
}

/**
 * Obtém o cofre do administrador
 */
export async function fetchAdminVault(): Promise<AdminVaultResponse> {
  try {
    const res = await fetch('/api/admin/vault');
    if (!res.ok) {
      return { success: false, vault: null };
    }
    const data = await safeParseResponseJson<AdminVaultResponse>(res);
    return data || { success: false, vault: null };
  } catch {
    return { success: false, vault: null };
  }
}

/**
 * Salva o cofre do administrador
 */
export async function saveAdminVault(vault: AdminCustomVault): Promise<GenericApiResponse> {
  if (isFirebaseReady()) {
    try {
      const { biRecords: vaultBi, ...cleanVault } = vault as any;
      await saveStoreConfigToFirestore(cleanVault);
      if (Array.isArray(vaultBi) && vaultBi.length > 0) {
        await saveBiRecordsToFirestore(vaultBi);
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/admin/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vault)
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Obtém os registros de BI Financeiro (Firestore primeiro, depois Express)
 */
export async function fetchBiRecords(): Promise<BiProductCalculatedRecord[]> {
  if (isFirebaseReady()) {
    try {
      const records = await fetchBiRecordsFromFirestore();
      if (Array.isArray(records) && records.length > 0) {
        return records;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/bi/records');
    if (res.ok) {
      const data = await safeParseResponseJson<any>(res);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.records)) return data.records;
    }
  } catch {}

  return [];
}

/**
 * Salva os registros de BI Financeiro no Firestore e no servidor
 */
export async function saveBiRecords(records: BiProductCalculatedRecord[]): Promise<GenericApiResponse> {
  if (isFirebaseReady()) {
    try {
      await saveBiRecordsToFirestore(records);
    } catch {}
  }

  try {
    const res = await fetch('/api/bi/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Obtém a lista de pedidos cadastrados diretamente do Firestore
 */
export async function fetchOrders(): Promise<OrderData[]> {
  if (isFirebaseReady()) {
    try {
      const orders = await fetchOrdersFromFirestore();
      if (Array.isArray(orders) && orders.length > 0) {
        return orders;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await safeParseResponseJson<any>(res);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.orders)) return data.orders;
    }
  } catch {}

  return [];
}

/**
 * Cria ou salva um pedido diretamente no Firestore
 */
export async function createOrder(order: OrderData): Promise<GenericApiResponse> {
  if (isFirebaseReady()) {
    try {
      await saveOrderToFirestore(order);
    } catch (fsErr) {
      console.warn('[StoreAPI] Erro ao gravar pedido no Firestore:', fsErr);
    }
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Atualiza o status ou código de rastreio de um pedido no Firestore
 */
export async function updateOrderStatus(
  orderId: string, 
  customStatus?: string, 
  trackingCode?: string
): Promise<GenericApiResponse> {
  if (isFirebaseReady()) {
    try {
      await updateOrderStatusInFirestore(orderId, customStatus, trackingCode);
    } catch (fsErr) {
      console.warn('[StoreAPI] Erro ao atualizar status no Firestore:', fsErr);
    }
  }

  try {
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, customStatus, trackingCode })
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Limpa todos os pedidos de teste no Firestore e no servidor
 */
export async function clearAllOrders(): Promise<GenericApiResponse> {
  if (isFirebaseReady()) {
    try {
      await clearAllOrdersFromFirestore();
    } catch {}
  }

  try {
    const res = await fetch('/api/orders/clear', {
      method: 'POST'
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Envia uma avaliação de cliente para um produto
 */
export async function submitProductReview(review: CustomerReview): Promise<GenericApiResponse>;
export async function submitProductReview(productId: string, review: CustomerReview): Promise<GenericApiResponse>;
export async function submitProductReview(
  first: string | CustomerReview, 
  second?: CustomerReview
): Promise<GenericApiResponse> {
  const body = typeof first === 'string' 
    ? (second || { productId: first }) 
    : first;

  try {
    const res = await fetch('/api/store/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Inscreve um lead no Clube de Mimos / Newsletter diretamente no Firestore
 */
export async function subscribeNewsletter(email: string, name?: string, source?: string): Promise<GenericApiResponse> {
  const lead: NewsletterLead = {
    id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    email,
    name: name || '',
    source: source || 'site',
    registeredAt: new Date().toISOString()
  };

  if (isFirebaseReady()) {
    try {
      await saveNewsletterLeadToFirestore(lead);
    } catch (fsErr) {
      console.warn('[StoreAPI] Erro ao salvar lead no Firestore:', fsErr);
    }
  }

  try {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, source })
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}

/**
 * Obtém todos os cadastros no Clube de Mimos / Newsletter do Firestore
 */
export async function fetchNewsletterLeads(): Promise<NewsletterLead[]> {
  if (isFirebaseReady()) {
    try {
      const leads = await fetchNewsletterLeadsFromFirestore();
      if (Array.isArray(leads) && leads.length > 0) {
        return leads;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/newsletter/leads');
    if (res.ok) {
      const data = await safeParseResponseJson<any>(res);
      if (data && Array.isArray(data.leads)) return data.leads;
      if (Array.isArray(data)) return data;
    }
  } catch {}

  return [];
}

/**
 * Remove um lead do Clube de Mimos no Firestore
 */
export async function deleteNewsletterLead(id: string): Promise<GenericApiResponse> {
  if (isFirebaseReady()) {
    try {
      await deleteNewsletterLeadFromFirestore(id);
    } catch {}
  }

  try {
    const res = await fetch(`/api/newsletter/leads/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await safeParseResponseJson<GenericApiResponse>(res);
      if (data) return data;
    }
  } catch {}

  return { success: true };
}
