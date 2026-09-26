/**
 * SERVIÇO DE API E PERSISTÊNCIA DA LOJA (LAVISTORE API CLIENT)
 * Camada de abstração e isolamento para todas as chamadas HTTP e persistência do backend.
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
  saveStoreConfigToFirestore 
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
 * Recupera as configurações soberanas da loja com estratégia READ-FIRST rigorosa:
 * 1. Consulta o Firestore via getDoc()
 * 2. Se o documento existir, ele é a fonte única e absoluta da verdade (imune a qualquer deploy/build)
 * 3. Se NÃO existir (primeira instalação da loja), NÃO executa setDoc nem grava dados fakes;
 *    apenas retorna o fallback seguro em memória/API Express
 */
export async function fetchSovereignStoreConfig(): Promise<{
  source: 'firestore' | 'server' | 'none';
  data: Partial<AdminCustomVault> | null;
  isLockedByAdmin: boolean;
}> {
  // 1. READ-FIRST no Firestore (Nunca faz seed/setDoc se não existir)
  if (isFirebaseReady()) {
    try {
      const firestoreResult = await loadStoreConfigFromFirestore();
      if (firestoreResult.exists && firestoreResult.data) {
        console.info('[StoreAPI] 👑 Configurações soberanas obtidas diretamente do Firestore (Fonte Soberana da Verdade).');
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

  // 2. Consulta à API Express / cofre persistente como fallback secundário
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
 * Recupera os dados oficiais da loja e configurações administrativas
 */
export async function fetchStoreData(): Promise<StoreDataResponse> {
  const res = await fetch('/api/store/data');
  if (!res.ok) {
    throw new Error(`Falha ao obter dados da loja (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Sincroniza e grava atomicamente os dados da loja no cofre do servidor e no Firestore
 * (Apenas executado sob ação explícita do administrador no painel)
 */
export async function syncStoreData(payload: SyncStorePayload): Promise<SyncStoreResponse> {
  // 1. Gravação protegida no Firestore (Apenas sob comando explícito do usuário/Admin)
  if (isFirebaseReady()) {
    try {
      await saveStoreConfigToFirestore(payload as Partial<AdminCustomVault>);
      console.info('[StoreAPI] 🛡️ Configurações sincronizadas no Firebase Firestore.');
    } catch (fsErr) {
      console.warn('[StoreAPI] Aviso ao persistir no Firestore:', fsErr);
    }
  }

  // 2. Gravação no servidor Express
  const res = await fetch('/api/store/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Falha ao sincronizar dados da loja (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Salva as configurações de blindagem do administrador
 */
export async function saveAdminSettings(settings: AdminSettingsPayload): Promise<GenericApiResponse> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) {
    throw new Error(`Falha ao salvar configurações do administrador (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Obtém as configurações do administrador
 */
export async function fetchAdminSettings(): Promise<AdminSettingsResponse> {
  const res = await fetch('/api/admin/settings');
  if (!res.ok) {
    throw new Error(`Falha ao obter configurações do administrador (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Obtém o cofre do administrador
 */
export async function fetchAdminVault(): Promise<AdminVaultResponse> {
  const res = await fetch('/api/admin/vault');
  if (!res.ok) {
    throw new Error(`Falha ao obter cofre do administrador (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Salva o cofre do administrador
 */
export async function saveAdminVault(vault: AdminCustomVault): Promise<GenericApiResponse> {
  const res = await fetch('/api/admin/vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vault)
  });
  if (!res.ok) {
    throw new Error(`Falha ao salvar cofre do administrador (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Obtém os registros de BI Financeiro
 */
export async function fetchBiRecords(): Promise<BiProductCalculatedRecord[]> {
  const res = await fetch('/api/bi/records');
  if (!res.ok) {
    throw new Error(`Falha ao carregar registros de BI (HTTP ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Salva os registros de BI Financeiro
 */
export async function saveBiRecords(records: BiProductCalculatedRecord[]): Promise<GenericApiResponse> {
  const res = await fetch('/api/bi/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  if (!res.ok) {
    throw new Error(`Falha ao salvar registros de BI (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Obtém a lista de pedidos cadastrados
 */
export async function fetchOrders(): Promise<OrderData[]> {
  const res = await fetch('/api/orders');
  if (!res.ok) {
    throw new Error(`Falha ao carregar pedidos (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.orders)) return data.orders;
  return [];
}

/**
 * Cria ou salva um pedido
 */
export async function createOrder(order: OrderData): Promise<GenericApiResponse> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  if (!res.ok) {
    throw new Error(`Falha ao salvar pedido (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Atualiza o status ou código de rastreio de um pedido
 */
export async function updateOrderStatus(
  orderId: string, 
  customStatus?: string, 
  trackingCode?: string
): Promise<GenericApiResponse> {
  const res = await fetch('/api/orders/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, customStatus, trackingCode })
  });
  if (!res.ok) {
    throw new Error(`Falha ao atualizar status do pedido (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Limpa todos os pedidos de teste para publicação oficial
 */
export async function clearAllOrders(): Promise<GenericApiResponse> {
  const res = await fetch('/api/orders/clear', {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error(`Falha ao limpar pedidos (HTTP ${res.status})`);
  }
  return res.json();
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

  const res = await fetch('/api/store/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar avaliação (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Inscreve um lead no Clube de Mimos / Newsletter
 */
export async function subscribeNewsletter(email: string, name?: string, source?: string): Promise<GenericApiResponse> {
  const res = await fetch('/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, source })
  });
  if (!res.ok) {
    throw new Error(`Falha ao cadastrar na newsletter (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Obtém todos os cadastros no Clube de Mimos / Newsletter
 */
export async function fetchNewsletterLeads(): Promise<NewsletterLead[]> {
  const res = await fetch('/api/newsletter/leads');
  if (!res.ok) {
    throw new Error(`Falha ao buscar leads (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data && Array.isArray(data.leads)) return data.leads;
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * Remove um lead do Clube de Mimos
 */
export async function deleteNewsletterLead(id: string): Promise<GenericApiResponse> {
  const res = await fetch(`/api/newsletter/leads/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(`Falha ao remover lead (HTTP ${res.status})`);
  }
  return res.json();
}
