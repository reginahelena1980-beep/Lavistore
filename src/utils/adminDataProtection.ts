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

/**
 * Carrega o cofre protegido do administrador a partir do localStorage
 */
export function getLocalAdminVault(): Partial<AdminCustomVault> | null {
  try {
    const raw = localStorage.getItem(ADMIN_VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.warn('[AdminProtection] Erro ao ler cofre local:', err);
  }
  return null;
}

/**
 * Salva o cofre protegido no localStorage de forma atômica
 */
export function saveLocalAdminVault(partialVault: Partial<AdminCustomVault>): AdminCustomVault {
  const existing = getLocalAdminVault() || {};
  const updatedVault: AdminCustomVault = {
    version: (existing.version || 0) + 1,
    lastAdminSavedAt: partialVault.lastAdminSavedAt || new Date().toISOString(),
    isLockedByAdmin: true,
    ...existing,
    ...partialVault
  };

  try {
    localStorage.setItem(ADMIN_VAULT_KEY, JSON.stringify(updatedVault));
    localStorage.setItem(ADMIN_LOCK_KEY, 'true');
    localStorage.setItem(ADMIN_LAST_UPDATE_KEY, updatedVault.lastAdminSavedAt);
  } catch (err) {
    console.warn('[AdminProtection] Erro ao salvar cofre no localStorage:', err);
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
 * Mescla produtos garantindo que NENHUMA edição do administrador seja perdida.
 * Se o produto foi editado ou existe na lista do admin, TODOS os campos do admin têm prioridade absoluta.
 * Elimina produtos de teste e registros descartados.
 */
export function mergeProductsSafely(
  primaryList: Product[],
  fallbackList: Product[]
): Product[] {
  const cleanPrimary = (Array.isArray(primaryList) ? primaryList : []).filter(sanitizeProductItem);
  const cleanFallback = (Array.isArray(fallbackList) ? fallbackList : []).filter(sanitizeProductItem);

  if (cleanPrimary.length === 0) return cleanFallback;
  if (cleanFallback.length === 0) return cleanPrimary;

  const result: Product[] = [];

  // 1. Processa a lista principal (local do Admin ou cofre soberano)
  for (const item of cleanPrimary) {
    if (!item || !item.id) continue;
    const normName = item.name?.trim().toLowerCase();

    // Encontra se existe no fallback para preencher campos complementares
    const matchFallback = cleanFallback.find(
      fb => fb.id === item.id || (normName && fb.name?.trim().toLowerCase() === normName)
    );

    if (matchFallback) {
      result.push({
        ...matchFallback,
        ...item,
        images: (item.images && item.images.length > 0) ? item.images : matchFallback.images,
        sizes: (item.sizes && item.sizes.length > 0) ? item.sizes : matchFallback.sizes,
        colors: (item.colors && item.colors.length > 0) ? item.colors : matchFallback.colors,
        features: (item.features && item.features.length > 0) ? item.features : matchFallback.features,
        description: item.description?.trim() ? item.description : matchFallback.description,
        tag: item.tag?.trim() ? item.tag : matchFallback.tag
      });
    } else {
      result.push(item);
    }
  }

  return result;
}

/**
 * Mescla profunda da configuração da Home Page (Sobre Nós, Contato, Rodapé, Frases, Selos, Telefone, E-mail, WhatsApp)
 * `primary` contém personalizações do Administrador que têm prioridade absoluta sobre `fallback`.
 * Novos campos adicionados no código/fallback são preservados sem sobrescrever as edições existentes.
 */
export function mergeHomePageConfigSafely(
  primary: HomePageConfig,
  fallback?: Partial<HomePageConfig> | null
): HomePageConfig {
  if (!fallback) return { ...primary };
  if (!primary) return { ...fallback } as HomePageConfig;

  const result: Record<string, unknown> = { ...fallback };
  const fallbackRecord = fallback as Record<string, unknown>;

  for (const [key, pVal] of Object.entries(primary)) {
    if (pVal === undefined || pVal === null) continue;

    const fVal = fallbackRecord[key];

    // Se for objeto com { text, fontSize, isBold } (FormattedText)
    if (typeof pVal === 'object' && !Array.isArray(pVal) && 'text' in pVal) {
      result[key] = {
        ...(typeof fVal === 'object' && fVal !== null ? fVal : {}),
        ...pVal
      };
    } else if (typeof pVal === 'string') {
      result[key] = pVal;
    } else if (typeof pVal === 'boolean' || typeof pVal === 'number') {
      result[key] = pVal;
    } else if (Array.isArray(pVal)) {
      result[key] = pVal.length > 0 ? pVal : fVal;
    } else if (typeof pVal === 'object') {
      result[key] = {
        ...(typeof fVal === 'object' && fVal !== null ? fVal : {}),
        ...pVal
      };
    }
  }

  return result as unknown as HomePageConfig;
}

/**
 * Mescla segura da configuração do Hero Banner
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
    ...(fallback || {})
  };

  if (!primary) return base;

  return {
    ...base,
    ...primary,
    image: primary.image !== undefined ? primary.image : base.image,
    badge: primary.badge !== undefined ? primary.badge : base.badge,
    title: primary.title !== undefined ? primary.title : base.title,
    subtitle: primary.subtitle !== undefined ? primary.subtitle : base.subtitle
  };
}

/**
 * Mescla segura de cupons mantendo os cupons ativos e cadastrados pelo administrador
 */
export function mergeCouponsSafely(
  primary: Coupon[],
  fallback: Coupon[]
): Coupon[] {
  if (!Array.isArray(primary) || primary.length === 0) return fallback || [];
  if (!Array.isArray(fallback) || fallback.length === 0) return primary;

  const result: Coupon[] = [...primary];
  const knownCodes = new Set(primary.map(c => c.code.trim().toUpperCase()));

  for (const fb of fallback) {
    if (!fb || !fb.code) continue;
    const codeUpper = fb.code.trim().toUpperCase();
    if (!knownCodes.has(codeUpper)) {
      knownCodes.add(codeUpper);
      result.push(fb);
    }
  }

  return result;
}

/**
 * Mescla segura de categorias
 */
export function mergeCategoriesSafely(
  primary: Category[],
  fallback: Category[]
): Category[] {
  if (!Array.isArray(primary) || primary.length === 0) return fallback || [];
  if (!Array.isArray(fallback) || fallback.length === 0) return primary;

  const result: Category[] = [...primary];
  const knownIds = new Set(primary.map(c => c.id));

  for (const fb of fallback) {
    if (!fb || !fb.id) continue;
    if (!knownIds.has(fb.id)) {
      knownIds.add(fb.id);
      result.push(fb);
    }
  }

  return result;
}

/**
 * Mescla segura de modelos de embalagens / sacolinhas
 */
export function mergeBagTypesSafely(
  primary: BagType[],
  fallback: BagType[]
): BagType[] {
  if (!Array.isArray(primary) || primary.length === 0) return fallback || [];
  if (!Array.isArray(fallback) || fallback.length === 0) return primary;

  const result: BagType[] = [...primary];
  const knownIds = new Set(primary.map(b => b.id));

  for (const fb of fallback) {
    if (!fb || !fb.id) continue;
    if (!knownIds.has(fb.id)) {
      knownIds.add(fb.id);
      result.push(fb);
    }
  }

  return result;
}

/**
 * Mescla segura de opções de fitas
 */
export function mergeRibbonOptionsSafely(
  primary: RibbonOption[],
  fallback: RibbonOption[]
): RibbonOption[] {
  if (!Array.isArray(primary) || primary.length === 0) return fallback || [];
  if (!Array.isArray(fallback) || fallback.length === 0) return primary;

  const result: RibbonOption[] = [...primary];
  const knownIds = new Set(primary.map(r => r.id));

  for (const fb of fallback) {
    if (!fb || !fb.id) continue;
    if (!knownIds.has(fb.id)) {
      knownIds.add(fb.id);
      result.push(fb);
    }
  }

  return result;
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
