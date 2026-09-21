import { Product, Category, Coupon, BagType, RibbonOption, CustomerReview, FilterBarConfig, HomePageConfig, HeroConfig, BiProductCalculatedRecord } from '../types';

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
  orders?: any[];
  newsletterLeads?: any[];
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
    lastAdminSavedAt: new Date().toISOString(),
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

/**
 * Mescla produtos garantindo que NENHUMA edição do administrador seja perdida.
 * Se o produto foi editado ou existe na lista do admin, TODOS os campos do admin têm prioridade absoluta.
 * Nenhum produto é excluído acidentalmente (união de IDs).
 */
export function mergeProductsSafely(
  primaryList: Product[],
  fallbackList: Product[]
): Product[] {
  const result: Product[] = [];
  const handledIds = new Set<string>();
  const handledNames = new Set<string>();

  // 1. Processa a lista principal (geralmente local do Admin ou cofre protegido)
  for (const item of primaryList) {
    if (!item || !item.id) continue;
    handledIds.add(item.id);
    const normName = item.name?.trim().toLowerCase();
    if (normName) handledNames.add(normName);

    // Encontra se existe no fallback para preencher campos que possam estar faltando
    const matchFallback = fallbackList.find(
      fb => fb.id === item.id || (normName && fb.name?.trim().toLowerCase() === normName)
    );

    if (matchFallback) {
      result.push({
        ...matchFallback,
        ...item,
        // Garante que imagens, variações e textos customizados não sejam substituídos
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

  // 2. Adiciona produtos da lista secundária que ainda não estão presentes
  for (const fb of fallbackList) {
    if (!fb || !fb.id) continue;
    const normName = fb.name?.trim().toLowerCase();
    if (handledIds.has(fb.id) || (normName && handledNames.has(normName))) {
      continue;
    }
    handledIds.add(fb.id);
    if (normName) handledNames.add(normName);
    result.push(fb);
  }

  return result;
}

/**
 * Mescla profunda da configuração da Home Page (Sobre Nós, Contato, Rodapé, Frases, Selos)
 * garantindo que campos editados pelo Admin nunca voltem ao padrão original.
 */
export function mergeHomePageConfigSafely(
  base: HomePageConfig,
  overrides?: Partial<HomePageConfig> | null
): HomePageConfig {
  if (!overrides) return { ...base };

  const merged: any = { ...base };

  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined || val === null) continue;

    // Se for objeto com { text, fontSize, isBold }
    if (typeof val === 'object' && !Array.isArray(val) && 'text' in val) {
      merged[key] = {
        ...(merged[key] || {}),
        ...(val as any)
      };
    } else if (typeof val === 'string' && val.trim() !== '') {
      merged[key] = val;
    } else if (typeof val === 'boolean' || typeof val === 'number') {
      merged[key] = val;
    } else if (Array.isArray(val)) {
      merged[key] = val;
    } else if (typeof val === 'object') {
      merged[key] = {
        ...(merged[key] || {}),
        ...(val as any)
      };
    }
  }

  return merged as HomePageConfig;
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
export function validateAdminBackup(data: any): { valid: boolean; error?: string; vault?: AdminCustomVault } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'O arquivo selecionado não contém um formato JSON válido.' };
  }

  const hasAnyKey = 
    Array.isArray(data.products) || 
    Array.isArray(data.categories) || 
    Array.isArray(data.coupons) || 
    data.homePageConfig || 
    data.heroConfig || 
    Array.isArray(data.biRecords);

  if (!hasAnyKey) {
    return { valid: false, error: 'O arquivo JSON não contém dados reconhecíveis da Lavistore (produtos, cupons, textos ou categorias).' };
  }

  const vault: AdminCustomVault = {
    version: (typeof data.version === 'number' ? data.version : 1) + 1,
    lastAdminSavedAt: new Date().toISOString(),
    isLockedByAdmin: true,
    ...data
  };

  return { valid: true, vault };
}
