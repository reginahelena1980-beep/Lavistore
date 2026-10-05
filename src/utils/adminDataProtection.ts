import { 
  Product, 
  Category, 
  Coupon, 
  BagType, 
  RibbonOption, 
  CustomerReview, 
  FilterBarConfig, 
  HomePageConfig, 
  HeroConfig, 
  BiProductCalculatedRecord,
  OrderData,
  NewsletterLead
} from '../types';

export const ADMIN_VAULT_KEY = 'lavistore_admin_custom_vault';
export const ADMIN_LOCK_KEY = 'lavistore_admin_locked';
export const ADMIN_LAST_UPDATE_KEY = 'lavistore_admin_last_update';

export interface AdminCustomVault {
  version: number;
  lastAdminSavedAt: string;
  isLockedByAdmin: boolean;
  products?: Product[];
  biRecords?: BiProductCalculatedRecord[];
  categories?: Category[];
  heroConfig?: HeroConfig;
  homePageConfig?: HomePageConfig;
  coupons?: Coupon[];
  bagTypes?: BagType[];
  ribbonOptions?: RibbonOption[];
  reviews?: CustomerReview[];
  filterBarConfig?: FilterBarConfig;
  orders?: OrderData[];
  newsletterLeads?: NewsletterLead[];
}

// Cofre volátil mantido estritamente em memória durante a sessão (Zero LocalStorage)
let inMemoryAdminVault: AdminCustomVault | null = null;

/**
 * Carrega o cofre protegido do administrador a partir da memória volátil da sessão
 */
export function getLocalAdminVault(): Partial<AdminCustomVault> | null {
  // Purga proativa de chave legada do localStorage se existir
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(ADMIN_VAULT_KEY);
      window.localStorage.removeItem(ADMIN_LOCK_KEY);
      window.localStorage.removeItem(ADMIN_LAST_UPDATE_KEY);
    } catch {}
  }
  return inMemoryAdminVault;
}

/**
 * Salva o cofre protegido na memória volátil da sessão (Zero LocalStorage)
 */
export function saveLocalAdminVault(partialVault: Partial<AdminCustomVault>): AdminCustomVault {
  const existing = inMemoryAdminVault || {} as Partial<AdminCustomVault>;
  const updatedVault: AdminCustomVault = {
    version: (existing.version || 0) + 1,
    lastAdminSavedAt: partialVault.lastAdminSavedAt || new Date().toISOString(),
    isLockedByAdmin: true,
    ...existing,
    ...partialVault
  };

  inMemoryAdminVault = updatedVault;

  // Garante que nenhuma informação seja salva em localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(ADMIN_VAULT_KEY);
      window.localStorage.removeItem(ADMIN_LOCK_KEY);
      window.localStorage.removeItem(ADMIN_LAST_UPDATE_KEY);
    } catch {}
  }

  return updatedVault;
}

const TEST_PRODUCT_IDS = new Set(['lav-74750', 'lav-15329', 'lav-03352', 'lav-01', 'lav-02']);

function sanitizeProductItem(p: Product): boolean {
  if (!p || !p.id || !p.name) return false;
  const lowerId = String(p.id).toLowerCase();
  const lowerName = String(p.name).toLowerCase();
  if (TEST_PRODUCT_IDS.has(lowerId)) return false;
  if (lowerName.includes('teste')) return false;
  return true;
}

/**
 * Mescla recursiva e não-destrutiva de configurações:
 * - O objeto `target` (originário do Administrador/Firestore) tem prioridade absoluta.
 * - Valores persistidos legítimos como "", false, 0, [] e {} JAMAIS são substituídos ou descartados.
 * - `defaults` é utilizado EXCLUSIVAMENTE para preencher propriedades que sejam genuinamente `undefined` em `target`.
 * - Se `target` contém sub-objetos (ex: FormattedText { text, fontSize, isBold }), as propriedades internas existentes são mantidas e apenas campos ausentes recebem valor de `defaults`.
 */
export function deepMergeConfigWithDefaults<T extends Record<string, any>>(
  target: T | null | undefined,
  defaults: T
): T {
  if (target === undefined || target === null) {
    if (Array.isArray(defaults)) return [...defaults] as unknown as T;
    return typeof defaults === 'object' && defaults !== null ? { ...defaults } : defaults;
  }

  // Coleções em Array são autoritativas mesmo se vazias ([])
  if (Array.isArray(target)) {
    return target;
  }

  // Tipos primitivos (string, number, boolean) em target são autoritativos mesmo se vazios/falsy ("", 0, false)
  if (typeof target !== 'object') {
    return target;
  }

  const result: Record<string, any> = { ...target };

  if (defaults && typeof defaults === 'object' && !Array.isArray(defaults)) {
    for (const key of Object.keys(defaults)) {
      const defVal = defaults[key];
      const targetVal = target[key];

      if (targetVal === undefined) {
        // Campo genuinamente ausente no target: herda o default do código
        result[key] = defVal;
      } else if (
        typeof targetVal === 'object' &&
        targetVal !== null &&
        !Array.isArray(targetVal) &&
        typeof defVal === 'object' &&
        defVal !== null &&
        !Array.isArray(defVal)
      ) {
        // Sub-objeto de configuração: mescla recursiva protegendo as chaves internas existentes
        result[key] = deepMergeConfigWithDefaults(targetVal, defVal);
      }
      // Se targetVal !== undefined (incluindo "", 0, false, [], {}), permanece intocado!
    }
  }

  return result as T;
}

/**
 * Mescla produtos garantindo que NENHUMA edição do administrador seja perdida.
 * Se uma lista persistida existir (mesmo que vazia []), ela é soberana.
 * Itens excluídos pelo administrador JAMAIS são ressuscitados pelo código padrão.
 * Apenas campos de modelo ausentes (undefined) em um produto existente recebem fallback.
 */
export function mergeProductsSafely(
  primaryList?: Product[] | null,
  fallbackList?: Product[] | null
): Product[] {
  if (Array.isArray(primaryList)) {
    const cleanPrimary = primaryList.filter(sanitizeProductItem);
    const cleanFallback = Array.isArray(fallbackList) ? fallbackList.filter(sanitizeProductItem) : [];

    return cleanPrimary.map(item => {
      const match = cleanFallback.find(fb => fb.id === item.id);
      if (!match) return item;
      return deepMergeConfigWithDefaults(item, match);
    });
  }

  if (Array.isArray(fallbackList)) {
    return fallbackList.filter(sanitizeProductItem);
  }

  return [];
}

/**
 * Mescla profunda da configuração da Home Page.
 * `primary` contém personalizações do Administrador que têm prioridade absoluta sobre `fallback`.
 * Valores válidos ("", false, 0, [], {}) são preservados intactos.
 * Novos campos adicionados no código/fallback são incorporados sem sobrescrever as edições existentes.
 */
export function mergeHomePageConfigSafely(
  primary?: Partial<HomePageConfig> | null,
  fallback?: Partial<HomePageConfig> | null
): HomePageConfig {
  if (!primary && !fallback) return {} as HomePageConfig;
  if (!primary) return { ...(fallback as HomePageConfig) };
  if (!fallback) return { ...(primary as HomePageConfig) };

  return deepMergeConfigWithDefaults(primary as HomePageConfig, fallback as HomePageConfig);
}

/**
 * Mescla segura da configuração do Hero Banner.
 * Preserva títulos, subtítulos, imagens e opções do administrador (inclusive strings vazias).
 * Novos campos estruturais herdam o default apenas se undefined.
 */
export function mergeHeroConfigSafely(
  primary?: Partial<HeroConfig> | null,
  fallback?: Partial<HeroConfig> | null
): HeroConfig {
  const base: HeroConfig = {
    image: '',
    badge: '',
    title: '',
    subtitle: '',
    imageFit: 'cover',
    imageScale: 100,
    imagePosition: 'center',
    imagePositionX: 50,
    imagePositionY: 50,
    bannerHeight: 'medium',
    ...(fallback || {})
  };

  if (!primary) return base;
  return deepMergeConfigWithDefaults(primary as HeroConfig, base);
}

/**
 * Mescla segura de cupons:
 * Um array de cupons existente é autoritativo MESMO SE VAZIO ([]).
 * Cupons excluídos pelo administrador JAMAIS são ressuscitados pelo código.
 */
export function mergeCouponsSafely(
  primary?: Coupon[] | null,
  fallback?: Coupon[] | null
): Coupon[] {
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

/**
 * Mescla segura de categorias:
 * Um array de categorias existente é autoritativo MESMO SE VAZIO ([]).
 * Categorias excluídas pelo administrador JAMAIS são ressuscitadas pelo código.
 */
export function mergeCategoriesSafely(
  primary?: Category[] | null,
  fallback?: Category[] | null
): Category[] {
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

/**
 * Mescla segura de modelos de embalagens / sacolinhas:
 * Um array existente é autoritativo MESMO SE VAZIO ([]).
 * Itens excluídos pelo administrador JAMAIS são ressuscitados.
 */
export function mergeBagTypesSafely(
  primary?: BagType[] | null,
  fallback?: BagType[] | null
): BagType[] {
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

/**
 * Mescla segura de opções de fitas:
 * Um array existente é autoritativo MESMO SE VAZIO ([]).
 * Itens excluídos pelo administrador JAMAIS são ressuscitados.
 */
export function mergeRibbonOptionsSafely(
  primary?: RibbonOption[] | null,
  fallback?: RibbonOption[] | null
): RibbonOption[] {
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

/**
 * Determina se os dados locais do cofre devem ter precedência absoluta sobre a resposta do servidor
 * (por exemplo, após um novo deploy onde o servidor acabou de inicializar com arquivos padrão de build).
 */
export function shouldPreferLocalAdminVault(
  localVault: Partial<AdminCustomVault> | null,
  remoteData: { isLockedByAdmin?: boolean; lastAdminSavedAt?: string; updatedAt?: string } | null | undefined
): boolean {
  if (!localVault || !localVault.isLockedByAdmin || !localVault.lastAdminSavedAt) {
    return false;
  }

  if (!remoteData || !remoteData.isLockedByAdmin) {
    return true;
  }

  const localTime = new Date(localVault.lastAdminSavedAt).getTime();
  const remoteTime = new Date(remoteData.lastAdminSavedAt || remoteData.updatedAt || 0).getTime();

  // Se o cofre local é igual ou mais recente que o servidor, preserva o cofre local
  if (isNaN(remoteTime) || localTime >= remoteTime) {
    return true;
  }

  return false;
}

/**
 * Exporta o cofre completo do Administrador como arquivo JSON para download imediato
 */
export function downloadAdminBackupFile(vault: AdminCustomVault) {
  const dateStr = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const fileName = `lavistore_backup_completo_adm_${dateStr}.json`;
  const jsonContent = JSON.stringify(vault, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valida se um objeto JSON importado possui a estrutura de backup do Admin
 */
export function validateAdminBackup(data: unknown): { valid: boolean; error?: string; vault?: AdminCustomVault } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'O arquivo selecionado não contém um formato JSON válido.' };
  }

  const candidate = data as Record<string, unknown>;

  const hasAnyKey = 
    Array.isArray(candidate.products) || 
    Array.isArray(candidate.categories) || 
    Array.isArray(candidate.coupons) || 
    candidate.homePageConfig || 
    candidate.heroConfig || 
    Array.isArray(candidate.bagTypes) ||
    Array.isArray(candidate.ribbonOptions) ||
    Array.isArray(candidate.biRecords);

  if (!hasAnyKey) {
    return { valid: false, error: 'O arquivo JSON não contém dados reconhecíveis da Lavistore (produtos, cupons, textos ou categorias).' };
  }

  const vault: AdminCustomVault = {
    version: (typeof candidate.version === 'number' ? candidate.version : 1) + 1,
    lastAdminSavedAt: new Date().toISOString(),
    isLockedByAdmin: true,
    ...(candidate as unknown as Partial<AdminCustomVault>)
  };

  return { valid: true, vault };
}
